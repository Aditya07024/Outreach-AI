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

export default router;
