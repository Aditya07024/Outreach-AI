import React, { useState, useEffect } from 'react';
import { Sparkles, Mail, Send, CheckCircle2, ShieldCheck, KeyRound, Lock, AlertCircle } from 'lucide-react';

interface LandingPageProps {
  onAuthenticated: () => void;
  initialPaymentRequiredUserId: string | null;
  onClearPaymentRequired: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onAuthenticated, 
  initialPaymentRequiredUserId, 
  onClearPaymentRequired 
}) => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mock payment simulator state
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false);
  const [mockOrderId, setMockOrderId] = useState<string | null>(null);

  // Load Razorpay standard script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/google/url?action=login');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to retrieve authentication URL.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed to initialize');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/google/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passcode })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Incorrect passcode');

      localStorage.setItem('token', data.token);
      onAuthenticated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect passcode');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPurchase = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      // Amount is Rs. 499 (49900 paisa)
      const res = await fetch('/api/auth/google/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 49900 })
      });
      const order = await res.json();

      if (!res.ok) throw new Error(order.error || 'Failed to create payment order');

      if (order.mock) {
        // If credentials are placeholders, trigger simulated success dialog
        setMockOrderId(order.id);
        setShowMockPaymentModal(true);
        setIsSubmitting(false);
        return;
      }

      // Initialize real Razorpay Checkout modal
      const options = {
        key: order.key_id || 'rzp_test_yourkeyid',
        amount: order.amount,
        currency: order.currency,
        name: 'AI Job Outreach Assistant',
        description: 'Lifetime Outreach Access License',
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/auth/google/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: initialPaymentRequiredUserId
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              localStorage.setItem('token', verifyData.token);
              onAuthenticated();
            } else {
              setErrorMsg('Payment verification failed.');
            }
          } catch (err) {
            setErrorMsg('Failed to verify payment with server.');
          }
        },
        prefill: {
          name: 'Developer Applicant',
          email: 'candidate@example.com'
        },
        theme: {
          color: '#18181b'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment server connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyMockPayment = async () => {
    if (!mockOrderId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/google/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          userId: initialPaymentRequiredUserId
        })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        onAuthenticated();
      } else {
        setErrorMsg('Simulated verification failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to process simulated license.');
    } finally {
      setIsSubmitting(false);
      setShowMockPaymentModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-neutral-100 flex flex-col justify-between overflow-x-hidden relative">
      
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-zinc-950 font-black text-base shadow-lg">
            A
          </div>
          <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            Outreach AI
          </span>
        </div>

        <button
          onClick={() => {
            setShowAdminLogin(!showAdminLogin);
            setErrorMsg(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold rounded-lg text-xs transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Owner Access
        </button>
      </header>

      {/* Hero Body */}
      <main className="max-w-6xl mx-auto w-full px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10 flex-grow">
        
        {/* Left Side: Pitch */}
        <div className="space-y-6 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-800/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            AI Cold Email Automation
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-100 leading-tight">
            Apply to <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">100x More Jobs</span> with Personal touch.
          </h1>

          <p className="text-sm md:text-base text-neutral-400 leading-relaxed max-w-lg">
            AI Job Outreach Assistant connects to your personal Gmail account via secure Google OAuth. Generate highly tailored recruiters pitch emails with Grok AI, review drafts in an interactive Outbox, and send with built-in reputation delay protections.
          </p>

          {/* Icon Bullet points */}
          <div className="space-y-3 pt-4">
            {[
              { title: 'Personal Gmail API Auth', desc: 'Secure Google OAuth 2.0. No password entries requested.', icon: ShieldCheck },
              { title: 'Grok AI Dynamic Parsing', desc: 'Custom template placeholders customized dynamically.', icon: Mail },
              { title: 'Controlled Anti-Spam Sending', desc: 'Sends emails sequentially with configurable delays.', icon: Send }
            ].map((bullet, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="mt-0.5 p-1 rounded-md bg-neutral-900 border border-neutral-850 h-fit">
                  <bullet.icon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-200">{bullet.title}</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{bullet.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Authentication/Purchase Panel */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md border border-neutral-800 bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
            
            {/* Header border decor */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500" />

            {errorMsg && (
              <div className="flex gap-2 p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-400 text-xs items-center">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!showAdminLogin ? (
              initialPaymentRequiredUserId ? (
                // USER PAYMENT CARD (rendered post-login if account is unpaid)
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-neutral-200">Unlock Lifetime License</h3>
                    <p className="text-xs text-neutral-500">Get complete unlimited access to your personal AI outreach suite.</p>
                  </div>

                  <div className="p-6 bg-zinc-950/40 border border-neutral-850 rounded-xl text-center space-y-4">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Lifetime License</div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-neutral-500 text-sm font-semibold">₹</span>
                      <span className="text-3xl font-extrabold text-neutral-100">499</span>
                      <span className="text-neutral-500 text-xs">/ one-time payment</span>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-neutral-900 text-left">
                      {[
                        'Add unlimited campaigns & contacts',
                        'Personalized Grok AI cover letters',
                        'Local PDF Resume parsing/attachments',
                        'Secure OAuth Google sign-in auth'
                      ].map((feat, idx) => (
                        <div key={idx} className="flex gap-2 items-center text-[10px] text-neutral-450">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleStartPurchase}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors shadow-lg shadow-white/5 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-zinc-950" />
                    {isSubmitting ? 'Initializing Pay...' : 'Unlock Platform with Razorpay'}
                  </button>

                  <button
                    onClick={onClearPaymentRequired}
                    className="w-full py-2.5 bg-transparent border border-neutral-850 hover:bg-neutral-900 text-neutral-300 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    Cancel / Sign Out
                  </button>

                  <p className="text-[9px] text-neutral-600 text-center">
                    Payments are secure and processed via Razorpay gateway services.
                  </p>
                </div>
              ) : (
                // GOOGLE SIGN IN CARD (default visitor state)
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-neutral-200">Sign In to Outreach AI</h3>
                    <p className="text-xs text-neutral-500">Sign in with Google to start sending job applications.</p>
                  </div>

                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700 text-neutral-200 font-bold rounded-xl text-xs transition-all duration-200 shadow-lg flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2a6.386 6.386 0 0 1-6.39-6.39 6.386 6.386 0 0 1 6.39-6.39c2.866 0 4.743 1.177 5.733 2.11l3.22-3.22A10.825 10.825 0 0 0 12.24 1.2a10.8 10.8 0 0 0-10.8 10.8 10.8 10.8 0 0 0 10.8 10.8c5.842 0 10.963-4.225 10.963-10.8 0-.665-.06-1.25-.19-1.715H12.24Z"
                      />
                    </svg>
                    {isSubmitting ? 'Initializing...' : 'Continue with Google'}
                  </button>

                  <p className="text-[10px] text-neutral-500 text-center leading-normal">
                    New users will be redirected to pay a one-time ₹499 lifetime access fee after Google Sign-In.
                  </p>
                </div>
              )
            ) : (
              // OWNER passcode LOGIN FORM
              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-neutral-200">Owner Verification</h3>
                  <p className="text-xs text-neutral-500">Provide the administrator password to bypass licensing verification.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Passcode</label>
                  <input
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter owner passcode"
                    className="rounded-lg border border-neutral-800 bg-zinc-950 px-3.5 py-2 text-xs text-neutral-105 focus:outline-none focus:border-neutral-700"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-neutral-100 font-bold rounded-lg text-xs transition-colors shadow-lg shadow-purple-950/20"
                  >
                    {isSubmitting ? 'Authenticating...' : 'Authorize Admin Session'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setErrorMsg(null);
                    }}
                    className="w-full py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-bold rounded-lg text-xs transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </main>

      {/* Simulated Payment Success Modal */}
      {showMockPaymentModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-800 bg-zinc-900/90 rounded-xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Developer Simulation
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              No Razorpay keys are configured in your <code className="text-neutral-200">.env</code> file. The backend triggered a simulated mock order:
            </p>
            <div className="bg-zinc-950/50 border border-neutral-850 p-3 rounded-lg text-[10px] text-neutral-400 font-mono space-y-1">
              <div>Order ID: <span className="text-neutral-200">{mockOrderId}</span></div>
              <div>Price: <span className="text-emerald-400">₹499.00</span></div>
              <div>Gateway: <span className="text-amber-400">Simulated Sandbox</span></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowMockPaymentModal(false)}
                className="w-1/2 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyMockPayment}
                disabled={isSubmitting}
                className="w-1/2 py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors"
              >
                Authorize Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-neutral-900 text-center text-[10px] text-neutral-500 z-10">
        © 2026 AI Job Outreach Assistant. Personal use project, all rights reserved.
      </footer>
    </div>
  );
};
