import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, Mail, Send, Sparkles, Lock, AlertCircle } from 'lucide-react';

interface PricingPageProps {
  user: {
    id: number;
    email: string | null;
    role: string;
    paid: boolean;
    plan: string | null;
    paidUntil: string | null;
  };
  onPaymentSuccess: (token: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ user, onPaymentSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Mock payment simulator state
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false);
  const [mockOrderId, setMockOrderId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'lifetime' | null>(null);

  // Load Razorpay standard script dynamically
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
      const text = await res.text();
      let order: any = {};
      try {
        order = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }

      if (!res.ok) throw new Error(order.error || 'Failed to create payment order');

      if (order.mock) {
        // Trigger simulated success dialog for sandbox/local testing
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
            const verifyText = await verifyRes.text();
            let verifyData: any = {};
            try {
              verifyData = JSON.parse(verifyText);
            } catch (jsonErr) {
              throw new Error('Failed to verify payment (invalid response from server).');
            }
            if (verifyData.success) {
              onPaymentSuccess(verifyData.token);
            } else {
              setErrorMsg('Payment verification failed.');
            }
          } catch (err) {
            setErrorMsg('Failed to verify payment with server.');
          }
        },
        prefill: {
          name: 'Developer Applicant',
          email: user.email || 'candidate@example.com'
        },
        theme: {
          color: '#8b5cf6' // Purple theme
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
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error('Verification response is not valid JSON');
      }
      if (data.success) {
        onPaymentSuccess(data.token);
      } else {
        setErrorMsg('Simulated verification failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process simulated license.');
    } finally {
      setIsSubmitting(false);
      setShowMockPaymentModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10 relative">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[300px] h-[300px] rounded-full bg-purple-900/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-900/5 blur-[100px] pointer-events-none" />

      {/* Page Title Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-800/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
          <Lock className="w-3 h-3 text-purple-400" />
          Subscription Required
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
          Choose a Plan to Unlock <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">Outreach AI</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto">
          You are successfully signed in, but all features are locked until payment is made. Select one of the plans below to instantly activate your account.
        </p>
      </div>

      {errorMsg && (
        <div className="flex gap-2 p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-450 text-xs items-center max-w-md mx-auto">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-450" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Plans Comparison Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        
        {/* Plan 1: Yearly Subscription */}
        <div className="border border-neutral-800 bg-zinc-900/40 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between relative hover:border-neutral-755 transition-all">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-neutral-200">Yearly Subscription</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">Perfect for job hunting sprints</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-neutral-450 border border-neutral-800 text-[9px] font-bold uppercase tracking-wide">
                Flexible
              </span>
            </div>

            <div className="flex items-baseline gap-1 py-2">
              <span className="text-neutral-400 text-sm font-semibold">₹</span>
              <span className="text-4xl font-black text-neutral-100">100</span>
              <span className="text-neutral-500 text-xs">/ year</span>
            </div>

            <div className="space-y-3 pt-2 border-t border-neutral-900">
              {[
                'Full access to AI Campaigns & Contacts',
                'Tailor career outreach using Grok AI',
                'Gmail API connection & secure OAuth',
                'Built-in reputation safety delays',
                'Cancel renewal at any time'
              ].map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-[11px] text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleStartPurchase('yearly')}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 font-bold rounded-lg text-xs transition-colors shadow-md mt-auto"
          >
            {isSubmitting && selectedPlan === 'yearly' ? 'Initializing Pay...' : 'Select Yearly Plan'}
          </button>
        </div>

        {/* Plan 2: Lifetime License */}
        <div className="border border-purple-900/50 bg-zinc-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between relative hover:border-purple-800 transition-all">
          
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-t-2xl" />

          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-neutral-200">Lifetime License</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">Pay once, own forever</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-800/40 text-[9px] font-bold uppercase tracking-wide">
                Best Value
              </span>
            </div>

            <div className="flex items-baseline gap-1 py-2">
              <span className="text-neutral-400 text-sm font-semibold">₹</span>
              <span className="text-4xl font-black text-neutral-100">300</span>
              <span className="text-neutral-500 text-xs">/ one-time</span>
            </div>

            <div className="space-y-3 pt-2 border-t border-neutral-900">
              {[
                'Everything included in Yearly Plan',
                'Lifetime unlimited access',
                'No recurring bills or subscriptions',
                'Priority support for integrations',
                'Lifetime free updates and new features'
              ].map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-[11px] text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleStartPurchase('lifetime')}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors shadow-lg shadow-white/5 mt-auto"
          >
            {isSubmitting && selectedPlan === 'lifetime' ? 'Initializing Pay...' : 'Buy Lifetime Access'}
          </button>
        </div>

      </div>

      {/* Benefits Section */}
      <div className="border border-neutral-900 bg-zinc-950/40 rounded-xl p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
        {[
          { title: 'Secure Checkouts', desc: 'Encrypted via Razorpay gateway.', icon: ShieldCheck },
          { title: 'Grok-2 AI Included', desc: 'Direct access to advanced outreach templates.', icon: Sparkles },
          { title: 'Anti-Spam Safety', desc: 'Custom intervals preserve sender score.', icon: Send }
        ].map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-neutral-250 font-bold text-xs">
              <item.icon className="w-4 h-4 text-purple-400" />
              <span>{item.title}</span>
            </div>
            <p className="text-[10px] text-neutral-550">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Simulated Payment Success Modal */}
      {showMockPaymentModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-800 bg-zinc-900 rounded-xl p-6 space-y-4 shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500 rounded-t-xl" />
            <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Developer Simulation
            </h3>
            <p className="text-xs text-neutral-450 leading-relaxed">
              No Razorpay credentials are set in <code className="text-neutral-200">.env</code>. The backend triggered a simulated mock order:
            </p>
            <div className="bg-zinc-950 border border-neutral-850 p-3 rounded-lg text-[10px] text-neutral-450 font-mono space-y-1">
              <div>Order ID: <span className="text-neutral-200">{mockOrderId}</span></div>
              <div>Plan: <span className="text-purple-400 uppercase font-bold">{selectedPlan}</span></div>
              <div>Price: <span className="text-emerald-400">₹{selectedPlan === 'yearly' ? '100.00' : '300.00'}</span></div>
              <div>Gateway: <span className="text-amber-400">Simulated Sandbox</span></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowMockPaymentModal(false)}
                className="w-1/2 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-300 font-semibold rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyMockPayment}
                disabled={isSubmitting}
                className="w-1/2 py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors shadow-md"
              >
                Authorize Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
