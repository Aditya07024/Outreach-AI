import { Router } from 'express';
import { GmailService } from '../services/gmail.service';
import { logger } from '../utils/logger';
import prisma from '../utils/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aditya07';

// Retrieve Gmail authentication URL
router.get('/url', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const url = GmailService.getAuthUrl(userId);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

// OAuth Callback from Google redirect (public callback, uses state param for userId lookup)
router.get('/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const userId = state ? Number(state) : 1;

  if (!code) {
    await logger.error('OAUTH', 'Google OAuth callback received without a code parameter');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?error=no_code`);
  }

  try {
    const email = await GmailService.handleCallback(code, userId);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?connected=true&email=${encodeURIComponent(email)}`);
  } catch (error: any) {
    await logger.error('OAUTH', `OAuth callback exchange failed for user ${userId}`, error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?error=${encodeURIComponent(error.message || 'auth_failed')}`);
  }
});

// Check authentication connection status
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const status = await GmailService.getConnectionStatus(userId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check connection status' });
  }
});

// Disconnect Gmail OAuth credentials
router.post('/disconnect', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    await GmailService.disconnect(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to disconnect Gmail' });
  }
});

// 1. Admin login with passcode
router.post('/login', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    if (password === ADMIN_PASSWORD) {
      // Find or create User 1 (Admin)
      let user = await prisma.user.findUnique({ where: { id: 1 } });
      if (!user) {
        user = await prisma.user.create({ data: { id: 1, role: 'admin' } });
      }

      const token = jwt.sign({ id: user.id, role: 'admin' }, JWT_SECRET, { expiresIn: '365d' });
      return res.json({ success: true, token, role: 'admin' });
    }

    return res.status(401).json({ error: 'Incorrect password' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Authentication error' });
  }
});

// 2. Create Razorpay order
router.post('/razorpay/order', async (req, res) => {
  const { amount } = req.body; // In paisa, e.g. 49900 for Rs. 499
  
  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    if (!keyId || keyId.includes('yourkeyid')) {
      // Mock order for easy local/deployment testing without production credentials
      return res.json({
        id: `order_mock_${Date.now()}`,
        amount,
        currency: 'INR',
        mock: true
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: process.env.RAZORPAY_KEY_SECRET || ''
    });

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });

    const orderData = JSON.parse(JSON.stringify(order));
    return res.json({
      ...orderData,
      key_id: keyId
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Razorpay order creation failed' });
  }
});

// 3. Verify Razorpay payment signature
router.post('/razorpay/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ error: 'Order ID and Payment ID are required' });
  }

  try {
    const handleSuccessPayment = async () => {
      // Create a new User record for this paid session
      const user = await prisma.user.create({
        data: {
          role: 'paid_user'
        }
      });
      
      const token = jwt.sign({ id: user.id, role: 'paid_user' }, JWT_SECRET, { expiresIn: '365d' });
      return res.json({ success: true, token, role: 'paid_user' });
    };

    // If it is a mock order
    if (razorpay_order_id.startsWith('order_mock_')) {
      return await handleSuccessPayment();
    }

    // Verify real signature
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest === razorpay_signature) {
      return await handleSuccessPayment();
    } else {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Payment signature verification failed' });
  }
});

export default router;
