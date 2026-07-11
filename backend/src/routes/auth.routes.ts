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

// Helper to encode state object to base64
function encodeState(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

// Helper to decode base64 state string
function decodeState(stateStr: string): any {
  try {
    const jsonStr = Buffer.from(stateStr, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (err) {
    // Fallback for legacy state format
    if (stateStr === 'login') {
      return { action: 'login' };
    }
    const num = Number(stateStr);
    if (!isNaN(num)) {
      return { userId: num };
    }
    return {};
  }
}

// Retrieve Gmail authentication URL
router.get('/url', (req, res) => {
  try {
    const action = req.query.action as string;
    const origin = (req.query.origin as string) || (process.env.FRONTEND_URL || 'http://localhost:5173');
    
    if (action === 'login') {
      const state = encodeState({ action: 'login', origin });
      const url = GmailService.getAuthUrl(state);
      return res.json({ url });
    }
    
    // Connect Gmail inside settings requires requireAuth
    requireAuth(req as any, res as any, () => {
      const userId = (req as any).user!.id;
      const state = encodeState({ userId, origin });
      const url = GmailService.getAuthUrl(state);
      res.json({ url });
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

// OAuth Callback from Google redirect (public callback)
router.get('/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code) {
    await logger.error('OAUTH', 'Google OAuth callback received without a code parameter');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/#error=no_code`);
  }

  const stateData = decodeState(state);
  const redirectOrigin = stateData.origin || process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    if (stateData.action === 'login') {
      // 1. SIGN IN / SIGN UP FLOW
      const { email } = await GmailService.getEmailFromCode(code);
      
      let user = await prisma.user.findUnique({
        where: { email }
      });

      const isAdminEmail = email === 'adityakumar07024@gmail.com' || email === 'adityakumarjat106@gmail.com';

      if (!user) {
        // Create new user, paid = true if admin email, else false
        user = await prisma.user.create({
          data: {
            email,
            paid: isAdminEmail,
            role: isAdminEmail ? 'admin' : 'paid_user'
          }
        });
      } else if (isAdminEmail && user.role !== 'admin') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'admin', paid: true }
        });
      }

      // Always issue JWT token and redirect to frontend (gating is handled on /me and on frontend)
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '365d' });
      return res.redirect(`${redirectOrigin}/#token=${token}`);
    } else {
      // 2. CONNECT GMAIL ACCOUNT FLOW
      const userId = stateData.userId || 1;
      const email = await GmailService.handleCallback(code, userId);
      res.redirect(`${redirectOrigin}/settings?connected=true&email=${encodeURIComponent(email)}`);
    }
  } catch (error: any) {
    await logger.error('OAUTH', 'OAuth callback exchange failed', error);
    res.redirect(`${redirectOrigin}/#error=${encodeURIComponent(error.message || 'auth_failed')}`);
  }
});

// Get current authenticated user profile
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate dynamic paid status based on plan expiration
    const isPaid = user.role === 'admin' || (
      user.paid && (
        user.plan !== 'yearly' || 
        !user.paidUntil || 
        user.paidUntil > new Date()
      )
    );

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      paid: isPaid,
      plan: user.plan,
      paidUntil: user.paidUntil
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve user profile' });
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
      // Find or create Admin User (local admin has no email)
      let user = await prisma.user.findFirst({ where: { role: 'admin', email: null } });
      if (!user) {
        user = await prisma.user.create({ data: { role: 'admin', paid: true } });
      }

      const token = jwt.sign({ id: user.id, role: 'admin' }, JWT_SECRET, { expiresIn: '365d' });
      return res.json({ success: true, token, role: 'admin' });
    }

    return res.status(401).json({ error: 'Incorrect password' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Authentication error' });
  }
});

// 2. Create Razorpay order (protected by requireAuth)
router.post('/razorpay/order', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { plan } = req.body;
  
  if (!plan || (plan !== 'yearly' && plan !== 'lifetime')) {
    return res.status(400).json({ error: 'Valid plan (yearly or lifetime) is required.' });
  }

  const amount = plan === 'yearly' ? 10000 : 30000; // Rs. 100 or Rs. 300 in paisa
  const userId = req.user!.id;

  try {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    if (!keyId || keyId.includes('yourkeyid')) {
      // Mock order for easy local/deployment testing without production credentials
      return res.json({
        id: `order_mock_${plan}_${Date.now()}`,
        amount,
        currency: 'INR',
        mock: true,
        plan
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: process.env.RAZORPAY_KEY_SECRET || ''
    });

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        plan,
        userId: String(userId)
      }
    });

    const orderData = JSON.parse(JSON.stringify(order));
    return res.json({
      ...orderData,
      key_id: keyId,
      plan
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Razorpay order creation failed' });
  }
});

// 3. Verify Razorpay payment signature (protected by requireAuth)
router.post('/razorpay/verify', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
  const userId = req.user!.id;

  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ error: 'Order ID and Payment ID are required' });
  }

  try {
    const handleSuccessPayment = async (resolvedPlan: string) => {
      const now = new Date();
      const paidUntil = resolvedPlan === 'yearly'
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())
        : null;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          paid: true,
          plan: resolvedPlan,
          paidUntil
        }
      });
      
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '365d' });
      return res.json({ success: true, token, role: user.role });
    };

    // If it is a mock order
    if (razorpay_order_id.startsWith('order_mock_')) {
      let resolvedPlan = 'lifetime';
      if (razorpay_order_id.includes('_yearly_')) {
        resolvedPlan = 'yearly';
      }
      return await handleSuccessPayment(resolvedPlan);
    }

    // Verify real signature
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest === razorpay_signature) {
      // Fetch the plan from the Razorpay order notes to prevent client-side tampering
      let resolvedPlan = plan;
      try {
        const keyId = process.env.RAZORPAY_KEY_ID || '';
        const razorpay = new Razorpay({
          key_id: keyId,
          key_secret: secret
        });
        const order = await razorpay.orders.fetch(razorpay_order_id);
        if (order && order.notes && order.notes.plan) {
          resolvedPlan = order.notes.plan as string;
        }
      } catch (fetchErr) {
        console.error('Failed to fetch Razorpay order notes, falling back to request body plan:', fetchErr);
      }

      if (!resolvedPlan || (resolvedPlan !== 'yearly' && resolvedPlan !== 'lifetime')) {
        resolvedPlan = 'lifetime'; // Fallback
      }

      return await handleSuccessPayment(resolvedPlan);
    } else {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Payment signature verification failed' });
  }
});

// Admin Portal Login with specific user ID and password
router.post('/admin-login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    if (username === 'aditya07024' && password === '1234567890') {
      // Find or create super_admin user
      let user = await prisma.user.findFirst({
        where: { role: 'super_admin', email: 'aditya07024@admin.outreach.ai' }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'aditya07024@admin.outreach.ai',
            role: 'super_admin',
            paid: true
          }
        });
      }

      const token = jwt.sign(
        { id: user.id, role: 'super_admin' },
        JWT_SECRET,
        { expiresIn: '365d' }
      );

      return res.json({
        success: true,
        token,
        role: 'super_admin'
      });
    }

    return res.status(401).json({ error: 'Invalid admin credentials' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Authentication error' });
  }
});

export default router;
