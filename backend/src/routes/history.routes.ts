import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// Search and list email history
router.get('/', async (req, res) => {
  try {
    const search = (req.query.search as string || '').trim().toLowerCase();
    const campaignId = req.query.campaignId ? Number(req.query.campaignId) : undefined;

    // Build Prisma query filters
    const whereClause: any = {};

    if (campaignId) {
      whereClause.campaignId = campaignId;
    }

    if (search) {
      whereClause.OR = [
        {
          contact: {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { company: { contains: search } },
            ],
          },
        },
        {
          campaign: {
            name: { contains: search },
          },
        },
        {
          subject: { contains: search },
        },
      ];
    }

    const history = await prisma.emailHistory.findMany({
      where: whereClause,
      include: {
        contact: true,
        campaign: true,
      },
      orderBy: { sentAt: 'desc' },
    });

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to search email history' });
  }
});

export default router;
