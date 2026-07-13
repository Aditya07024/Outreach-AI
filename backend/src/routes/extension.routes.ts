/**
 * Extension Sync API Routes
 * 
 * Handles communication between the Chrome Extension and the backend.
 * Provides endpoints for:
 * - Receiving extracted emails from websites
 * - Listing available campaigns for the extension dropdown
 * - Creating new campaigns from the extension
 */

import { Router } from 'express';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/extension/sync
 * Receives extracted contacts from the Chrome Extension and inserts them into a campaign.
 * 
 * Body:
 * - campaignId: number (target campaign)
 * - contacts: Array<{ email, company?, role?, classification?, sourceUrl?, firstName?, lastName? }>
 * - companyName?: string (auto-detected company name)
 * - companyDomain?: string (auto-detected domain)
 * - sourceUrl: string (the URL the extension was on)
 */
router.post('/sync', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { campaignId, contacts, companyName, companyDomain, sourceUrl } = req.body;

  if (!campaignId || !contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'Campaign ID and at least one contact are required.' });
  }

  try {
    // Verify campaign ownership
    const campaign = await prisma.campaign.findFirst({
      where: { id: Number(campaignId), userId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or unauthorized.' });
    }

    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const contact of contacts) {
      const email = (contact.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        errorCount++;
        continue;
      }

      // Check for duplicates within the same campaign
      const existingContact = await prisma.contact.findFirst({
        where: { campaignId: Number(campaignId), email }
      });

      if (existingContact) {
        duplicateCount++;
        continue;
      }

      // Check for duplicates across other campaigns
      const otherCampaignContact = await prisma.contact.findFirst({
        where: {
          email,
          campaignId: { not: Number(campaignId) }
        }
      });

      const duplicateStatus = otherCampaignContact ? 'PREVIOUS_CAMPAIGN' : null;

      try {
        await prisma.contact.create({
          data: {
            campaignId: Number(campaignId),
            email,
            firstName: contact.firstName || null,
            lastName: contact.lastName || null,
            company: contact.company || companyName || null,
            role: contact.classification || contact.role || null,
            title: contact.classification || null,
            linkedin: null,
            country: null,
            isTechnical: false,
            duplicateStatus,
          }
        });
        importedCount++;
      } catch (createErr: any) {
        // Handle unique constraint violation gracefully
        if (createErr.code === 'P2002') {
          duplicateCount++;
        } else {
          console.error('Failed to insert extension contact:', email, createErr);
          errorCount++;
        }
      }
    }

    await logger.info(
      'EXTENSION_SYNC',
      `Extension sync from ${sourceUrl || 'unknown'}: ${importedCount} contacts added, ${duplicateCount} duplicates, ${errorCount} errors. Company: ${companyName || 'unknown'}`
    );

    res.json({
      success: true,
      imported: importedCount,
      duplicates: duplicateCount,
      errors: errorCount,
      campaignId: Number(campaignId),
    });
  } catch (error: any) {
    await logger.error('EXTENSION_SYNC', 'Extension sync failed', error);
    res.status(500).json({ error: error.message || 'Failed to sync contacts from extension.' });
  }
});

/**
 * GET /api/extension/campaigns
 * Returns a lightweight list of the user's campaigns for the extension dropdown.
 */
router.get('/campaigns', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { contacts: true } }
      }
    });

    res.json(campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      contactCount: c._count.contacts,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch campaigns.' });
  }
});

/**
 * POST /api/extension/campaigns
 * Quick-create a campaign from the extension.
 * Body: { name: string, description?: string }
 */
router.post('/campaigns', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required.' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description: description || `Created from Chrome Extension`,
        userId,
        templateType: 'AI_GENERATED',
      }
    });

    await logger.info('EXTENSION_SYNC', `Campaign "${name}" created from Chrome Extension`);

    res.status(201).json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      contactCount: 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create campaign.' });
  }
});

/**
 * GET /api/extension/status
 * Simple health check for the extension to verify API connectivity and auth.
 */
router.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, paid: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      connected: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        paid: user.paid,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check status.' });
  }
});

export default router;
