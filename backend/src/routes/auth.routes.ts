import { Router } from 'express';
import { GmailService } from '../services/gmail.service';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aditya07';

// Retrieve Gmail authentication URL
router.get('/url', (req, res) => {
  try {
    const url = GmailService.getAuthUrl();
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

// OAuth Callback from Google redirect
router.get('/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    await logger.error('OAUTH', 'Google OAuth callback received without a code parameter');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?error=no_code`);
  }

  try {
    const email = await GmailService.handleCallback(code);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?connected=true&email=${encodeURIComponent(email)}`);
  } catch (error: any) {
    await logger.error('OAUTH', 'OAuth callback exchange failed', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?error=${encodeURIComponent(error.message || 'auth_failed')}`);
  }
});

// Check authentication connection status
router.get('/status', async (req, res) => {
  try {
    const status = await GmailService.getConnectionStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check connection status' });
  }
});

// Disconnect Gmail OAuth credentials
router.post('/disconnect', async (req, res) => {
  try {
    await GmailService.disconnect();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to disconnect Gmail' });
  }
});

// 1. Admin login with passcode
router.post('/login', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '365d' });
    return res.json({ success: true, token, role: 'admin' });
  }

  return res.status(401).json({ error: 'Incorrect password' });
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
    // If it is a mock order
    if (razorpay_order_id.startsWith('order_mock_')) {
      const token = jwt.sign({ role: 'paid_user' }, JWT_SECRET, { expiresIn: '365d' });
      return res.json({ success: true, token, role: 'paid_user' });
    }

    // Verify real signature
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest === razorpay_signature) {
      const token = jwt.sign({ role: 'paid_user' }, JWT_SECRET, { expiresIn: '365d' });
      return res.json({ success: true, token, role: 'paid_user' });
    } else {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Payment signature verification failed' });
  }
});

export default router;
