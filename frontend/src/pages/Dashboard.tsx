import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Send, 
  AlertOctagon, 
  Clock, 
  TrendingUp, 
  CalendarDays,
  FileCode2,
  Settings as SettingsIcon
} from 'lucide-react';
import { Campaign, EmailHistory, Log } from '../types';

export const Dashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [history, setHistory] = useState<EmailHistory[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // Fetch Campaigns
      const campRes = await fetch('/api/campaigns');
      const campData = await campRes.json();
      setCampaigns(campData);

      // Fetch History
      const histRes = await fetch('/api/history');
      const histData = await histRes.json();
      setHistory(histData);

      // Fetch Logs
      const logsRes = await fetch('/api/logs?limit=8');
      const logsData = await logsRes.json();
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll updates every 15 seconds to show active progress
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute aggregated stats
  const totalContacts = campaigns.reduce((acc, c) => acc + (c.metrics?.total || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + (c.metrics?.sent || 0), 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + (c.metrics?.failed || 0), 0);
  
  const totalPending = campaigns.reduce((acc, c) => 
    acc + (c.metrics?.pending || 0) + (c.metrics?.generating || 0) + (c.metrics?.ready || 0), 0
  );

  // Compute Today's Sent Count
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaySentCount = history.filter(h => {
    const sentDate = new Date(h.sentAt);
    return h.status === 'SENT' && sentDate >= startOfToday;
  }).length;

  // Calculate campaign progress percentages
  const activeCampaigns = campaigns.filter(c => c.status === 'SENDING' || c.status === 'COMPLETED');
  const overallProgress = totalContacts > 0 ? Math.round((totalSent / totalContacts) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-200"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Contacts', value: totalContacts, icon: Users, gradient: 'card-gradient-1' },
    { title: 'Emails Sent', value: totalSent, icon: Send, gradient: 'card-gradient-3' },
    { title: 'Failed Emails', value: totalFailed, icon: AlertOctagon, gradient: 'card-gradient-2' },
    { title: 'Pending Queue', value: totalPending, icon: Clock, gradient: 'card-gradient-1' },
    { title: 'Today\'s Sent Count', value: todaySentCount, icon: CalendarDays, gradient: 'card-gradient-3' },
    { title: 'Campaign Progress', value: `${overallProgress}%`, icon: TrendingUp, gradient: 'card-gradient-2' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Intro Header */}
      <div>
        <h2 className="text-xl font-bold text-neutral-100 tracking-tight">System Performance</h2>
        <p className="text-xs text-neutral-400 mt-1">Real-time status of your job outreach metrics, queue processes, and logs.</p>
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <div 
            key={idx} 
            className={`p-6 border border-neutral-800/80 rounded-xl relative overflow-hidden transition-all duration-300 hover:border-neutral-700/80 shadow-md ${card.gradient}`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                {card.title}
              </span>
              <card.icon className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-100 tracking-tight">{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Campaign Progress Indicators */}
        <div className="border border-neutral-800 bg-zinc-900/10 rounded-xl p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Active Campaigns</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Progress of your running job applications</p>
          </div>

          <div className="flex-1 flex flex-col gap-5 justify-center">
            {campaigns.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-500">
                No active outreach campaigns. Create one in Campaigns tab.
              </div>
            ) : (
              campaigns.slice(0, 3).map((camp) => {
                const total = camp.metrics?.total || 0;
                const sent = camp.metrics?.sent || 0;
                const percentage = total > 0 ? Math.round((sent / total) * 100) : 0;

                return (
                  <div key={camp.id} className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-neutral-300">{camp.name}</span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase">
                        {sent} / {total} Sent ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-900 border border-neutral-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-neutral-200 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity Log Feed */}
        <div className="border border-neutral-800 bg-zinc-900/10 rounded-xl p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Recent Activity Logs</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Real-time status updates and execution events</p>
          </div>

          <div className="flex-1 flex flex-col gap-3 min-h-[200px]">
            {logs.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-500">
                No activity logs available.
              </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 text-xs leading-relaxed py-1.5 border-b border-neutral-900/80 last:border-0"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {log.level === 'ERROR' ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500 block" />
                    ) : log.level === 'WARN' ? (
                      <span className="w-2 h-2 rounded-full bg-amber-500 block" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-neutral-500 block" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-300 font-medium truncate">{log.message}</p>
                    <div className="flex gap-2 items-center text-[10px] text-neutral-500 mt-0.5">
                      <span className="font-bold uppercase tracking-wider text-[9px] bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800/80">
                        {log.source}
                      </span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
