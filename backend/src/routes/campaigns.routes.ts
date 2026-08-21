import { Router } from 'express';
import prisma from '../utils/prisma';
import { SendingEngine } from '../services/sending.engine';
import { AIService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { replacePlaceholders } from '../utils/template';

const router = Router();

// Get all campaigns with contact metrics (Optimized bulk query)
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        resume: true,
        _count: {
          select: { contacts: true },
        },
      },
    });

    const campaignIds = campaigns.map((c) => c.id);

    const counts = campaignIds.length > 0
      ? await prisma.contact.groupBy({
          by: ['campaignId', 'status'],
          where: { campaignId: { in: campaignIds } },
          _count: { _all: true },
        })
      : [];

    const metricsMap = new Map<number, { total: number; pending: number; generating: number; ready: number; sent: number; failed: number; skipped: number }>();

    counts.forEach((group) => {
      if (!metricsMap.has(group.campaignId)) {
        metricsMap.set(group.campaignId, {
          total: 0,
          pending: 0,
          generating: 0,
          ready: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
        });
      }
      const m = metricsMap.get(group.campaignId)!;
      const count = group._count._all;
      switch (group.status) {
        case 'PENDING': m.pending += count; break;
        case 'GENERATING': m.generating += count; break;
        case 'READY_TO_SEND': m.ready += count; break;
        case 'SENT': m.sent += count; break;
        case 'FAILED': m.failed += count; break;
        case 'SKIPPED': m.skipped += count; break;
      }
    });

    const enrichedCampaigns = campaigns.map((c) => {
      const m = metricsMap.get(c.id) || {
        total: c._count.contacts,
        pending: 0,
        generating: 0,
        ready: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      };
      m.total = c._count.contacts;
      return {
        ...c,
        metrics: m,
      };
    });

    res.json(enrichedCampaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch campaigns' });
  }
});

// Get aggregated dashboard stats in a single ultra-fast call
router.get('/dashboard-stats', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [campaigns, todaySentCount, recentLogs] = await Promise.all([
      prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          resume: true,
          _count: {
            select: { contacts: true },
          },
        },
      }),
      prisma.emailHistory.count({
        where: {
          campaign: { userId },
          status: 'SENT',
          sentAt: { gte: startOfToday },
        },
      }),
      prisma.log.findMany({
        where: req.user!.role === 'super_admin' || req.user!.role === 'admin'
          ? {}
          : { userId },
        take: 8,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    const campaignIds = campaigns.map((c) => c.id);

    const counts = campaignIds.length > 0
      ? await prisma.contact.groupBy({
          by: ['campaignId', 'status'],
          where: { campaignId: { in: campaignIds } },
          _count: { _all: true },
        })
      : [];

    const metricsMap = new Map<number, { total: number; pending: number; generating: number; ready: number; sent: number; failed: number; skipped: number }>();

    counts.forEach((group) => {
      if (!metricsMap.has(group.campaignId)) {
        metricsMap.set(group.campaignId, {
          total: 0,
          pending: 0,
          generating: 0,
          ready: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
        });
      }
      const m = metricsMap.get(group.campaignId)!;
      const count = group._count._all;
      switch (group.status) {
        case 'PENDING': m.pending += count; break;
        case 'GENERATING': m.generating += count; break;
        case 'READY_TO_SEND': m.ready += count; break;
        case 'SENT': m.sent += count; break;
        case 'FAILED': m.failed += count; break;
        case 'SKIPPED': m.skipped += count; break;
      }
    });

    const enrichedCampaigns = campaigns.map((c) => {
      const m = metricsMap.get(c.id) || {
        total: c._count.contacts,
        pending: 0,
        generating: 0,
        ready: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      };
      m.total = c._count.contacts;
      return {
        ...c,
        metrics: m,
      };
    });

    res.json({
      campaigns: enrichedCampaigns,
      todaySentCount,
      logs: recentLogs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard stats' });
  }
});

// Create campaign
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, description, resumeId, templateType, templateSubject, templateBody, autoSendExtension } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required.' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        resumeId: resumeId ? Number(resumeId) : null,
        userId,
        templateType: templateType || 'AI_GENERATED',
        templateSubject: templateSubject || null,
        templateBody: templateBody || null,
        autoSendExtension: Boolean(autoSendExtension),
      },
    });

    await logger.info('API', `Created campaign: "${name}" with template type: ${campaign.templateType}, autoSendExtension: ${campaign.autoSendExtension}`);
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create campaign' });
  }
});

// Get campaign detail with contacts
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        resume: true,
        contacts: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch campaign' });
  }
});

// Update campaign
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const { name, description, resumeId, status, templateType, templateSubject, templateBody, autoSendExtension } = req.body;

    const existing = await prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name,
        description,
        resumeId: resumeId !== undefined ? (resumeId ? Number(resumeId) : null) : undefined,
        status,
        templateType,
        templateSubject,
        templateBody,
        autoSendExtension: autoSendExtension !== undefined ? Boolean(autoSendExtension) : undefined,
      },
    });

    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const existing = await prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    await prisma.campaign.delete({ where: { id } });
    await logger.info('API', `Deleted campaign: "${existing.name}"`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete campaign' });
  }
});

// Start campaign sending
router.post('/:id/start', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    await SendingEngine.startCampaign(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start campaign' });
  }
});

// Pause campaign sending
router.post('/:id/pause', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    await SendingEngine.pauseCampaign(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to pause campaign' });
  }
});

// Cancel campaign (resets to draft)
router.post('/:id/cancel', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    await SendingEngine.cancelCampaign(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel campaign' });
  }
});

// Retry campaign failures
router.post('/:id/retry', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    await SendingEngine.retryFailures(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retry campaign failures' });
  }
});

// AI Batch Generation endpoint
router.post('/:id/generate', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    // Find all contacts that need email generation
    const contacts = await prisma.contact.findMany({
      where: {
        campaignId: id,
        status: { in: ['PENDING', 'FAILED'] },
      },
    });

    if (contacts.length === 0) {
      return res.json({ message: 'No pending contacts require email generation.' });
    }

    // Set campaign status to GENERATING
    await prisma.campaign.update({
      where: { id },
      data: { status: 'GENERATING' }
    });

    // Process generation asynchronously in the background so request completes quickly
    res.json({ success: true, count: contacts.length, message: `Email generation started for ${contacts.length} contacts.` });

    // Background generation execution
    (async () => {
      try {
        await logger.info('EMAIL_GENERATION', `Starting generation for campaign "${campaign.name}" (${contacts.length} contacts) with method: ${campaign.templateType}`);
        
        const campaignOwnerId = campaign.userId || userId;
        const settings = await prisma.settings.findUnique({ where: { id: campaignOwnerId } }) || {
          name: 'Candidate',
          github: '',
          portfolio: '',
          phone: '',
          linkedin: '',
          preferredRole: 'Software Engineer',
          location: ''
        };

        for (const contact of contacts) {
          // Double check campaign is not deleted or changed status
          const currentCampaign = await prisma.campaign.findUnique({
            where: { id },
            select: { status: true, templateType: true, templateSubject: true, templateBody: true },
          });
          if (!currentCampaign || currentCampaign.status !== 'GENERATING') break;

          // Set status to GENERATING
          await prisma.contact.update({
            where: { id: contact.id },
            data: { status: 'GENERATING' },
          });

          try {
            let subject = '';
            let body = '';

            if (currentCampaign.templateType === 'SAVED_TEMPLATE') {
              subject = replacePlaceholders(currentCampaign.templateSubject, contact, settings);
              body = replacePlaceholders(currentCampaign.templateBody, contact, settings);
            } else if (currentCampaign.templateType === 'MANUAL') {
              const defaultSubject = 'Opportunities at {company} - {role} Application';
              const defaultBody = 'Hi {firstName},\n\nI am writing to express my interest in software engineering opportunities at {company}, specifically for the {role} role.\n\n[Custom edits...]\n\nBest regards,\n{name}\n{portfolio}\n{github}';
              subject = replacePlaceholders(defaultSubject, contact, settings);
              body = replacePlaceholders(defaultBody, contact, settings);
            } else {
              // Default: AI_GENERATED (Grok)
              const generated = await AIService.generateEmail(contact.id);
              subject = generated.subject;
              body = generated.body;
            }

            await prisma.contact.update({
              where: { id: contact.id },
              data: {
                emailSubject: subject,
                emailBody: body,
                status: 'READY_TO_SEND',
              },
            });
          } catch (err: any) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: { status: 'FAILED' },
            });
            await logger.error(
              'EMAIL_GENERATION',
              `Generation failed for contact ${contact.email}`,
              { contactId: contact.id, error: err.message || err }
            );
          }
        }
        await logger.info('EMAIL_GENERATION', `Completed email generation for campaign "${campaign.name}"`);
      } catch (err: any) {
        console.error('Error in batch generation routine:', err);
      } finally {
        // Reset campaign status back to DRAFT when done
        const currentCamp = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
        if (currentCamp && currentCamp.status === 'GENERATING') {
          await prisma.campaign.update({
            where: { id },
            data: { status: 'DRAFT' },
          });
        }
      }
    })().catch((err) => console.error('Error in batch generation routine:', err));

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to trigger email generation' });
  }
});

// Clear/reset all generated emails for this campaign
router.post('/:id/clear-emails', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId }
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    if (campaign.status === 'SENDING') {
      return res.status(400).json({ error: 'Cannot clear emails while campaign is sending.' });
    }

    await prisma.contact.updateMany({
      where: {
        campaignId: id,
        status: { not: 'SENT' }
      },
      data: {
        emailSubject: null,
        emailBody: null,
        status: 'PENDING'
      }
    });

    await logger.info('API', `Cleared generated emails for campaign "${campaign.name}"`);
    res.json({ success: true, message: 'All generated email drafts have been cleared.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear emails' });
  }
});

// Delete all failed contacts in a campaign
router.delete('/:id/failed-contacts', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId }
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    const deleteResult = await prisma.contact.deleteMany({
      where: {
        campaignId: id,
        status: { in: ['FAILED', 'SKIPPED'] },
      },
    });

    await logger.info('API', `Deleted ${deleteResult.count} failed/skipped contacts for campaign "${campaign.name}"`);
    res.json({ success: true, count: deleteResult.count, message: `Deleted ${deleteResult.count} failed/skipped contacts.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete failed contacts' });
  }
});

export default router;
