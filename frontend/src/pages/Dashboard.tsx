import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Send, 
  AlertOctagon, 
  Clock, 
  TrendingUp, 
  CalendarDays,
  PenSquare,
  FileText,
  Settings as SettingsIcon,
  ArrowRight,
  CheckCircle2,
  Activity,
  Layers,
  Zap
} from 'lucide-react';
import { Campaign, EmailHistory, Log } from '../types';

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

export const Dashboard: React.FC<DashboardProps> = ({ isPaid, user, onPaymentSuccess }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [history, setHistory] = useState<EmailHistory[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [campRes, histRes, logsRes] = await Promise.allSettled([
        fetch('/api/campaigns'),
        fetch('/api/history'),
        fetch('/api/logs?limit=8')
      ]);

      const campData = campRes.status === 'fulfilled' && campRes.value.ok ? await campRes.value.json().catch(() => []) : [];
      const histData = histRes.status === 'fulfilled' && histRes.value.ok ? await histRes.value.json().catch(() => []) : [];
      const logsData = logsRes.status === 'fulfilled' && logsRes.value.ok ? await logsRes.value.json().catch(() => []) : [];

      setCampaigns(campData);
      setHistory(histData);
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Aggregated stats calculation
  const totalContacts = campaigns.reduce((acc, c) => acc + (c.metrics?.total || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + (c.metrics?.sent || 0), 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + (c.metrics?.failed || 0), 0);
  
  const totalPending = campaigns.reduce((acc, c) => 
    acc + (c.metrics?.pending || 0) + (c.metrics?.generating || 0) + (c.metrics?.ready || 0), 0
  );

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaySentCount = history.filter(h => {
    const sentDate = new Date(h.sentAt);
    return h.status === 'SENT' && sentDate >= startOfToday;
  }).length;

  const overallProgress = totalContacts > 0 ? Math.round((totalSent / totalContacts) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-4rem)] bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-800"></div>
          <span className="text-xs font-semibold text-slate-500">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Total Contacts', 
      value: totalContacts.toLocaleString(), 
      icon: Users, 
      badgeText: 'Volume'
    },
    { 
      title: 'Emails Sent', 
      value: totalSent.toLocaleString(), 
      icon: Send, 
      badgeText: 'Delivered'
    },
    { 
      title: 'Failed Attempts', 
      value: totalFailed.toLocaleString(), 
      icon: AlertOctagon, 
      badgeText: 'Bounces'
    },
    { 
      title: 'Pending Queue', 
      value: totalPending.toLocaleString(), 
      icon: Clock, 
      badgeText: 'In Queue'
    },
    { 
      title: 'Sent Today', 
      value: todaySentCount.toLocaleString(), 
      icon: CalendarDays, 
      badgeText: 'Today'
    },
    { 
      title: 'Overall Progress', 
      value: `${overallProgress}%`, 
      icon: TrendingUp, 
      badgeText: 'Completion'
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Clean Professional Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-200">
            <span>Cold Email Automation</span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard & Performance Overview
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Monitor email delivery queues, active campaigns, and direct recruiter outreach from your Gmail integration.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/compose"
            className="px-4 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <PenSquare className="w-3.5 h-3.5" />
            <span>Compose Email</span>
          </Link>
          <Link
            to="/campaigns"
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>New Campaign</span>
          </Link>
        </div>
      </div>

      {/* Metrics Stats Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            Metrics Summary
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Real-time status</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {card.title}
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700">
                  <card.icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {card.value}
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  {card.badgeText}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Campaigns Progress & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Campaigns Overview (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-600" />
                Active Campaigns
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Progress of your running job application batches</p>
            </div>
            <Link
              to="/campaigns"
              className="text-xs font-bold text-slate-800 hover:text-slate-900 flex items-center gap-1 transition-colors underline"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 space-y-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-8 space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Send className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-500">No active outreach campaigns yet.</p>
                <Link
                  to="/campaigns"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs hover:bg-slate-800 transition-colors"
                >
                  <span>Create Campaign</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              campaigns.slice(0, 4).map((camp) => {
                const total = camp.metrics?.total || 0;
                const sent = camp.metrics?.sent || 0;
                const percentage = total > 0 ? Math.round((sent / total) * 100) : 0;

                return (
                  <div key={camp.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{camp.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {camp.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-600 font-bold">
                        {sent} / {total} Sent ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-slate-900 h-full rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Action Navigation Grid (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-600" />
              Quick Actions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Shortcuts to manage your outreach</p>
          </div>

          <div className="space-y-2">
            <Link
              to="/compose"
              className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center">
                  <PenSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Compose Email</span>
                  <span className="text-[10px] text-slate-500">Draft personalized message</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
            </Link>

            <Link
              to="/resumes"
              className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Resumes</span>
                  <span className="text-[10px] text-slate-500">Upload PDF attachments</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
            </Link>

            <Link
              to="/settings"
              className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Settings</span>
                  <span className="text-[10px] text-slate-500">Gmail OAuth setup</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
            </Link>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            🔒 Secure Gmail API Integration
          </div>
        </div>

      </div>

    </div>
  );
};
