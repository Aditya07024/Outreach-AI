import { Router } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Retrieve logs, with optional filter and limit
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const source = req.query.source as string || undefined;
    const level = req.query.level as string || undefined;

    const whereClause: any = {};
    if (source) {
      whereClause.source = source;
    }
    if (level) {
      whereClause.level = level;
    }

    // Standard users should only see their own logs
    if (req.user!.role !== 'super_admin' && req.user!.role !== 'admin') {
      whereClause.userId = req.user!.id;
    }

    const logs = await prisma.log.findMany({
      where: whereClause,
      take: limit,
      orderBy: { timestamp: 'desc' },
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch logs' });
  }
});

// Clear all logs
router.post('/clear', async (req: AuthenticatedRequest, res) => {
  try {
    const whereClause: any = {};
    if (req.user!.role !== 'super_admin' && req.user!.role !== 'admin') {
      whereClause.userId = req.user!.id;
    }
    await prisma.log.deleteMany({
      where: whereClause
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear logs' });
  }
});

export default router;
