import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: 'admin' | 'paid_user' | 'super_admin';
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Bypasses check for standard public options
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. Authorization token missing.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: 'admin' | 'paid_user' | 'super_admin' };
    req.user = decoded;

    // Update lastActiveAt in the background asynchronously
    prisma.user.update({
      where: { id: decoded.id },
      data: { lastActiveAt: new Date() }
    }).catch(err => {
      console.error('Failed to update lastActiveAt for user:', decoded.id, err);
    });

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }
}
