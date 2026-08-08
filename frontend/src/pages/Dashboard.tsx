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
  Zap,
  RefreshCw,
  Plus,
  MailCheck
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

      setCampaigns(Array.isArray(campData) ? campData : (campData?.campaigns && Array.isArray(campData.campaigns) ? campData.campaigns : []));
      setHistory(Array.isArray(histData) ? histData : (histData?.history && Array.isArray(histData.history) ? histData.history : []));
      setLogs(Array.isArray(logsData) ? logsData : (logsData?.logs && Array.isArray(logsData.logs) ? logsData.logs : []));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      setCampaigns([]);
      setHistory([]);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const safeHistory = Array.isArray(history) ? history : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

  // Aggregated stats calculation
  const totalContacts = safeCampaigns.reduce((acc, c) => acc + (c.metrics?.total || 0), 0);
  const totalSent = safeCampaigns.reduce((acc, c) => acc + (c.metrics?.sent || 0), 0);
  const totalFailed = safeCampaigns.reduce((acc, c) => acc + (c.metrics?.failed || 0), 0);
  
  const totalPending = safeCampaigns.reduce((acc, c) => 
    acc + (c.metrics?.pending || 0) + (c.metrics?.generating || 0) + (c.metrics?.ready || 0), 0
  );

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaySentCount = safeHistory.filter(h => {
    const sentDate = new Date(h.sentAt);
    return h.status === 'SENT' && sentDate >= startOfToday;
  }).length;

  const overallProgress = totalContacts > 0 ? Math.round((totalSent / totalContacts) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[600px] bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-900"></div>
          <span className="text-xs font-bold text-slate-600">Loading Outreach Dashboard...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Total Contacts', 
      value: totalContacts.toLocaleString(), 
      badge: `${safeCampaigns.length} Campaigns`, 
      icon: Users, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50 border-indigo-100' 
    },
    { 
      title: 'Emails Delivered', 
      value: totalSent.toLocaleString(), 
      badge: `${overallProgress}% Complete`, 
      icon: Send, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50 border-emerald-100' 
    },
    { 
      title: 'Sent Today', 
      value: todaySentCount.toLocaleString(), 
      badge: 'Last 24 Hours', 
      icon: CalendarDays, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50 border-blue-100' 
    },
    { 
      title: 'Outbox Queue', 
      value: totalPending.toLocaleString(), 
      badge: totalFailed > 0 ? `${totalFailed} Failed` : 'Ready to Send', 
      icon: Clock, 
      color: totalFailed > 0 ? 'text-amber-600' : 'text-slate-700', 
      bg: totalFailed > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-100 border-slate-200' 
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Overview Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Real-time cold email outreach campaign metrics and anti-spam deliverability logs.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <Link
            to="/compose"
            className="px-4 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <PenSquare className="w-4 h-4" />
            <span>AI Email Studio</span>
          </Link>

          <Link
            to="/campaigns"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div className={`p-2 rounded-xl ${card.bg} border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {card.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Left Column Campaigns & Progress, Right Column Logs & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Campaigns & Outbox Summary (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Campaigns Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Active Outreach Campaigns
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage and track your active cold email campaign queues.</p>
              </div>
              <Link 
                to="/campaigns"
                className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {safeCampaigns.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-3">
                <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-800">No Active Campaigns Found</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Create a campaign and import contacts to start sending automated emails.</p>
                </div>
                <Link
                  to="/campaigns"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-900 text-slate-900 font-bold rounded-xl text-xs hover:bg-slate-900 hover:text-white transition-all shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Campaign
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {safeCampaigns.slice(0, 4).map((c) => {
                  const total = c.metrics?.total || 0;
                  const sent = c.metrics?.sent || 0;
                  const percent = total > 0 ? Math.round((sent / total) * 100) : 0;
                  return (
                    <div 
                      key={c.id} 
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                          <span className="text-[10px] text-slate-500">{c.description || 'General Cold Outreach'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'SENDING' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {c.status}
                          </span>
                          <Link
                            to={`/outbox?campaignId=${c.id}`}
                            className="px-3 py-1 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-lg text-[10px] transition-all shadow-2xs"
                          >
                            Review Queue
                          </Link>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-medium text-slate-500">
                          <span>{sent} of {total} sent</span>
                          <span className="font-bold text-slate-900">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-slate-900 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Launcher Banner */}
          {/* <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold">Cold Email Automation</span>
              <h3 className="text-lg font-black tracking-tight text-white">Generate High-Converting Cold Email Drafts</h3>
              <p className="text-xs text-slate-300 max-w-md">Our Grok-2 AI analyzes target recruiter roles and candidate resumes to craft personalized value propositions.</p>
            </div>
            <Link
              to="/compose"
              className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Launch Draft Studio</span>
            </Link>
          </div> */}

        </div>

        {/* Right Column: Recent Activity Feed & Quick Links (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Recent Sent Log Stream */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MailCheck className="w-4 h-4 text-emerald-600" />
                Recent Dispatched Emails
              </h3>
              <Link to="/history" className="text-[11px] font-bold text-slate-600 hover:text-slate-900">
                Log History
              </Link>
            </div>

            {safeHistory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No emails sent yet.</p>
            ) : (
              <div className="space-y-3">
                {safeHistory.slice(0, 5).map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                        {item.contact?.firstName ? `${item.contact.firstName} ${item.contact.lastName || ''}` : item.contact?.email || 'Recruiter'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{item.subject}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>{item.contact?.company || 'Direct Outreach'}</span>
                      <span className="text-emerald-700 font-bold">Sent via Gmail</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Diagnostic Logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                System Activity Stream
              </h3>
              <Link to="/logs" className="text-[11px] font-bold text-slate-600 hover:text-slate-900">
                View Diagnostics
              </Link>
            </div>

            {safeLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent logs recorded.</p>
            ) : (
              <div className="space-y-2 font-mono text-[10px]">
                {safeLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200/50 flex items-start gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                      log.level === 'ERROR' ? 'bg-rose-100 text-rose-800' :
                      log.level === 'WARN' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-slate-700 truncate">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
