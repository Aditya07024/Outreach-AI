import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import gsap from 'gsap';
import {
  Sliders,
  EnvelopeSimple,
  ShieldCheck,
  Prohibit,
  GoogleChromeLogo,
  CheckCircle,
  WarningCircle,
  Clock,
  Fire,
  Gauge,
  ArrowRight,
  ArrowSquareOut,
  Copy,
  Check,
  FloppyDisk,
  ArrowCounterClockwise,
  PaperPlaneRight,
  Plus,
  X,
  Lock,
  SignOut,
  GoogleLogo,
  UsersThree,
  Eye,
  EyeSlash,
  Broadcast,
} from '@phosphor-icons/react';
import { Settings as SettingsType, Resume, QuotaStats } from '../types';
import { Glass } from '../components/glass/Glass';
import { ArcGauge } from '../components/visual/ArcGauge';
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

const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard failed, using fallback:', err);
    }
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error('Fallback execCommand failed:', fallbackErr);
    return false;
  }
};

const formatSeconds = (sec: number): string => {
  if (!sec || isNaN(sec)) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};

const pausePresets = [
  { label: 'Fast (1–3m)', min: 60, max: 180 },
  { label: 'Recommended (3–7m)', min: 180, max: 420 },
  { label: 'Ultra Safe (5–15m)', min: 300, max: 900 },
];

export const Settings: React.FC<SettingsProps> = ({ 
  gmailStatus, 
  onRefreshGmailStatus, 
  isPaid = false,
  currentUser
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [initialData, setInitialData] = useState<SettingsType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [quotaStats, setQuotaStats] = useState<QuotaStats | null>(null);

  // Chrome Extension Token state
  const [extensionToken, setExtensionToken] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [showExtensionKey, setShowExtensionKey] = useState(false);

  // Quick Test Email Modal / Drawer state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testSubject, setTestSubject] = useState('Outreach AI — Test Email');
  const [testBody, setTestBody] = useState(
    'Hi,\n\nThis is a quick test email to verify that my Gmail connection and resume attachment are working properly.\n\nBest regards,\nCandidate'
  );
  const [testResumeId, setTestResumeId] = useState<number | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tag list for blocklist
  const [newBlockEntry, setNewBlockEntry] = useState('');
  const [blockList, setBlockList] = useState<string[]>([]);

  const isConnected = !!gmailStatus?.connected;
  const [isExtensionDone, setIsExtensionDone] = useState<boolean>(() => {
    return localStorage.getItem('outreach_extension_done') === 'true';
  });

  const isStep1Active = !isConnected;
  const isStep2Active = isConnected && !isExtensionDone;
  const areOtherSettingsDulled = !isConnected || !isExtensionDone;

  const { register, handleSubmit, reset, setValue, watch } = useForm<SettingsType>();

  const maxDailyLimit = watch('maxDailyLimit') || 50;
  const delayMin = watch('delayMin') || 60;
  const delayMax = watch('delayMax') || 180;
  const enableWarmup = watch('enableWarmup');
  const technicalFilter = watch('technicalFilter');
  const rawExcluded = watch('excludedEmails') || '';

  // GSAP reveal matching Dashboard's .bento-reveal
  useEffect(() => {
    if (!containerRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Animate non-dulled cards smoothly with opacity
      gsap.fromTo(
        '.bento-reveal:not(.settings-dulled-card)',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          stagger: 0.04,
          ease: 'power3.out',
        }
      );
      // For dulled cards, animate translation only without touching opacity or filter
      gsap.fromTo(
        '.settings-dulled-card',
        { y: 24 },
        {
          y: 0,
          duration: 0.45,
          stagger: 0.04,
          ease: 'power3.out',
        }
      );
    });
    return () => mm.revert();
  }, [isConnected, isExtensionDone]);

  // Listen for extension handshake if installed
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.source !== window) return;
      if (e.data?.type === 'OUTREACH_EXTENSION_PONG' || e.data?.type === 'OUTREACH_EXTENSION_AUTH_SUCCESS') {
        setIsExtensionDone(true);
        localStorage.setItem('outreach_extension_done', 'true');
      }
    };
    window.addEventListener('message', handleMsg);
    window.postMessage({ type: 'OUTREACH_EXTENSION_PING' }, '*');
    return () => window.removeEventListener('message', handleMsg);
  }, []);

  // Synchronize blocklist chips
  useEffect(() => {
    if (typeof rawExcluded === 'string') {
      const items = rawExcluded
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      setBlockList(Array.from(new Set(items)));
    }
  }, [rawExcluded]);

  // Load extension token
  useEffect(() => {
    const resolveToken = async () => {
      let t = '';
      if ((window as any).__clerkGetToken) {
        try {
          t = await (window as any).__clerkGetToken() || '';
        } catch (e) {}
      }
      if (!t) {
        t = localStorage.getItem('token') || '';
      }
      setExtensionToken(t);
    };
    resolveToken();
  }, []);

  const handleCopyToken = async () => {
    let token = extensionToken;
    if (!token) {
      if ((window as any).__clerkGetToken) {
        try {
          token = await (window as any).__clerkGetToken() || '';
        } catch (e) {}
      }
      if (!token) {
        token = localStorage.getItem('token') || '';
      }
      setExtensionToken(token);
    }
    if (!token) {
      alert('Sign-in key is still loading. Please refresh and try again.');
      return;
    }
    const ok = await copyToClipboard(token);
    if (ok) {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } else {
      alert('Unable to copy key automatically. Please copy the text manually.');
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.quotaStats) {
          setQuotaStats(data.quotaStats);
        }
        setInitialData(data);
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
    
    // Check URL parameters for OAuth status indications
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      onRefreshGmailStatus();
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch (err) {
        console.warn('replaceState failed', err);
      }
      setTimeout(() => {
        const step2 = document.getElementById('step-2-extension');
        if (step2) {
          step2.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    } else if (params.get('error')) {
      alert(`Google sign-in issue: ${params.get('error')}`);
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
      const data = await response.json();
      if (data.quotaStats) {
        setQuotaStats(data.quotaStats);
      }
      setInitialData(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (initialData) {
      reset(initialData);
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
        window.location.href = url;
      } else {
        throw new Error('Failed to get Google sign-in link.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to Google account');
      setIsRedirecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account? This will pause sending until you connect again.')) return;

    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' });
      if (res.ok) {
        onRefreshGmailStatus();
        alert('Gmail account disconnected.');
      }
    } catch (err) {
      alert('Failed to disconnect Gmail account');
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailStatus?.connected) {
      setTestMessage({ type: 'error', text: 'Please connect your Gmail account first.' });
      return;
    }
    if (!testTo) {
      setTestMessage({ type: 'error', text: 'Please enter a recipient email address.' });
      return;
    }
    setIsSendingTest(true);
    setTestMessage(null);
    try {
      const response = await fetch('/api/settings/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testTo,
          subject: testSubject,
          body: testBody,
          resumeId: testResumeId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send test email.');
      setTestMessage({
        type: 'success',
        text: `Test email successfully sent to ${testTo}! Check your inbox or sent messages.`,
      });
    } catch (err: any) {
      setTestMessage({
        type: 'error',
        text: err.message || 'Failed to send test email. Please check your Gmail connection.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Blocklist helper
  const handleAddBlockItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newBlockEntry.trim().toLowerCase();
    if (!trimmed) return;
    if (!blockList.includes(trimmed)) {
      const updated = [...blockList, trimmed];
      setBlockList(updated);
      setValue('excludedEmails', updated.join(', '));
    }
    setNewBlockEntry('');
  };

  const handleRemoveBlockItem = (itemToRemove: string) => {
    const updated = blockList.filter((item) => item !== itemToRemove);
    setBlockList(updated);
    setValue('excludedEmails', updated.join(', '));
  };

  // Preset daily limit values
  const presetLimits = [
    { value: 25, label: '25', desc: 'Ultra Safe' },
    { value: 50, label: '50', desc: 'Personal Gmail' },
    { value: 100, label: '100', desc: 'High Volume' },
    { value: 200, label: '200', desc: 'Workspace' },
  ];

  const effectiveSent = quotaStats?.sentInLast24h || 0;
  const effectiveLimit = quotaStats?.effectiveLimit || Number(maxDailyLimit) || 50;
  const warmupPercent = Math.min(100, Math.round((effectiveSent / (effectiveLimit || 1)) * 100));
  const remainingToday = quotaStats?.remainingToday ?? Math.max(0, effectiveLimit - effectiveSent);

  return (
    <div ref={containerRef} className="space-y-6">
      
      {/* ========================================================
          1. EDITORIAL GREETING & TACTILE COMMAND BAR
         ======================================================== */}
      <div className="bento-reveal flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          {/* <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/80 border border-white/90 shadow-2xs text-xs font-semibold text-[#2A1A0F] flex items-center gap-1.5">
              <Sliders size={13} weight="bold" className="text-[#FF6B1A]" />
              <span>Sending Preferences</span>
            </span>

            {gmailStatus?.connected ? (
              <span className="px-3 py-1 rounded-full bg-[#1DA365]/10 border border-[#1DA365]/20 text-xs font-semibold text-[#1DA365] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1DA365] animate-pulse" />
                <span>Gmail Connected</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConnectGmail}
                className="px-3 py-1 rounded-full bg-[#FF6B1A]/10 hover:bg-[#FF6B1A]/15 border border-[#FF6B1A]/25 text-xs font-semibold text-[#FF6B1A] flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span className="w-2 h-2 rounded-full bg-[#FF6B1A] animate-pulse" />
                <span>Connect Gmail to Send</span>
                <ArrowRight size={11} weight="bold" />
              </button>
            )}
          </div> */}

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-[#2A1A0F]">
            {gmailStatus?.connected ? (
              <>
                Outreach is <span className="text-[#1DA365] underline decoration-[#1DA365]/40 decoration-wavy decoration-2">safely configured</span> for your account.
              </>
            ) : (
              <>
                Link your Gmail to <span className="text-[#FF6B1A] underline decoration-[#FF6B1A]/40 decoration-wavy decoration-2">start sending</span> approved emails.
              </>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-[#735E50] max-w-2xl leading-relaxed">
            Choose your daily email limits, set safe pauses between sends to stay out of spam filters, and manage your blocked companies.
          </p>
        </div>

        {/* Command Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1DA365]/10 border border-[#1DA365]/20 text-[#1DA365] text-xs font-bold animate-fade-in shadow-2xs">
              <CheckCircle size={15} weight="fill" />
              <span>All changes saved!</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit(onSaveSettings)}
            disabled={isSaving || areOtherSettingsDulled}
            className={`px-5 py-2.5 rounded-[14px] bg-[#FF6B1A] text-white text-xs font-bold transition-all flex items-center gap-2 ${
              areOtherSettingsDulled
                ? 'opacity-20 cursor-not-allowed pointer-events-none grayscale'
                : 'hover:bg-[#E55B10] shadow-md shadow-[#FF6B1A]/25 cursor-pointer active:scale-[0.98]'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <FloppyDisk size={15} weight="bold" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          2. ASYMMETRIC HERO BENTO ROW (5 Cols vs 7 Cols)
             Left (5 Cols): STEP 1 — Active Gmail Sender & Live Test Trigger
             Right (7 Cols): STEP 2 — LinkedIn Chrome Extension Hub
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* STEP 1 (5 Cols): Active Gmail Sender & Live Test Trigger */}
        <Glass
          variant={isStep1Active ? "strong" : "surface"}
          radius="outer"
          className={`bento-reveal lg:col-span-5 p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
            isStep1Active
              ? 'ring-2 ring-[#FF6B1A] shadow-xl shadow-[#FF6B1A]/20 bg-white/95 scale-[1.01] z-10'
              : ''
          }`}
          style={{ opacity: 1, filter: 'none', pointerEvents: 'auto' }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#FF6B1A]/10 text-[#FF6B1A] font-mono text-[10px] font-bold uppercase tracking-wider border border-[#FF6B1A]/20">
                  STEP 1
                </span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#735E50] font-bold flex items-center gap-1.5">
                  <EnvelopeSimple size={14} weight="fill" className="text-[#FF6B1A]" />
                  <span>GMAIL INTEGRATION</span>
                </span>
              </div>

              {isConnected ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#1DA365] font-mono text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle size={12} weight="fill" className="text-[#1DA365]" />
                  Step 1 Complete
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#E63946] font-mono text-[10px] font-bold">
                  Needs Connection
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold font-display text-[#2A1A0F]">
              Active Gmail Sender
            </h3>
            <p className="text-xs text-[#735E50] mt-0.5">
              Outreach AI sends your reviewed candidate emails directly through your personal Google account.
            </p>
          </div>

          {/* Connected Account Box or Connect Prompt */}
          <div className="my-4">
            {isConnected ? (
              <div className="p-4 rounded-[20px] bg-white/80 border border-white/90 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#1DA365]/10 border border-[#1DA365]/20 flex items-center justify-center text-[#1DA365] shrink-0">
                      <GoogleLogo size={20} weight="bold" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-[#1DA365] uppercase font-bold">Primary Sender</div>
                      <div className="text-xs font-bold text-[#2A1A0F] truncate mt-0.5">
                        {gmailStatus?.email}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectGmail}
                    className="p-1.5 rounded-[10px] hover:bg-rose-50 text-[#735E50] hover:text-[#E63946] transition-colors cursor-pointer"
                    title="Disconnect Gmail"
                  >
                    <SignOut size={16} weight="bold" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-100 text-[#735E50]">
                  <span className="font-mono">Google API 2.0 Auth</span>
                  <span className="text-[#1DA365] font-semibold flex items-center gap-1">
                    <ShieldCheck size={13} weight="fill" /> Review Required Before Send
                  </span>
                </div>

                {isStep2Active && (
                  <div className="pt-1 text-[11px] font-semibold text-[#FF6B1A] flex items-center gap-1.5">
                    <ArrowRight size={13} weight="bold" />
                    <span>Now continue to Step 2 on the right</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-[20px] bg-white/80 border border-white/90 shadow-sm space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-[#2A1A0F]">
                  <WarningCircle size={18} weight="fill" className="text-[#FF6B1A] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#735E50] leading-relaxed">
                    Connect your Gmail to send personalized pitches directly to recruiter inboxes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  className="w-full py-2.5 rounded-[12px] bg-[#2A1A0F] hover:bg-[#432A18] text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <GoogleLogo size={16} weight="bold" className="text-[#FF6B1A]" />
                  <span>Connect Gmail Account</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons: Test Email Studio Trigger */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowTestModal(true)}
              disabled={!gmailStatus?.connected}
              className="flex-1 px-4 py-2.5 rounded-[12px] bg-white hover:bg-[#2A1A0F] text-[#2A1A0F] hover:text-white border border-[rgba(42,26,15,0.15)] text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <PaperPlaneRight size={14} weight="bold" className="text-[#FF6B1A]" />
              <span>Send a Test Email</span>
            </button>
          </div>
        </Glass>

        {/* STEP 2 (7 Cols): LinkedIn Chrome Extension Hub */}
        <Glass
          id="step-2-extension"
          variant={isStep2Active ? "strong" : "surface"}
          radius="outer"
          className={`bento-reveal lg:col-span-7 p-6 sm:p-7 space-y-4 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
            !isConnected
              ? 'settings-dulled-card'
              : isStep2Active
              ? 'ring-2 ring-[#FF6B1A] shadow-xl shadow-[#FF6B1A]/20 bg-white/95 scale-[1.01] z-10'
              : ''
          }`}
          style={
            !isConnected
              ? { opacity: 0.18, filter: 'grayscale(100%) contrast(0.8) blur(0.5px)', pointerEvents: 'none', userSelect: 'none' }
              : isStep2Active
              ? { opacity: 1, filter: 'none', pointerEvents: 'auto' }
              : undefined
          }
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(42,26,15,0.06)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[#FF6B1A]/10 border border-[#FF6B1A]/20 flex items-center justify-center text-[#FF6B1A] shrink-0">
                  <GoogleChromeLogo size={20} weight="duotone" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                      isStep2Active
                        ? 'bg-[#FF6B1A] text-white shadow-2xs'
                        : 'bg-stone-100 text-[#735E50]'
                    }`}>
                      STEP 2
                    </span>
                    <h3 className="text-base sm:text-lg font-bold font-display text-[#2A1A0F]">
                      Chrome Extension
                    </h3>
                  </div>
                  <p className="text-xs text-[#735E50] mt-0.5">
                    Find recruiter emails directly on LinkedIn profiles with 1 click
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isExtensionDone ? (
                  <span className="px-2.5 py-1 rounded-[10px] bg-emerald-50 border border-emerald-200 text-[#1DA365] font-mono text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" />
                    Step 2 Complete
                  </span>
                ) : isStep2Active ? (
                  <span className="px-2.5 py-1 rounded-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[10px] font-bold animate-pulse">
                    Active Step
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-[10px] bg-stone-100 text-[#735E50] font-mono text-[10px]">
                    Waiting for Step 1
                  </span>
                )}

                <a
                  href="https://chromewebstore.google.com/detail/outreach-ai-%E2%80%94-email-extra/lghahidlejpibjojgiokdghjjpmkhcnc"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] bg-[#2A1A0F] hover:bg-[#432A18] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-[0.98] shrink-0"
                >
                  <GoogleChromeLogo size={14} weight="bold" className="text-[#FF6B1A]" />
                  <span>Click here to download extension</span>
                  <ArrowSquareOut size={13} weight="bold" className="text-white/80" />
                </a>
              </div>
            </div>

            {/* 1-Click Link Banner */}
            <div className="p-4 rounded-[18px] bg-white/80 border border-white/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#2A1A0F] block">
                  Automatic 1-Click Connection
                </span>
                <p className="text-[11px] text-[#735E50] mt-0.5">
                  Links your installed browser extension to this account in one tap.
                </p>
              </div>
              <a
                href="/extension-login"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[12px] bg-[#FF6B1A] hover:bg-[#E55B10] text-white text-xs font-bold shadow-sm shadow-[#FF6B1A]/20 cursor-pointer shrink-0"
              >
                <span>1-Click Sign In</span>
                <ArrowRight size={13} weight="bold" />
              </a>
            </div>

            {/* Key Copier */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[#735E50]">
Sign-In Key (If you failed to sign-in then use this code)
                </label>
                <button
                  type="button"
                  onClick={() => setShowExtensionKey(!showExtensionKey)}
                  className="text-[11px] font-semibold text-[#735E50] hover:text-[#2A1A0F] flex items-center gap-1 cursor-pointer"
                >
                  {showExtensionKey ? <EyeSlash size={13} /> : <Eye size={13} />}
                  <span>{showExtensionKey ? 'Hide key' : 'Show key'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showExtensionKey ? 'text' : 'password'}
                  readOnly
                  value={extensionToken || 'Loading sign-in key...'}
                  className="w-full px-3.5 py-2 rounded-[12px] bg-white/70 border border-[rgba(42,26,15,0.12)] text-xs text-[#2A1A0F] pr-28 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-[8px] bg-white hover:bg-[#2A1A0F] text-[#2A1A0F] hover:text-white border border-[rgba(42,26,15,0.12)] text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  {copiedToken ? (
                    <>
                      <Check size={13} weight="bold" className="text-[#1DA365]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} weight="bold" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2 Finish / Unlock Button */}
            {isConnected && !isExtensionDone && (
              <button
                type="button"
                onClick={() => {
                  setIsExtensionDone(true);
                  localStorage.setItem('outreach_extension_done', 'true');
                }}
                className="w-full py-2.5 px-4 rounded-[12px] bg-[#1DA365] hover:bg-[#178552] text-white text-xs font-bold transition-all shadow-md shadow-[#1DA365]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] group"
              >
                <span className="inline-flex items-center animate-arrow-nudge">
                  <ArrowRight size={15} weight="bold" />
                </span>
                <span>Click here if you have already connected the Extension</span>
              </button>
            )}
          </div>

          <div className="pt-2 text-[11px] text-[#735E50] border-t border-[rgba(42,26,15,0.06)] flex items-center justify-between">
            <span>Install on Chrome or Brave</span>
            <a
              href="https://chromewebstore.google.com/detail/outreach-ai-%E2%80%94-email-extra/lghahidlejpibjojgiokdghjjpmkhcnc"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#FF6B1A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Download from Web Store</span>
              <ArrowSquareOut size={12} weight="bold" />
            </a>
          </div>
        </Glass>

      </div>

      {/* ========================================================
          3. SENDING SAFETY & SMART PACING BENTO (Dashboard Grade)
         ======================================================== */}
      <div id="step-2-delays" className="scroll-mt-6">
        <Glass
          variant="surface"
          radius="outer"
          className={`bento-reveal p-6 sm:p-7 transition-all duration-300 ${
            areOtherSettingsDulled ? 'settings-dulled-card' : ''
          }`}
          style={
            areOtherSettingsDulled
              ? { opacity: 0.18, filter: 'grayscale(100%) contrast(0.8) blur(0.5px)', pointerEvents: 'none', userSelect: 'none' }
              : undefined
          }
        >
          {/* Delays Callout Banner when Unlocked */}
          {!areOtherSettingsDulled && (
            <div className="mb-5 p-3 sm:p-3.5 rounded-[16px] bg-[#1DA365]/10 border border-[#1DA365]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#1DA365]">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} weight="fill" className="shrink-0 text-[#1DA365]" />
                <span className="font-bold">
                  All steps configured! You can fine-tune your email pause delays and safety rules below.
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold bg-white/80 px-2.5 py-1 rounded-[10px] border border-[#1DA365]/20 self-start sm:self-auto">
                Current Delay: {formatSeconds(delayMin)} – {formatSeconds(delayMax)}
              </span>
            </div>
          )}

          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-[rgba(42,26,15,0.06)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[#FF6B1A]/10 border border-[#FF6B1A]/20 flex items-center justify-center text-[#FF6B1A] shrink-0">
                <ShieldCheck size={22} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#FF6B1A] text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                    STEP 3
                  </span>
                  <h2 className="text-base sm:text-lg font-bold font-display text-[#2A1A0F]">
                    Set Sending Delays & Safety Controls
                  </h2>
                  {!areOtherSettingsDulled && (
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#1DA365] font-mono text-[10px] font-bold items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1DA365] animate-pulse" />
                      Ready to Configure
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#735E50] mt-0.5">
                  Set your random pause delay between emails, volume ramp-up, and recruiter filters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {!isConnected ? (
                <span className="px-3 py-1 rounded-full bg-stone-100 border border-stone-200 shadow-2xs font-mono text-[11px] font-semibold text-[#735E50] flex items-center gap-1.5">
                  <Lock size={13} weight="bold" />
                  <span>Complete Step 1 (Gmail) First</span>
                </span>
              ) : !isExtensionDone ? (
                <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 shadow-2xs font-mono text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                  <Lock size={13} weight="bold" />
                  <span>Complete Step 2 (Extension) Above</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 shadow-2xs font-mono text-[11px] font-semibold text-[#1DA365] flex items-center gap-1.5">
                  <CheckCircle size={14} weight="fill" className="text-[#1DA365]" />
                  <span>Delays Active</span>
                </span>
              )}
            </div>
          </div>

        {/* 2x2 Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Pause Delay Between Sends */}
          <div className="p-5 rounded-[20px] bg-white/70 border border-white/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[10px] bg-[#FF6B1A]/10 text-[#FF6B1A] flex items-center justify-center">
                    <Clock size={18} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2A1A0F]">Pause Delay Between Sends</h3>
                    <p className="text-[11px] text-[#735E50]">Random delay between each email to look human</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-[10px] bg-[#FF6B1A]/10 text-[#FF6B1A] font-mono text-xs font-bold border border-[#FF6B1A]/20">
                    {formatSeconds(delayMin)} – {formatSeconds(delayMax)}
                  </span>
                  <div className="text-[10px] text-[#735E50] font-mono mt-0.5">
                    ({delayMin}s – {delayMax}s)
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mt-3 pt-3 border-t border-[rgba(42,26,15,0.06)] space-y-1.5">
                <span className="text-[10px] font-mono text-[#735E50] uppercase font-bold tracking-wider">
                  Quick Pacing Presets:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {pausePresets.map((preset) => {
                    const isSelected = Number(delayMin) === preset.min && Number(delayMax) === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setValue('delayMin', preset.min, { shouldDirty: true });
                          setValue('delayMax', preset.max, { shouldDirty: true });
                        }}
                        className={`px-2.5 py-1.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer border text-center ${
                          isSelected
                            ? 'bg-[#2A1A0F] text-white border-[#2A1A0F] shadow-xs'
                            : 'bg-white/90 hover:bg-white text-[#735E50] hover:text-[#2A1A0F] border-[rgba(42,26,15,0.08)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Custom Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-[14px] bg-white/80 border border-[rgba(42,26,15,0.08)] shadow-2xs space-y-1">
                <label className="text-[11px] font-semibold text-[#735E50] flex items-center justify-between">
                  <span>Min Pause</span>
                  <span className="font-mono text-[10px] text-[#FF6B1A]">≈ {formatSeconds(delayMin)}</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={5}
                    step={5}
                    {...register('delayMin', { valueAsNumber: true })}
                    className="w-full px-2.5 py-1.5 rounded-[10px] bg-white border border-[rgba(42,26,15,0.12)] text-xs font-mono font-bold text-[#2A1A0F] focus:border-[#FF6B1A] focus:outline-none"
                    title="Minimum pause in seconds"
                  />
                  <span className="text-xs font-mono text-[#735E50] shrink-0">sec</span>
                </div>
                <span className="text-[10px] text-[#735E50]">Shortest wait time</span>
              </div>

              <div className="p-3 rounded-[14px] bg-white/80 border border-[rgba(42,26,15,0.08)] shadow-2xs space-y-1">
                <label className="text-[11px] font-semibold text-[#735E50] flex items-center justify-between">
                  <span>Max Pause</span>
                  <span className="font-mono text-[10px] text-[#FF6B1A]">≈ {formatSeconds(delayMax)}</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={10}
                    step={5}
                    {...register('delayMax', { valueAsNumber: true })}
                    className="w-full px-2.5 py-1.5 rounded-[10px] bg-white border border-[rgba(42,26,15,0.12)] text-xs font-mono font-bold text-[#2A1A0F] focus:border-[#FF6B1A] focus:outline-none"
                    title="Maximum pause in seconds"
                  />
                  <span className="text-xs font-mono text-[#735E50] shrink-0">sec</span>
                </div>
                <span className="text-[10px] text-[#735E50]">Longest wait time</span>
              </div>
            </div>
          </div>

          {/* Card 2: Safe Start (Volume Warmup) */}
          <div className="p-5 rounded-[20px] bg-white/70 border border-white/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[10px] bg-[#FF6B1A]/10 text-[#FF6B1A] flex items-center justify-center">
                    <Fire size={18} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2A1A0F]">Safe Start (Gradual Ramp)</h3>
                    <p className="text-[11px] text-[#735E50]">Ramps volume weekly to build Google sender trust</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    {...register('enableWarmup')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1DA365]" />
                </label>
              </div>

              {/* Status Banner */}
              <div className={`p-3.5 rounded-[14px] border mt-3 transition-colors ${
                enableWarmup
                  ? 'bg-emerald-50/70 border-emerald-200/80 text-[#1DA365]'
                  : 'bg-white/80 border-[rgba(42,26,15,0.08)] text-[#735E50]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    {enableWarmup ? (
                      <>
                        <CheckCircle size={15} weight="fill" />
                        <span>Weekly Volume Ramp Active</span>
                      </>
                    ) : (
                      <>
                        <Gauge size={15} weight="bold" />
                        <span>Standard Daily Limit Active</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-current/20">
                    {enableWarmup ? 'Recommended' : 'Direct Limit'}
                  </span>
                </div>
                <p className="text-[11px] text-[#735E50] mt-1 leading-relaxed">
                  {enableWarmup
                    ? 'Protects your Gmail address by starting at 10 emails/day and safely expanding weekly.'
                    : 'Sends up to your configured daily limit immediately without gradual weekly ramping.'}
                </p>
              </div>
            </div>

            {/* Visual Ramp Steps */}
            <div className="p-3 rounded-[14px] bg-white/80 border border-[rgba(42,26,15,0.08)] shadow-2xs">
              <div className="text-[10px] font-mono text-[#735E50] uppercase font-bold mb-2">
                Warmup Schedule:
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2 rounded-[10px] border ${enableWarmup ? 'bg-emerald-50/60 border-emerald-200 text-[#1DA365]' : 'bg-stone-50 border-stone-200 text-[#735E50]'}`}>
                  <div className="text-[10px] font-mono font-bold">Week 1</div>
                  <div className="text-xs font-bold font-display mt-0.5">10 / day</div>
                </div>
                <div className={`p-2 rounded-[10px] border ${enableWarmup ? 'bg-emerald-50/60 border-emerald-200 text-[#1DA365]' : 'bg-stone-50 border-stone-200 text-[#735E50]'}`}>
                  <div className="text-[10px] font-mono font-bold">Week 2</div>
                  <div className="text-xs font-bold font-display mt-0.5">25 / day</div>
                </div>
                <div className={`p-2 rounded-[10px] border ${enableWarmup ? 'bg-emerald-50/60 border-emerald-200 text-[#1DA365]' : 'bg-stone-50 border-stone-200 text-[#735E50]'}`}>
                  <div className="text-[10px] font-mono font-bold">Week 3+</div>
                  <div className="text-xs font-bold font-display mt-0.5">Full Limit</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Tech Recruiter Filter */}
          <div className="p-5 rounded-[20px] bg-white/70 border border-white/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[10px] bg-[#1DA365]/10 text-[#1DA365] flex items-center justify-center">
                    <UsersThree size={18} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2A1A0F]">Tech Recruiter Smart Filter</h3>
                    <p className="text-[11px] text-[#735E50]">Prioritize engineering hiring managers and technical recruiters</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    {...register('technicalFilter')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1DA365]" />
                </label>
              </div>

              {/* Status Banner */}
              <div className={`p-3.5 rounded-[14px] border mt-3 transition-colors ${
                technicalFilter !== false
                  ? 'bg-emerald-50/70 border-emerald-200/80 text-[#1DA365]'
                  : 'bg-white/80 border-[rgba(42,26,15,0.08)] text-[#735E50]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    {technicalFilter !== false ? (
                      <>
                        <CheckCircle size={15} weight="fill" />
                        <span>Focusing on Technical Hiring Leads</span>
                      </>
                    ) : (
                      <>
                        <UsersThree size={15} weight="bold" />
                        <span>All Recruiter Roles Included</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-current/20">
                    {technicalFilter !== false ? 'Smart Filter' : 'All Roles'}
                  </span>
                </div>
                <p className="text-[11px] text-[#735E50] mt-1 leading-relaxed">
                  {technicalFilter !== false
                    ? 'Automatically skips general HR, payroll, and benefits staff so your emails reach people who actually hire engineers.'
                    : 'Emails will be sent to any recruiter, HR coordinator, or talent acquisition contact found on LinkedIn.'}
                </p>
              </div>
            </div>

            {/* Filter Tags */}
            <div className="p-3 rounded-[14px] bg-white/80 border border-[rgba(42,26,15,0.08)] shadow-2xs space-y-1.5">
              <div className="text-[10px] font-mono text-[#735E50] uppercase font-bold">
                Target Roles on LinkedIn:
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#1DA365] text-[10px] font-semibold">
                  ✓ Tech Recruiter
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#1DA365] text-[10px] font-semibold">
                  ✓ Engineering Manager
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#1DA365] text-[10px] font-semibold">
                  ✓ Talent Acquisition (Tech)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[#E63946] text-[10px] font-semibold">
                  ✕ Non-Tech HR (Skipped)
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Primary Inbox Placement & Health Guard */}
          <div className="p-5 rounded-[20px] bg-white/70 border border-white/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[10px] bg-[#1DA365]/10 text-[#1DA365] flex items-center justify-center">
                    <ShieldCheck size={18} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2A1A0F]">Primary Inbox Placement</h3>
                    <p className="text-[11px] text-[#735E50]">Active safeguards keeping emails in primary inboxes</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-[10px] bg-emerald-50 border border-emerald-200 text-[#1DA365] font-mono text-xs font-bold">
                  100% Clean
                </span>
              </div>

              {/* Reputation Metric Banner */}
              <div className="p-3.5 rounded-[14px] bg-emerald-50/70 border border-emerald-200/80 text-[#1DA365] mt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle size={15} weight="fill" />
                    <span>Zero Spam Flags Detected</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#1DA365]">0.0% Bounce</span>
                </div>
                <p className="text-[11px] text-[#735E50] leading-relaxed">
                  Your personalized emails land cleanly in the main inbox, never in promotions or spam folders.
                </p>
              </div>
            </div>

            {/* Checklist of Active Safeguards */}
            <div className="p-3 rounded-[14px] bg-white/80 border border-[rgba(42,26,15,0.08)] shadow-2xs space-y-2">
              <div className="text-[10px] font-mono text-[#735E50] uppercase font-bold">
                Active Safeguards:
              </div>
              <div className="space-y-1.5 text-xs text-[#2A1A0F]">
                <div className="flex items-center gap-2">
                  <Check size={13} weight="bold" className="text-[#1DA365] shrink-0" />
                  <span className="text-[11px]">Human-like randomized typing and send pacing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={13} weight="bold" className="text-[#1DA365] shrink-0" />
                  <span className="text-[11px]">Personalized recruiter pitches with zero mass-blast templates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={13} weight="bold" className="text-[#1DA365] shrink-0" />
                  <span className="text-[11px]">Google OAuth 2.0 direct-sender verification</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Glass>
      </div>

      {/* ========================================================
          4. LOWER BENTO: DAILY SENDING LIMITS & BLOCKLIST (7 Cols vs 5 Cols)
         ======================================================== */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch transition-all duration-300 ${
          areOtherSettingsDulled ? 'settings-dulled-card' : ''
        }`}
        style={
          areOtherSettingsDulled
            ? { opacity: 0.18, filter: 'grayscale(100%) contrast(0.8) blur(0.5px)', pointerEvents: 'none', userSelect: 'none' }
            : undefined
        }
      >
        
        {/* LEFT TILE (7 Cols): Daily Sending Limits & ArcGauge Cockpit */}
        <Glass
          variant="surface"
          radius="outer"
          className={`bento-reveal lg:col-span-7 p-6 sm:p-7 space-y-5 flex flex-col justify-between ${
            areOtherSettingsDulled ? 'settings-dulled-card' : ''
          }`}
          style={
            areOtherSettingsDulled
              ? { opacity: 0.18, filter: 'grayscale(100%) contrast(0.8) blur(0.5px)', pointerEvents: 'none', userSelect: 'none' }
              : undefined
          }
        >
          <div>
            <div className="flex items-center justify-between border-b border-[rgba(42,26,15,0.06)] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[#FF6B1A]/10 border border-[#FF6B1A]/20 flex items-center justify-center text-[#FF6B1A] shrink-0">
                  <Gauge size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-[#2A1A0F]">
                    Daily Sending Limits
                  </h3>
                  <p className="text-xs text-[#735E50]">
                    Control maximum outreach emails sent per 24 hours to protect sender reputation
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[#FF6B1A] font-bold bg-[#FF6B1A]/10 px-3 py-1 rounded-full border border-[#FF6B1A]/20">
                {effectiveLimit} max/day
              </span>
            </div>

            {/* Gauge + Metrics Cockpit */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 rounded-[20px] bg-white/70 border border-white/90 shadow-2xs">
              <div className="sm:col-span-5 flex justify-center py-1">
                <ArcGauge
                  value={effectiveSent}
                  max={effectiveLimit}
                  label="Sent Today"
                  sublabel="daily safe limit"
                  size={165}
                />
              </div>

              <div className="sm:col-span-7 space-y-2.5">
                <div className="p-3 rounded-[14px] bg-white/80 border border-[rgba(42,26,15,0.08)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-[#735E50]">Daily Safe Limit</span>
                    <div className="text-sm font-extrabold text-[#2A1A0F] font-display mt-0.5">
                      {effectiveLimit} emails / day
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#1DA365] text-[10px] font-mono font-bold border border-emerald-200">
                    Safe Range
                  </span>
                </div>

                <div className="p-3 rounded-[14px] bg-white/80 border border-[rgba(42,26,15,0.08)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-[#735E50]">Sent Past 24h</span>
                    <div className="text-sm font-extrabold text-[#2A1A0F] font-display mt-0.5">
                      {effectiveSent} emails
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#735E50]">
                    {warmupPercent}% used
                  </span>
                </div>

                <div className="p-3 rounded-[14px] bg-white/80 border border-[rgba(42,26,15,0.08)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-[#735E50]">Remaining Today</span>
                    <div className="text-sm font-extrabold text-[#1DA365] font-display mt-0.5">
                      {remainingToday} emails available
                    </div>
                  </div>
                  <CheckCircle size={16} weight="fill" className="text-[#1DA365]" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Presets & Slider */}
          <div className="space-y-3 pt-2">
            <div>
              <span className="text-[10px] font-mono text-[#735E50] uppercase font-bold tracking-wider block mb-1.5">
                Quick Limit Presets:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {presetLimits.map((preset) => {
                  const isSelected = Number(maxDailyLimit) === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setValue('maxDailyLimit', preset.value, { shouldDirty: true })}
                      className={`p-2 rounded-[12px] text-center transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#2A1A0F] text-white border-[#2A1A0F] shadow-xs'
                          : 'bg-white/80 hover:bg-white text-[#2A1A0F] border-[rgba(42,26,15,0.08)]'
                      }`}
                    >
                      <div className="text-xs font-extrabold font-display">{preset.label}</div>
                      <div className={`text-[9px] truncate ${isSelected ? 'text-white/70' : 'text-[#735E50]'}`}>
                        {preset.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider */}
            <div className="p-3 rounded-[14px] bg-white/80 border border-[rgba(42,26,15,0.08)] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[#735E50]">Custom Limit Adjustment</span>
                <span className="font-mono font-bold text-[#FF6B1A]">{maxDailyLimit} emails</span>
              </div>
              <input
                type="range"
                min={10}
                max={250}
                step={5}
                {...register('maxDailyLimit', { valueAsNumber: true })}
                className="w-full accent-[#FF6B1A] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#735E50]">
                <span>10 (Minimal)</span>
                <span>50 (Recommended)</span>
                <span>250 (Max)</span>
              </div>
            </div>
          </div>
        </Glass>

        {/* RIGHT TILE (5 Cols): Never Email List (Blocklist) */}
        <Glass
          variant="surface"
          radius="outer"
          className={`bento-reveal lg:col-span-5 p-6 sm:p-7 space-y-4 flex flex-col justify-between ${
            areOtherSettingsDulled ? 'settings-dulled-card' : ''
          }`}
          style={
            areOtherSettingsDulled
              ? { opacity: 0.18, filter: 'grayscale(100%) contrast(0.8) blur(0.5px)', pointerEvents: 'none', userSelect: 'none' }
              : undefined
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(42,26,15,0.06)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[#E63946]/10 border border-[#E63946]/20 flex items-center justify-center text-[#E63946]">
                  <Prohibit size={20} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-[#2A1A0F]">
                    Never Email List
                  </h3>
                  <p className="text-xs text-[#735E50]">
                    Domains & companies to skip automatically
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[#735E50] bg-white px-2.5 py-1 rounded-full border border-[rgba(42,26,15,0.08)]">
                {blockList.length} blocked
              </span>
            </div>

            <form onSubmit={handleAddBlockItem} className="flex gap-2">
              <input
                type="text"
                value={newBlockEntry}
                onChange={(e) => setNewBlockEntry(e.target.value)}
                placeholder="e.g. @currentemployer.com"
                className="flex-1 px-3.5 py-2 rounded-[12px] bg-white/70 border border-[rgba(42,26,15,0.12)] text-xs font-mono text-[#2A1A0F] focus:bg-white focus:border-[#FF6B1A] focus:outline-none transition-all"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-[12px] bg-[#2A1A0F] hover:bg-[#432A18] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
              >
                <Plus size={14} weight="bold" />
                <span>Add</span>
              </button>
            </form>

            {/* Active Blocked Chips */}
            {blockList.length > 0 ? (
              <div className="p-3.5 rounded-[16px] bg-white/70 border border-white/90 space-y-2 max-h-[220px] overflow-y-auto">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#735E50] font-bold">
                  Active Exclusions:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {blockList.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-rose-50 text-[#E63946] border border-rose-200 font-mono text-xs font-medium"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockItem(tag)}
                        className="p-0.5 hover:bg-rose-100 rounded-full cursor-pointer"
                      >
                        <X size={11} weight="bold" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-[16px] bg-white/50 border border-white/70 text-center text-xs text-[#735E50]">
                No blocked companies yet. Add domain endings (like @currentcompany.com) above to automatically skip them.
              </div>
            )}

            <textarea {...register('excludedEmails')} className="hidden" />
          </div>

          <div className="pt-2 text-[11px] text-[#735E50] border-t border-[rgba(42,26,15,0.06)] flex items-center justify-between">
            <span>Safety Guard Active</span>
            <span className="font-semibold text-[#1DA365]">Auto-filter on Outreach</span>
          </div>
        </Glass>

      </div>

      {/* ========================================================
          5. TACTILE COMMAND FOOTER (Save / Reset Bar)
         ======================================================== */}
      <div
        className={`bento-reveal p-4 sm:p-5 rounded-[22px] bg-white/85 backdrop-blur-[24px] border border-white/95 shadow-md shadow-[#2A1A0F]/5 flex flex-col sm:flex-row items-center justify-between gap-3 transition-all duration-300 ${
          areOtherSettingsDulled ? 'settings-dulled-card' : ''
        }`}
        style={
          areOtherSettingsDulled
            ? { opacity: 0.18, filter: 'grayscale(100%) contrast(0.8) blur(0.5px)', pointerEvents: 'none', userSelect: 'none' }
            : undefined
        }
      >
        <div className="flex items-center gap-2">
          {saveSuccess ? (
            <div className="flex items-center gap-2 text-xs font-bold text-[#1DA365] animate-fade-in">
              <CheckCircle size={16} weight="fill" />
              <span>All changes saved successfully!</span>
            </div>
          ) : (
            <span className="text-xs text-[#735E50]">
              Review your settings and click save to apply any changes.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving || areOtherSettingsDulled}
            className="px-4 py-2.5 rounded-[14px] bg-white/70 hover:bg-white border border-[rgba(42,26,15,0.08)] text-xs font-bold text-[#735E50] hover:text-[#2A1A0F] transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-40"
          >
            <ArrowCounterClockwise size={15} weight="bold" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit(onSaveSettings)}
            disabled={isSaving || areOtherSettingsDulled}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[14px] bg-[#FF6B1A] hover:bg-[#E55B10] text-white text-xs font-bold shadow-md shadow-[#FF6B1A]/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FloppyDisk size={15} weight="bold" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          7. MODALS: Google Verification & Test Email Studio
         ======================================================== */}
      <GoogleVerificationModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onProceed={executeGoogleRedirect}
        isLoading={isRedirecting}
      />

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1A0F]/30 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg my-6" onClick={(e) => e.stopPropagation()}>
            <Glass variant="strong" radius="outer" className="overflow-hidden shadow-2xl border-white/95">
              <div className="p-6 border-b border-[rgba(42,26,15,0.06)] flex items-center justify-between bg-white/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-[#1DA365]/10 border border-[#1DA365]/20 flex items-center justify-center text-[#1DA365]">
                    <PaperPlaneRight size={20} weight="duotone" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#2A1A0F]">
                      Send a Test Email
                    </h2>
                    <p className="text-xs text-[#735E50]">
                      Check that your Gmail and resume attachment work properly
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTestModal(false);
                    setTestMessage(null);
                  }}
                  className="p-2 rounded-[12px] text-[#735E50] hover:text-[#2A1A0F] hover:bg-black/5 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {testMessage && (
                  <div className={`p-3.5 rounded-[14px] text-xs font-semibold flex items-center gap-2 ${
                    testMessage.type === 'success' 
                      ? 'bg-emerald-50 text-[#1DA365] border border-emerald-200' 
                      : 'bg-rose-50 text-[#E63946] border border-rose-200'
                  }`}>
                    {testMessage.type === 'success' ? <CheckCircle size={16} weight="fill" /> : <WarningCircle size={16} weight="fill" />}
                    <span>{testMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleSendTestEmail} className="space-y-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-[#735E50]">Send To Email</label>
                      {gmailStatus?.email && (
                        <button
                          type="button"
                          onClick={() => setTestTo(gmailStatus.email || '')}
                          className="text-[10px] font-semibold text-[#FF6B1A] hover:underline cursor-pointer"
                        >
                          Use my email ({gmailStatus.email})
                        </button>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-white/70 border border-[rgba(42,26,15,0.12)] text-xs text-[#2A1A0F] focus:bg-white focus:border-[#FF6B1A] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#735E50]">Subject Line</label>
                    <input
                      type="text"
                      required
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-white/70 border border-[rgba(42,26,15,0.12)] text-xs text-[#2A1A0F] focus:bg-white focus:border-[#FF6B1A] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#735E50]">Message</label>
                    <textarea
                      required
                      rows={3}
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      className="w-full p-3 rounded-[12px] bg-white/70 border border-[rgba(42,26,15,0.12)] text-xs text-[#2A1A0F] focus:bg-white focus:border-[#FF6B1A] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#735E50]">Attach Resume (Optional)</label>
                    <select
                      value={testResumeId || ''}
                      onChange={(e) => setTestResumeId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-white/70 border border-[rgba(42,26,15,0.12)] text-xs text-[#2A1A0F] focus:bg-white focus:border-[#FF6B1A] focus:outline-none cursor-pointer"
                    >
                      <option value="">No Resume Attachment</option>
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.description ? `— ${r.description}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowTestModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#735E50] hover:text-[#2A1A0F]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingTest}
                      className="px-5 py-2 rounded-[12px] bg-[#FF6B1A] hover:bg-[#E55B10] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSendingTest ? 'Sending...' : 'Send Test Email'}
                    </button>
                  </div>
                </form>
              </div>
            </Glass>
          </div>
        </div>
      )}

    </div>
  );
};
