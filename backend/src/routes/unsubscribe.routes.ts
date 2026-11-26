import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/unsubscribe/check
 * Public check to verify an email's current subscription status.
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const contacts = await prisma.contact.findMany({
      where: { email },
      select: { id: true, status: true, company: true, role: true }
    });

    const isAlreadyUnsubscribed = contacts.length > 0 && contacts.every(c => c.status === 'UNSUBSCRIBED');

    res.json({
      email,
      found: contacts.length > 0,
      isUnsubscribed: isAlreadyUnsubscribed,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check unsubscribe status.' });
  }
});

/**
 * POST /api/unsubscribe
 * Public endpoint allowing recipients to opt out and submit their feedback/problem.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, reason, feedback, campaignId } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    // 1. Update all matching contacts in the database to 'UNSUBSCRIBED'
    const updateResult = await prisma.contact.updateMany({
      where: { email: cleanEmail },
      data: { status: 'UNSUBSCRIBED' }
    });

    // 2. Record the user's reason and problem feedback
    const recordedFeedback = await prisma.unsubscribeFeedback.create({
      data: {
        email: cleanEmail,
        campaignId: campaignId ? Number(campaignId) : null,
        reason: (reason || 'No specific reason selected').trim(),
        feedback: (feedback || '').trim() || null,
      }
    });

    // 3. Log to system logs for audit visibility
    await logger.info(
      'EMAIL_SENDING',
      `Recipient "${cleanEmail}" opted out and submitted unsubscribe feedback. Reason: "${reason || 'N/A'}"`,
      {
        email: cleanEmail,
        contactsUpdated: updateResult.count,
        reason: reason || null,
        feedback: feedback || null,
        feedbackId: recordedFeedback.id
      }
    );

    res.json({
      success: true,
      message: 'You have been successfully unsubscribed. You will not receive future outreach emails.',
      contactsUpdated: updateResult.count
    });
  } catch (error: any) {
    console.error('Failed to process unsubscribe request:', error);
    res.status(500).json({ error: error.message || 'Failed to process unsubscribe request.' });
  }
});

export default router;
