import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, Send, ShieldCheck, HeartHandshake } from 'lucide-react';

export const UnsubscribePage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('Not interested in these opportunities');
  const [problemFeedback, setProblemFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam.trim());
    }
  }, []);

  const reasons = [
    'Not interested in these opportunities',
    'Wrong person / no longer in this role',
    'Too many emails or frequent outreach',
    'I never signed up or expected this email',
    'Other problem or concern',
  ];

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          reason,
          feedback: problemFeedback.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit unsubscribe request');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while processing your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-neutral-100 py-16 px-6 relative overflow-hidden flex flex-col items-center justify-center font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />

      <div className="max-w-lg w-full z-10 space-y-6">
        {/* Top return link */}
        <button
          onClick={() => (window.location.href = '/')}
          className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Outreach AI
        </button>

        {isSuccess ? (
          /* Confirmation Success State */
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 space-y-6 shadow-2xl backdrop-blur-md animate-fade-in text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-neutral-100">You Have Been Unsubscribed</h1>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
                <span className="text-neutral-200 font-mono font-medium">{email}</span> has been permanently opted out. You will not receive future outreach emails from this platform.
              </p>
            </div>

            {problemFeedback && (
              <div className="p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-left text-xs text-neutral-300">
                <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">
                  Your feedback was recorded:
                </div>
                <p className="italic text-neutral-300 font-sans text-xs">"{problemFeedback}"</p>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-3">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Your privacy and preferences are respected.</span>
              </div>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-neutral-200 transition-colors cursor-pointer"
              >
                Close or Return to Homepage
              </button>
            </div>
          </div>
        ) : (
          /* Unsubscribe & Feedback Form */
          <form
            onSubmit={handleUnsubscribe}
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 space-y-6 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-neutral-100">Unsubscribe & Preferences</h1>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Manage your communication preferences and tell us what went wrong.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Recipient Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  Email Address to Unsubscribe
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/70 border border-zinc-700/60 text-xs text-neutral-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/60 focus:bg-zinc-800 transition-all font-mono"
                />
              </div>

              {/* Primary Reason */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  Why would you like to unsubscribe?
                </label>
                <div className="space-y-1.5">
                  {reasons.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        reason === r
                          ? 'bg-rose-500/10 border-rose-500/40 text-neutral-100 font-medium'
                          : 'bg-zinc-800/40 border-zinc-800 text-neutral-400 hover:border-zinc-700 hover:text-neutral-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="w-3.5 h-3.5 accent-rose-500 cursor-pointer"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Problem / Feedback Textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    Write about the problem or share feedback
                  </label>
                  <span className="text-[10px] text-neutral-500">Optional</span>
                </div>
                <textarea
                  rows={4}
                  value={problemFeedback}
                  onChange={(e) => setProblemFeedback(e.target.value)}
                  placeholder="Tell us what problem occurred, why this was irrelevant, or what we should improve..."
                  className="w-full p-3 rounded-xl bg-zinc-800/70 border border-zinc-700/60 text-xs text-neutral-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/60 focus:bg-zinc-800 transition-all leading-relaxed"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-md shadow-rose-900/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Processing Unsubscribe...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm Unsubscribe & Submit Feedback</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 text-center">
                <HeartHandshake className="w-3 h-3 text-neutral-400" />
                <span>Your feedback helps prevent future unwanted messages.</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
