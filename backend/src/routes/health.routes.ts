import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

router.get('/', async (req, res) => {
  const healthCheck: any = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(), // in seconds
    services: {
      database: 'UNKNOWN',
    },
  };

  try {
    // Ping database using Prisma client
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.services.database = 'UP';
  } catch (error: any) {
    healthCheck.status = 'DOWN';
    healthCheck.services.database = 'DOWN';
    healthCheck.error = error.message || String(error);
  }

  // Include detailed diagnostic information
  healthCheck.diagnostics = {
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    platform: process.platform,
    nodeVersion: process.version,
  };

  if (healthCheck.status === 'UP') {
    res.status(200).json(healthCheck);
  } else {
    res.status(503).json(healthCheck);
  }
});

// Public Waitlist Email Capture Endpoint
router.post('/waitlist', async (req, res) => {
  const { email, rolePack, notes } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  try {
    const lead = await prisma.waitlistLead.create({
      data: {
        email: email.trim().toLowerCase(),
        rolePack: rolePack || 'All Roles',
        notes: notes || null
      }
    });

    return res.json({ success: true, lead });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to join waitlist' });
  }
});

export default router;
