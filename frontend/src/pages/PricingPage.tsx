import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, Sparkles, Send, Lock, AlertCircle } from 'lucide-react';

interface PricingPageProps {
  user?: {
    id: number;
    email: string | null;
  } | null;
  onPaymentSuccess?: (token: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ user, onPaymentSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'six_months' | 'yearly'>('six_months');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false);
  const [mockOrderId, setMockOrderId] = useState('');

  const handleStartPurchase = async (plan: 'monthly' | 'six_months' | 'yearly') => {
    setSelectedPlan(plan);
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/auth/google/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      if (data.mock) {
        setMockOrderId(data.id || `order_mock_${plan}_${Date.now()}`);
        setShowMockPaymentModal(true);
        setIsSubmitting(false);
        return;
      }

      if ((window as any).Razorpay) {
        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: 'Outreach AI',
          description: `${plan.toUpperCase().replace('_', ' ')} Plan`,
          order_id: data.id,
          handler: async function (res: any) {
            await verifyPayment(res.razorpay_order_id, res.razorpay_payment_id, res.razorpay_signature, plan);
          },
          prefill: {
            email: user?.email || '',
          },
          theme: {
            color: '#0f172a',
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Razorpay SDK failed to load. Please refresh and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing subscription purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyPayment = async (orderId: string, paymentId: string, signature: string, plan: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/google/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          plan,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        if (onPaymentSuccess) {
          onPaymentSuccess(data.token);
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyMockPayment = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/google/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature',
          plan: selectedPlan,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Mock payment verification failed');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        if (onPaymentSuccess) {
          onPaymentSuccess(data.token);
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Mock payment error.');
    } finally {
      setIsSubmitting(false);
      setShowMockPaymentModal(false);
    }
  };

  const getPriceDisplay = (plan: 'monthly' | 'six_months' | 'yearly') => {
    if (plan === 'monthly') return '299';
    if (plan === 'six_months') return '1,599';
    return '2,999';
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-200 relative text-slate-900">
      
      {/* Page Title Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider">
          <Lock className="w-3 h-3 text-slate-700" />
          Subscription Required
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Choose a Plan to Unlock Outreach AI
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Select one of our tailored plans below to instantly activate full access to AI campaigns, resume parsing, and sequential sending.
        </p>
      </div>

      {errorMsg && (
        <div className="flex gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs items-center max-w-md mx-auto font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Plans Comparison Layout - 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        
        {/* Plan 1: Monthly Plan */}
        <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between relative hover:border-slate-300 transition-all text-slate-900">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Monthly Plan</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Flexible monthly billing</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-bold uppercase tracking-wide">
                Monthly
              </span>
            </div>

            <div className="flex items-baseline gap-1 py-2">
              <span className="text-slate-500 text-sm font-bold">₹</span>
              <span className="text-4xl font-black text-slate-900">299</span>
              <span className="text-slate-500 text-xs font-bold">/ month</span>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              {[
                'Full access to AI Campaigns & Contacts',
                'Grok AI Email Generator',
                'Gmail API OAuth Integration',
                'Anti-Spam Sequential Sending',
                'Cancel anytime'
              ].map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-[11px] text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleStartPurchase('monthly')}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs active:scale-[0.98] mt-auto"
          >
            {isSubmitting && selectedPlan === 'monthly' ? 'Initializing Pay...' : 'Select Monthly Plan'}
          </button>
        </div>

        {/* Plan 2: 6-Month Plan */}
        <div className="border border-slate-900 bg-white rounded-2xl p-6 shadow-md space-y-6 flex flex-col justify-between relative text-slate-900 ring-2 ring-slate-900">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider shadow-xs">
            Most Popular
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">6-Month Plan</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Save on semi-annual billing</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold uppercase tracking-wide">
                Save 11%
              </span>
            </div>

            <div className="flex items-baseline gap-1 py-2">
              <span className="text-slate-500 text-sm font-bold">₹</span>
              <span className="text-4xl font-black text-slate-900">1,599</span>
              <span className="text-slate-500 text-xs font-bold">/ 6 months</span>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              {[
                'Includes all Monthly features',
                'Priority email queue processing',
                '6 months uninterrupted access',
                'PDF Resume AI Parser',
                'Dedicated support'
              ].map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-[11px] text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleStartPurchase('six_months')}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs active:scale-[0.98] mt-auto"
          >
            {isSubmitting && selectedPlan === 'six_months' ? 'Initializing Pay...' : 'Select 6-Month Plan'}
          </button>
        </div>

        {/* Plan 3: Yearly Plan */}
        <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between relative hover:border-slate-300 transition-all text-slate-900">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Yearly Plan</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Maximum annual savings</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-bold uppercase tracking-wide">
                Best Value
              </span>
            </div>

            <div className="flex items-baseline gap-1 py-2">
              <span className="text-slate-500 text-sm font-bold">₹</span>
              <span className="text-4xl font-black text-slate-900">2,999</span>
              <span className="text-slate-500 text-xs font-bold">/ year</span>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              {[
                'Everything in 6-Month Plan',
                'Full 12 months access',
                'Save over 16% annually',
                'Priority feature requests',
                'Free future updates'
              ].map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-[11px] text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleStartPurchase('yearly')}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs active:scale-[0.98] mt-auto"
          >
            {isSubmitting && selectedPlan === 'yearly' ? 'Initializing Pay...' : 'Select Yearly Plan'}
          </button>
        </div>

      </div>

      {/* Benefits Section */}
      <div className="border border-slate-200 bg-white rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left shadow-sm">
        {[
          { title: 'Secure Checkouts', desc: 'Encrypted via Razorpay gateway.', icon: ShieldCheck },
          { title: 'Grok-2 AI Included', desc: 'Direct access to advanced outreach templates.', icon: Sparkles },
          { title: 'Anti-Spam Safety', desc: 'Custom intervals preserve sender score.', icon: Send }
        ].map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-900 font-bold text-xs">
              <item.icon className="w-4 h-4 text-slate-700" />
              <span>{item.title}</span>
            </div>
            <p className="text-[10px] text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Simulated Payment Success Modal */}
      {showMockPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-xl relative text-slate-900">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-slate-700" />
              Developer Simulation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No Razorpay credentials are set in <code className="text-slate-900 font-bold">.env</code>. The backend triggered a simulated mock order:
            </p>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] text-slate-700 font-mono space-y-1">
              <div>Order ID: <span className="text-slate-900 font-bold">{mockOrderId}</span></div>
              <div>Plan: <span className="text-slate-900 uppercase font-bold">{selectedPlan.replace('_', ' ')}</span></div>
              <div>Price: <span className="text-emerald-700 font-bold">₹{getPriceDisplay(selectedPlan)}</span></div>
              <div>Gateway: <span className="text-amber-800 font-bold">Simulated Sandbox</span></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowMockPaymentModal(false)}
                className="w-1/2 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyMockPayment}
                disabled={isSubmitting}
                className="w-1/2 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Verifying...' : 'Complete Mock Pay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
