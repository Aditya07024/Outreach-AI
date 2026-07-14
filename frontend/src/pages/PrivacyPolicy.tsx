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
            <h2 className="text-sm font-bold text-neutral-200">2. Google User Data</h2>
            <p>
              Outreach AI accesses Google user data only after the user explicitly grants permission through Google OAuth. We request only the Gmail Send permission (https://www.googleapis.com/auth/gmail.send) to send emails that the user explicitly creates, reviews, or authorizes. We do not read, access, modify, or delete the user's Gmail inbox or messages.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">3. How We Use Information</h2>
            <p>
              We use your connected Gmail account solely to send emails that you explicitly create, review, and authorize through Outreach AI. We do not read your inbox, analyze existing emails, or access Gmail content beyond what is necessary to send emails using the Gmail Send API.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">4. Data Encryption, Security and Storage</h2>
            <p>
              Your Gmail API access tokens and refresh tokens are stored securely in our database. We employ robust security measures to protect your data, including the following:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-neutral-350">
              <li>OAuth tokens are encrypted using AES-256.</li>
              <li>All communication uses HTTPS/TLS.</li>
              <li>Access to stored credentials is restricted.</li>
              <li>We follow the principle of least privilege.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">5. Third-Party Services and AI</h2>
            <p>
              If AI-powered email generation is used, only the minimum information required to generate personalized email drafts is shared with our AI provider. Google user data obtained through Gmail APIs is never used to train generalized AI or machine learning models. We do not sell, distribute, or rent your personal information, candidate resumes, or recruiter contact details to any third-party advertising services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">6. Google API Services User Data</h2>
            <p>
              Outreach AI's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">7. Your Controls and Data Retention</h2>
            <p>
              You can disconnect your Google account, delete all uploaded resumes, remove campaigns, or clear your history at any time. When a user disconnects their Google account or deletes their account, OAuth credentials are permanently removed from our production systems. Campaign and application data are deleted according to our retention policy unless required by law.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">8. Policy Updates</h2>
            <p>
              We may update this privacy policy from time to time to align with Google API guidelines or security standards. We will notify you of any changes by updating the revision date at the top of this policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-neutral-200">9. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or your data, please contact us:
            </p>
            <p className="mt-1">
              Support Email: <a href="mailto:support@outreachai.in" className="text-purple-400 hover:underline">support@outreachai.in</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
