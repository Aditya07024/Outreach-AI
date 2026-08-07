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
      <div className="flex items-center justify-center h-[60vh] text-slate-500 font-medium">
        Loading subscription data...
      </div>
    );
  }

  const isPaid = user.paid || user.role === 'admin';

  if (!isPaid) {
    return <PricingPage user={user} onPaymentSuccess={onPaymentSuccess} />;
  }

  const planName = user.plan === 'monthly' 
    ? 'Monthly Subscription' 
    : user.plan === 'six_months' 
    ? '6-Month Plan' 
    : user.plan === 'yearly' 
    ? 'Yearly Plan' 
    : 'No Active Plan';

  const planPrice = user.plan === 'monthly' 
    ? '₹299/month' 
    : user.plan === 'six_months' 
    ? '₹1,599 / 6 months' 
    : user.plan === 'yearly' 
    ? '₹2,999/year' 
    : 'N/A';

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
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Subscription Billing</h2>
        <p className="text-xs text-slate-500 mt-1">Manage your license status, active subscription plan, and billing history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Plan Overview Card */}
        <div className="md:col-span-2 border border-slate-200 bg-white rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden text-slate-900">

          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Account Plan</span>
              <h3 className="text-lg font-bold text-slate-900">{planName}</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isPaid 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
              }`}>
                {isPaid ? 'Active' : 'Payment Required'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Pricing Plan</span>
              <p className="text-slate-900 font-bold text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-slate-700" />
                {planPrice}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">License Expiration</span>
              <p className="text-slate-900 font-bold text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-700" />
                {isPaid ? formatExpiryDate(user.paidUntil) : 'No subscription active'}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Billing Email</span>
              <p className="text-slate-800 font-mono font-medium">{user.email || 'Local Owner Account'}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Payment Gateway</span>
              <p className="text-slate-800 font-medium">{isPaid ? 'Razorpay Secure Checkout' : 'Not Connected'}</p>
            </div>
          </div>

          {!isPaid && (
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[11px] text-slate-500 text-center sm:text-left">
                Unlock all features including career outreach, Grok AI generators, campaigns, and resumes.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                Go to Dashboard & Pay
              </button>
            </div>
          )}
        </div>

        {/* Features Lock Status side block */}
        <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-sm text-slate-900">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-slate-700" />
            Plan Benefits
          </h4>
          
          <div className="space-y-2.5">
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
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1">
                <span className={feature.unlocked ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                  {feature.name}
                </span>
                {feature.unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
