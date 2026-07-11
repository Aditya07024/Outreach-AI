import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { 
  Sparkles, 
  Mail, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Check,
  ChevronDown,
  PlayCircle,
  FileText,
  Layers,
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
          color: '#2563eb'
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
    <div className="min-h-screen bg-white text-neutral-800 flex flex-col justify-between overflow-x-hidden relative selection:bg-blue-500/20 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:24px_24px]">
      
      {/* Inline styles for custom premium animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.15;
            transform: scale(1);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.05);
          }
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-pulse-glow {
          animation: pulseGlow 8s ease-in-out infinite;
        }
        .animation-delay-100 { animation-delay: 100ms; }
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-300 { animation-delay: 300ms; }
        .animation-delay-400 { animation-delay: 400ms; }
        .animation-delay-500 { animation-delay: 500ms; }
      `}} />

      {/* Main Sky Blue Grid Hero Banner Wrapper */}
      <div className="w-full bg-[#f3f8ff] pb-16">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-6">
          <div className="rounded-3xl bg-[#70a6ff] bg-[linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:40px_40px] p-6 md:p-12 pb-24 shadow-md relative overflow-hidden">
            
            {/* Soft decorative background glows inside the banner */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-300/30 blur-[130px] pointer-events-none animate-pulse-glow" />

            {/* Floating White Navbar Capsule */}
            <header className="w-full max-w-[1000px] mx-auto bg-white/95 backdrop-blur-md rounded-full px-6 py-2 flex items-center justify-between shadow-lg shadow-black/5 border border-white/20 relative z-50">
              <div className="flex items-center gap-2">
                <img alt="Outreach AI Logo" className="h-6 w-6 object-contain" src={logo} />
                <span className="text-sm font-black text-neutral-900 tracking-tight">Outreach AI</span>
              </div>
              
              <div className="hidden md:flex gap-8 text-xs font-bold text-neutral-500">
                <a className="hover:text-black transition-colors" href="#features">Features</a>
                <a className="hover:text-black transition-colors" href="#how-it-works">How it works</a>
                <a className="hover:text-black transition-colors" href="#pricing">Pricing</a>
                <a className="hover:text-black transition-colors" href="#faq">FAQ</a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin-portal')}
                  className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-full text-[10px] transition-colors cursor-pointer"
                >
                  Admin
                </button>

                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold px-4 py-1.5 rounded-full text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-blue-500/10 hover:scale-95"
                >
                  Login
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </header>

            {/* Hero Main Content Grid */}
            <div className="grid lg:grid-cols-12 gap-12 items-center w-full mt-16 md:mt-20 max-w-[1000px] mx-auto text-left relative z-10">
              
              {/* Left Column: Title Copy & Subtitle */}
              <div className="space-y-6 lg:col-span-7 text-left text-white animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-mono font-bold tracking-widest uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Next-Gen Outreach</span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-5.5xl font-black leading-tight tracking-tight text-white animate-fade-in-up animation-delay-100">
                  Secret Weapon of <br/>Successful Job Seekers
                </h1>

                <p className="text-xs md:text-sm text-white/90 max-w-md leading-relaxed animate-fade-in-up animation-delay-200">
                  Land your dream role with precision-engineered email outreach. Our AI drafts recruiter pitch emails using your resume details, reviews drafts in a queue, and sends safely with anti-spam protection delays.
                </p>

                <div className="flex flex-wrap gap-3.5 items-center pt-2 animate-fade-in-up animation-delay-300">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="bg-black hover:bg-neutral-900 text-white font-bold px-7 py-3 rounded-full hover:scale-95 transition-all text-xs cursor-pointer shadow-xl shadow-black/20"
                  >
                    Get Started
                  </button>
                  <a
                    href="#how-it-works"
                    className="text-white hover:text-white/80 font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    Request a Demo <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Right Column: Premium white Dashboard Mockup with Glass Gating Overlay */}
              <div className="lg:col-span-5 relative animate-fade-in-up animation-delay-200">
                {/* Underlying White Dashboard Mockup Card */}
                <div className="w-full bg-white rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-neutral-100/80 font-sans text-neutral-800 space-y-4">
                  {/* Header Controls */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="text-[9px] text-neutral-400 font-mono">outreach-ai.dashboard</div>
                    <div className="w-8" />
                  </div>
                  
                  <div className="grid grid-cols-12 gap-3">
                    {/* Mini Sidebar */}
                    <div className="col-span-3 border-r border-neutral-100 pr-2.5 space-y-4">
                      <div className="flex items-center gap-1">
                        <img alt="logo" className="w-3.5 h-3.5 object-contain" src={logo} />
                        <span className="text-[9px] font-bold text-neutral-900 tracking-tight">Outreach</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-[8px] font-bold flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5" />
                          Overview
                        </div>
                        <div className="px-2 py-1 rounded text-neutral-500 hover:bg-neutral-50 text-[8px] font-semibold flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" />
                          Campaigns
                        </div>
                        <div className="px-2 py-1 rounded text-neutral-500 hover:bg-neutral-50 text-[8px] font-semibold flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Queue
                        </div>
                        <div className="px-2 py-1 rounded text-neutral-500 hover:bg-neutral-50 text-[8px] font-semibold flex items-center gap-1">
                          <KeyRound className="w-2.5 h-2.5" />
                          Settings
                        </div>
                      </div>
                    </div>
                    
                    {/* Main body stats */}
                    <div className="col-span-9 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-900">Outbox Queue Overview</span>
                        <span className="text-[8px] bg-emerald-100 text-emerald-850 px-1.5 py-0.5 rounded-full font-bold">Active</span>
                      </div>
                      
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-neutral-50 p-1.5 rounded-lg border border-neutral-100 space-y-0.5">
                          <span className="text-[7px] text-neutral-400 block font-bold uppercase">Drafts</span>
                          <span className="text-[11px] font-extrabold text-neutral-800 block">230</span>
                          <span className="text-[6px] text-emerald-600 font-bold block">+8.2%</span>
                        </div>
                        <div className="bg-neutral-50 p-1.5 rounded-lg border border-neutral-100 space-y-0.5">
                          <span className="text-[7px] text-neutral-400 block font-bold uppercase">Sent</span>
                          <span className="text-[11px] font-extrabold text-neutral-800 block">2,648</span>
                          <span className="text-[6px] text-emerald-600 font-bold block">+6.2%</span>
                        </div>
                        <div className="bg-neutral-50 p-1.5 rounded-lg border border-neutral-100 space-y-0.5">
                          <span className="text-[7px] text-neutral-400 block font-bold uppercase">Delays</span>
                          <span className="text-[11px] font-extrabold text-neutral-800 block">99.8%</span>
                          <span className="text-[6px] text-emerald-600 font-bold block">Safe</span>
                        </div>
                      </div>
                      
                      {/* Mini chart */}
                      <div className="border border-neutral-100 p-2 rounded-lg space-y-1">
                        <div className="text-[8px] font-bold text-neutral-905">Campaign response rates</div>
                        <div className="flex items-end justify-between h-10 pt-1">
                          <div className="w-1.5 bg-blue-500 rounded-t h-3" />
                          <div className="w-1.5 bg-blue-300 rounded-t h-5" />
                          <div className="w-1.5 bg-blue-500 rounded-t h-8" />
                          <div className="w-1.5 bg-blue-400 rounded-t h-6" />
                          <div className="w-1.5 bg-blue-500 rounded-t h-9" />
                          <div className="w-1.5 bg-blue-300 rounded-t h-4" />
                          <div className="w-1.5 bg-blue-500 rounded-t h-7" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Glassmorphic Gating Overlay Card */}
                <div className="absolute inset-0 bg-white/45 backdrop-blur-[3px] rounded-2xl flex items-center justify-center p-4">
                  <div className="w-full bg-white/95 border border-neutral-100 rounded-xl p-5 shadow-xl space-y-4">
                    
                    {errorMsg && (
                      <div className="flex gap-2 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-[10px] items-center">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {initialPaymentRequiredUserId ? (
                      // Payment Gating Card
                      <div className="space-y-4 text-center">
                        <div className="space-y-1">
                          <h3 className="text-xs font-bold text-neutral-905">Unlock Outreach Platform</h3>
                          <p className="text-[10px] text-neutral-500 font-medium">Choose a subscription option to launch your cold emails pipeline.</p>
                        </div>

                        <div className="space-y-2">
                          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex justify-between items-center hover:border-blue-500 transition-colors">
                            <div className="text-left space-y-0.5">
                              <h4 className="text-[10px] font-bold text-neutral-805">Yearly Plan</h4>
                              <span className="text-[9px] text-neutral-500">₹100/year</span>
                            </div>
                            <button
                              onClick={() => handleStartPurchase('yearly')}
                              disabled={isSubmitting}
                              className="px-3 py-1 bg-neutral-900 hover:bg-black text-white text-[9px] font-bold rounded cursor-pointer"
                            >
                              Select
                            </button>
                          </div>

                          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg flex justify-between items-center hover:border-blue-500 transition-colors relative">
                            <div className="absolute top-0 right-2 translate-y-[-50%] px-1 py-0.5 rounded bg-blue-600 text-white text-[6px] font-bold uppercase tracking-wide">
                              Best Value
                            </div>
                            <div className="text-left space-y-0.5">
                              <h4 className="text-[10px] font-bold text-neutral-805">Lifetime Plan</h4>
                              <span className="text-[9px] text-blue-600 font-bold">₹300 once</span>
                            </div>
                            <button
                              onClick={() => handleStartPurchase('lifetime')}
                              disabled={isSubmitting}
                              className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 text-[9px] font-bold rounded cursor-pointer shadow-md shadow-blue-500/10"
                            >
                              Unlock
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={onClearPaymentRequired}
                          className="w-full py-1.5 border border-neutral-200 text-neutral-500 hover:text-neutral-700 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          Cancel / Sign Out
                        </button>
                      </div>
                    ) : showAdminLogin ? (
                      // Admin Login Card
                      <form onSubmit={handleAdminLogin} className="space-y-3 text-center">
                        <div className="space-y-1">
                          <h3 className="text-xs font-bold text-neutral-900">Admin Authentication</h3>
                          <p className="text-[10px] text-neutral-500 font-medium">Enter passcode to view administrative dashboard.</p>
                        </div>
                        <input
                          type="password"
                          required
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          placeholder="Enter passcode"
                          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-neutral-805"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAdminLogin(false)}
                            className="w-1/2 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-1/2 py-1.5 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            {isSubmitting ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      // Google Sign-In Card
                      <div className="space-y-4 text-center">
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1.5 py-0.5 px-2.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[8px] font-mono w-fit mx-auto">
                            <Lock className="w-2.5 h-2.5 text-blue-500" />
                            <span>OAuth 2.0 Secure</span>
                          </div>
                          <h3 className="text-xs font-bold text-neutral-900 tracking-tight">Access Dashboard</h3>
                          <p className="text-[10px] text-neutral-500 leading-normal">
                            Sign in with Google to set up campaigns, upload resumes, and automate cold emails.
                          </p>
                        </div>

                        <button
                          onClick={handleGoogleSignIn}
                          disabled={isSubmitting}
                          className="w-full py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 hover:border-neutral-300 text-[10px] font-bold rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#ea4335"
                              d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.827.99 15.09 0 12 0 7.34 0 3.318 2.668 1.34 6.57l3.926 3.195z"
                            />
                            <path
                              fill="#4285f4"
                              d="M24 12.24c0-.825-.075-1.62-.212-2.385H12v4.51h6.724a5.747 5.747 0 0 1-2.495 3.778v3.136h4.037C22.623 19.125 24 15.933 24 12.24z"
                            />
                            <path
                              fill="#fbbc05"
                              d="M5.266 14.235a7.1 7.1 0 0 1 0-4.47L1.34 6.57a12.022 12.022 0 0 0 0 10.86l3.926-3.195z"
                            />
                            <path
                              fill="#34a853"
                              d="M12 24c3.24 0 5.955-1.075 7.94-2.915l-4.037-3.136c-1.12.75-2.55 1.205-3.903 1.205-2.977 0-5.503-2.01-6.403-4.71H1.543v3.253C3.582 21.737 7.545 24 12 24z"
                            />
                          </svg>
                          {isSubmitting ? 'Connecting...' : 'Continue with Google'}
                        </button>

                        <div className="pt-3 border-t border-neutral-100 text-left space-y-1.5 text-[8px] text-neutral-450 leading-relaxed">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            <span><strong>Zero Password Storage</strong>: authenticated directly via official Google OAuth handshake.</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            <span><strong>Safety Delays</strong>: sequence emails safely with customizable anti-spam delays.</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Social Proof Partners Banner */}
      <section className="py-12 border-b border-neutral-100 bg-[#f8faff] z-10 relative">
        <div className="max-w-[1000px] mx-auto px-6">
          <p className="text-[10px] font-mono tracking-[0.2em] text-neutral-400 text-center uppercase mb-8">
            Our users have secured interviews at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 text-xs font-black tracking-tighter text-neutral-500">
            <span>GLOBO</span>
            <span>NEXUS</span>
            <span>VELOCITY</span>
            <span>ZENITH</span>
            <span>AETHER</span>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid Section */}
      <section className="py-24 px-6 max-w-[1000px] mx-auto z-10 relative" id="features">
        <div className="text-center mb-16 space-y-3">
          <span className="text-[10px] font-mono tracking-widest text-[#2563eb] uppercase font-bold">Capabilities</span>
          <h2 className="text-3xl font-black tracking-tight text-neutral-900">
            Find out why we're best-in-class
          </h2>
          <p className="text-xs text-neutral-500 max-w-xl mx-auto leading-relaxed">
            Skip the generic templates. Use AI that understands your career narrative and the roles you're chasing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-neutral-800">
          
          {/* Card 1: AI Email Drafting (2 Cols) */}
          <div className="md:col-span-2 rounded-2xl p-6 bg-[#f8faff] border border-neutral-200/60 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 relative overflow-hidden group flex flex-col justify-between min-h-[240px] hover:shadow-xl hover:shadow-blue-500/5">
            <div className="space-y-4 z-10">
              <Mail className="w-8 h-8 text-blue-500" />
              <h3 className="text-base font-bold text-neutral-900">Smart AI Email Drafting</h3>
              <p className="text-xs text-neutral-500 max-w-md leading-relaxed">
                Every email is unique. Our engine analyzes the job description and your profile to craft a narrative that resonates with recruiters.
              </p>
            </div>
            {/* Visual simulation elements */}
            <div className="mt-6 flex gap-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 w-full max-w-sm">
              <div className="bg-white rounded-xl p-3 border border-neutral-200/60 flex-1 space-y-2 shadow-sm">
                <div className="h-1.5 w-2/3 bg-blue-500/20 rounded" />
                <div className="h-1.5 w-full bg-neutral-200/40 rounded" />
                <div className="h-1.5 w-1/2 bg-neutral-200/40 rounded" />
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-200 flex-1 space-y-2 shadow-sm">
                <div className="h-1.5 w-2/3 bg-blue-500/30 rounded" />
                <div className="h-1.5 w-full bg-blue-100 rounded" />
                <div className="h-1.5 w-4/5 bg-blue-100 rounded" />
              </div>
            </div>
          </div>

          {/* Card 2: Resume Parsing (1 Col) */}
          <div className="rounded-2xl p-6 bg-[#f8faff] border border-neutral-200/60 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 flex flex-col justify-between min-h-[240px] hover:shadow-xl hover:shadow-blue-500/5">
            <FileText className="w-8 h-8 text-cyan-500" />
            <div className="space-y-2">
              <h3 className="text-base font-bold text-neutral-900">Resume Parsing</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Upload PDF files. We extract your core skills, expected salaries, target positions, and achievements to prime the AI.
              </p>
            </div>
          </div>

          {/* Card 3: Gmail Integration (1 Col) */}
          <div className="rounded-2xl p-6 bg-[#f8faff] border border-neutral-200/60 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 flex flex-col justify-between min-h-[240px] hover:shadow-xl hover:shadow-blue-500/5">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
            <div className="space-y-2">
              <h3 className="text-base font-bold text-neutral-900">Gmail Integration</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Secure, official API Google OAuth connection. Review, edit, compile drafts and send directly from Outreach AI.
              </p>
            </div>
          </div>

          {/* Card 4: CSV Bulk Outreach (2 Cols) */}
          <div className="md:col-span-2 rounded-2xl p-6 bg-[#f8faff] border border-neutral-200/60 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 flex flex-col justify-between relative overflow-hidden group min-h-[240px] hover:shadow-xl hover:shadow-blue-500/5">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between w-full h-full">
              <div className="space-y-4 flex-1">
                <Layers className="w-8 h-8 text-amber-500" />
                <h3 className="text-base font-bold text-neutral-900">CSV Bulk Outreach</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Managing 50+ applications? Upload a CSV and let the AI generate personalized drafts for your entire list in one go.
                </p>
              </div>
              {/* Visual simulation spreadsheet overlay */}
              <div className="flex-1 w-full bg-white p-4 rounded-xl border border-neutral-200 font-mono text-[9px] text-neutral-500 space-y-2 shadow-sm">
                <div className="grid grid-cols-4 border-b border-neutral-100 pb-1.5">
                  <span>Company</span><span>Role</span><span>Contact</span><span>Status</span>
                </div>
                <div className="grid grid-cols-4 gap-y-1.5">
                  <span>Apple</span><span>UX Lead</span><span>...</span><span className="text-blue-500 font-bold">Drafting</span>
                  <span>Tesla</span><span>AI Eng</span><span>...</span><span className="text-emerald-500 font-bold">Ready</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 border-t border-neutral-100 bg-[#f8faff]" id="how-it-works">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-widest text-blue-600 uppercase font-bold">Process</span>
              <h2 className="text-3xl font-black tracking-tight text-neutral-900">Zero to Sent in 4 Minutes</h2>
            </div>
            <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
              Stop staring at a blank screen. Let our intelligent workflow handle the heavy lifting of job applications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Step lines connector */}
            <div className="hidden lg:block absolute top-6 left-12 right-12 h-[1px] bg-neutral-200" />
            
            {[
              { step: '1', title: 'Upload Resume', desc: 'Simply drop your CV. Our AI extracts core skills and learns your voice.' },
              { step: '2', title: 'Link Gmail', desc: 'Connect via Google OAuth secure token. No credentials saved.' },
              { step: '3', title: 'Generate Drafts', desc: 'Paste recruiter contacts. Watch as Grok drafts custom pitches.' },
              { step: '4', title: 'Review & Send', desc: 'Review everything. Once approved, the queue dispatches emails.' }
            ].map((item, idx) => (
              <div key={idx} className="space-y-4 group relative hover:translate-y-[-2px] transition-transform duration-300">
                <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center group-hover:border-blue-500 transition-colors shadow-sm">
                  <span className="text-sm font-bold text-blue-650">{item.step}</span>
                </div>
                <h4 className="text-xs font-bold text-neutral-900">{item.title}</h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security details panel */}
      <section className="py-24 px-6 max-w-[1000px] mx-auto z-10 relative">
        <div className="rounded-3xl p-8 bg-[#f8faff] border border-neutral-200/60 text-center space-y-8 shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-55">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-neutral-900">Security is Our Foundation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-4">
            <div className="p-5 rounded-2xl bg-white border border-neutral-200/60 space-y-2 shadow-sm">
              <h5 className="text-xs font-bold text-neutral-900">Google OAuth Only</h5>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                We authenticate securely through Google. We never ask for or save your Gmail password.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-neutral-200/60 space-y-2 shadow-sm">
              <h5 className="text-xs font-bold text-neutral-900">Natural Safety Delays</h5>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Outbound emails are delayed dynamically (1-3 minutes) to ensure natural pacing score.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-neutral-200/60 space-y-2 shadow-sm">
              <h5 className="text-xs font-bold text-neutral-900">Private Data Vault</h5>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Your data belongs to you. We never train public large language models on your resumes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Options Section */}
      <section className="py-24 px-6 max-w-[1000px] mx-auto z-10 relative" id="pricing">
        <div className="text-center mb-16 space-y-3">
          <span className="text-[10px] font-mono tracking-widest text-[#2563eb] uppercase font-bold">Licensing</span>
          <h2 className="text-3xl font-black tracking-tight text-neutral-900">
            Simple, Growth-Focused Pricing
          </h2>
          <p className="text-xs text-neutral-500 max-w-xl mx-auto leading-relaxed">
            Scale your search at the pace you need with our simple licensing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Option 1: Yearly */}
          <div className="rounded-2xl p-6 bg-white border border-neutral-200/80 hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between min-h-[280px] hover:scale-[1.02] hover:shadow-lg">
            <div className="space-y-4">
              <span className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase block font-bold">Yearly Access</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-neutral-900">₹100</span>
                <span className="text-xs text-neutral-400 font-semibold">/year</span>
              </div>
              <ul className="space-y-3 pt-2 text-xs text-neutral-500">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> Unlimited AI Drafts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> Gmail OAuth Integration</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> Review Queue panel</li>
              </ul>
            </div>
            <button 
              onClick={() => handleStartPurchase('yearly')}
              className="mt-6 w-full py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors cursor-pointer"
            >
              Start Yearly Access
            </button>
          </div>

          {/* Option 2: Lifetime */}
          <div className="rounded-2xl p-6 bg-blue-50/50 border border-blue-300 hover:border-blue-400 transition-all duration-300 flex flex-col justify-between min-h-[280px] relative hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute top-0 right-4 translate-y-[-50%] bg-blue-600 text-white font-bold text-[8px] font-mono px-3 py-1 rounded-full uppercase tracking-wider">
              POPULAR
            </div>
            <div className="space-y-4">
              <span className="text-[9px] font-mono tracking-widest text-blue-600 uppercase block font-bold">Lifetime License</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-neutral-900">₹300</span>
                <span className="text-xs text-neutral-555 font-semibold">/once</span>
              </div>
              <ul className="space-y-3 pt-2 text-xs text-neutral-600">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Permanent ownership license</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> CSV bulk applications upload</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Lifetime releases & updates</li>
              </ul>
            </div>
            <button 
              onClick={() => handleStartPurchase('lifetime')}
              className="mt-6 w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-md shadow-blue-500/10"
            >
              Go Lifetime License
            </button>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section className="py-24 px-6 max-w-[800px] mx-auto z-10 relative" id="faq">
        <h2 className="text-2xl font-black tracking-tight text-center text-neutral-900 mb-12">
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
                className="rounded-2xl border border-neutral-200/60 bg-[#f8faff] overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 flex justify-between items-center text-left text-xs font-bold text-neutral-800 transition-colors hover:text-black cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-650' : ''}`} />
                </button>
                
                <div 
                  className={`transition-all duration-300 overflow-hidden ${
                    isOpen ? 'max-h-40 border-t border-neutral-200/60' : 'max-h-0'
                  }`}
                >
                  <p className="px-5 py-4 text-xs text-neutral-505 leading-relaxed bg-white">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-24 px-6 max-w-[1000px] mx-auto text-center z-10 relative">
        <div className="rounded-3xl p-12 bg-[#70a6ff] bg-[linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:40px_40px] shadow-md relative overflow-hidden space-y-6">
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 blur-[100px] rounded-full pointer-events-none" />
          
          <h2 className="text-3xl md:text-5xl font-black leading-tight text-white">
            Stop searching. <br/>
            <span className="text-blue-105">Start landing.</span>
          </h2>
          
          <button 
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="bg-black text-white hover:bg-neutral-900 font-bold px-8 py-3.5 rounded-full hover:scale-95 transition-all shadow-xl shadow-black/10 inline-flex items-center gap-2 cursor-pointer text-xs"
          >
            Sign in with Google
          </button>
        </div>
      </section>

      {/* Simulated Razorpay Verification sandbox modal */}
      {showMockPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-200 bg-white rounded-2xl p-6 space-y-4 shadow-2xl relative text-neutral-800">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500 rounded-t-xl" />
            <h3 className="text-sm font-bold text-neutral-850 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
              Payment Sandbox Simulation
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              No Razorpay keys are detected in settings. Triggering a simulated sandbox licensing order:
            </p>
            <div className="bg-[#f8faff] border border-neutral-200 p-3.5 rounded-xl text-[10px] text-neutral-550 font-mono space-y-1">
              <div>Order ID: <span className="text-neutral-800">{mockOrderId}</span></div>
              <div>Plan Selected: <span className="text-blue-600 uppercase font-bold">{selectedPlan}</span></div>
              <div>Total Cost: <span className="text-emerald-600">₹{selectedPlan === 'yearly' ? '100.00' : '300.00'}</span></div>
              <div>Gateway: <span className="text-blue-500 font-bold">Simulated Razorpay</span></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowMockPaymentModal(false)}
                className="w-1/2 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyMockPayment}
                disabled={isSubmitting}
                className="w-1/2 py-2 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-lg text-xs transition-colors shadow-md cursor-pointer"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-12 border-t border-neutral-150 bg-[#f8faff]">
        <div className="max-w-[1000px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img alt="Outreach AI Logo" className="h-6 w-6 object-contain" src={logo} />
              <span className="text-base font-bold text-neutral-900 tracking-tight">Outreach AI</span>
            </div>
            <p className="text-xs text-neutral-505 leading-relaxed">
              Precision-engineered for growth. Amplifying human potential with intelligent communication.
            </p>
            <p className="text-[10px] text-neutral-400">© 2026 Outreach AI. All rights reserved.</p>
          </div>
          
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-neutral-900">Product</h5>
            <nav className="flex flex-col gap-1.5 text-xs text-neutral-500">
              <a className="hover:text-black transition-colors" href="#features">Features</a>
              <a className="hover:text-black transition-colors" href="#pricing">Pricing</a>
              <a className="hover:text-black transition-colors" href="#how-it-works">How it works</a>
            </nav>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-neutral-900">Legal</h5>
            <nav className="flex flex-col gap-1.5 text-xs text-neutral-500">
              <a className="hover:text-black transition-colors" href="/privacy">Privacy Policy</a>
              <a className="hover:text-black transition-colors" href="/terms">Terms of Service</a>
            </nav>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-neutral-900">Connect</h5>
            <nav className="flex flex-col gap-1.5 text-xs text-neutral-500">
              <a className="hover:text-black transition-colors flex items-center gap-1" href="https://aditya07.me" target="_blank" rel="noopener noreferrer">
                Developer aditya07.me
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};
