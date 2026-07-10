import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Routes
import authRoutes from './routes/auth.routes';
import settingsRoutes from './routes/settings.routes';
import resumeRoutes from './routes/resumes.routes';
import campaignRoutes from './routes/campaigns.routes';
import contactRoutes from './routes/contacts.routes';
import historyRoutes from './routes/history.routes';
import logsRoutes from './routes/logs.routes';

// Services
import { SendingEngine } from './services/sending.engine';
import prisma from './utils/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development server
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware
import { requireAuth } from './middleware/auth';

// Ensure upload directories exist
const uploadResumesDir = path.join(__dirname, '../uploads/resumes');
if (!fs.existsSync(uploadResumesDir)) {
  fs.mkdirSync(uploadResumesDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register Routes
app.use('/api/auth/google', authRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/resumes', requireAuth, resumeRoutes);
app.use('/api/campaigns', requireAuth, campaignRoutes);
app.use('/api/contacts', requireAuth, contactRoutes);
app.use('/api/history', requireAuth, historyRoutes);
app.use('/api/logs', requireAuth, logsRoutes);

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Seed default settings and run server
async function startServer() {
  try {
    // Ensure Settings row 1 exists
    const settingsCount = await prisma.settings.count();
    if (settingsCount === 0) {
      await prisma.settings.create({
        data: {
          id: 1,
          name: '',
          phone: '',
          portfolio: '',
          github: '',
          linkedin: '',
          preferredRole: '',
          desiredSalary: '',
          location: '',
          customPrompt: 'Write a concise and professional cold email. Mention my technical skills and internships. Keep under 150 words. Do not exaggerate.',
          delayMin: 30,
          delayMax: 90,
          technicalFilter: true,
        },
      });
      console.log('Seeded default settings row.');
    }

    // Start background queue scheduler
    SendingEngine.startScheduler();

    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    if (error.code === 'P2021' || (error.message && error.message.includes('does not exist'))) {
      console.error('\n==================================================================');
      console.error('[DATABASE SETUP REQUIRED]');
      console.error('The tables do not exist in your database yet.');
      console.error('Please run the database schema sync command in your backend folder:');
      console.error('    npx prisma db push');
      console.error('==================================================================\n');
    } else {
      console.error('Failed to start server:', error);
    }
    process.exit(1);
  }
}

startServer();
