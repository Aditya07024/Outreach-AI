import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { 
  Sparkles, 
  Mail, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  AlertCircle, 
  UploadCloud, 
  Clock, 
  UserCheck, 
  ArrowRight, 
  HelpCircle,
  Check
} from 'lucide-react';

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
  const navigate = useNavigate();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mock payment simulator state
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false);
  const [mockOrderId, setMockOrderId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'lifetime' | null>(null);

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
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/google/url?action=login&origin=${encodeURIComponent(origin)}`);
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

  const handleStartPurchase = async (plan: 'yearly' | 'lifetime') => {
    setErrorMsg(null);
    setIsSubmitting(true);
    setSelectedPlan(plan);

    try {
      const res = await fetch('/api/auth/google/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const order = await res.json();

      if (!res.ok) throw new Error(order.error || 'Failed to create payment order');

      if (order.mock) {
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
        name: 'Outreach AI',
        description: `${plan === 'yearly' ? 'Yearly Subscription' : 'Lifetime Access License'}`,
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
                plan
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
          color: '#8b5cf6'
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
    if (!mockOrderId || !selectedPlan) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/google/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          plan: selectedPlan
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
    <div className="min-h-screen bg-zinc-950 text-neutral-100 flex flex-col justify-between overflow-x-hidden relative bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:20px_20px]">
      
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[10%] left-[10%] w-[35%] h-[35%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Outreach AI Logo" className="h-9 object-contain rounded-md" />
        </div>

        <button
          onClick={() => navigate('/admin-portal')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900/60 hover:bg-zinc-900 backdrop-blur-md border border-neutral-800/80 hover:border-neutral-700 text-neutral-300 font-semibold rounded-lg text-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          Admin Portal
        </button>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto w-full px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center z-10">
        
        {/* Left Side: Pitch & Live Simulator */}
        <div className="space-y-6 text-left lg:col-span-7">
          <h1 className="text-4xl md:text-5xl lg:text-6.5xl font-black tracking-tight text-neutral-100 leading-tight">
            Automate <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent font-extrabold">Cold Emails</span> with a Personal Touch.
          </h1>

          <p className="text-xs md:text-sm text-neutral-400 leading-relaxed max-w-xl">
            Outreach AI helps you land more interviews by sending personalized job application emails directly from your own Gmail. Write custom messages with AI based on your resume, review drafts, and send them safely with smart delays.
          </p>

          <div className="space-y-3.5 pt-2">
            {[
              { title: 'Secure Gmail Integration', desc: 'Connects directly with your Google account. We never see or save your password.', icon: ShieldCheck },
              { title: 'Smart AI Email Drafting', desc: 'Drafts personalized emails for each job using your resume details automatically.', icon: Mail },
              { title: 'Safe, Natural Sending', desc: 'Sends emails one by one with random pauses to avoid spam filters.', icon: Send }
            ].map((bullet, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="mt-0.5 p-1.5 rounded-lg bg-zinc-900 border border-neutral-800/60 h-fit">
                  <bullet.icon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-200">{bullet.title}</h4>
                  <p className="text-[10px] text-neutral-450 mt-0.5">{bullet.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Outbox Queue Simulator */}
          <div className="mt-8 border border-neutral-800/80 bg-zinc-900/20 backdrop-blur-md rounded-xl p-4 shadow-2xl relative overflow-hidden group hover:border-neutral-700/60 transition-all duration-300 max-w-xl">
            {/* Window controls */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900/60 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-500/80" />
                <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                active-outbox-monitor
              </div>
            </div>

            <div className="space-y-2">
              {/* Item 1 */}
              <div className="p-2.5 bg-zinc-950/40 border border-neutral-850/60 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded bg-purple-500/10 text-purple-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-neutral-350 truncate">Recruiter at Stripe</div>
                    <div className="text-[9px] text-neutral-550 truncate">Subject: Product Design Role</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full bg-purple-950/30 border border-purple-800/30 text-purple-400 font-medium">
                  <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                  Drafting with AI
                </div>
              </div>

              {/* Item 2 */}
              <div className="p-2.5 bg-zinc-950/40 border border-neutral-850/60 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded bg-cyan-500/10 text-cyan-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-neutral-350 truncate">Hiring Manager at Vercel</div>
                    <div className="text-[9px] text-neutral-550 truncate">Subject: Frontend Engineer Application</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full bg-cyan-950/30 border border-cyan-800/30 text-cyan-400 font-medium">
                  Ready to Send
                </div>
              </div>

              {/* Item 3 */}
              <div className="p-2.5 bg-zinc-950/40 border border-neutral-850/60 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-neutral-350 truncate">HR at OpenAI</div>
                    <div className="text-[9px] text-neutral-550 truncate">Subject: Full Stack Developer</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-800/30 text-emerald-400 font-medium">
                  Delivered
                </div>
              </div>
            </div>

            {/* Delay progress bar */}
            <div className="mt-3 pt-2.5 border-t border-neutral-900/60 flex items-center justify-between text-[9px] text-neutral-500">
              <div className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3 h-3 text-purple-400" />
                Anti-Spam Safety: 42s remaining
              </div>
              <div className="w-24 h-1 bg-zinc-950 rounded-full overflow-hidden border border-neutral-850/60">
                <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side: Auth/Purchase Box */}
        <div className="flex justify-center lg:justify-end lg:col-span-5">
          <div className="w-full max-w-md border border-neutral-800 bg-zinc-900/25 backdrop-blur-md rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden group hover:border-neutral-700/60 transition-all duration-300">
            
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500" />

            {errorMsg && (
              <div className="flex gap-2 p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-450 text-xs items-center">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-450" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!showAdminLogin ? (
              initialPaymentRequiredUserId ? (
                // Payment Selection Card (post-login gating)
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-neutral-200">Unlock Outreach Platform</h3>
                    <p className="text-xs text-neutral-550">Choose a subscription model to unlock your cold outreach pipeline.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Yearly Select Option */}
                    <div className="p-4 bg-zinc-950/40 border border-neutral-850 hover:border-purple-800/40 rounded-xl flex justify-between items-center gap-4 transition-colors group/card">
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Plan Option 1</span>
                        <h4 className="text-xs font-bold text-neutral-200">Yearly Subscription</h4>
                        <p className="text-[10px] text-neutral-450">Active updates & priority email sending</p>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="text-sm font-bold text-neutral-100">₹100 <span className="text-[10px] text-neutral-500">/ yr</span></div>
                        <button
                          onClick={() => handleStartPurchase('yearly')}
                          disabled={isSubmitting}
                          className="px-3.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-neutral-800 text-neutral-200 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          Select
                        </button>
                      </div>
                    </div>

                    {/* Lifetime Select Option */}
                    <div className="p-4 bg-zinc-950/60 border border-purple-900/30 hover:border-purple-600/40 rounded-xl flex justify-between items-center gap-4 transition-colors relative group/card">
                      <div className="absolute top-0 right-4 translate-y-[-50%] px-2 py-0.5 rounded bg-purple-950 border border-purple-800/40 text-purple-300 text-[8px] font-bold uppercase tracking-wide">
                        Best Value
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Plan Option 2</span>
                        <h4 className="text-xs font-bold text-neutral-200">Lifetime License</h4>
                        <p className="text-[10px] text-neutral-450">Pay once, own forever. No renewals.</p>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="text-sm font-bold text-neutral-100">₹300 <span className="text-[10px] text-neutral-500">/ once</span></div>
                        <button
                          onClick={() => handleStartPurchase('lifetime')}
                          disabled={isSubmitting}
                          className="px-3.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-lg text-[10px] transition-colors cursor-pointer shadow-md shadow-purple-950/20"
                        >
                          Unlock
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onClearPaymentRequired}
                    className="w-full py-2.5 bg-transparent border border-neutral-850 hover:bg-zinc-900/60 text-neutral-400 hover:text-neutral-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Cancel / Sign Out
                  </button>

                  <p className="text-[9px] text-neutral-600 text-center">
                    Payments are encrypted and processed securely via Razorpay.
                  </p>
                </div>
              ) : (
                // Google Login Card
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-neutral-250 tracking-tight">Access Dashboard</h3>
                    <p className="text-xs text-neutral-500">Log in with Google to manage campaigns, resumes, and settings.</p>
                  </div>

                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 hover:border-neutral-750 text-neutral-200 font-bold rounded-xl text-xs transition-all duration-200 shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2a6.386 6.386 0 0 1-6.39-6.39 6.386 6.386 0 0 1 6.39-6.39c2.866 0 4.743 1.177 5.733 2.11l3.22-3.22A10.825 10.825 0 0 0 12.24 1.2a10.8 10.8 0 0 0-10.8 10.8 10.8 10.8 0 0 0 10.8 10.8c5.842 0 10.963-4.225 10.963-10.8 0-.665-.06-1.25-.19-1.715H12.24Z"
                      />
                    </svg>
                    {isSubmitting ? 'Connecting...' : 'Continue with Google'}
                  </button>

                  <p className="text-[10px] text-neutral-500 text-center leading-normal">
                    New users can choose between our Yearly (₹100/year) or Lifetime (₹300 one-time) access plans on the Dashboard.
                  </p>
                </div>
              )
            ) : (
              // Owner Admin Passcode Login
              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-neutral-200">Owner Verification</h3>
                  <p className="text-xs text-neutral-550">Provide the owner password to access administrative configurations.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Passcode</label>
                  <input
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter owner passcode"
                    className="rounded-lg border border-neutral-850 bg-zinc-950 px-3.5 py-2 text-xs focus:outline-none focus:border-neutral-700 text-neutral-200"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-neutral-100 font-bold rounded-lg text-xs transition-colors shadow-lg cursor-pointer"
                  >
                    {isSubmitting ? 'Authorizing...' : 'Authorize Owner Session'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setErrorMsg(null);
                    }}
                    className="w-full py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-350 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="max-w-6xl mx-auto w-full px-6 py-16 md:py-20 border-t border-neutral-900/60 z-10">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-2xl font-bold text-neutral-100 tracking-tight sm:text-3xl">
            Streamlined in Three Simple Steps
          </h2>
          <p className="text-xs text-neutral-450 max-w-md mx-auto">
            Our automated sending layout acts as your personal career search agent, directly from your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Authenticate Gmail', desc: 'Connect to Gmail via secure Google OAuth. The token is stored locally on your device with high-grade encryption.', icon: ShieldCheck },
            { step: '02', title: 'Upload Resumes & Data', desc: 'Import csv files containing contact emails, company names, and recruiter details. Upload resumes to automatically attach to emails.', icon: UploadCloud },
            { step: '03', title: 'Configure and Run', desc: 'Select templates, personalize drafts with Grok AI, set random safety delay parameters, and run campaigns sequentially.', icon: Clock }
          ].map((item, idx) => (
            <div key={idx} className="border border-neutral-900/80 bg-zinc-900/10 rounded-xl p-6 relative hover:border-neutral-800 transition-all duration-300 group hover:bg-zinc-900/15">
              <span className="absolute top-4 right-6 text-3xl font-black text-neutral-900 font-mono select-none group-hover:text-neutral-850 transition-colors">{item.step}</span>
              <div className="p-2 rounded-lg bg-zinc-900 border border-neutral-800/80 w-fit">
                <item.icon className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-neutral-200 mt-4">{item.title}</h3>
              <p className="text-xs text-neutral-450 mt-2 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid Matrix */}
      <section className="max-w-6xl mx-auto w-full px-6 py-16 md:py-20 border-t border-neutral-900/60 z-10">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-2xl font-bold text-neutral-100 tracking-tight sm:text-3xl">
            Engineered for Job Hunters
          </h2>
          <p className="text-xs text-neutral-450 max-w-md mx-auto">
            Avoid bulk sending scripts that land directly in spam folders. Personalize and send organically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Grok-2 AI Personalization', desc: 'Automatically drafts recruiter pitches based on your PDF resume contents and the specific job description.' },
            { title: 'Queue Review Panel', desc: 'Review, edit, and approve every AI email draft in an interactive outbox folder before triggering the send queue.' },
            { title: 'Gmail Reputation Protection', desc: 'Appends customized random delays (e.g. 30-90s) between sends to emulate natural human behavior.' },
            { title: 'Settings Profile Customization', desc: 'Configure target roles, expected salary ranges, portfolio links, and customized system prompt guides.' }
          ].map((feat, idx) => (
            <div key={idx} className="border border-neutral-900 bg-zinc-950/40 rounded-xl p-5 hover:border-neutral-800 hover:bg-zinc-900/10 transition-all duration-300 relative group overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
              <h4 className="text-xs font-bold text-neutral-200">{feat.title}</h4>
              <p className="text-[11px] text-neutral-450 mt-2 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Transparency Section */}
      <section className="max-w-6xl mx-auto w-full px-6 py-16 md:py-20 border-t border-neutral-900/60 z-10 text-center">
        <div className="space-y-3 mb-12">
          <h2 className="text-2xl font-bold text-neutral-100 tracking-tight sm:text-3xl">
            Flexible Licensing Options
          </h2>
          <p className="text-xs text-neutral-450 max-w-md mx-auto">
            Transparent pricing models to support your career search budget. Pay for exactly what you need.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Yearly Card */}
          <div className="border border-neutral-900 bg-zinc-900/10 rounded-2xl p-6 text-center space-y-4 hover:border-neutral-850 hover:bg-zinc-900/15 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest block">Yearly Subscription</span>
              <div className="text-3xl font-black text-neutral-100">₹100 <span className="text-xs font-normal text-neutral-500">/ year</span></div>
              <p className="text-xs text-neutral-450">Perfect for active hiring sprints. Renew or cancel anytime.</p>
              <div className="pt-4 border-t border-neutral-900/60 space-y-2.5 text-left text-[11px] text-neutral-400 max-w-xs mx-auto">
                <div className="flex gap-2.5 items-center"><Check className="w-4 h-4 text-purple-400" /> <span>Unlimited AI Email Drafts</span></div>
                <div className="flex gap-2.5 items-center"><Check className="w-4 h-4 text-purple-400" /> <span>Gmail OAuth Connection</span></div>
                <div className="flex gap-2.5 items-center"><Check className="w-4 h-4 text-purple-400" /> <span>Interactive Outbox Review Queue</span></div>
              </div>
            </div>
          </div>

          {/* Lifetime Card */}
          <div className="border border-purple-950/80 bg-zinc-900/25 rounded-2xl p-6 text-center space-y-4 hover:border-purple-800 hover:bg-purple-950/5 transition-all duration-300 relative flex flex-col justify-between group">
            <div className="absolute top-0 left-1/2 translate-x-[-50%] translate-y-[-50%] px-3 py-0.5 rounded-full bg-purple-900 border border-purple-600/40 text-purple-300 text-[8px] font-bold uppercase tracking-wider shadow-lg">
              Most Selected
            </div>
            <div className="space-y-4">
              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest block">Lifetime License</span>
              <div className="text-3xl font-black text-neutral-100">₹300 <span className="text-xs font-normal text-neutral-500">/ once</span></div>
              <p className="text-xs text-neutral-450">Best value. Unlimited access with zero renewal requirements.</p>
              <div className="pt-4 border-t border-neutral-900/60 space-y-2.5 text-left text-[11px] text-neutral-400 max-w-xs mx-auto">
                <div className="flex gap-2.5 items-center"><Check className="w-4 h-4 text-purple-400" /> <span>All features of Yearly Plan</span></div>
                <div className="flex gap-2.5 items-center"><Check className="w-4 h-4 text-purple-400" /> <span>Permanent Access License</span></div>
                <div className="flex gap-2.5 items-center"><Check className="w-4 h-4 text-purple-400" /> <span>Lifetime Updates & Releases</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto w-full px-6 py-16 border-t border-neutral-900/60 z-10">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-2xl font-bold text-neutral-100 tracking-tight sm:text-3xl flex items-center justify-center gap-2">
            <HelpCircle className="w-5.5 h-5.5 text-purple-400" />
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-neutral-450">
            Answers to common questions regarding security, billing, and system operations.
          </p>
        </div>

        <div className="space-y-6">
          {[
            {
              q: 'Is it safe to connect my personal Gmail?',
              a: 'Yes. Outreach AI connects via Google OAuth 2.0. We request only the permissions needed to send emails on your behalf and confirm connection details. We never see, request, or store your actual email passwords. You can revoke this connection at any time from your Google Account settings.'
            },
            {
              q: 'Which AI model generates the email drafts?',
              a: 'The application uses xAI\'s Grok-2 API. When drafting, the model combines your target job roles, system instructions, settings configuration, and the specific details parsed from your uploaded PDF resume to craft tailored recruiter pitch letters.'
            },
            {
              q: 'What is the difference between the two plans?',
              a: 'The Yearly Plan (₹100/year) gives you full access to the application features for 12 months, with billing renewing annually. The Lifetime Access plan (₹300 one-time) grants you permanent license ownership, free from subscription renewals.'
            },
            {
              q: 'How does the safety delay engine protect my sender score?',
              a: 'Automated platforms that send dozens of emails simultaneously trigger anti-spam heuristics. Outreach AI sequentializes your campaigns, injecting configurable random delay intervals (like 30 to 90 seconds) between email dispatches to emulate organic human typing speeds.'
            }
          ].map((faq, idx) => (
            <div key={idx} className="border-b border-neutral-900/80 pb-5 space-y-2">
              <h4 className="text-xs font-bold text-neutral-200 flex items-start gap-1.5">
                <span className="text-purple-400 select-none font-bold">Q:</span>
                {faq.q}
              </h4>
              <p className="text-[11px] text-neutral-450 leading-relaxed pl-5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Simulated Payment Success Modal */}
      {showMockPaymentModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-800 bg-zinc-900 rounded-xl p-6 space-y-4 shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500 rounded-t-xl" />
            <h3 className="text-sm font-semibold text-neutral-250 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-450 animate-pulse" />
              Developer Simulation
            </h3>
            <p className="text-xs text-neutral-450 leading-relaxed">
              No Razorpay credentials are set in <code className="text-neutral-250">.env</code>. The backend triggered a simulated mock order:
            </p>
            <div className="bg-zinc-950 border border-neutral-850 p-3 rounded-lg text-[10px] text-neutral-400 font-mono space-y-1">
              <div>Order ID: <span className="text-neutral-200">{mockOrderId}</span></div>
              <div>Plan: <span className="text-purple-450 uppercase font-bold">{selectedPlan}</span></div>
              <div>Price: <span className="text-emerald-400">₹{selectedPlan === 'yearly' ? '100.00' : '300.00'}</span></div>
              <div>Gateway: <span className="text-amber-400 font-semibold">Simulated Sandbox</span></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowMockPaymentModal(false)}
                className="w-1/2 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyMockPayment}
                disabled={isSubmitting}
                className="w-1/2 py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors shadow-md cursor-pointer"
              >
                Authorize Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-neutral-900 text-[10px] text-neutral-500 z-10 flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto w-full px-6 gap-3">
        <span>© 2026 AI Job Outreach Assistant. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="/privacy" className="hover:text-neutral-300 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-neutral-300 transition-colors">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};
