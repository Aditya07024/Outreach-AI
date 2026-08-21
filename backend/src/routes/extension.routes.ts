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
import { AIService } from '../services/ai.service';
import { GmailService } from '../services/gmail.service';
import { replacePlaceholders } from '../utils/template';
import fs from 'fs';

const router = Router();

/**
 * POST /api/extension/sync
 * Receives extracted contacts from the Chrome Extension and inserts them into a campaign.
 * If campaign has autoSendExtension enabled, automatically generates email and sends via Gmail!
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
    const insertedContacts: any[] = [];

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
        const created = await prisma.contact.create({
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
        insertedContacts.push(created);
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

    // Auto-generate & auto-send routine if autoSendExtension is enabled on this campaign
    if (campaign.autoSendExtension && insertedContacts.length > 0) {
      (async () => {
        try {
          await logger.info('EMAIL_SENDING', `[AutoSend Extension] Triggering auto email generation and sending for ${insertedContacts.length} new extension contacts in campaign "${campaign.name}"`, null, userId);

          const fullCampaign = await prisma.campaign.findUnique({
            where: { id: campaign.id },
            include: { resume: true },
          });

          if (!fullCampaign) return;

          const settings = (await prisma.settings.findUnique({ where: { id: userId } })) || {
            name: 'Candidate',
            github: '',
            portfolio: '',
            phone: '',
            linkedin: '',
            preferredRole: 'Software Engineer',
            location: '',
          };

          const gmailStatus = await GmailService.getConnectionStatus(userId).catch(() => ({ connected: false }));

          let attachmentBase64: string | undefined = fullCampaign.resume?.fileContent || undefined;
          if (!attachmentBase64 && fullCampaign.resume?.filePath && fs.existsSync(fullCampaign.resume.filePath)) {
            try {
              attachmentBase64 = fs.readFileSync(fullCampaign.resume.filePath).toString('base64');
            } catch (e) {
              console.error('Failed reading resume file:', e);
            }
          }

          for (const contact of insertedContacts) {
            try {
              let subject = '';
              let body = '';

              if (fullCampaign.templateType === 'SAVED_TEMPLATE') {
                subject = replacePlaceholders(fullCampaign.templateSubject, contact, settings);
                body = replacePlaceholders(fullCampaign.templateBody, contact, settings);
              } else if (fullCampaign.templateType === 'MANUAL') {
                const defaultSubject = 'Opportunities at {company} - {role} Application';
                const defaultBody = 'Hi {firstName},\n\nI am writing to express my interest in software engineering opportunities at {company}, specifically for the {role} role.\n\nBest regards,\n{name}';
                subject = replacePlaceholders(defaultSubject, contact, settings);
                body = replacePlaceholders(defaultBody, contact, settings);
              } else {
                // Default: AI_GENERATED
                const generated = await AIService.generateEmail(contact.id);
                subject = generated.subject;
                body = generated.body;
              }

              // Save generated email
              await prisma.contact.update({
                where: { id: contact.id },
                data: {
                  emailSubject: subject,
                  emailBody: body,
                  status: 'READY_TO_SEND',
                },
              });

              // Send email if Gmail is connected
              if (gmailStatus.connected) {
                try {
                  const messageId = await GmailService.sendEmail(
                    userId,
                    contact.email,
                    subject,
                    body,
                    attachmentBase64,
                    fullCampaign.resume?.name ? `${fullCampaign.resume.name}.pdf` : undefined
                  );

                  const timestamp = new Date();
                  await prisma.$transaction([
                    prisma.contact.update({
                      where: { id: contact.id },
                      data: { status: 'SENT' },
                    }),
                    prisma.emailHistory.create({
                      data: {
                        contactId: contact.id,
                        campaignId: campaign.id,
                        subject,
                        body,
                        status: 'SENT',
                        gmailMessageId: messageId,
                        sentAt: timestamp,
                      },
                    }),
                  ]);

                  await logger.info(
                    'EMAIL_SENDING',
                    `[AutoSend Extension] Email auto-sent successfully to ${contact.email} for campaign "${campaign.name}"`,
                    null,
                    userId
                  );
                } catch (sendErr: any) {
                  const timestamp = new Date();
                  await prisma.$transaction([
                    prisma.contact.update({
                      where: { id: contact.id },
                      data: { status: 'FAILED' },
                    }),
                    prisma.emailHistory.create({
                      data: {
                        contactId: contact.id,
                        campaignId: campaign.id,
                        subject,
                        body,
                        status: 'FAILED',
                        errorMsg: sendErr.message || String(sendErr),
                        sentAt: timestamp,
                      },
                    }),
                  ]);

                  await logger.error(
                    'EMAIL_SENDING',
                    `[AutoSend Extension] Failed to auto-send email to ${contact.email}: ${sendErr.message || sendErr}`,
                    null,
                    userId
                  );
                }
              } else {
                await logger.warn(
                  'EMAIL_SENDING',
                  `[AutoSend Extension] Email auto-generated for ${contact.email} but Gmail is not connected. Saved in READY_TO_SEND queue.`,
                  null,
                  userId
                );
              }
            } catch (genErr: any) {
              await prisma.contact.update({
                where: { id: contact.id },
                data: { status: 'FAILED' },
              });
              await logger.error(
                'EMAIL_GENERATION',
                `[AutoSend Extension] Failed to auto-generate email for ${contact.email}: ${genErr.message || genErr}`,
                null,
                userId
              );
            }
          }
        } catch (autoErr: any) {
          console.error('Error in extension auto-send routine:', autoErr);
        }
      })().catch((err) => console.error('Unhandled error in auto-send extension routine:', err));
    }

    res.json({
      success: true,
      imported: importedCount,
      duplicates: duplicateCount,
      errors: errorCount,
      campaignId: Number(campaignId),
      autoSendActive: Boolean(campaign.autoSendExtension),
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
        autoSendExtension: true,
        _count: { select: { contacts: true } }
      }
    });

    res.json(campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      autoSendExtension: c.autoSendExtension,
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
        autoSendExtension: false,
      }
    });

    await logger.info('EXTENSION_SYNC', `Campaign "${name}" created from Chrome Extension`);

    res.status(201).json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      autoSendExtension: campaign.autoSendExtension,
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
