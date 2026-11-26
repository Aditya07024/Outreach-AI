import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { SendingEngine } from '../services/sending.engine';
import { AIService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { replacePlaceholders } from '../utils/template';
import { getDuplicateStatus } from './contacts.routes';
import { isEmailExcluded } from '../utils/exclusion';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

const router = Router();

// Get all campaigns with contact metrics (Optimized bulk query with optional search)
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const search = (req.query.search as string || '').trim();

    const whereClause: any = { userId };
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          contacts: {
            some: {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const campaigns = await prisma.campaign.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        resume: true,
        _count: {
          select: { contacts: true },
        },
        ...(search ? {
          contacts: {
            where: {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              company: true,
              status: true,
            },
            take: 10,
          },
        } : {}),
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

    const enrichedCampaigns = campaigns.map((c: any) => {
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
        matchingContacts: c.contacts || [],
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
    const { name, description, resumeId, templateType, templateSubject, templateBody, autoSendExtension, autoRemoveGmailExtension, excludedEmails } = req.body;
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
        autoRemoveGmailExtension: autoRemoveGmailExtension !== undefined ? Boolean(autoRemoveGmailExtension) : true,
        excludedEmails: excludedEmails !== undefined ? String(excludedEmails) : '',
      },
    });

    await logger.info('API', `Created campaign: "${name}" with template type: ${campaign.templateType}, autoSendExtension: ${campaign.autoSendExtension}, autoRemoveGmailExtension: ${campaign.autoRemoveGmailExtension}`);
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create campaign' });
  }
});

// Search contacts by email across all user campaigns
router.get('/search-email', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const query = (req.query.q as string || req.query.email as string || '').trim();
    if (!query) {
      return res.json([]);
    }

    const contacts = await prisma.contact.findMany({
      where: {
        campaign: { userId },
        email: { contains: query, mode: 'insensitive' },
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });

    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to search contacts by email' });
  }
});

// Preview shared campaign contacts using share token / link
router.get('/share-preview/:token', async (req: AuthenticatedRequest, res) => {
  try {
    let token = decodeURIComponent(req.params.token || '').trim();
    if (token.includes('import_share=')) {
      token = token.split('import_share=')[1].split('&')[0];
    } else if (token.includes('share=')) {
      token = token.split('share=')[1].split('&')[0];
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err: any) {
      return res.status(400).json({ error: 'Invalid or expired share link/code.' });
    }

    if (decoded.type !== 'campaign_share' || !decoded.campaignId) {
      return res.status(400).json({ error: 'Invalid share token format.' });
    }

    const sourceCampaign = await prisma.campaign.findUnique({
      where: { id: decoded.campaignId },
      include: {
        contacts: {
          orderBy: { id: 'asc' },
        },
        _count: {
          select: { contacts: true },
        },
      },
    });

    if (!sourceCampaign) {
      return res.status(404).json({ error: 'The shared campaign no longer exists.' });
    }

    res.json({
      success: true,
      campaignId: sourceCampaign.id,
      campaignName: sourceCampaign.name,
      campaignDescription: sourceCampaign.description,
      templateType: sourceCampaign.templateType,
      templateSubject: sourceCampaign.templateSubject,
      templateBody: sourceCampaign.templateBody,
      totalContacts: sourceCampaign._count.contacts,
      contactsPreview: sourceCampaign.contacts.slice(0, 10).map((c) => ({
        id: c.id,
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        company: c.company,
        title: c.title || c.role,
        country: c.country,
        isTechnical: c.isTechnical,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to preview shared campaign' });
  }
});

// Import shared campaign contacts into user account (new campaign or existing)
router.post('/import-shared', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { shareToken, targetCampaignId, createNewCampaign, newCampaignName } = req.body;

    if (!shareToken) {
      return res.status(400).json({ error: 'Share code or link is required.' });
    }

    let token = String(shareToken).trim();
    if (token.includes('import_share=')) {
      token = token.split('import_share=')[1].split('&')[0];
    } else if (token.includes('share=')) {
      token = token.split('share=')[1].split('&')[0];
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err: any) {
      return res.status(400).json({ error: 'Invalid or expired share link/code.' });
    }

    if (decoded.type !== 'campaign_share' || !decoded.campaignId) {
      return res.status(400).json({ error: 'Invalid share token format.' });
    }

    const sourceCampaign = await prisma.campaign.findUnique({
      where: { id: decoded.campaignId },
      include: {
        contacts: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!sourceCampaign) {
      return res.status(404).json({ error: 'The shared campaign no longer exists.' });
    }

    let finalCampaignId: number;
    let finalCampaignName: string;

    if (createNewCampaign || !targetCampaignId) {
      finalCampaignName = newCampaignName?.trim() || `${sourceCampaign.name} (Shared)`;
      const newCamp = await prisma.campaign.create({
        data: {
          name: finalCampaignName,
          description: sourceCampaign.description,
          userId,
          templateType: sourceCampaign.templateType || 'AI_GENERATED',
          templateSubject: sourceCampaign.templateSubject || null,
          templateBody: sourceCampaign.templateBody || null,
        },
      });
      finalCampaignId = newCamp.id;
    } else {
      finalCampaignId = Number(targetCampaignId);
      const existing = await prisma.campaign.findFirst({
        where: { id: finalCampaignId, userId },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Target campaign not found or unauthorized.' });
      }
      finalCampaignName = existing.name;
    }

    let importedCount = 0;
    let duplicateCount = 0;

    for (const c of sourceCampaign.contacts) {
      const dupStatus = await getDuplicateStatus(c.email, c.company, finalCampaignId);
      if (dupStatus === 'DUPLICATE_EMAIL') {
        duplicateCount++;
        continue;
      }

      try {
        await prisma.contact.create({
          data: {
            campaignId: finalCampaignId,
            email: c.email,
            firstName: c.firstName,
            lastName: c.lastName,
            company: c.company,
            title: c.title,
            role: c.role || c.title,
            phone: c.phone,
            linkedin: c.linkedin,
            country: c.country,
            isTechnical: c.isTechnical,
            duplicateStatus: dupStatus === 'NONE' ? null : dupStatus,
            status: 'PENDING',
          },
        });
        importedCount++;
      } catch (err) {
        duplicateCount++;
      }
    }

    await logger.info(
      'API',
      `Imported shared contacts: ${importedCount} added, ${duplicateCount} duplicates into campaign "${finalCampaignName}" (ID: ${finalCampaignId})`
    );

    res.json({
      success: true,
      campaignId: finalCampaignId,
      campaignName: finalCampaignName,
      importedCount,
      duplicateCount,
      totalSourceContacts: sourceCampaign.contacts.length,
      message: `Successfully imported ${importedCount} contact(s) into "${finalCampaignName}".`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to import shared contacts' });
  }
});

// Get campaign detail with contacts (with optional contact search filter)
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const search = (req.query.search as string || '').trim();

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        resume: true,
        contacts: {
          where: search ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
            ],
          } : undefined,
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

// Export contacts of a campaign as CSV file or JSON
router.get('/:id/export', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const format = (req.query.format as string || 'csv').toLowerCase();

    const campaign = await prisma.campaign.findFirst({
      where: req.user!.role === 'super_admin' ? { id } : { id, userId },
      include: {
        contacts: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    if (format === 'json') {
      return res.json({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
        },
        contacts: campaign.contacts,
      });
    }

    // Generate CSV (RFC 4180 standard)
    const headers = [
      'First Name',
      'Last Name',
      'Active Email',
      'Company Name',
      'Job Title',
      'Phone Number',
      'LinkedIn URL',
      'Country',
      'Technical Recruiter',
      'Status',
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = [headers.join(',')];

    for (const c of campaign.contacts) {
      const row = [
        escapeCsv(c.firstName || ''),
        escapeCsv(c.lastName || ''),
        escapeCsv(c.email),
        escapeCsv(c.company || ''),
        escapeCsv(c.title || c.role || ''),
        escapeCsv(c.phone || ''),
        escapeCsv(c.linkedin || ''),
        escapeCsv(c.country || ''),
        escapeCsv(c.isTechnical ? 'Yes' : 'No'),
        escapeCsv(c.status),
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\r\n');
    const safeName = campaign.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${safeName}-contacts.csv"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to export contacts' });
  }
});

// Generate share link and token for campaign contacts
router.post('/:id/share', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: req.user!.role === 'super_admin' ? { id } : { id, userId },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    const shareToken = jwt.sign(
      {
        campaignId: campaign.id,
        ownerId: campaign.userId,
        type: 'campaign_share',
        createdAt: Date.now(),
      },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    await logger.info('API', `Generated share link for campaign "${campaign.name}" (${campaign._count.contacts} contacts)`);

    res.json({
      success: true,
      shareToken,
      campaignName: campaign.name,
      contactsCount: campaign._count.contacts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate share link' });
  }
});

// Update campaign
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const { name, description, resumeId, status, templateType, templateSubject, templateBody, autoSendExtension, autoRemoveGmailExtension, excludedEmails } = req.body;

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
        autoRemoveGmailExtension: autoRemoveGmailExtension !== undefined ? Boolean(autoRemoveGmailExtension) : undefined,
        excludedEmails: excludedEmails !== undefined ? String(excludedEmails) : undefined,
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

// Skip queue delay for next email (one-time skip)
router.post('/:id/skip-queue', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    // Check if there are any ready contacts
    const readyCount = await prisma.contact.count({
      where: {
        campaignId: id,
        status: { in: ['READY_TO_SEND', 'FAILED'] },
        emailSubject: { not: null },
        emailBody: { not: null },
      }
    });

    if (readyCount === 0) {
      return res.status(400).json({ error: 'No ready emails in queue to send. Generate emails first.' });
    }

    const result = await SendingEngine.skipNextQueue(id, userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to skip queue for next email' });
  }
});

// Skip all contacts in this campaign that match the excluded domain/email list
router.post('/:id/skip-excluded', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    const userSettings = await prisma.settings.findUnique({ where: { id: userId } });
    const campaignExclusions = campaign.excludedEmails || '';
    const settingsExclusions = userSettings?.excludedEmails || '';

    // Find all contacts in campaign that are not already SENT or UNSUBSCRIBED
    const contacts = await prisma.contact.findMany({
      where: {
        campaignId: id,
        status: { in: ['PENDING', 'GENERATING', 'READY_TO_SEND', 'FAILED'] }
      }
    });

    const matchingIds: number[] = [];
    const matchingEmails: string[] = [];

    for (const c of contacts) {
      if (isEmailExcluded(c.email, campaignExclusions) || isEmailExcluded(c.email, settingsExclusions)) {
        matchingIds.push(c.id);
        matchingEmails.push(c.email);
      }
    }

    if (matchingIds.length > 0) {
      await prisma.contact.updateMany({
        where: { id: { in: matchingIds } },
        data: { status: 'SKIPPED' }
      });

      await logger.info(
        'API',
        `Marked ${matchingIds.length} contact(s) as SKIPPED matching exclusion rules for campaign "${campaign.name}"`,
        { count: matchingIds.length, emails: matchingEmails },
        userId
      );
    }

    res.json({
      success: true,
      skippedCount: matchingIds.length,
      affectedEmails: matchingEmails,
      message: matchingIds.length > 0 
        ? `Marked ${matchingIds.length} contact(s) matching exclusion rules as SKIPPED.`
        : 'No un-sent contacts matched the exclusion rules.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to scan and skip excluded contacts' });
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

// Delete all @gmail.com contacts in a campaign (including READY_TO_SEND, PENDING, GENERATING, FAILED, SKIPPED)
router.delete('/:id/gmail-contacts', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const includeSent = req.query.includeSent === 'true';
    const { contactIds } = req.body || {};

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    }

    const statusFilter = includeSent ? {} : { status: { not: 'SENT' } };
    const idFilter = Array.isArray(contactIds) && contactIds.length > 0
      ? { id: { in: contactIds.map((cid: any) => Number(cid)) } }
      : {};

    const deleteResult = await prisma.contact.deleteMany({
      where: {
        campaignId: id,
        ...statusFilter,
        ...idFilter,
        OR: [
          { email: { endsWith: '@gmail.com', mode: 'insensitive' } },
          { email: { endsWith: '@googlemail.com', mode: 'insensitive' } },
        ],
      },
    });

    await logger.info(
      'API',
      `Deleted ${deleteResult.count} @gmail.com contact(s) from campaign "${campaign.name}" (ID: ${id})`
    );

    res.json({
      success: true,
      count: deleteResult.count,
      message: `Deleted ${deleteResult.count} @gmail.com contact(s) from campaign.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete @gmail.com contacts' });
  }
});

export default router;
