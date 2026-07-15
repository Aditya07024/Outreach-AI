import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import prisma from '../utils/prisma';

export async function requirePaid(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Authenticated session required.' });
    }

    // Bypass check for admins
    if (req.user.role === 'admin') {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Double check admin role from DB
    if (user.role === 'admin') {
      return next();
    }

    // Calculate paid status based on plan expiration
    const isPaid = user.paid && (
      user.plan !== 'yearly' || 
      !user.paidUntil || 
      user.paidUntil > new Date()
    );

    const isTrialActive = user.trialEndsAt && user.trialEndsAt > new Date();

    if (!isPaid && !isTrialActive) {
      return res.status(402).json({ 
        error: 'Payment required. Please subscribe to access these features.',
        code: 'PAYMENT_REQUIRED'
      });
    }

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error during payment verification.' });
  }
}
