import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    role: 'admin' | 'paid_user';
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
    const decoded = jwt.verify(token, JWT_SECRET) as { role: 'admin' | 'paid_user' };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }
}
