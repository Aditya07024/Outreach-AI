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
import { PricingPage } from './PricingPage';

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
      // Fetch Campaigns, History, and Logs in parallel
      const [campRes, histRes, logsRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/history'),
        fetch('/api/logs?limit=8')
      ]);

      const [campData, histData, logsData] = await Promise.all([
        campRes.json(),
        histRes.json(),
        logsRes.json()
      ]);

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
    if (!isPaid) {
      setIsLoading(false);
      return;
    }
    fetchDashboardData();
    // Poll updates every 30 seconds to show active progress without hammering the database
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [isPaid]);

  if (!isPaid) {
    return <PricingPage user={user!} onPaymentSuccess={onPaymentSuccess} />;
  }

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

    

      </div>
    </div>
  );
};
