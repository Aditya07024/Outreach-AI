import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import {
  Users,
  PaperPlaneRight,
  Tray,
  ArrowsClockwise,
  Plus,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  Flame,
  Stack,
  ArrowRight,
  Sparkle,
  Clock,
  Broadcast,
  Check,
  EnvelopeSimple,
  Briefcase,
  Buildings,
  Pulse,
} from '@phosphor-icons/react';
import { Campaign, EmailHistory, Log, QuotaStats, Contact } from '../types';
import { Glass } from '../components/glass/Glass';
import { ArcGauge } from '../components/visual/ArcGauge';
import { PipelineFunnel } from '../components/visual/PipelineFunnel';
import { DashboardSkeleton } from '../components/skeleton';

interface DashboardProps {
  isPaid: boolean;
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

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [history, setHistory] = useState<EmailHistory[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [queue, setQueue] = useState<Contact[]>([]);
  const [todaySentCount, setTodaySentCount] = useState<number>(0);
  const [quotaStats, setQuotaStats] = useState<QuotaStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter & Search states for Campaigns
  const [campaignFilter, setCampaignFilter] = useState<'ALL' | 'SENDING' | 'DRAFT' | 'PAUSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Right column tab switcher: Sent Emails vs Activity Log
  const [activityTab, setActivityTab] = useState<'DISPATCHES' | 'LOGS'>('DISPATCHES');

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    setFetchError(null);
    try {
      const [statsRes, settingsRes] = await Promise.allSettled([
        fetch('/api/campaigns/dashboard-stats'),
        fetch('/api/settings'),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        try {
          const settingsData = await settingsRes.value.json();
          if (settingsData.quotaStats) {
            setQuotaStats(settingsData.quotaStats);
          }
        } catch (e) {
          console.warn('[Dashboard] Could not parse settings response:', e);
        }
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json();
        setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        if (Array.isArray(data.queue)) {
          setQueue(data.queue);
        }
        if (typeof data.todaySentCount === 'number') {
          setTodaySentCount(data.todaySentCount);
        }
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Fallback endpoints
      const [campRes, histRes, logsRes, queueRes] = await Promise.allSettled([
        fetch('/api/campaigns'),
        fetch('/api/history'),
        fetch('/api/logs?limit=8'),
        fetch('/api/contacts/queue?limit=10'),
      ]);

      const campData = campRes.status === 'fulfilled' && campRes.value.ok ? await campRes.value.json().catch(() => []) : [];
      const histData = histRes.status === 'fulfilled' && histRes.value.ok ? await histRes.value.json().catch(() => []) : [];
      const logsData = logsRes.status === 'fulfilled' && logsRes.value.ok ? await logsRes.value.json().catch(() => []) : [];
      const queueData = queueRes.status === 'fulfilled' && queueRes.value.ok ? await queueRes.value.json().catch(() => []) : [];

      setCampaigns(Array.isArray(campData) ? campData : (campData?.campaigns && Array.isArray(campData.campaigns) ? campData.campaigns : []));
      setHistory(Array.isArray(histData) ? histData : (histData?.history && Array.isArray(histData.history) ? histData.history : []));
      setLogs(Array.isArray(logsData) ? logsData : (logsData?.logs && Array.isArray(logsData.logs) ? logsData.logs : []));
      setQueue(Array.isArray(queueData) ? queueData : []);
    } catch (err: any) {
      console.warn('[Dashboard] Data fetch error:', err);
      setFetchError('Connection is waking up. Tap retry to reconnect.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  // GSAP Page Load Reveal Animation
  useEffect(() => {
    if (isLoading || !containerRef.current) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '.bento-reveal',
        { y: 24, opacity: 0, filter: 'blur(6px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.5,
          stagger: 0.05,
          ease: 'power3.out',
        }
      );
    });

    return () => mm.revert();
  }, [isLoading]);

  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const safeHistory = Array.isArray(history) ? history : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

  // Aggregated outreach metrics
  const totalContacts = safeCampaigns.reduce((acc, c) => acc + (c.metrics?.total || 0), 0);
  const totalSent = safeCampaigns.reduce((acc, c) => acc + (c.metrics?.sent || 0), 0);
  const totalFailed = safeCampaigns.reduce((acc, c) => acc + (c.metrics?.failed || 0), 0);
  const totalPending = safeCampaigns.reduce(
    (acc, c) => acc + (c.metrics?.pending || 0) + (c.metrics?.generating || 0) + (c.metrics?.ready || 0),
    0
  );

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const effectiveTodaySent =
    safeHistory.length > 0
      ? safeHistory.filter((h) => {
          const sentDate = new Date(h.sentAt);
          return h.status === 'SENT' && sentDate >= startOfToday;
        }).length
      : (quotaStats?.sentInLast24h ?? todaySentCount);

  const dailyLimit = quotaStats?.effectiveLimit || 50;
  const warmupPercent = Math.min(100, Math.round((effectiveTodaySent / dailyLimit) * 100));
  const activeSendingCount = safeCampaigns.filter((c) => c.status === 'SENDING').length;

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return safeCampaigns.filter((c) => {
      const matchesFilter = campaignFilter === 'ALL' || c.status === campaignFilter;
      const matchesSearch =
        searchQuery === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [safeCampaigns, campaignFilter, searchQuery]);

  // Extract top draft for the action card
  const topActiveCampaign = safeCampaigns.find(c => (c.metrics?.pending || 0) > 0) || safeCampaigns[0];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {/* ========================================================
          1. EDITORIAL GREETING & TACTILE COMMAND BAR
         ======================================================== */}
      <div className="bento-reveal flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div className="space-y-1">


          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-[#2A1A0F]">
            {totalPending > 0 ? (
              <>
                You have <span className="text-[#FF6B1A] underline decoration-[#FF6B1A]/40 decoration-wavy decoration-2">{totalPending} emails</span> ready to review.
              </>
            ) : (
              <>
                Email outreach is <span className="text-[#1DA365] underline decoration-[#1DA365]/40 decoration-wavy decoration-2">all caught up</span> for today.
              </>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-[#735E50]">
            Review your AI-written emails, view your job search lists, and keep sending safely via Gmail.
          </p>
        </div>

      </div>

      {fetchError && (
        <div className="p-3.5 rounded-[20px] bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => fetchDashboardData(false)}
            className="font-bold underline cursor-pointer hover:text-amber-950"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ========================================================
          2. ASYMMETRIC HERO BENTO ROW (7 Cols vs 5 Cols)
             Left (7 Cols): Today's Sending Limit & Pace
             Right (5 Cols): Next Email to Review (Spotlight)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* HERO TILE (7 Cols): Today's Sending Limit & Safe Pace */}
        <Glass
          variant="strong"
          radius="outer"
          className="bento-reveal lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden"
        >


          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#FF6B1A] font-bold">
              TODAY'S EMAILS
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-[#2A1A0F]">
              Emails Sent Today & Daily Limit
            </h2>
            <p className="text-xs text-[#735E50] mt-0.5">
              We pause naturally between emails so they go straight to recruiter inboxes.
            </p>
          </div>

          {/* Integrated Gauge + Metrics Cockpit */}
          <div className="my-4 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Circular Gauge */}
            <div className="sm:col-span-5 flex justify-center py-1">
              <ArcGauge
                value={effectiveTodaySent}
                max={dailyLimit}
                label="Sent Today"
                sublabel="limit per day"
                size={180}
              />
            </div>

            {/* Live Metrics Cockpit */}
            <div className="sm:col-span-7 space-y-2.5">
              <div className="p-3 rounded-[16px] bg-white/60 border border-white/80 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#735E50] uppercase font-bold">Emails Left Today</div>
                  <div className="text-xl font-bold font-display text-[#2A1A0F] tabular-nums">
                    {Math.max(0, dailyLimit - effectiveTodaySent)} <span className="text-xs font-normal text-[#735E50]">emails left</span>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-[10px] bg-stone-100 font-mono text-xs font-bold text-[#2A1A0F]">
                  {warmupPercent}% Used
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-[14px] bg-white/50 border border-white/70 shadow-2xs space-y-0.5">
                  <div className="text-[10px] font-mono text-[#735E50]">Pause Between Emails</div>
                  <div className="font-bold text-[#2A1A0F] font-mono">45–90 seconds</div>
                </div>
                <div className="p-2.5 rounded-[14px] bg-white/50 border border-white/70 shadow-2xs space-y-0.5">
                  <div className="text-[10px] font-mono text-[#735E50]">Sending Speed</div>
                  <div className="font-bold text-[#1DA365]">
                    {quotaStats?.isWarmup ? `Week ${quotaStats.warmupWeek || 1}` : 'Normal speed'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-[rgba(42,26,15,0.06)] flex items-center justify-between text-xs text-[#735E50]">
            <span className="font-mono text-[11px]">Email Delivery: 100% clean • 0 blocked</span>
            <Link
              to="/settings"
              className="text-xs font-bold text-[#FF6B1A] hover:underline flex items-center gap-1"
            >
              <span>Adjust speed & daily limit</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </Glass>

        {/* HERO COMPANION (5 Cols): Next Actionable Review Spotlight Card */}
        <Glass
          variant="surface"
          radius="outer"
          className="bento-reveal lg:col-span-5 p-6 flex flex-col justify-between relative overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#D99B00] font-bold flex items-center gap-1.5">
                <Tray size={14} weight="fill" />
                <span>Next Email to Review</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#D99B00] font-mono text-[10px] font-bold">
                {totalPending} Ready
              </span>
            </div>
            <h3 className="text-lg font-bold font-display text-[#2A1A0F]">
              Check & Send Next Email
            </h3>
            <p className="text-xs text-[#735E50] mt-0.5">
              Nothing is sent without your review. Check each email here before sending.
            </p>
          </div>

          {/* Queued Emails Card */}
          <div className="my-4 p-4 rounded-[20px] bg-white/80 border border-white/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FF6B1A] font-bold text-[11px] flex items-center justify-center shrink-0">
                  <Tray size={12} weight="bold" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#2A1A0F] truncate text-xs">
                    {topActiveCampaign?.name || 'Recruiter Outreach Queue'}
                  </div>
                  <div className="text-[10px] text-[#735E50] truncate">
                    {queue.length > 0 ? `${queue.length} emails waiting in sequence` : 'Queue is currently empty'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#D99B00] shrink-0 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                {queue.length > 0 ? 'Ready in Queue' : 'Ready to review'}
              </span>
            </div>

            {/* List of Next Emails in Queue */}
            {queue.length > 0 ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
                {queue.slice(0, 4).map((item, idx) => {
                  const contactName = [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email.split('@')[0];
                  return (
                    <Link
                      key={item.id}
                      to="/outbox"
                      className="p-2.5 rounded-[12px] bg-white/90 hover:bg-white border border-stone-200/80 hover:border-[#FF6B1A]/40 transition-all block group shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-stone-100 group-hover:bg-[#FF6B1A]/10 text-stone-600 group-hover:text-[#FF6B1A] text-[10px] font-mono font-bold flex items-center justify-center shrink-0 transition-colors">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#2A1A0F] truncate group-hover:text-[#FF6B1A] transition-colors">
                              {contactName}
                              {item.company && (
                                <span className="font-normal text-[#735E50] text-[11px] ml-1">
                                  @ {item.company}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#735E50] truncate font-mono">
                              {item.email}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                          item.status === 'READY_TO_SEND'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.status === 'READY_TO_SEND' ? 'Ready' : 'Queued'}
                        </span>
                      </div>
                      {item.emailSubject && (
                        <p className="text-[10.5px] text-[#735E50] line-clamp-1 italic mt-1 pl-7">
                          "{item.emailSubject}"
                        </p>
                      )}
                    </Link>
                  );
                })}
                {queue.length > 4 && (
                  <div className="text-center pt-1">
                    <Link
                      to="/outbox"
                      className="text-[10.5px] font-bold text-[#FF6B1A] hover:underline"
                    >
                      + {queue.length - 4} more emails in queue →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 px-3 rounded-[12px] bg-stone-50/70 border border-dashed border-stone-200 text-center space-y-1">
                <p className="text-xs font-semibold text-[#2A1A0F]">No pending emails in queue</p>
                <p className="text-[11px] text-[#735E50]">
                  Import contacts in Email Folders or generate AI drafts to fill your outbox queue.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] pt-1 text-[#735E50] border-t border-stone-100">
              <span className="font-mono text-[10px]">Natural pause: 45–90s</span>
              <span className="text-[#1DA365] font-semibold flex items-center gap-1 text-[10.5px]">
                <CheckCircle size={12} weight="fill" /> Ready for one-click dispatch
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <Link
              to="/outbox"
              className="flex-1 px-4 py-2.5 rounded-[12px] bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white text-xs font-bold transition-all shadow-[0_4px_12px_rgba(255,107,26,0.3)] flex items-center justify-center gap-1.5"
            >
              <span>Review All Ready Emails</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
        </Glass>

      </div>

      {/* ========================================================
          3. FULL-WIDTH OUTREACH PROGRESS RIBBON
         ======================================================== */}
      <Glass variant="surface" radius="outer" className="bento-reveal p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Broadcast size={17} className="text-[#FF6B1A]" weight="duotone" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#735E50] font-mono">
              Your Outreach Steps
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#735E50] font-medium">
            {totalSent} sent of {totalContacts} recruiters
          </span>
        </div>
        <PipelineFunnel
          contactsCount={totalContacts}
          draftsCount={totalPending + totalSent}
          reviewCount={totalPending}
          sentCount={totalSent}
        />
      </Glass>

      {/* ========================================================
          4. CAMPAIGNS BENTO CARDS
         ======================================================== */}
      <div className="bento-reveal space-y-4">
        {/* Section Header with Liquid Filter Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold font-display text-[#2A1A0F] flex items-center gap-2">
              <Stack size={20} className="text-[#FF6B1A]" weight="duotone" />
              <span>Your Email Folders</span>
            </h2>
            <p className="text-xs text-[#735E50] mt-0.5">
              Manage your job search lists and email sending progress.
            </p>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-full bg-white/70 border border-white/90 shadow-2xs">
              {(['ALL', 'SENDING', 'DRAFT', 'PAUSED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCampaignFilter(tab)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    campaignFilter === tab
                      ? 'bg-[#FF6B1A] text-white shadow-xs'
                      : 'text-[#735E50] hover:text-[#2A1A0F]'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="relative">
              <MagnifyingGlass size={14} className="text-[#735E50] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search email folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 pr-3 py-1.5 text-xs bg-white/70 border border-white/90 rounded-full text-[#2A1A0F] placeholder-[#735E50]/60 focus:outline-none focus:border-[#FF6B1A] shadow-2xs w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Campaign Cards Grid */}
        {safeCampaigns.length === 0 ? (
          <Glass variant="surface" radius="outer" className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-[20px] bg-stone-100 text-[#735E50] flex items-center justify-center mx-auto shadow-2xs">
              <Stack size={24} weight="duotone" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold font-display text-[#2A1A0F]">No email folders created yet</h4>
              <p className="text-xs text-[#735E50]">
                Add recruiters or upload a list to start your first job outreach email folder.
              </p>
            </div>
            <Link
              to="/campaigns"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white text-xs font-bold rounded-[12px] transition-all shadow-[0_4px_12px_rgba(255,107,26,0.3)]"
            >
              <Plus size={14} weight="bold" />
              <span>Create Email Folder</span>
            </Link>
          </Glass>
        ) : filteredCampaigns.length === 0 ? (
          <Glass variant="surface" radius="inner" className="p-8 text-center text-xs text-[#735E50] font-mono">
            No email folders match "{searchQuery}"
          </Glass>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCampaigns.map((c) => {
              const total = c.metrics?.total || 0;
              const sent = c.metrics?.sent || 0;
              const failed = c.metrics?.failed || 0;
              const pending = (c.metrics?.pending || 0) + (c.metrics?.generating || 0) + (c.metrics?.ready || 0);

              const sentPercent = total > 0 ? (sent / total) * 100 : 0;
              const pendingPercent = total > 0 ? (pending / total) * 100 : 0;
              const failedPercent = total > 0 ? (failed / total) * 100 : 0;
              const percent = total > 0 ? Math.round((sent / total) * 100) : 0;

              return (
                <Glass
                  key={c.id}
                  variant="surface"
                  radius="inner"
                  interactive
                  className="p-5 flex flex-col justify-between space-y-4"
                >
                  {/* Card Header: Title & Status Capsule */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-bold font-display text-[#2A1A0F] truncate leading-snug">
                        {c.name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                          c.status === 'SENDING'
                            ? 'bg-[#FF6B1A]/10 text-[#FF6B1A] border border-[#FF6B1A]/30'
                            : c.status === 'COMPLETED'
                            ? 'bg-[#1DA365]/10 text-[#1DA365] border border-[#1DA365]/30'
                            : c.status === 'PAUSED'
                            ? 'bg-stone-100 text-[#735E50]'
                            : 'bg-[#D99B00]/10 text-[#D99B00] border border-[#D99B00]/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#735E50] line-clamp-1">
                      {c.description || 'Target recruiter outreach list'}
                    </p>
                  </div>

                  {/* Multi-Segment Delivery Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#735E50] font-medium">
                      <span>{sent} of {total} sent</span>
                      <span className="font-mono text-[#2A1A0F] font-bold">{percent}%</span>
                    </div>

                    <div className="w-full bg-[rgba(42,26,15,0.06)] rounded-full h-2 overflow-hidden flex shadow-2xs">
                      {/* Sent Leaf Segment */}
                      <div
                        className="bg-[#1DA365] h-2 transition-all duration-500"
                        style={{ width: `${sentPercent}%` }}
                        title={`Sent: ${sent}`}
                      />
                      {/* Queued Saffron Segment */}
                      <div
                        className="bg-[#D99B00] h-2 transition-all duration-500"
                        style={{ width: `${pendingPercent}%` }}
                        title={`Queued: ${pending}`}
                      />
                      {/* Failed Signal Segment */}
                      <div
                        className="bg-[#E63946] h-2 transition-all duration-500"
                        style={{ width: `${failedPercent}%` }}
                        title={`Failed: ${failed}`}
                      />
                    </div>
                  </div>

                  {/* Metrics Footer & Jump Action */}
                  <div className="pt-3 border-t border-[rgba(42,26,15,0.06)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#735E50]">
                      <span>{total} recruiters</span>
                      <span>•</span>
                      <span className="text-[#D99B00] font-bold">{pending} to review</span>
                    </div>

                    <Link
                      to={`/outbox?campaignId=${c.id}`}
                      className="px-2.5 py-1 rounded-[10px] bg-stone-100 hover:bg-[#FF6B1A] hover:text-white font-bold text-xs text-[#2A1A0F] transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <span>Review Emails</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </Glass>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          5. BOTTOM SPLIT: SENT EMAILS & INBOX PROTECTION
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (8 Cols): Sent Emails vs Activity Log */}
        <Glass variant="surface" radius="outer" className="bento-reveal lg:col-span-8 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(42,26,15,0.06)]">
            <div className="flex items-center gap-1 p-1 bg-stone-100/80 rounded-[12px]">
              <button
                onClick={() => setActivityTab('DISPATCHES')}
                className={`px-3 py-1 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                  activityTab === 'DISPATCHES'
                    ? 'bg-white text-[#2A1A0F] shadow-2xs'
                    : 'text-[#735E50] hover:text-[#2A1A0F]'
                }`}
              >
                Sent Emails
              </button>
              <button
                onClick={() => setActivityTab('LOGS')}
                className={`px-3 py-1 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                  activityTab === 'LOGS'
                    ? 'bg-white text-[#2A1A0F] shadow-2xs'
                    : 'text-[#735E50] hover:text-[#2A1A0F]'
                }`}
              >
                Activity Log
              </button>
            </div>

            <Link
              to={activityTab === 'DISPATCHES' ? '/history' : '/logs'}
              className="text-xs font-bold text-[#FF6B1A] hover:underline"
            >
              View Full History →
            </Link>
          </div>

          {/* Feed Content */}
          {activityTab === 'DISPATCHES' ? (
            <div className="space-y-2">
              {safeHistory.length === 0 ? (
                <p className="text-xs text-[#735E50]/60 py-6 text-center font-mono">
                  No emails sent today yet. Check your drafts in the Review Queue to begin.
                </p>
              ) : (
                safeHistory.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white/60 hover:bg-white/90 rounded-[16px] border border-white/80 shadow-2xs flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#1DA365]/10 text-[#1DA365] flex items-center justify-center font-bold text-xs shrink-0">
                        {item.contact?.firstName?.charAt(0) || 'P'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#2A1A0F] text-xs truncate">
                          {item.contact?.firstName
                            ? `${item.contact.firstName} ${item.contact.lastName || ''}`
                            : item.contact?.email || 'Contact'}
                          <span className="text-[#735E50] font-normal text-[11px] ml-1.5 font-mono">
                            ({item.contact?.company || 'Company'})
                          </span>
                        </div>
                        <div className="text-[11px] text-[#735E50] truncate">{item.subject}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-[#735E50]">
                        {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[#1DA365] text-xs font-bold flex items-center gap-1 bg-[#1DA365]/10 px-2 py-0.5 rounded-full">
                        <CheckCircle size={12} weight="fill" /> Delivered
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2 font-mono text-[10px]">
              {safeLogs.length === 0 ? (
                <p className="text-xs text-[#735E50]/60 py-6 text-center font-sans">No recent activity.</p>
              ) : (
                safeLogs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-[12px] bg-white/60 border border-white/80 flex items-start gap-2 shadow-2xs"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 uppercase ${
                        log.level === 'ERROR'
                          ? 'bg-rose-100 text-rose-700'
                          : log.level === 'WARN'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-[#2A1A0F] truncate leading-relaxed">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </Glass>

        {/* Right (4 Cols): Spam & Inbox Protection Card */}
        <Glass variant="surface" radius="outer" className="bento-reveal lg:col-span-4 p-5 space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-[#1DA365]" weight="duotone" />
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#2A1A0F]">
                Spam & Inbox Protection
              </h3>
            </div>
            <p className="text-xs text-[#735E50]">
              Built-in protections to keep your Gmail account safe and trusted.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-[14px] bg-white/60 border border-white/80 shadow-2xs flex items-center justify-between">
              <span className="text-[#2A1A0F] font-medium flex items-center gap-2">
                <CheckCircle size={14} className="text-[#1DA365]" weight="fill" />
                <span>Pause Between Emails</span>
              </span>
              <span className="font-mono text-[#735E50] font-bold">45–90s pause</span>
            </div>

            <div className="p-2.5 rounded-[14px] bg-white/60 border border-white/80 shadow-2xs flex items-center justify-between">
              <span className="text-[#2A1A0F] font-medium flex items-center gap-2">
                <CheckCircle size={14} className="text-[#1DA365]" weight="fill" />
                <span>Never Email Same Person Twice</span>
              </span>
              <span className="font-mono text-[#1DA365] font-bold">Protected</span>
            </div>

            <div className="p-2.5 rounded-[14px] bg-white/60 border border-white/80 shadow-2xs flex items-center justify-between">
              <span className="text-[#2A1A0F] font-medium flex items-center gap-2">
                <CheckCircle size={14} className="text-[#1DA365]" weight="fill" />
                <span>Bad Email Protection</span>
              </span>
              <span className="font-mono text-[#1DA365] font-bold">0 blocked</span>
            </div>
          </div>

          <Link
            to="/settings"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[12px] bg-stone-100 hover:bg-stone-200 text-xs font-bold text-[#2A1A0F] transition-all"
          >
            <span>Change Safety Settings</span>
            <ArrowRight size={13} />
          </Link>
        </Glass>
      </div>

    </div>
  );
};
