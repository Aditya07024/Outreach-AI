import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${cleanName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only PDF allowed
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return cb(new Error('Only PDF resumes are supported.'));
    }
    cb(null, true);
  },
});

// List all resumes
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(resumes);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list resumes' });
  }
});

// Upload resume
router.post('/', upload.single('resume'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    const name = req.body.name || req.file.originalname.replace('.pdf', '');
    const description = req.body.description || null;

    const resume = await prisma.resume.create({
      data: {
        name,
        filePath: req.file.path,
        description,
        userId,
      },
    });

    await logger.info('API', `Uploaded new resume: ${name} (path: ${req.file.path})`);
    res.status(201).json(resume);
  } catch (error: any) {
    await logger.error('API', 'Failed to upload resume', error);
    res.status(500).json({ error: error.message || 'Failed to upload resume' });
  }
});

// Update resume details
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const { name, description } = req.body;

    const existing = await prisma.resume.findFirst({
      where: { id, userId },
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Resume not found or unauthorized' });
    }

    const updated = await prisma.resume.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
      },
    });

    await logger.info('API', `Updated resume details: ${updated.name}`);
    res.json(updated);
  } catch (error: any) {
    await logger.error('API', `Failed to update resume ID ${req.params.id}`, error);
    res.status(500).json({ error: error.message || 'Failed to update resume' });
  }
});

// Delete resume
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const resume = await prisma.resume.findFirst({
      where: { id, userId },
    });
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Delete local file if it exists
    if (fs.existsSync(resume.filePath)) {
      fs.unlinkSync(resume.filePath);
    }

    await prisma.resume.delete({ where: { id } });

    // Check if this was set as default and unset it
    const settings = await prisma.settings.findUnique({ where: { id: userId } });
    if (settings?.defaultResumeId === id) {
      await prisma.settings.update({
        where: { id: userId },
        data: { defaultResumeId: null },
      });
    }

    await logger.info('API', `Deleted resume: ${resume.name}`);
    res.json({ success: true });
  } catch (error: any) {
    await logger.error('API', `Failed to delete resume ID ${req.params.id}`, error);
    res.status(500).json({ error: error.message || 'Failed to delete resume' });
  }
});

export default router;
