import { Router } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Search and list email history
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const search = (req.query.search as string || '').trim();
    const campaignId = req.query.campaignId ? Number(req.query.campaignId) : undefined;

    // Build Prisma query filters scoped to campaigns owned by this user
    const whereClause: any = {
      campaign: {
        userId
      }
    };

    if (campaignId) {
      whereClause.campaignId = campaignId;
    }

    if (search) {
      whereClause.OR = [
        {
          contact: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          campaign: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          subject: { contains: search, mode: 'insensitive' },
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
