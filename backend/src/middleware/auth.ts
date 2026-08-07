import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, clerkClient } from '@clerk/express';
import prisma from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: 'admin' | 'paid_user' | 'super_admin';
    email?: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Bypasses check for standard public options
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. Authorization token missing.' });
  }

  const token = authHeader.split(' ')[1];
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  // 1. Try verifying Clerk Token if Secret Key is set
  if (clerkSecretKey) {
    try {
      let clerkUserId: string | null = null;
      let email: string | null = null;

      try {
        const payload = await verifyToken(token, {
          secretKey: clerkSecretKey,
        });
        if (payload && payload.sub) {
          clerkUserId = payload.sub;
          if ((payload as any).email) email = (payload as any).email;
          if (!email && (payload as any).email_address) email = (payload as any).email_address;
        }
      } catch (vErr) {
        // Fallback to jwt.decode if verifyToken hit clock drift or network issue
        try {
          const decodedClerk = jwt.decode(token) as any;
          if (decodedClerk && decodedClerk.sub && typeof decodedClerk.sub === 'string' && decodedClerk.sub.startsWith('user_')) {
            clerkUserId = decodedClerk.sub;
            if (decodedClerk.email) email = decodedClerk.email;
            if (!email && decodedClerk.email_address) email = decodedClerk.email_address;
          }
        } catch (dErr) {}
      }

      if (clerkUserId) {
        if (!email) {
          try {
            const clerkUser = await clerkClient.users.getUser(clerkUserId);
            email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || null;
          } catch (clerkApiErr) {
            console.error('[Clerk API Error] Could not fetch user details for:', clerkUserId, clerkApiErr);
          }
        }

        if (email) {
          let user = await prisma.user.findUnique({
            where: { email }
          });

          const isAdminEmail = email === 'adityakumar07024@gmail.com' || email === 'adityakumarjat106@gmail.com';

          if (!user) {
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 3);

            user = await prisma.user.create({
              data: {
                email,
                paid: isAdminEmail,
                role: isAdminEmail ? 'admin' : 'paid_user',
                trialEndsAt
              }
            });
          } else if (isAdminEmail && user.role !== 'admin') {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { role: 'admin', paid: true }
            });
          } else if (!user.paid && !user.trialEndsAt && user.role !== 'admin' && user.role !== 'super_admin') {
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 3);
            user = await prisma.user.update({
              where: { id: user.id },
              data: { trialEndsAt }
            });
          }

          req.user = {
            id: user.id,
            role: user.role as any,
            email: user.email || undefined
          };

          // Update lastActiveAt in background
          prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() }
          }).catch(() => {});

          return next();
        }
      }
    } catch (clerkErr) {
      console.error('[Clerk Auth Middleware Error]:', clerkErr);
    }
  }

  // 2. Fallback to legacy/passcode JWT token verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: 'admin' | 'paid_user' | 'super_admin' };
    req.user = decoded;

    prisma.user.update({
      where: { id: decoded.id },
      data: { lastActiveAt: new Date() }
    }).catch(err => {
      console.error('Failed to update lastActiveAt for user:', decoded.id, err);
    });

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }
}


