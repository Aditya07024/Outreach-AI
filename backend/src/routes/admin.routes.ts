import { Router, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Middleware to ensure user is super_admin
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

// Get all users and aggregate metrics
router.get('/users', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        // Count campaigns
        const campaignsCount = await prisma.campaign.count({
          where: { userId: u.id }
        });

        // Count email history sent
        const emailsSent = await prisma.emailHistory.count({
          where: {
            campaign: {
              userId: u.id
            }
          }
        });

        return {
          id: u.id,
          email: u.email,
          role: u.role,
          paid: u.paid,
          plan: u.plan,
          paidUntil: u.paidUntil,
          createdAt: u.createdAt,
          lastActiveAt: u.lastActiveAt,
          campaignsCount,
          emailsSent
        };
      })
    );

    // Calculate aggregated metrics
    const totalUsers = users.length;
    const paidUsers = users.filter(u => u.paid && u.role !== 'super_admin').length;
    
    const yearlyCount = users.filter(u => u.paid && u.plan === 'yearly').length;
    const lifetimeCount = users.filter(u => u.paid && u.plan === 'lifetime').length;
    const totalIncome = (yearlyCount * 100) + (lifetimeCount * 300);

    res.json({
      users: enrichedUsers,
      stats: {
        totalUsers,
        paidUsers,
        totalIncome,
        yearlyCount,
        lifetimeCount
      }
    });
  } catch (error: any) {
    res.status(550).json({ error: error.message || 'Failed to retrieve admin analytics data' });
  }
});

// Bypass payment check for a user
router.post('/bypass/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        paid: true,
        plan: 'lifetime',
        paidUntil: null
      }
    });

    await logger.info('API', `Admin bypassed payment requirements for user ${userId} (${user.email || 'local'})`);
    res.json({ success: true, user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to bypass payment' });
  }
});

// Revoke/cancel subscription for a user
router.post('/cancel/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        paid: false,
        plan: null,
        paidUntil: null
      }
    });

    await logger.info('API', `Admin cancelled/revoked subscription for user ${userId} (${user.email || 'local'})`);
    res.json({ success: true, user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

export default router;
