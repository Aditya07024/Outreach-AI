import prisma from '../utils/prisma';
import { GmailService } from './gmail.service';
import { logger } from '../utils/logger';
import fs from 'fs';

export class SendingEngine {
  private static isRunning = false;
  private static timerId: NodeJS.Timeout | null = null;
  private static activeTimeout: NodeJS.Timeout | null = null;

  /**
   * Start the background scheduler loop.
   */
  static startScheduler(): void {
    if (this.timerId) return;

    // Check for campaigns in SENDING status every 10 seconds
    this.timerId = setInterval(() => {
      this.processQueue().catch((err) => {
        console.error('Error in SendingEngine processQueue:', err);
      });
    }, 10000);

    console.log('[SendingEngine] Background scheduler started.');
  }

  /**
   * Stop the background scheduler loop.
   */
  static stopScheduler(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
    console.log('[SendingEngine] Background scheduler stopped.');
  }

  /**
   * Main processing tick. Finds one active campaign and sends the next email.
   */
  private static async processQueue(): Promise<void> {
    if (this.isRunning) return; // Prevent concurrent overlap
    this.isRunning = true;

    try {
      // Find the first campaign currently in SENDING state
      const campaign = await prisma.campaign.findFirst({
        where: { status: 'SENDING' },
        include: {
          resume: true,
        },
      });

      if (!campaign) {
        this.isRunning = false;
        return;
      }

      // Find the next contact that is eligible for sending in this campaign
      const contact = await prisma.contact.findFirst({
        where: {
          campaignId: campaign.id,
          status: { in: ['READY_TO_SEND', 'FAILED'] },
          emailSubject: { not: null },
          emailBody: { not: null },
        },
        orderBy: { id: 'asc' },
      });

      // If no contacts are left to send, complete the campaign
      if (!contact) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'COMPLETED' },
        });
        await logger.info('EMAIL_SENDING', `Campaign "${campaign.name}" completed. No more pending contacts.`);
        this.isRunning = false;
        return;
      }

      // Check if emails are generated; if not, throw an error
      if (!contact.emailSubject || !contact.emailBody) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { status: 'FAILED' },
        });
        await logger.error(
          'EMAIL_SENDING',
          `Cannot send to ${contact.email}. Subject or Body is empty. Run email generation first.`,
          { contactId: contact.id }
        );
        this.isRunning = false;
        return;
      }

      // 3. Send the email
      await logger.info('EMAIL_SENDING', `Sending email to ${contact.firstName || ''} (${contact.email}) for campaign "${campaign.name}"`);
      
      let messageId: string | null = null;
      let sendError: string | null = null;

      let attachmentBase64 = campaign.resume?.fileContent || undefined;
      if (!attachmentBase64 && campaign.resume?.filePath && fs.existsSync(campaign.resume.filePath)) {
        try {
          attachmentBase64 = fs.readFileSync(campaign.resume.filePath).toString('base64');
        } catch (err) {
          console.error('Failed to read fallback local resume path:', err);
        }
      }

      try {
        messageId = await GmailService.sendEmail(
          campaign.userId || 1, // Scope email send to campaign owner
          contact.email,
          contact.emailSubject,
          contact.emailBody,
          attachmentBase64,
          campaign.resume?.name ? `${campaign.resume.name}.pdf` : undefined
        );
      } catch (err: any) {
        sendError = err.message || String(err);
      }

      const timestamp = new Date();

      if (messageId) {
        // Success
        await prisma.$transaction([
          prisma.contact.update({
            where: { id: contact.id },
            data: { status: 'SENT' },
          }),
          prisma.emailHistory.create({
            data: {
              contactId: contact.id,
              campaignId: campaign.id,
              subject: contact.emailSubject,
              body: contact.emailBody,
              status: 'SENT',
              gmailMessageId: messageId,
              sentAt: timestamp,
            },
          }),
        ]);

        await logger.info(
          'EMAIL_SENDING',
          `Email sent successfully to ${contact.email}. Message ID: ${messageId}`
        );
      } else {
        // Failure
        await prisma.$transaction([
          prisma.contact.update({
            where: { id: contact.id },
            data: { status: 'FAILED' },
          }),
          prisma.emailHistory.create({
            data: {
              contactId: contact.id,
              campaignId: campaign.id,
              subject: contact.emailSubject,
              body: contact.emailBody,
              status: 'FAILED',
              errorMsg: sendError,
              sentAt: timestamp,
            },
          }),
        ]);

        await logger.error(
          'EMAIL_SENDING',
          `Email failed for ${contact.email}. Error: ${sendError}`
        );

        // If it's a Gmail authentication/session failure, auto-pause the campaign to avoid repeat errors
        if (sendError && (sendError.includes('auth') || sendError.includes('expired') || sendError.includes('login') || sendError.includes('connect'))) {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'PAUSED' },
          });
          await logger.warn(
            'EMAIL_SENDING',
            `Campaign "${campaign.name}" auto-paused due to Google authentication error.`
          );
        }
      }

      // 4. Calculate and apply random delay
      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      const delayMin = settings?.delayMin ?? 30;
      const delayMax = settings?.delayMax ?? 90;
      const randomDelaySeconds = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

      await logger.info(
        'EMAIL_SENDING',
        `Queue waiting for ${randomDelaySeconds} seconds before next send...`
      );

      // Wait for the random delay in a non-blocking timeout
      await new Promise<void>((resolve) => {
        this.activeTimeout = setTimeout(() => {
          resolve();
        }, randomDelaySeconds * 1000);
      });

    } catch (error: any) {
      console.error('Critical error in sending loop:', error);
      await logger.error('EMAIL_SENDING', 'Critical error in sending queue loop', error);
    } finally {
      this.isRunning = false;
      this.activeTimeout = null;
    }
  }

  /**
   * Set campaign status to SENDING (resumes sending)
   */
  static async startCampaign(campaignId: number): Promise<void> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    const status = await GmailService.getConnectionStatus(campaign.userId || 1);
    if (!status.connected) {
      throw new Error('Please connect your Gmail account before starting the campaign.');
    }

    // Check if there are any ready emails to send
    const readyCount = await prisma.contact.count({
      where: {
        campaignId,
        status: 'READY_TO_SEND',
        emailSubject: { not: null },
        emailBody: { not: null },
      },
    });

    if (readyCount === 0) {
      throw new Error('No ready emails to send. Please generate emails first by clicking the "Generate Emails" button.');
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });
    
    await logger.info('EMAIL_SENDING', `Campaign "${campaign.name}" started/resumed.`);
    
    // Trigger tick immediately without waiting for interval
    this.processQueue().catch((err) => {
      console.error('Error in direct processQueue call:', err);
    });
  }

  /**
   * Set campaign status to PAUSED
   */
  static async pauseCampaign(campaignId: number): Promise<void> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    await logger.info('EMAIL_SENDING', `Campaign "${campaign.name}" paused.`);
  }

  /**
   * Set campaign status to CANCELLED (resets pending to ready)
   */
  static async cancelCampaign(campaignId: number): Promise<void> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'DRAFT' }, // Roll back to DRAFT or similar
    });

    await logger.info('EMAIL_SENDING', `Campaign "${campaign.name}" cancelled/reset to draft.`);
  }

  /**
   * Reset failed items in a campaign back to READY_TO_SEND so they will retry
   */
  static async retryFailures(campaignId: number): Promise<void> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    const result = await prisma.contact.updateMany({
      where: {
        campaignId,
        status: 'FAILED',
      },
      data: {
        status: 'READY_TO_SEND',
      },
    });

    await logger.info(
      'EMAIL_SENDING',
      `Reset ${result.count} failed contacts in "${campaign.name}" to retry sending.`
    );
  }
}
