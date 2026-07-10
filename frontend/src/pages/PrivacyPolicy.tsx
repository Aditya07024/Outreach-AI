import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-neutral-100 py-16 px-6 relative overflow-hidden flex flex-col items-center">
      {/* Background glow decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      <div className="max-w-3xl w-full space-y-8 z-10">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 text-xs text-neutral-455 hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </button>

        <div className="flex items-center gap-3 border-b border-neutral-900 pb-6">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-100">Privacy Policy</h1>
            <p className="text-xs text-neutral-500 mt-1">Last Updated: July 10, 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-xs text-neutral-350 leading-relaxed font-sans">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">1. Information We Collect</h2>
            <p>
              We collect information to provide a better outreach experience. This includes information you provide directly, such as your profile metadata (name, phone, portfolio links) and any contact lists or resumes you upload to our platform. We also collect OAuth tokens from your connected Google Account to authorize sending emails on your behalf.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">2. How We Use Information</h2>
            <p>
              We use your connected Gmail account strictly to send job applications to the recruiters and companies you specify. We do not read, store, or parse any of your personal emails other than those generated and recorded through your campaigns on this platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">3. Data Encryption and Storage</h2>
            <p>
              Your Gmail API access tokens and refresh tokens are stored securely in our database using industry-standard AES-256 encryption. Only you have access to authorize or disconnect these credentials, which can be fully deleted at any time from your settings tab.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">4. Third-Party Services</h2>
            <p>
              We share candidate profile logs and recruiter details with xAI (Grok) strictly to draft personalized cover letters. We do not sell, distribute, or rent your personal information, candidate resumes, or recruiter contact details to any third-party advertising services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">5. Your Controls and Choices</h2>
            <p>
              You can disconnect your Google account, delete all uploaded resumes, remove campaigns, or clear your history at any time. If you decide to cancel or terminate your account, all credentials and outreach records will be permanently deleted from our live databases.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">6. Policy Updates</h2>
            <p>
              We may update this privacy policy from time to time to align with Google API guidelines or security standards. We will notify you of any changes by updating the revision date at the top of this policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
