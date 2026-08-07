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

  // 1. Check if token is a Clerk JWT token by decoding payload
  try {
    const decodedAny = jwt.decode(token) as any;
    const isClerkToken = decodedAny && (
      (typeof decodedAny.iss === 'string' && decodedAny.iss.includes('clerk')) ||
      (typeof decodedAny.sub === 'string' && decodedAny.sub.startsWith('user_')) ||
      decodedAny.azp ||
      decodedAny.clerk_user_id
    );
    const clerkUserId = isClerkToken ? (decodedAny.sub || decodedAny.clerk_user_id) : null;

    if (clerkUserId) {
      let email: string | null = decodedAny.email || decodedAny.email_address || null;

      // Search database for existing user by clerkId or email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { clerkId: clerkUserId },
            ...(email ? [{ email }] : [])
          ]
        }
      });

      // If user not found, try retrieving details from Clerk API or use fallback
      if (!user) {
        if (!email && clerkSecretKey) {
          try {
            const clerkUser = await clerkClient.users.getUser(clerkUserId);
            email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || null;
          } catch (clerkApiErr) {
            console.warn('[Clerk API Warning] Could not fetch user details from Clerk API:', clerkApiErr);
          }
        }

        const effectiveEmail = email || `${clerkUserId}@user.clerk`;
        const isAdminEmail = effectiveEmail === 'adityakumar07024@gmail.com' || effectiveEmail === 'adityakumarjat106@gmail.com';

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 3);

        user = await prisma.user.create({
          data: {
            clerkId: clerkUserId,
            email: effectiveEmail,
            paid: isAdminEmail,
            role: isAdminEmail ? 'admin' : 'paid_user',
            trialEndsAt
          }
        });
      } else {
        // Link clerkId if not linked yet
        if (!user.clerkId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { clerkId: clerkUserId }
          });
        }
      }

      // Check admin email override
      if (user.email && (user.email === 'adityakumar07024@gmail.com' || user.email === 'adityakumarjat106@gmail.com') && user.role !== 'admin') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'admin', paid: true }
        });
      }

      req.user = {
        id: user.id,
        role: user.role as any,
        email: user.email || undefined
      };

      // Update lastActiveAt asynchronously
      prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() }
      }).catch(() => {});

      return next();
    }
  } catch (clerkDecodeErr) {
    // Continue to legacy JWT check
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
