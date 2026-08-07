import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, CheckCircle2, AlertTriangle, KeyRound, Cpu, Sliders, Shield, Send, Lock, Sparkles } from 'lucide-react';
import { Settings as SettingsType, Resume } from '../types';
import { GoogleVerificationModal } from '../components/GoogleVerificationModal';

interface SettingsProps {
  gmailStatus: { connected: boolean; email?: string } | null;
  onRefreshGmailStatus: () => void;
  isPaid?: boolean;
  currentUser?: {
    id: number;
    email: string | null;
    role: string;
    paid: boolean;
    plan: string | null;
    paidUntil: string | null;
    trialEndsAt: string | null;
    createdAt: string;
  } | null;
}

export const Settings: React.FC<SettingsProps> = ({ 
  gmailStatus, 
  onRefreshGmailStatus, 
  isPaid = false,
  currentUser
}) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Test Email Sender state variables
  const [testTo, setTestTo] = useState('');
  const [testSubject, setTestSubject] = useState('Outreach AI - Standalone Connection Test');
  const [testBody, setTestBody] = useState('Hi,\n\nThis is a standalone test email sent from Outreach AI to verify my Gmail API integration.\n\nBest regards,\nCandidate');
  const [testResumeId, setTestResumeId] = useState<number | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<SettingsType>();

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        reset(data);
      }

      // Load resumes list
      const resRes = await fetch('/api/resumes');
      if (resRes.ok) {
        const resumesData = await resRes.json();
        if (Array.isArray(resumesData)) {
          setResumes(resumesData);
        } else {
          setResumes([]);
        }
      } else {
        setResumes([]);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
      setResumes([]);
    }
  };

  useEffect(() => {
    loadSettings();
    
    // Check URL parameters for OAuth status toast indications
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      alert(`Gmail successfully connected to: ${params.get('email')}`);
      onRefreshGmailStatus();
      // Clean up URL
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch (err) {
        console.warn('replaceState failed', err);
      }
    } else if (params.get('error')) {
      alert(`Google Authentication Failed: ${params.get('error')}`);
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch (err) {
        console.warn('replaceState failed', err);
      }
    }
  }, []);

  const onSaveSettings = async (formData: SettingsType) => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectGmail = () => {
    setShowGoogleModal(true);
  };

  const executeGoogleRedirect = async () => {
    try {
      setIsRedirecting(true);
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(origin)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).error || `Failed to connect (${res.status})`);
      }
      const { url } = await res.json();
      if (url && typeof url === 'string' && url.startsWith('http')) {
        window.location.href = url; // Redirect to Google Sign-In
      } else {
        throw new Error('Failed to get Google OAuth URL.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to Google OAuth service');
      setIsRedirecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account? This will stop all running campaigns.')) return;

    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' });
      if (res.ok) {
        onRefreshGmailStatus();
        alert('Gmail account disconnected successfully.');
      }
    } catch (err) {
      alert('Failed to disconnect Gmail account');
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailStatus?.connected) {
      alert('Please connect your Gmail account first.');
      return;
    }
    setIsSendingTest(true);
    try {
      const response = await fetch('/api/settings/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testTo,
          subject: testSubject,
          body: testBody,
          resumeId: testResumeId
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send test email.');
      alert('Test email successfully sent! Check your inbox (or sent folder).');
    } catch (err: any) {
      alert(err.message || 'Failed to send test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System Settings & Configurations</h2>
        <p className="text-xs text-slate-500 mt-1">Configure your personal profile variables, AI writing prompt guidelines, and Gmail integration.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: OAuth & Setup status */}
        <div className="space-y-6">
          {/* Gmail OAuth setup */}
          <div className="border border-slate-200/80 bg-white rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              Gmail API OAuth 2.0
            </h3>

            <div className="space-y-3">
              {!isPaid ? (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg flex items-start gap-2 text-xs text-rose-300">
                    <Lock className="w-4 h-4 flex-shrink-0 text-rose-400 animate-pulse mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold text-rose-200 block">3-Day Free Trial Expired</span>
                      <span className="leading-relaxed text-[11px] text-rose-300/80 block">
                        Your 3-day free trial has ended. Please upgrade your plan to link your Gmail account and continue sending automated outreach emails.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.href = '/subscription'}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-neutral-100 font-bold rounded-md text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950/30 cursor-pointer hover:scale-[0.99]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Upgrade Plan to Link Gmail
                  </button>
                </div>
              ) : gmailStatus?.connected ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-950/10 border border-emerald-900/40 rounded-lg flex items-start gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <span className="font-semibold block">Connected Account</span>
                      <span className="text-[10px] text-emerald-400 mt-0.5 truncate block max-w-[180px]">
                        {gmailStatus.email}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectGmail}
                    className="w-full py-1.5 border border-rose-900/30 hover:border-rose-800/60 bg-rose-950/10 hover:bg-rose-950/20 text-rose-400 font-semibold rounded-md text-xs transition-colors cursor-pointer"
                  >
                    Disconnect Gmail
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentUser && !currentUser.paid && currentUser.trialEndsAt && (
                    <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-lg text-xs text-purple-300 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold text-purple-200 block">3-Day Free Trial Active</span>
                        <span className="text-[11px] text-purple-300/80 leading-relaxed block">
                          You can link your Gmail account now during your 3-day free trial. After trial expires, upgrade will be required.
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-3 bg-amber-950/15 border border-amber-900/30 rounded-lg flex items-start gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-500" />
                    <span className="leading-relaxed">
                      Connect your Google Account to authorize sending emails using the secure Gmail API.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    className="w-full py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    Connect Gmail Account
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Direct Test Email Sender */}
          <div className="border border-slate-200/80 bg-white rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-slate-600" />
              Test Email Sender
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Send a test email directly to any address to verify email routing and attachment loading.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-3.5 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Recipient Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. test@inbox.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Connection Test"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Message Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Test email content..."
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors resize-none font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Attach Resume PDF</label>
                <select
                  value={testResumeId || ''}
                  onChange={(e) => setTestResumeId(e.target.value ? Number(e.target.value) : null)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                >
                  <option value="">No Resume Attachment</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSendingTest || !gmailStatus?.connected}
                className="w-full py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all disabled:opacity-40 shadow-xs cursor-pointer active:scale-[0.98]"
              >
                {!gmailStatus?.connected 
                  ? 'Connect Gmail First' 
                  : isSendingTest 
                    ? 'Sending Test Email...' 
                    : 'Send Test Email'
                }
              </button>
            </form>
          </div>

          {/* Chrome Extension Connection */}
          <div className="border border-slate-200/80 bg-white rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-600" />
                Chrome Extension Connection
              </h3>
              <a
                href="https://chromewebstore.google.com/detail/outreach-ai-%E2%80%94-email-extra/lghahidlejpibjojgiokdghjjpmkhcnc"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-slate-800 hover:text-slate-900 font-bold flex items-center gap-1 transition-colors border border-slate-300 bg-slate-100 px-2.5 py-0.5 rounded-full"
              >
                Web Store <Send className="w-2.5 h-2.5" />
              </a>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Use this token to connect the Chrome Extension to your account.
            </p>

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">JWT Access Token</label>
                <div className="relative">
                  <input
                    type="password"
                    readOnly
                    value={localStorage.getItem('token') || ''}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none pr-16 font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(localStorage.getItem('token') || '');
                      alert('Token copied to clipboard!');
                    }}
                    className="absolute right-1 top-1 bottom-1 px-3 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="text-[9px] text-slate-500 leading-relaxed">
                Instructions:
                <ol className="list-decimal pl-3 mt-1 space-y-0.5">
                  <li>
                    Install the{' '}
                    <a
                      href="https://chromewebstore.google.com/detail/outreach-ai-%E2%80%94-email-extra/lghahidlejpibjojgiokdghjjpmkhcnc"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-semibold underline"
                    >
                      Outreach AI Chrome Extension
                    </a>.
                  </li>
                  <li>Click the extension icon in your toolbar.</li>
                  <li>Paste this JWT access token and click Connect.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          <form onSubmit={handleSubmit(onSaveSettings)} className="space-y-6">
            
            {/* PROFILE DETAILS */}
            <div className="border border-slate-200/80 bg-white rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Sliders className="w-4 h-4 text-slate-600" />
                Personal Profile Variables
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="John Doe"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="+1 (555) 019-2834"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Portfolio Website</label>
                  <input
                    type="url"
                    {...register('portfolio')}
                    placeholder="https://myportfolio.dev"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">GitHub Link</label>
                  <input
                    type="url"
                    {...register('github')}
                    placeholder="https://github.com/myusername"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">LinkedIn URL</label>
                  <input
                    type="url"
                    {...register('linkedin')}
                    placeholder="https://linkedin.com/in/myusername"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Preferred Role</label>
                  <input
                    type="text"
                    {...register('preferredRole')}
                    placeholder="Senior React Engineer"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Desired Salary</label>
                  <input
                    type="text"
                    {...register('desiredSalary')}
                    placeholder="$140,000 / year"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Location</label>
                  <input
                    type="text"
                    {...register('location')}
                    placeholder="San Francisco, CA (Remote)"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Default Resume</label>
                  <select
                    {...register('defaultResumeId')}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  >
                    <option value="">No Default Resume</option>
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SENDING CONFIGURATIONS */}
            <div className="border border-slate-200/80 bg-white rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Sliders className="w-4 h-4 text-slate-600" />
                Queue Delays & Filters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Min Delay (Seconds)</label>
                  <input
                    type="number"
                    min={1}
                    {...register('delayMin')}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Max Delay (Seconds)</label>
                  <input
                    type="number"
                    min={1}
                    {...register('delayMax')}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              {/* Technical filter toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="technicalFilter"
                  {...register('technicalFilter')}
                  className="rounded border-slate-300 bg-slate-50 w-4 h-4 text-slate-900 focus:ring-0 focus:outline-none"
                />
                <label htmlFor="technicalFilter" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                  Enable Recruiter Title Technical Filter (only import technical recruiter contacts)
                </label>
              </div>
            </div>

            {/* AI SYSTEM PROMPT */}
            <div className="border border-slate-200/80 bg-white rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Cpu className="w-4 h-4 text-slate-600" />
                AI Writing Prompt Parameters
              </h3>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Guidelines / Pitch Text</label>
                <textarea
                  {...register('customPrompt')}
                  rows={6}
                  placeholder="Instructions for generating the email cover pitches..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 font-mono leading-relaxed transition-colors"
                />
                <span className="text-[10px] text-slate-500">
                  These instructions guide how the AI frames your skills, what languages/projects it mentions, and writing constraints (e.g. keep under 150 words).
                </span>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-4 border-t border-neutral-900 pt-4">
              {saveSuccess && (
                <span className="text-xs text-emerald-450 font-semibold animate-pulse">
                  Settings saved successfully!
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                {isSaving ? 'Saving Configurations...' : 'Save Settings'}
              </button>
            </div>

          </form>
        </div>

      </div>

      <GoogleVerificationModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onProceed={executeGoogleRedirect}
        isLoading={isRedirecting}
      />
    </div>
  );
};
