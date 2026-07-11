import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import illustration from '../../stitch_assets/aida_illustration_workspace.png';
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
  Check,
  ChevronDown,
  PlayCircle,
  FileText,
  Layers,
  ShieldAlert,
  ArrowUpRight
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

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-[#0c1324] text-[#dce1fb] flex flex-col justify-between overflow-x-hidden relative selection:bg-purple-500/30">
      
      {/* Background radial highlight matches Stitch */}
      <div className="absolute inset-0 z-0 bg-radial-gradient from-purple-900/10 via-transparent to-transparent pointer-events-none" />

      {/* Header NavBar */}
      <header className="fixed top-0 w-full z-50 bg-[#0c1324]/80 backdrop-blur-xl border-b border-[#464554]/20 shadow-sm">
        <nav className="flex justify-between items-center h-16 px-6 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <img alt="Outreach AI Logo" className="h-8 w-8 object-contain" src={logo} />
            <span className="text-lg font-bold text-[#dce1fb] tracking-tight">Outreach AI</span>
          </div>
          
          <div className="hidden md:flex gap-8">
            <a className="text-[#c7c4d7] text-sm font-medium hover:text-[#dce1fb] transition-colors" href="#features">Features</a>
            <a className="text-[#c7c4d7] text-sm font-medium hover:text-[#dce1fb] transition-colors" href="#how-it-works">How it Works</a>
            <a className="text-[#c7c4d7] text-sm font-medium hover:text-[#dce1fb] transition-colors" href="#pricing">Pricing</a>
            <a className="text-[#c7c4d7] text-sm font-medium hover:text-[#dce1fb] transition-colors" href="#faq">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin-portal')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/40 hover:bg-zinc-800/80 border border-neutral-800 text-[#c7c4d7] font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              Admin
            </button>

            <button 
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="bg-[#c0c1ff] text-[#1000a9] font-bold px-4 py-2 rounded-full hover:scale-95 transition-all duration-150 shadow-lg shadow-purple-500/10 flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2a6.386 6.386 0 0 1-6.39-6.39 6.386 6.386 0 0 1 6.39-6.39c2.866 0 4.743 1.177 5.733 2.11l3.22-3.22A10.825 10.825 0 0 0 12.24 1.2a10.8 10.8 0 0 0-10.8 10.8 10.8 10.8 0 0 0 10.8 10.8c5.842 0 10.963-4.225 10.963-10.8 0-.665-.06-1.25-.19-1.715H12.24Z"
                />
              </svg>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 max-w-[1200px] mx-auto min-h-screen flex items-center z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center w-full">
          
          {/* Left Column: Heading, description, and Sign In action block */}
          <div className="space-y-6 lg:col-span-7 z-10 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8083ff]/10 border border-[#c0c1ff]/20">
              <Sparkles className="w-3.5 h-3.5 text-[#c0c1ff]" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#c0c1ff] uppercase">Next-Gen Outreach</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight bg-gradient-to-r from-[#c0c1ff] to-[#5de6ff] bg-clip-text text-transparent">
              Your Job Search, <br/>Amplified by AI.
            </h1>

            <p className="text-sm md:text-base text-[#c7c4d7] max-w-lg leading-relaxed">
              Land your dream role with precision-engineered email outreach. Our AI crafts personalized, high-converting drafts tailored to every job description in seconds.
            </p>

            {/* Error Message banner */}
            {errorMsg && (
              <div className="flex gap-2 p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-rose-350 text-xs items-center max-w-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-450" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Active authentication / payment select panel block (integrated directly inside hero for perfect flow) */}
            <div className="pt-2 max-w-md">
              {!showAdminLogin ? (
                initialPaymentRequiredUserId ? (
                  // Payment Select Card
                  <div className="p-5 rounded-2xl bg-[#0f172a]/60 backdrop-blur-md border border-[#c0c1ff]/10 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-[#dce1fb]">Unlock Outreach Platform</h3>
                      <p className="text-[11px] text-[#c7c4d7]">Choose a subscription option to launch your cold emails pipeline.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-[#0c1324]/80 border border-[#464554]/40 rounded-xl flex flex-col justify-between hover:border-[#c0c1ff]/40 transition-colors">
                        <div>
                          <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">Plan Option 1</span>
                          <h4 className="text-xs font-bold text-neutral-200">Yearly Plan</h4>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-xs font-bold text-neutral-100">₹100<span className="text-[9px] text-neutral-500 font-normal">/yr</span></span>
                          <button
                            onClick={() => handleStartPurchase('yearly')}
                            disabled={isSubmitting}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-[#dce1fb] border border-neutral-800 text-[9px] font-bold rounded-md transition-colors cursor-pointer"
                          >
                            Select
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-[#0c1324]/80 border border-[#c0c1ff]/20 rounded-xl flex flex-col justify-between hover:border-[#c0c1ff]/40 transition-colors relative">
                        <div className="absolute top-0 right-2 translate-y-[-50%] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/40 text-[#c0c1ff] text-[7px] font-bold uppercase tracking-wide">
                          Best Value
                        </div>
                        <div>
                          <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">Plan Option 2</span>
                          <h4 className="text-xs font-bold text-neutral-200">Lifetime Plan</h4>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-xs font-bold text-neutral-100">₹300<span className="text-[9px] text-neutral-500 font-normal">/once</span></span>
                          <button
                            onClick={() => handleStartPurchase('lifetime')}
                            disabled={isSubmitting}
                            className="px-2.5 py-1 bg-[#c0c1ff] hover:bg-white text-[#1000a9] text-[9px] font-bold rounded-md transition-colors cursor-pointer"
                          >
                            Unlock
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={onClearPaymentRequired}
                      className="w-full py-2 bg-transparent hover:bg-zinc-900/60 border border-neutral-800 text-neutral-450 hover:text-neutral-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel / Sign Out
                    </button>
                  </div>
                ) : (
                  // Google Sign-In Trigger
                  <div className="flex flex-wrap gap-4 items-center">
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="bg-[#c0c1ff] text-[#1000a9] font-bold px-8 py-4 rounded-2xl hover:scale-95 transition-all shadow-xl shadow-purple-500/20 flex items-center gap-2 cursor-pointer text-sm"
                    >
                      {isSubmitting ? 'Connecting...' : 'Sign in with Google'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <a
                      href="#how-it-works"
                      className="px-8 py-4 bg-[#0f172a]/60 border border-[#c0c1ff]/10 hover:bg-[#191f31] text-[#dce1fb] font-semibold rounded-2xl transition-all flex items-center gap-2 text-sm"
                    >
                      <PlayCircle className="w-4 h-4 text-purple-400" />
                      Watch Demo
                    </a>
                  </div>
                )
              ) : (
                // Owner verification passcode form
                <form onSubmit={handleAdminLogin} className="p-5 rounded-2xl bg-[#0f172a]/60 backdrop-blur-md border border-[#c0c1ff]/10 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#dce1fb]">Admin Authentication</h3>
                    <p className="text-[11px] text-[#c7c4d7]">Enter passcode to view administrative dashboard indicators.</p>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="password"
                      required
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter owner passcode"
                      className="w-full rounded-xl border border-neutral-800 bg-[#0c1324] px-4 py-2.5 text-xs focus:outline-none focus:border-neutral-700 text-[#dce1fb]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAdminLogin(false)}
                      className="w-1/2 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-350 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-1/2 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {isSubmitting ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Micro proof text */}
            <div className="flex items-center gap-4 pt-6 text-[#c7c4d7]/60 text-xs">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-[#0c1324] bg-[#2e3447] flex items-center justify-center text-[10px] font-bold">JD</div>
                <div className="w-8 h-8 rounded-full border-2 border-[#0c1324] bg-[#2e3447] flex items-center justify-center text-[10px] font-bold">MK</div>
                <div className="w-8 h-8 rounded-full border-2 border-[#0c1324] bg-[#2e3447] flex items-center justify-center text-[10px] font-bold">AL</div>
              </div>
              <p className="font-mono text-[11px]">Joined by 10k+ professionals this month</p>
            </div>
          </div>

          {/* Right Column: High-fidelity premium 3D illustration mock matches Stitch */}
          <div className="lg:col-span-5 relative hidden lg:block z-10">
            <div className="animate-[bounce_6s_ease-in-out_infinite]">
              <img 
                alt="Workspace Illustration" 
                className="w-full h-auto rounded-2xl border border-[#c0c1ff]/10 shadow-2xl bg-[#0f172a]/30 backdrop-blur-md" 
                src={illustration} 
              />
            </div>
            {/* Ambient blur circle background element */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#c0c1ff]/10 blur-[100px] rounded-full pointer-events-none" />
          </div>

        </div>
      </section>

      {/* Social Proof Partners Banner */}
      <section className="py-12 border-y border-[#464554]/10 bg-[#070d1f]/40 z-10 relative">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-[10px] font-mono tracking-[0.2em] text-[#c7c4d7] text-center uppercase mb-8">
            Our users have secured interviews at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-500 text-sm font-black tracking-tighter text-[#dce1fb]">
            <span>GLOBO</span>
            <span>NEXUS</span>
            <span>VELOCITY</span>
            <span>ZENITH</span>
            <span>AETHER</span>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid Section */}
      <section className="py-24 px-6 max-w-[1200px] mx-auto z-10 relative" id="features">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-[#dce1fb]">
            Precision Tools for Modern Seekers
          </h2>
          <p className="text-sm text-[#c7c4d7] max-w-xl mx-auto leading-relaxed">
            Skip the generic templates. Use AI that understands your career narrative and the roles you're chasing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: AI Email Drafting (2 Cols) */}
          <div className="md:col-span-2 rounded-2xl p-6 bg-[#0f172a]/60 backdrop-blur-md border border-[#c0c1ff]/10 hover:border-[#c0c1ff]/30 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between min-h-[240px]">
            {/* Soft inner radial gradient */}
            <div className="absolute inset-0 bg-radial-gradient from-purple-500/5 to-transparent pointer-events-none" />
            <div className="space-y-4 z-10">
              <Mail className="w-8 h-8 text-[#c0c1ff]" />
              <h3 className="text-lg font-bold text-[#dce1fb]">Smart AI Email Drafting</h3>
              <p className="text-xs text-[#c7c4d7] max-w-md leading-relaxed">
                Every email is unique. Our engine analyzes the job description and your profile to craft a narrative that resonates with recruiters.
              </p>
            </div>
            {/* Visual simulation elements */}
            <div className="mt-8 flex gap-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 w-full max-w-sm">
              <div className="bg-[#191f31] rounded-xl p-3 border border-[#464554]/20 flex-1 space-y-2">
                <div className="h-1.5 w-2/3 bg-purple-500/20 rounded" />
                <div className="h-1.5 w-full bg-[#464554]/20 rounded" />
                <div className="h-1.5 w-1/2 bg-[#464554]/20 rounded" />
              </div>
              <div className="bg-[#191f31] rounded-xl p-3 border border-[#c0c1ff]/30 flex-1 space-y-2">
                <div className="h-1.5 w-2/3 bg-[#c0c1ff]/40 rounded" />
                <div className="h-1.5 w-full bg-[#c0c1ff]/20 rounded" />
                <div className="h-1.5 w-4/5 bg-[#c0c1ff]/20 rounded" />
              </div>
            </div>
          </div>

          {/* Card 2: Resume Parsing (1 Col) */}
          <div className="rounded-2xl p-6 bg-[#0f172a]/60 backdrop-blur-md border border-[#c0c1ff]/10 hover:border-[#c0c1ff]/30 transition-all duration-300 flex flex-col justify-between min-h-[240px]">
            <FileText className="w-8 h-8 text-[#5de6ff]" />
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#dce1fb]">Resume Parsing</h3>
              <p className="text-xs text-[#c7c4d7] leading-relaxed">
                Upload PDF files. We extract your core skills, expected salaries, target positions, and achievements to prime the AI.
              </p>
            </div>
          </div>

          {/* Card 3: Gmail Integration (1 Col) */}
          <div className="rounded-2xl p-6 bg-[#0f172a]/60 backdrop-blur-md border border-[#c0c1ff]/10 hover:border-[#c0c1ff]/30 transition-all duration-300 flex flex-col justify-between min-h-[240px]">
            <ShieldCheck className="w-8 h-8 text-[#c0c1ff]" />
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#dce1fb]">Gmail Integration</h3>
              <p className="text-xs text-[#c7c4d7] leading-relaxed">
                Secure, official API Google OAuth connection. Review, edit, compile drafts and send directly from Outreach AI.
              </p>
            </div>
          </div>

          {/* Card 4: CSV Bulk Outreach (2 Cols) */}
          <div className="md:col-span-2 rounded-2xl p-6 bg-[#0f172a]/60 backdrop-blur-md border border-[#c0c1ff]/10 hover:border-[#c0c1ff]/30 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[240px]">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between w-full h-full">
              <div className="space-y-4 flex-1">
                <Layers className="w-8 h-8 text-[#ffb783]" />
                <h3 className="text-lg font-bold text-[#dce1fb]">CSV Bulk Outreach</h3>
                <p className="text-xs text-[#c7c4d7] leading-relaxed">
                  Managing 50+ applications? Upload a CSV and let the AI generate personalized drafts for your entire list in one go.
                </p>
              </div>
              {/* Visual simulation spreadsheet overlay */}
              <div className="flex-1 w-full bg-[#151b2d] p-4 rounded-xl border border-[#464554]/20 font-mono text-[9px] text-[#c7c4d7]/40 space-y-2">
                <div className="grid grid-cols-4 border-b border-[#464554]/25 pb-1.5">
                  <span>Company</span><span>Role</span><span>Contact</span><span>Status</span>
                </div>
                <div className="grid grid-cols-4 gap-y-1.5">
                  <span>Apple</span><span>UX Lead</span><span>...</span><span className="text-[#c0c1ff] font-bold">Drafting</span>
                  <span>Tesla</span><span>AI Eng</span><span>...</span><span className="text-[#5de6ff] font-bold">Ready</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 bg-[#070d1f]/20 border-t border-[#464554]/10 relative z-10" id="how-it-works">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-widest text-[#c0c1ff] uppercase">Process</span>
              <h2 className="text-3xl font-bold tracking-tight text-[#dce1fb]">Zero to Sent in 4 Minutes</h2>
            </div>
            <p className="text-xs text-[#c7c4d7] max-w-xs leading-relaxed">
              Stop staring at a blank screen. Let our intelligent workflow handle the heavy lifting of job applications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Step lines connector */}
            <div className="hidden lg:block absolute top-6 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#464554]/20 to-transparent" />
            
            {[
              { step: '1', title: 'Upload Resume', desc: 'Simply drop your current CV. Our AI learns your professional voice.' },
              { step: '2', title: 'Link Gmail', desc: 'Connect via Secure OAuth. No passwords, just a trusted handshake.' },
              { step: '3', title: 'Generate Drafts', desc: 'Paste job links. Watch as AI crafts perfect outreach for each one.' },
              { step: '4', title: 'Review & Send', desc: 'Tweak if you like, then hit send. Everything stays in your Sent folder.' }
            ].map((item, idx) => (
              <div key={idx} className="space-y-4 group relative">
                <div className="w-12 h-12 rounded-full bg-[#191f31] border border-[#464554]/30 flex items-center justify-center group-hover:border-[#c0c1ff]/50 transition-colors">
                  <span className="text-base font-bold text-[#c0c1ff]">{item.step}</span>
                </div>
                <h4 className="text-sm font-bold text-[#dce1fb]">{item.title}</h4>
                <p className="text-xs text-[#c7c4d7] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security details panel */}
      <section className="py-24 px-6 max-w-[1200px] mx-auto z-10 relative">
        <div className="rounded-3xl p-8 bg-gradient-to-b from-[#151b2d] to-[#070d1f] border border-[#c0c1ff]/10 text-center space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00cbe6]/10">
            <Lock className="w-8 h-8 text-[#5de6ff]" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#dce1fb]">Security is Our Foundation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-4">
            <div className="p-5 rounded-2xl bg-[#0c1324]/50 border border-[#464554]/10 space-y-2">
              <h5 className="text-xs font-bold text-[#dce1fb]">Google OAuth Only</h5>
              <p className="text-[11px] text-[#c7c4d7] leading-relaxed">
                We use official Google authentication. We never see or store your Gmail password.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c1324]/50 border border-[#464554]/10 space-y-2">
              <h5 className="text-xs font-bold text-[#dce1fb]">Smart Sending Delays</h5>
              <p className="text-[11px] text-[#c7c4d7] leading-relaxed">
                Emails are paced naturally with random delays to keep your account's sender score perfect.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c1324]/50 border border-[#464554]/10 space-y-2">
              <h5 className="text-xs font-bold text-[#dce1fb]">No Data Resale</h5>
              <p className="text-[11px] text-[#c7c4d7] leading-relaxed">
                Your resume and drafts belong to you. We never train public models on your private data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Options Section */}
      <section className="py-24 px-6 max-w-[1200px] mx-auto z-10 relative" id="pricing">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-[#dce1fb]">
            Simple, Growth-Focused Pricing
          </h2>
          <p className="text-sm text-[#c7c4d7] max-w-xl mx-auto leading-relaxed">
            Scale your search at the pace you need with our simple licensing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Option 1: Yearly */}
          <div className="rounded-2xl p-6 bg-[#0f172a]/60 backdrop-blur-md border border-[#c0c1ff]/10 hover:border-[#c0c1ff]/30 transition-all duration-300 flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <span className="text-[9px] font-mono tracking-widest text-[#c7c4d7] uppercase block">Yearly Access</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#dce1fb]">₹100</span>
                <span className="text-xs text-[#c7c4d7]">/year</span>
              </div>
              <ul className="space-y-3 pt-2 text-xs text-[#c7c4d7] space-y-3">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#c0c1ff]" /> Unlimited AI Drafts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#c0c1ff]" /> Gmail OAuth Integration</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#c0c1ff]" /> Review Queue panel</li>
              </ul>
            </div>
            <button 
              onClick={() => handleStartPurchase('yearly')}
              className="mt-6 w-full py-3 rounded-xl border border-[#464554]/30 text-xs font-bold hover:bg-[#191f31] text-[#dce1fb] transition-all cursor-pointer"
            >
              Start Yearly Access
            </button>
          </div>

          {/* Option 2: Lifetime */}
          <div className="rounded-2xl p-6 bg-purple-950/20 backdrop-blur-md border border-[#c0c1ff]/30 hover:border-[#c0c1ff]/60 transition-all duration-300 flex flex-col justify-between min-h-[300px] relative">
            <div className="absolute top-0 right-4 translate-y-[-50%] bg-[#c0c1ff] text-[#1000a9] font-bold text-[8px] font-mono px-3 py-1 rounded-full">
              POPULAR
            </div>
            <div className="space-y-4">
              <span className="text-[9px] font-mono tracking-widest text-[#c0c1ff] uppercase block">Lifetime License</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#c0c1ff]">₹300</span>
                <span className="text-xs text-[#c7c4d7]">/once</span>
              </div>
              <ul className="space-y-3 pt-2 text-xs text-[#dce1fb] space-y-3">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#c0c1ff]" /> Permanent ownership license</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#c0c1ff]" /> CSV bulk applications upload</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#c0c1ff]" /> Lifetime releases & updates</li>
              </ul>
            </div>
            <button 
              onClick={() => handleStartPurchase('lifetime')}
              className="mt-6 w-full py-3 rounded-xl bg-[#c0c1ff] text-[#1000a9] text-xs font-bold hover:bg-[#dce1fb] transition-all cursor-pointer shadow-lg shadow-purple-500/10"
            >
              Go Lifetime License
            </button>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section className="py-24 px-6 max-w-[800px] mx-auto z-10 relative" id="faq">
        <h2 className="text-2xl font-bold tracking-tight text-center text-[#dce1fb] mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: 'Is it safe to connect my Gmail?',
              a: 'Yes. We use Google’s official OAuth 2.0 protocol. This means we never see your password, and you can revoke access at any time through your Google Account settings.'
            },
            {
              q: 'How does the AI personalize my emails?',
              a: 'Our AI analyzes the specific requirements and keywords in the job description and cross-references them with the skills and experiences in your resume to create a unique value proposition for each role.'
            },
            {
              q: 'Can I edit the drafts before sending?',
              a: 'Absolutely. We encourage you to review every draft. You can make manual edits within our interface before hitting the send button.'
            }
          ].map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="rounded-2xl border border-[#464554]/20 bg-[#0f172a]/60 backdrop-blur-md overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 flex justify-between items-center text-left text-xs font-bold text-[#dce1fb] transition-colors hover:text-[#c0c1ff] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#c0c1ff]' : ''}`} />
                </button>
                
                <div 
                  className={`transition-all duration-300 overflow-hidden ${
                    isOpen ? 'max-h-40 border-t border-[#464554]/10' : 'max-h-0'
                  }`}
                >
                  <p className="px-5 py-4 text-xs text-[#c7c4d7] leading-relaxed bg-[#0c1324]/30">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-24 px-6 max-w-[1200px] mx-auto text-center z-10 relative">
        <div className="rounded-3xl p-12 bg-gradient-to-b from-[#151b2d] to-[#070d1f] border border-[#c0c1ff]/10 relative overflow-hidden space-y-6">
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#5de6ff]/5 blur-[100px] rounded-full pointer-events-none" />
          
          <h2 className="text-3xl md:text-5xl font-black leading-tight text-[#dce1fb]">
            Stop searching. <br/>
            <span className="bg-gradient-to-r from-[#c0c1ff] to-[#5de6ff] bg-clip-text text-transparent">Start landing.</span>
          </h2>
          
          <button 
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="bg-[#c0c1ff] text-[#1000a9] font-bold px-8 py-4 rounded-2xl hover:scale-95 transition-all shadow-xl shadow-purple-500/20 inline-flex items-center gap-2 cursor-pointer text-sm"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2a6.386 6.386 0 0 1-6.39-6.39 6.386 6.386 0 0 1 6.39-6.39c2.866 0 4.743 1.177 5.733 2.11l3.22-3.22A10.825 10.825 0 0 0 12.24 1.2a10.8 10.8 0 0 0-10.8 10.8 10.8 10.8 0 0 0 10.8 10.8c5.842 0 10.963-4.225 10.963-10.8 0-.665-.06-1.25-.19-1.715H12.24Z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </section>

      {/* Simulated Razorpay Verification sandbox modal */}
      {showMockPaymentModal && (
        <div className="fixed inset-0 z-50 bg-[#070d1f]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-800 bg-[#0f172a] rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c0c1ff] to-[#5de6ff] rounded-t-xl" />
            <h3 className="text-sm font-semibold text-neutral-250 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              Payment Sandbox Simulation
            </h3>
            <p className="text-xs text-neutral-450 leading-relaxed">
              No Razorpay keys are detected in settings. Triggering a simulated sandbox licensing order:
            </p>
            <div className="bg-[#0c1324] border border-[#464554]/30 p-3.5 rounded-xl text-[10px] text-neutral-400 font-mono space-y-1">
              <div>Order ID: <span className="text-[#dce1fb]">{mockOrderId}</span></div>
              <div>Plan Selected: <span className="text-[#c0c1ff] uppercase font-bold">{selectedPlan}</span></div>
              <div>Total Cost: <span className="text-emerald-400">₹{selectedPlan === 'yearly' ? '100.00' : '300.00'}</span></div>
              <div>Gateway: <span className="text-amber-500 font-bold">Simulated Razorpay</span></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowMockPaymentModal(false)}
                className="w-1/2 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyMockPayment}
                disabled={isSubmitting}
                className="w-1/2 py-2 bg-[#c0c1ff] text-[#1000a9] font-bold rounded-lg text-xs transition-colors shadow-md cursor-pointer"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-12 border-t border-[#464554]/10 bg-[#070d1f]">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img alt="Outreach AI Logo" className="h-6 w-6 object-contain" src={logo} />
              <span className="text-base font-bold text-[#dce1fb] tracking-tight">Outreach AI</span>
            </div>
            <p className="text-xs text-[#c7c4d7] leading-relaxed">
              Precision-engineered for growth. Amplifying human potential with intelligent communication.
            </p>
            <p className="text-[10px] text-neutral-600">© 2026 Outreach AI. All rights reserved.</p>
          </div>
          
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-[#dce1fb]">Product</h5>
            <nav className="flex flex-col gap-1.5 text-xs text-[#c7c4d7]">
              <a className="hover:text-[#c0c1ff] transition-colors" href="#features">Features</a>
              <a className="hover:text-[#c0c1ff] transition-colors" href="#pricing">Pricing</a>
              <a className="hover:text-[#c0c1ff] transition-colors" href="#how-it-works">How it works</a>
            </nav>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-[#dce1fb]">Legal</h5>
            <nav className="flex flex-col gap-1.5 text-xs text-[#c7c4d7]">
              <a className="hover:text-[#c0c1ff] transition-colors" href="/privacy">Privacy Policy</a>
              <a className="hover:text-[#c0c1ff] transition-colors" href="/terms">Terms of Service</a>
            </nav>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-[#dce1fb]">Connect</h5>
            <nav className="flex flex-col gap-1.5 text-xs text-[#c7c4d7]">
              <a className="hover:text-[#c0c1ff] transition-colors" href="#">LinkedIn</a>
              <a className="hover:text-[#c0c1ff] transition-colors" href="#">Twitter</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};
