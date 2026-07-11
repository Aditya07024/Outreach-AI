import { Router } from 'express';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { GmailService } from '../services/gmail.service';

const router = Router();

// Get settings
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    let settings = await prisma.settings.findUnique({
      where: { id: userId },
    });

    // Auto-create settings if not found
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: userId },
      });
    }

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve settings' });
  }
});

// Update settings
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    const updated = await prisma.settings.upsert({
      where: { id: userId },
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
        id: userId,
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

// Send direct test email
router.post('/send-test-email', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { to, subject, body, resumeId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Recipient email, subject, and body are required.' });
    }

    let fileContent: string | undefined = undefined;
    let fileName: string | undefined = undefined;

    if (resumeId) {
      const resume = await prisma.resume.findFirst({
        where: { id: Number(resumeId), userId }
      });
      if (resume) {
        fileContent = resume.fileContent || undefined;
        fileName = `${resume.name}.pdf`;
      }
    }

    const messageId = await GmailService.sendEmail(
      userId,
      to,
      subject,
      body,
      fileContent,
      fileName
    );

    await logger.info('API', `Direct test email successfully sent to ${to} (Message ID: ${messageId})`);
    res.json({ success: true, messageId, message: 'Test email sent successfully!' });
  } catch (error: any) {
    await logger.error('API', `Failed to send direct test email to ${req.body?.to}`, error);
    res.status(500).json({ error: error.message || 'Failed to send test email.' });
  }
});

export default router;
