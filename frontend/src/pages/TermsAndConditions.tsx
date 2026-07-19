import React from 'react';
import { ArrowLeft, Scale } from 'lucide-react';

export const TermsAndConditions: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-neutral-100 py-16 px-6 relative overflow-hidden flex flex-col items-center">
      {/* Background glow decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      <div className="max-w-3xl w-full space-y-8 z-10">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 text-xs text-neutral-450 hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </button>

        <div className="flex items-center gap-3 border-b border-neutral-900 pb-6">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-100">Terms of Service</h1>
            <p className="text-xs text-neutral-500 mt-1">Last Updated: July 10, 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-xs text-neutral-350 leading-relaxed font-sans">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">1. License and Access</h2>
            <p>
              By purchasing our ₹499 lifetime access license, you are granted a non-transferable, single-user license to access and use Outreach AI. You agree not to resell, distribute, lease, or commercially exploit any part of our outreach dashboard services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">2. Acceptable Use Policy</h2>
            <p>
              You are solely responsible for all emails sent through your connected Gmail account. Users are responsible for ensuring that emails sent through Outreach AI comply with applicable laws, Google's policies, and recipient consent requirements where applicable. You agree not to use the service to distribute spam, marketing blasts, unsolicited commercial ads, or any harassing, abusive, or unlawful messages.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">3. Google API Limits and Compliance</h2>
            <p>
              Outreach AI is not affiliated with Google or Alphabet Inc. Your account utilization must fully comply with Gmail's sending limits (typically 500 emails/day for free accounts) and Google's Developer Policy. Violation of Google's Terms of Service may result in your credentials being revoked by Google, which is beyond our control.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">4. Disclaimer of Warranties</h2>
            <p>
              The platform is provided "as is" without warranties of any kind. We do not guarantee job interview conversion rates, recruiter response metrics, or uninterrupted email delivery service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">5. Limitation of Liability</h2>
            <p>
              In no event shall Outreach AI or its developers be liable for any direct, indirect, special, or consequential damages (including, without limitation, loss of business, data or job application opportunities) arising out of the use or inability to use the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">6. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without reference to its conflict of laws principles.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
