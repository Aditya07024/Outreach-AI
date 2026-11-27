import prisma from '../utils/prisma';
import { GmailService } from './gmail.service';
import { logger } from '../utils/logger';
import { isEmailExcluded } from '../utils/exclusion';
import fs from 'fs';

export function getEffectiveDailyLimit(settings: any): { effectiveLimit: number; warmupWeek: number; isWarmup: boolean } {
  const maxDailyLimit = settings?.maxDailyLimit ?? 50;
  if (!settings?.enableWarmup) {
    return { effectiveLimit: maxDailyLimit, warmupWeek: 0, isWarmup: false };
  }

  const startDate = settings.warmupStartDate ? new Date(settings.warmupStartDate) : new Date();
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const warmupWeek = Math.floor(diffDays / 7) + 1; // Week 1, Week 2, ...

  const startLimit = settings.warmupStartLimit ?? 5;
  const increment = settings.warmupWeeklyIncrement ?? 5;
  const calculatedLimit = startLimit + Math.max(0, warmupWeek - 1) * increment;
  const effectiveLimit = Math.min(maxDailyLimit, calculatedLimit);

  return { effectiveLimit, warmupWeek, isWarmup: true };
}

export async function getSentEmailsInLast24Hours(userId?: number): Promise<number> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.emailHistory.count({
    where: {
      status: 'SENT',
      sentAt: { gte: twentyFourHoursAgo },
      ...(userId ? { campaign: { userId } } : {}),
    },
  });
  return count;
}

interface UserQueueState {
  isRunning: boolean;
  activeTimeout: NodeJS.Timeout | null;
  activeTimeoutResolve: (() => void) | null;
  skipNextQueueDelay: boolean;
}

export class SendingEngine {
  // Map of userId -> UserQueueState for completely isolated, concurrent sending per user
  private static userQueues = new Map<number, UserQueueState>();
  private static timerId: NodeJS.Timeout | null = null;

  private static getUserQueue(userId: number): UserQueueState {
    let state = this.userQueues.get(userId);
    if (!state) {
      state = {
        isRunning: false,
        activeTimeout: null,
        activeTimeoutResolve: null,
        skipNextQueueDelay: false,
      };
      this.userQueues.set(userId, state);
    }
    return state;
  }

  /**
   * Start the background scheduler loop.
   */
  static startScheduler(): void {
    if (this.timerId) return;

    // Check for campaigns in SENDING status every 10 seconds across all users
    this.timerId = setInterval(() => {
      this.processAllQueues().catch((err) => {
        console.error('Error in SendingEngine processAllQueues:', err);
      });
    }, 10000);

    console.log('[SendingEngine] Background scheduler started (Parallel Multi-User mode).');
  }

  /**
   * Stop the background scheduler loop.
   */
  static stopScheduler(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    for (const [userId, state] of this.userQueues.entries()) {
      if (state.activeTimeout) {
        clearTimeout(state.activeTimeout);
        state.activeTimeout = null;
      }
      if (state.activeTimeoutResolve) {
        state.activeTimeoutResolve();
        state.activeTimeoutResolve = null;
      }
      state.skipNextQueueDelay = false;
      state.isRunning = false;
    }
    this.userQueues.clear();
    console.log('[SendingEngine] Background scheduler stopped.');
  }

  /**
   * Automatically checks for users whose free trial has expired and who are not paid,
   * disconnecting their Gmail connection and pausing their active campaigns.
   */
  private static async checkExpiredTrials(): Promise<void> {
    try {
      const expiredUsers = await prisma.user.findMany({
        where: {
          paid: false,
          role: { not: 'admin' },
          trialEndsAt: { lt: new Date() }
        }
      });

      for (const user of expiredUsers) {
        const creds = await prisma.gmailCredentials.findUnique({
          where: { id: user.id }
        });
        if (creds) {
          console.log(`Auto-disconnecting Gmail for user ${user.id} (${user.email}) due to expired trial.`);
          await GmailService.disconnect(user.id);

          await prisma.campaign.updateMany({
            where: { userId: user.id, status: 'SENDING' },
            data: { status: 'PAUSED' }
          });

          await logger.info(
            'EMAIL_SENDING',
            `User ${user.email}'s trial expired. Automatically disconnected Gmail and paused active campaigns.`,
            null,
            user.id
          );
        }
      }
    } catch (err) {
      console.error('Error checking expired trials in SendingEngine:', err);
    }
  }

  /**
   * Main scheduler tick.
   * Finds all distinct users who currently have campaigns in SENDING status,
   * and triggers their independent queues in true parallel.
   */
  static async processAllQueues(): Promise<void> {
    try {
      // 1. Run automatic trial expiration check
      await this.checkExpiredTrials();

      // 2. Find all distinct users with active SENDING campaigns
      const activeUsers = await prisma.campaign.findMany({
        where: { status: 'SENDING' },
        select: { userId: true },
        distinct: ['userId'],
      });

      if (!activeUsers || activeUsers.length === 0) {
        return;
      }

      // 3. Process every user's queue in parallel
      await Promise.allSettled(
        activeUsers.map(async (u) => {
          const uid = u.userId || 1;
          await this.processUserQueue(uid);
        })
      );
    } catch (err) {
      console.error('Error in SendingEngine processAllQueues:', err);
    }
  }

  /**
   * Backward-compatible alias for processAllQueues
   */
  static async processQueue(userId?: number): Promise<void> {
    if (userId) {
      return this.processUserQueue(userId);
    }
    return this.processAllQueues();
  }

  /**
   * Processes the next pending email for a specific user.
   * Runs concurrently and completely isolated from any other user.
   */
  static async processUserQueue(userId: number): Promise<void> {
    const queueState = this.getUserQueue(userId);
    if (queueState.isRunning) return; // Prevent concurrent overlap FOR THIS USER ONLY
    queueState.isRunning = true;
    let campaign: any = null;

    try {
      // Find the active campaign currently in SENDING state for this user
      campaign = await prisma.campaign.findFirst({
        where: {
          userId,
          status: 'SENDING',
        },
        include: {
          resume: true,
        },
        orderBy: { id: 'asc' },
      });

      if (!campaign) {
        queueState.isRunning = false;
        return;
      }

      // Check user safety settings & daily limits
      const settings = (await prisma.settings.findUnique({ where: { id: userId } }))
        || (await prisma.settings.findUnique({ where: { id: 1 } }));

      const { effectiveLimit, warmupWeek, isWarmup } = getEffectiveDailyLimit(settings);
      const sentInLast24h = await getSentEmailsInLast24Hours(userId);

      if (sentInLast24h >= effectiveLimit) {
        await logger.warn(
          'EMAIL_SENDING',
          `Daily email limit reached (${sentInLast24h}/${effectiveLimit} sent in last 24h${isWarmup ? `, Warmup Week ${warmupWeek}` : ''}). Pausing queue for user #${userId} to protect Google Account.`,
          { sentInLast24h, effectiveLimit, isWarmup, warmupWeek },
          userId
        );
        queueState.isRunning = false;
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
        await logger.info(
          'EMAIL_SENDING',
          `Campaign "${campaign.name}" completed. No more pending contacts.`,
          null,
          userId
        );
        queueState.isRunning = false;
        // Check if user has another campaign waiting in SENDING
        this.triggerNextTickForUser(userId);
        return;
      }

      // Check if contact matches excluded domains or emails (e.g. specific email addresses or domain suffixes)
      const campaignExclusions = (campaign as any).excludedEmails || '';
      const settingsExclusions = (settings as any)?.excludedEmails || '';
      if (isEmailExcluded(contact.email, campaignExclusions) || isEmailExcluded(contact.email, settingsExclusions)) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { status: 'SKIPPED' },
        });
        await logger.warn(
          'EMAIL_SENDING',
          `Skipped sending to ${contact.email} (Contact #${contact.id}) for campaign "${campaign.name}" because it matches the excluded domain / email list.`,
          { contactId: contact.id, email: contact.email },
          userId
        );
        // Continue sending queue immediately to next contact for this user
        queueState.isRunning = false;
        setTimeout(() => this.processUserQueue(userId), 500);
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
          { contactId: contact.id },
          userId
        );
        queueState.isRunning = false;
        return;
      }

      // Send the email scoped strictly to THIS user's Gmail connection
      await logger.info(
        'EMAIL_SENDING',
        `Sending email to ${contact.firstName || ''} (${contact.email}) for campaign "${campaign.name}"`,
        null,
        userId
      );
      
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
          userId, // Scope email send to campaign owner
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
          `Email sent successfully to ${contact.email}. Message ID: ${messageId}`,
          null,
          userId
        );
      } else {
        // Failure
        const previousFailures = await prisma.emailHistory.count({
          where: {
            contactId: contact.id,
            status: 'FAILED',
          },
        });

        const newFailureCount = previousFailures + 1;
        const newStatus = newFailureCount >= 2 ? 'SKIPPED' : 'FAILED';

        await prisma.$transaction([
          prisma.contact.update({
            where: { id: contact.id },
            data: { status: newStatus },
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

        if (newStatus === 'SKIPPED') {
          await logger.warn(
            'EMAIL_SENDING',
            `Email failed ${newFailureCount} times for ${contact.email}. Setting status to SKIPPED to proceed with remaining queue. Error: ${sendError}`,
            null,
            userId
          );
        } else {
          await logger.error(
            'EMAIL_SENDING',
            `Email failed for ${contact.email} (Attempt ${newFailureCount}/2). Error: ${sendError}`,
            null,
            userId
          );
        }

        // If it's a Gmail authentication/session failure, auto-pause the campaign for this user
        if (sendError && (sendError.includes('auth') || sendError.includes('expired') || sendError.includes('login') || sendError.includes('connect'))) {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'PAUSED' },
          });
          await logger.warn(
            'EMAIL_SENDING',
            `Campaign "${campaign.name}" auto-paused due to Google authentication error.`,
            null,
            userId
          );
          queueState.isRunning = false;
          return;
        }
      }

      // Calculate and apply random delay for THIS user (or consume one-time skip if requested)
      if (queueState.skipNextQueueDelay) {
        queueState.skipNextQueueDelay = false; // Reset: single press skips one time only
        await logger.info(
          'EMAIL_SENDING',
          'Single-use queue skip consumed. Proceeding to next email without delay.',
          null,
          userId
        );
      } else {
        const delayMin = settings?.delayMin ?? 60;
        const delayMax = settings?.delayMax ?? 180;
        const randomDelaySeconds = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

        await logger.info(
          'EMAIL_SENDING',
          `Queue waiting for ${randomDelaySeconds} seconds before next send...`,
          null,
          userId
        );

        // Wait for the random delay in a non-blocking timeout for this user
        await new Promise<void>((resolve) => {
          queueState.activeTimeoutResolve = resolve;
          queueState.activeTimeout = setTimeout(() => {
            queueState.activeTimeout = null;
            queueState.activeTimeoutResolve = null;
            resolve();
          }, randomDelaySeconds * 1000);
        });
      }

    } catch (error: any) {
      console.error(`Critical error in sending loop for user ${userId}:`, error);
      await logger.error('EMAIL_SENDING', 'Critical error in sending queue loop', error, userId);
    } finally {
      queueState.isRunning = false;
      queueState.activeTimeout = null;
      queueState.activeTimeoutResolve = null;
      this.triggerNextTickForUser(userId);
    }
  }

  private static triggerNextTickForUser(userId: number): void {
    setTimeout(async () => {
      try {
        const count = await prisma.campaign.count({
          where: { userId, status: 'SENDING' },
        });
        if (count > 0) {
          this.processUserQueue(userId).catch((err) => {
            console.error(`Error in triggerNextTickForUser for user ${userId}:`, err);
          });
        }
      } catch (e) {
        // DB or connection blip, will be picked up by 10s interval
      }
    }, 50);
  }

  /**
   * Set campaign status to SENDING (resumes sending)
   */
  static async startCampaign(campaignId: number): Promise<void> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    const userId = campaign.userId || 1;
    const status = await GmailService.getConnectionStatus(userId);
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
    
    await logger.info('EMAIL_SENDING', `Campaign "${campaign.name}" started/resumed.`, null, userId);
    
    // Trigger tick immediately for THIS USER without waiting for interval
    this.processUserQueue(userId).catch((err) => {
      console.error(`Error in direct processUserQueue for user ${userId}:`, err);
    });
  }

  /**
   * Set campaign status to PAUSED
   */
  static async pauseCampaign(campaignId: number): Promise<void> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    const userId = campaign.userId || 1;
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    await logger.info('EMAIL_SENDING', `Campaign "${campaign.name}" paused.`, null, userId);

    // If user has no more active SENDING campaigns, clear their active timeout
    const remainingSending = await prisma.campaign.count({
      where: { userId, status: 'SENDING' },
    });

    if (remainingSending === 0) {
      const queueState = this.userQueues.get(userId);
      if (queueState?.activeTimeout) {
        clearTimeout(queueState.activeTimeout);
        queueState.activeTimeout = null;
      }
      if (queueState?.activeTimeoutResolve) {
        queueState.activeTimeoutResolve();
        queueState.activeTimeoutResolve = null;
      }
      if (queueState) {
        queueState.skipNextQueueDelay = false;
        queueState.isRunning = false;
      }
    }
  }

  /**
   * Set campaign status to CANCELLED (resets pending to ready)
   */
  static async cancelCampaign(campaignId: number): Promise<void> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    const userId = campaign.userId || 1;
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'DRAFT' },
    });

    await logger.info('EMAIL_SENDING', `Campaign "${campaign.name}" cancelled/reset to draft.`, null, userId);

    // If user has no more active SENDING campaigns, clear their active timeout
    const remainingSending = await prisma.campaign.count({
      where: { userId, status: 'SENDING' },
    });

    if (remainingSending === 0) {
      const queueState = this.userQueues.get(userId);
      if (queueState?.activeTimeout) {
        clearTimeout(queueState.activeTimeout);
        queueState.activeTimeout = null;
      }
      if (queueState?.activeTimeoutResolve) {
        queueState.activeTimeoutResolve();
        queueState.activeTimeoutResolve = null;
      }
      if (queueState) {
        queueState.skipNextQueueDelay = false;
        queueState.isRunning = false;
      }
    }
  }

  /**
   * Reset failed & skipped items in a campaign back to READY_TO_SEND so they will retry
   */
  static async retryFailures(campaignId: number): Promise<void> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    const result = await prisma.contact.updateMany({
      where: {
        campaignId,
        status: { in: ['FAILED', 'SKIPPED'] },
      },
      data: {
        status: 'READY_TO_SEND',
      },
    });

    await logger.info(
      'EMAIL_SENDING',
      `Reset ${result.count} failed/skipped contacts in "${campaign.name}" to retry sending.`,
      null,
      campaign.userId || undefined
    );
  }

  /**
   * Skips the queue wait time for the next email (one-time only) for a specific user.
   * - If currently in a delay sleep, wakes up immediately.
   * - If between loops, sets skipNextQueueDelay = true so the next email proceeds with 0s delay.
   * - Once the next email is handled, normal delays automatically resume.
   */
  static async skipNextQueue(campaignId?: number, userId?: number): Promise<{ success: boolean; message: string }> {
    let targetUserId = userId;
    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (campaign) {
        targetUserId = campaign.userId || targetUserId || 1;
        if (campaign.status !== 'SENDING') {
          const status = await GmailService.getConnectionStatus(targetUserId);
          if (!status.connected) {
            throw new Error('Please connect your Gmail account before starting the campaign.');
          }
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'SENDING' },
          });
        }
      }
    }

    const uid = targetUserId || 1;
    const queueState = this.getUserQueue(uid);

    // Case 1: An active delay timeout is currently running for this user
    if (queueState.activeTimeout && queueState.activeTimeoutResolve) {
      clearTimeout(queueState.activeTimeout);
      queueState.activeTimeout = null;
      const resolve = queueState.activeTimeoutResolve;
      queueState.activeTimeoutResolve = null;
      queueState.skipNextQueueDelay = false;

      await logger.info(
        'EMAIL_SENDING',
        'Queue wait skipped by user! Triggering next email immediately.',
        null,
        uid
      );

      resolve();

      setTimeout(() => {
        if (!queueState.isRunning) {
          this.processUserQueue(uid).catch((err) => {
            console.error(`Error running queue after skipping wait for user ${uid}:`, err);
          });
        }
      }, 50);

      return {
        success: true,
        message: 'Active queue wait skipped! Sending next email immediately.',
      };
    }

    // Case 2: Set one-time skip flag for the next email for this user
    queueState.skipNextQueueDelay = true;

    await logger.info(
      'EMAIL_SENDING',
      'One-time queue delay skip armed for next email.',
      null,
      uid
    );

    if (!queueState.isRunning) {
      setTimeout(() => {
        this.processUserQueue(uid).catch((err) => {
          console.error(`Error triggering queue after skipNextQueue for user ${uid}:`, err);
        });
      }, 50);
    }

    return {
      success: true,
      message: 'Queue delay skipped for the next email. Normal delays will resume afterwards.',
    };
  }
}
