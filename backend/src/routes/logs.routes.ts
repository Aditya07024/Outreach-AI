import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// Retrieve logs, with optional filter and limit
router.get('/', async (req, res) => {
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
router.post('/clear', async (req, res) => {
  try {
    await prisma.log.deleteMany();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear logs' });
  }
});

export default router;
