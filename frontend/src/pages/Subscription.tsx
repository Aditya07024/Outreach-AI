import React from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PricingPage } from './PricingPage';

interface SubscriptionProps {
  user: {
    id: number;
    email: string | null;
    role: string;
    paid: boolean;
    plan: string | null;
    paidUntil: string | null;
  } | null;
  onPaymentSuccess: (token: string) => void;
}

export const Subscription: React.FC<SubscriptionProps> = ({ user, onPaymentSuccess }) => {
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-neutral-400">
        Loading subscription data...
      </div>
    );
  }

  const isPaid = user.paid || user.role === 'admin';

  if (!isPaid) {
    return <PricingPage user={user} onPaymentSuccess={onPaymentSuccess} />;
  }

  const planName = user.plan === 'yearly' ? 'Yearly Subscription' : user.plan === 'lifetime' ? 'Lifetime Access License' : 'No Active Plan';
  const planPrice = user.plan === 'yearly' ? '₹1000/year' : user.plan === 'lifetime' ? '₹3000 one-time' : 'N/A';

  const formatExpiryDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never expires';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 animate-fade-in relative">
      
      {/* Decorative Gradients */}
      <div className="absolute top-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-purple-900/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[250px] h-[250px] rounded-full bg-cyan-900/5 blur-[80px] pointer-events-none" />

      {/* Title Header */}
      <div>
        <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Subscription Billing</h2>
        <p className="text-xs text-neutral-450 mt-1">Manage your license status, active subscription plan, and billing history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Plan Overview Card */}
        <div className="md:col-span-2 border border-neutral-800 bg-zinc-900/40 backdrop-blur-md rounded-xl p-6 shadow-xl space-y-6 relative overflow-hidden">
          {isPaid && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500" />
          )}

          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-neutral-900 pb-5">
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Current Account Plan</span>
              <h3 className="text-lg font-bold text-neutral-200">{planName}</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isPaid 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' 
                  : 'bg-rose-950/40 text-rose-450 border-rose-900/40 animate-pulse'
              }`}>
                {isPaid ? 'Active' : 'Payment Required'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <span className="text-neutral-500 font-medium">Pricing Plan</span>
              <p className="text-neutral-250 font-bold text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-400" />
                {planPrice}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-neutral-500 font-medium">License Expiration</span>
              <p className="text-neutral-250 font-bold text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-400" />
                {isPaid ? formatExpiryDate(user.paidUntil) : 'No subscription active'}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-neutral-500 font-medium">Billing Email</span>
              <p className="text-neutral-350 font-mono">{user.email || 'Local Owner Account'}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-neutral-500 font-medium">Payment Gateway</span>
              <p className="text-neutral-350">{isPaid ? 'Razorpay Secure Checkout' : 'Not Connected'}</p>
            </div>
          </div>

          {!isPaid && (
            <div className="pt-4 border-t border-neutral-900 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[11px] text-neutral-450 text-center sm:text-left">
                Unlock all features including career outreach, Grok AI generators, campaigns, and resumes.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-lg shadow-white/5"
              >
                Go to Dashboard & Pay
              </button>
            </div>
          )}
        </div>

        {/* Features Lock Status side block */}
        <div className="border border-neutral-850 bg-zinc-950/50 rounded-xl p-6 space-y-4">
          <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Plan Benefits
          </h4>
          
          <div className="space-y-3">
            {[
              { name: 'Dashboard Analytics', unlocked: true },
              { name: 'Profile Configuration', unlocked: true },
              { name: 'Campaign Creator', unlocked: true },
              { name: 'CSV Contact Uploader', unlocked: true },
              { name: 'PDF Resume Parser', unlocked: true },
              { name: 'Grok-2 AI Draft Builder', unlocked: true },
              { name: 'Anti-Spam Sequential Sending', unlocked: true },
              { name: 'System Performance Logs', unlocked: true },
              { name: 'Gmail API OAuth 2.0 Connection', unlocked: isPaid }
            ].map((feat, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <span className={feat.unlocked ? 'text-neutral-300' : 'text-neutral-550 line-through'}>
                  {feat.name}
                </span>
                {feat.unlocked ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-450 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
