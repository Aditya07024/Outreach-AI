import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import { AIService } from '../services/ai.service';

const router = Router();
const upload = multer({ dest: 'uploads/temp/' });

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Technical recruiter keywords
const TECHNICAL_KEYWORDS = [
  'technical recruiter',
  'engineering recruiter',
  'it recruiter',
  'talent acquisition',
  'technical talent',
  'software recruiter',
  'hiring manager',
  'engineering manager',
  'recruitment',
  'recruiter',
  'head of talent',
  'vp of engineering',
  'cto'
];

function checkIsTechnical(title: string): boolean {
  if (!title) return false;
  const lowerTitle = title.toLowerCase();
  return TECHNICAL_KEYWORDS.some((keyword) => lowerTitle.includes(keyword));
}

// Helper: Check duplicate status
async function getDuplicateStatus(email: string, company: string | null, campaignId: number): Promise<string> {
  // Check if email already exists in this same campaign
  const sameCampaignEmail = await prisma.contact.findFirst({
    where: { campaignId, email },
  });
  if (sameCampaignEmail) {
    return 'DUPLICATE_EMAIL';
  }

  // Check if email exists in any other campaign
  const otherCampaignEmail = await prisma.contact.findFirst({
    where: {
      email,
      campaignId: { not: campaignId },
    },
  });
  if (otherCampaignEmail) {
    return 'PREVIOUS_CAMPAIGN';
  }

  // Check if we already have a contact in this campaign with the same company
  if (company) {
    const sameCompany = await prisma.contact.findFirst({
      where: { campaignId, company },
    });
    if (sameCompany) {
      return 'DUPLICATE_COMPANY';
    }
  }

  return 'NONE';
}

// Import CSV
router.post('/import-csv', upload.single('file'), async (req, res) => {
  const file = req.file;
  const campaignId = Number(req.body.campaignId);

  if (!file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }
  if (!campaignId) {
    return res.status(400).json({ error: 'Campaign ID is required' });
  }

  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } }) || { technicalFilter: true };
    const results: any[] = [];

    // Parse CSV
    fs.createReadStream(file.path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        // Clean up temp file
        fs.unlinkSync(file.path);

        let importedCount = 0;
        let skippedCount = 0;
        let duplicateCount = 0;

        for (const row of results) {
          // Normalize CSV keys to lowercase
          const normalizedRow: any = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[key.toLowerCase().trim().replace(/[\s_]+/g, '')] = row[key];
          });

          // Extract fields based on common CSV headers
          const email = normalizedRow.activeemail || normalizedRow.email || normalizedRow.emailaddress || normalizedRow.address || '';
          if (!email || !email.includes('@')) {
            skippedCount++;
            continue;
          }

          const firstName = normalizedRow.firstname || normalizedRow.first || '';
          const lastName = normalizedRow.lastname || normalizedRow.last || '';
          const company = normalizedRow.companyname || normalizedRow.company || normalizedRow.organization || '';
          const title = normalizedRow.title || normalizedRow.role || normalizedRow.designation || '';
          const phone = normalizedRow.phone || normalizedRow.telephone || normalizedRow.mobile || '';
          const linkedin = normalizedRow.linkedinprofile || normalizedRow.linkedin || normalizedRow.linkedinurl || '';
          const country = normalizedRow.personcountry || normalizedRow.country || '';

          const isTechnical = checkIsTechnical(title);

          // Apply Technical Filter if active
          if (settings.technicalFilter && title && !isTechnical) {
            skippedCount++;
            continue;
          }

          // Duplicate detection
          const dupStatus = await getDuplicateStatus(email, company, campaignId);
          if (dupStatus === 'DUPLICATE_EMAIL') {
            duplicateCount++;
            continue; // Skip exact duplicates in the same campaign to satisfy unique constraints
          }

          try {
            await prisma.contact.create({
              data: {
                campaignId,
                email,
                firstName,
                lastName,
                company,
                title,
                role: title,
                phone,
                linkedin,
                country,
                isTechnical,
                duplicateStatus: dupStatus === 'NONE' ? null : dupStatus,
              },
            });
            importedCount++;
          } catch (createErr) {
            console.error('Failed to insert contact row:', email, createErr);
            skippedCount++;
          }
        }

        await logger.info(
          'CSV_IMPORT',
          `CSV imported: ${importedCount} contacts added, ${duplicateCount} duplicates skipped, ${skippedCount} items filtered/skipped.`
        );

        res.json({
          success: true,
          imported: importedCount,
          duplicates: duplicateCount,
          skipped: skippedCount,
        });
      })
      .on('error', async (error) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        await logger.error('CSV_IMPORT', 'CSV parsing error', error);
        res.status(500).json({ error: 'Failed to process CSV file' });
      });

  } catch (error: any) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ error: error.message || 'Error occurred' });
  }
});

// Import Pasted Text Email List
router.post('/import-paste', async (req, res) => {
  const { emailsText, campaignId } = req.body;
  if (!emailsText || !campaignId) {
    return res.status(400).json({ error: 'Emails list and Campaign ID are required.' });
  }

  try {
    const campaignIdNum = Number(campaignId);
    
    // Split by commas, semicolons, newlines, spaces
    const rawEmails = emailsText.split(/[\n,\t; ]+/);
    const emails = Array.from(new Set(
      rawEmails
        .map((e: string) => e.trim())
        .filter((e: string) => e && e.includes('@'))
    )) as string[];

    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const email of emails) {
      const dupStatus = await getDuplicateStatus(email, null, campaignIdNum);
      if (dupStatus === 'DUPLICATE_EMAIL') {
        duplicateCount++;
        continue;
      }

      try {
        await prisma.contact.create({
          data: {
            campaignId: campaignIdNum,
            email,
            duplicateStatus: dupStatus === 'NONE' ? null : dupStatus,
          },
        });
        importedCount++;
      } catch (err) {
        errorCount++;
      }
    }

    await logger.info(
      'CSV_IMPORT',
      `Imported pasted list: ${importedCount} added, ${duplicateCount} duplicates, ${errorCount} errors.`
    );

    res.json({
      success: true,
      imported: importedCount,
      duplicates: duplicateCount,
      errors: errorCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to import email list' });
  }
});

// Import Single Manual Contact
router.post('/import-manual', async (req, res) => {
  const { campaignId, email, firstName, lastName, title, company, phone, linkedin, country } = req.body;

  if (!campaignId || !email) {
    return res.status(400).json({ error: 'Campaign ID and Email are required.' });
  }

  try {
    const campaignIdNum = Number(campaignId);
    const isTechnical = checkIsTechnical(title || '');
    const dupStatus = await getDuplicateStatus(email, company || null, campaignIdNum);

    if (dupStatus === 'DUPLICATE_EMAIL') {
      return res.status(400).json({ error: 'A contact with this email already exists in this campaign.' });
    }

    const contact = await prisma.contact.create({
      data: {
        campaignId: campaignIdNum,
        email,
        firstName,
        lastName,
        title,
        role: title,
        company,
        phone,
        linkedin,
        country,
        isTechnical,
        duplicateStatus: dupStatus === 'NONE' ? null : dupStatus,
      },
    });

    await logger.info('API', `Manually added contact: ${email}`);
    res.status(201).json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add manual contact' });
  }
});

// Edit specific contact (used in email custom review)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { firstName, lastName, company, role, emailSubject, emailBody, status } = req.body;

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName,
        lastName,
        company,
        role,
        emailSubject,
        emailBody,
        status,
      },
    });

    res.json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update contact details' });
  }
});

// Delete specific contact
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.contact.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete contact' });
  }
});

// Regenerate single email using AI
router.post('/:id/regenerate', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const email = await AIService.generateEmail(id);
    
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        emailSubject: email.subject,
        emailBody: email.body,
        status: 'READY_TO_SEND',
      },
    });

    res.json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to regenerate email' });
  }
});

export default router;
