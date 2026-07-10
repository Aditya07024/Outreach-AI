import { Router } from 'express';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();

// Get settings
router.get('/', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 },
    });

    // Auto-create settings if not found
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1 },
      });
    }

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve settings' });
  }
});

// Update settings
router.post('/', async (req, res) => {
  try {
    const data = req.body;

    const updated = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        name: data.name ?? '',
        phone: data.phone ?? '',
        portfolio: data.portfolio ?? '',
        github: data.github ?? '',
        linkedin: data.linkedin ?? '',
        preferredRole: data.preferredRole ?? '',
        desiredSalary: data.desiredSalary ?? '',
        location: data.location ?? '',
        defaultResumeId: data.defaultResumeId ? Number(data.defaultResumeId) : null,
        customPrompt: data.customPrompt ?? '',
        delayMin: data.delayMin ? Number(data.delayMin) : 30,
        delayMax: data.delayMax ? Number(data.delayMax) : 90,
        technicalFilter: data.technicalFilter ?? true,
      },
      create: {
        id: 1,
        name: data.name ?? '',
        phone: data.phone ?? '',
        portfolio: data.portfolio ?? '',
        github: data.github ?? '',
        linkedin: data.linkedin ?? '',
        preferredRole: data.preferredRole ?? '',
        desiredSalary: data.desiredSalary ?? '',
        location: data.location ?? '',
        defaultResumeId: data.defaultResumeId ? Number(data.defaultResumeId) : null,
        customPrompt: data.customPrompt ?? '',
        delayMin: data.delayMin ? Number(data.delayMin) : 30,
        delayMax: data.delayMax ? Number(data.delayMax) : 90,
        technicalFilter: data.technicalFilter ?? true,
      },
    });

    await logger.info('API', 'Updated system settings successfully');
    res.json(updated);
  } catch (error: any) {
    await logger.error('API', 'Failed to update settings', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

export default router;
