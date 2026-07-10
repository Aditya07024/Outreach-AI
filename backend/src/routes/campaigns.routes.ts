import { Router } from 'express';
import prisma from '../utils/prisma';
import { SendingEngine } from '../services/sending.engine';
import { AIService } from '../services/ai.service';
import { logger } from '../utils/logger';

const router = Router();

// Helper: Replace placeholders in template text
function replacePlaceholders(text: string | null, contact: any, settings: any): string {
  if (!text) return '';
  let result = text;
  
  // Recruiter fields
  result = result.replace(/{firstName}/g, contact.firstName || 'Recruiter');
  result = result.replace(/{lastName}/g, contact.lastName || '');
  result = result.replace(/{company}/g, contact.company || 'your company');
  result = result.replace(/{role}/g, contact.role || contact.title || 'Software Engineer');
  result = result.replace(/{title}/g, contact.title || contact.role || 'Hiring Manager');
  result = result.replace(/{email}/g, contact.email || '');
  
  // Settings/Candidate fields
  result = result.replace(/{name}/g, settings.name || '');
  result = result.replace(/{phone}/g, settings.phone || '');
  result = result.replace(/{portfolio}/g, settings.portfolio || '');
  result = result.replace(/{github}/g, settings.github || '');
  result = result.replace(/{linkedin}/g, settings.linkedin || '');
  result = result.replace(/{preferredRole}/g, settings.preferredRole || '');
  result = result.replace(/{location}/g, settings.location || '');
  
  return result;
}

// Get all campaigns with contact metrics
router.get('/', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        resume: true,
        _count: {
          select: { contacts: true },
        },
      },
    });

    // Compute status metrics for each campaign
    const enrichedCampaigns = await Promise.all(
      campaigns.map(async (c) => {
        const counts = await prisma.contact.groupBy({
          by: ['status'],
          where: { campaignId: c.id },
          _count: { _all: true },
        });

        const metrics = {
          total: c._count.contacts,
          pending: 0,
          generating: 0,
          ready: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
        };

        counts.forEach((group) => {
          const count = group._count._all;
          switch (group.status) {
            case 'PENDING':
              metrics.pending += count;
              break;
            case 'GENERATING':
              metrics.generating += count;
              break;
            case 'READY_TO_SEND':
              metrics.ready += count;
              break;
            case 'SENT':
              metrics.sent += count;
              break;
            case 'FAILED':
              metrics.failed += count;
              break;
            case 'SKIPPED':
              metrics.skipped += count;
              break;
          }
        });

        return {
          ...c,
          metrics,
        };
      })
    );

    res.json(enrichedCampaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch campaigns' });
  }
});

// Create campaign
router.post('/', async (req, res) => {
  try {
    const { name, description, resumeId, templateType, templateSubject, templateBody } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required.' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        resumeId: resumeId ? Number(resumeId) : null,
        templateType: templateType || 'AI_GENERATED',
        templateSubject: templateSubject || null,
        templateBody: templateBody || null,
      },
    });

    await logger.info('API', `Created campaign: "${name}" with template type: ${campaign.templateType}`);
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create campaign' });
  }
});

// Get campaign detail with contacts
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const campaign = await prisma.campaign.findUnique({
      where: { id },
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
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, resumeId, status, templateType, templateSubject, templateBody } = req.body;

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
      },
    });

    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await prisma.campaign.delete({ where: { id } });
    await logger.info('API', `Deleted campaign: "${campaign.name}"`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete campaign' });
  }
});

// Start campaign sending
router.post('/:id/start', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await SendingEngine.startCampaign(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start campaign' });
  }
});

// Pause campaign sending
router.post('/:id/pause', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await SendingEngine.pauseCampaign(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to pause campaign' });
  }
});

// Cancel campaign (resets to draft)
router.post('/:id/cancel', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await SendingEngine.cancelCampaign(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel campaign' });
  }
});

// Retry campaign failures
router.post('/:id/retry', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await SendingEngine.retryFailures(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retry campaign failures' });
  }
});

// AI Batch Generation endpoint
router.post('/:id/generate', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
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

    // Process generation asynchronously in the background so request completes quickly
    res.json({ success: true, count: contacts.length, message: `Email generation started for ${contacts.length} contacts.` });

    // Background generation execution
    (async () => {
      await logger.info('EMAIL_GENERATION', `Starting generation for campaign "${campaign.name}" (${contacts.length} contacts) with method: ${campaign.templateType}`);
      
      const settings = await prisma.settings.findUnique({ where: { id: 1 } }) || {
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
        if (!currentCampaign) break;

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
    })().catch((err) => console.error('Error in batch generation routine:', err));

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to trigger email generation' });
  }
});

export default router;
