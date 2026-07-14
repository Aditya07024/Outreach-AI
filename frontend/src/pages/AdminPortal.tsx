import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  Users, 
  Mail, 
  Unlock, 
  Lock, 
  Search, 
  LogOut, 
  KeyRound, 
  AlertCircle, 
  Sparkles, 
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

interface UserDetail {
  id: number;
  email: string | null;
  role: string;
  paid: boolean;
  plan: string | null;
  paidUntil: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  campaignsCount: number;
  emailsSent: number;
}

interface AdminStats {
  totalUsers: number;
  paidUsers: number;
  totalIncome: number;
  yearlyCount: number;
  lifetimeCount: number;
}

interface AdminPortalProps {
  currentUser: {
    id: number;
    email: string | null;
    role: string;
    paid: boolean;
  } | null;
  onAdminLoginSuccess: () => void;
  onAdminLogout: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ 
  currentUser, 
  onAdminLoginSuccess, 
  onAdminLogout 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard Stats & Users
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser?.role === 'super_admin';

  const fetchAdminData = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setDashboardError(null);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to retrieve administrative data.');
      }
      const data = await response.json();
      setUsers(data.users);
      setStats(data.stats);
    } catch (err: any) {
      setDashboardError(err.message || 'Failed to fetch admin data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsSubmitting(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/google/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect credentials');
      }

      localStorage.setItem('token', data.token);
      onAdminLoginSuccess();
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBypassPayment = async (userId: number, userEmail: string | null) => {
    const confirmBypass = window.confirm(`Are you sure you want to bypass payment requirements for user ID: ${userId} (${userEmail || 'Local'})?`);
    if (!confirmBypass) return;

    try {
      const res = await fetch(`/api/admin/bypass/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to bypass payment');
      }

      alert('Payment requirement bypassed successfully.');
      fetchAdminData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCancelSubscription = async (userId: number, userEmail: string | null) => {
    const confirmCancel = window.confirm(`Are you sure you want to cancel the subscription plan for user ID: ${userId} (${userEmail || 'Local'})?`);
    if (!confirmCancel) return;

    try {
      const res = await fetch(`/api/admin/cancel/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      alert('Subscription plan cancelled successfully.');
      fetchAdminData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Filter users based on query
  const filteredUsers = users.filter(u => 
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
    String(u.id).includes(searchQuery)
  );

  const totalEmailsSent = users.reduce((acc, u) => acc + u.emailsSent, 0);

  // 1. SIGN IN SCREEN FOR ADMIN PORTAL
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-purple-950 border border-purple-800/40 flex items-center justify-center text-purple-400 mb-2">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Admin Gatekeeper</h2>
          <p className="text-xs text-neutral-450">Please provide administrative credentials to access command logs and bypass routes.</p>
        </div>

        {loginError && (
          <div className="flex gap-2 p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-450 text-xs items-center">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-450" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="border border-neutral-850 bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              className="rounded-lg border border-neutral-800 bg-zinc-950 px-3.5 py-2 text-xs focus:outline-none focus:border-neutral-700 text-neutral-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="rounded-lg border border-neutral-800 bg-zinc-950 px-3.5 py-2 text-xs focus:outline-none focus:border-neutral-700 text-neutral-200"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5"
          >
            <KeyRound className="w-3.5 h-3.5 text-zinc-950" />
            {isSubmitting ? 'Authenticating...' : 'Sign In as System Admin'}
          </button>
        </form>
      </div>
    );
  }

  // 2. MAIN ADMIN PORTAL VIEW
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in relative">
      
      {/* Glow backgrounds */}
      <div className="absolute top-0 right-1/4 w-[300px] h-[300px] rounded-full bg-purple-900/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-400" />
            Admin Command Center
          </h2>
          <p className="text-xs text-neutral-450 mt-1">Real-time statistics of platform users, aggregate income levels, and email dispatches.</p>
        </div>
        <button
          onClick={onAdminLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-neutral-350 font-semibold rounded-lg text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout Admin Session
        </button>
      </div>

      {dashboardError && (
        <div className="flex gap-2 p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-450 text-xs items-center max-w-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-450" />
          <span>{dashboardError}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Income Card */}
          <div className="p-6 border border-neutral-800 bg-zinc-900/40 rounded-xl space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Total Revenue</span>
              <DollarSign className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-neutral-100">₹{stats.totalIncome}</span>
            </div>
            <div className="text-[10px] text-neutral-500 border-t border-neutral-900/60 pt-2 flex justify-between">
              <span>Yearly: {stats.yearlyCount} (₹{stats.yearlyCount * 1000})</span>
              <span>Lifetime: {stats.lifetimeCount} (₹{stats.lifetimeCount * 3000})</span>
            </div>
          </div>

          {/* User Metrics */}
          <div className="p-6 border border-neutral-800 bg-zinc-900/40 rounded-xl space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Platform Users</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-neutral-100">{stats.totalUsers}</span>
            </div>
            <div className="text-[10px] text-neutral-500 border-t border-neutral-900/60 pt-2">
              <span>{stats.paidUsers} accounts paid subscription, {stats.totalUsers - stats.paidUsers} unpaid accounts</span>
            </div>
          </div>

          {/* Email metrics */}
          <div className="p-6 border border-neutral-800 bg-zinc-900/40 rounded-xl space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Email Send Volume</span>
              <Mail className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-neutral-100">{totalEmailsSent}</span>
            </div>
            <div className="text-[10px] text-neutral-500 border-t border-neutral-900/60 pt-2">
              <span>Combined system-wide emails dispatched across all campaigns</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Users list */}
      <div className="border border-neutral-800 bg-zinc-900/20 rounded-xl p-6 space-y-4">
        
        {/* Search header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Registered Users</h3>
            <p className="text-[10px] text-neutral-550">Review and bypass payment details for accounts.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 translate-y-[-50%]" />
            <input
              type="text"
              placeholder="Search ID, Email, Role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-zinc-950 pl-9 pr-3.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-750"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border border-neutral-900 rounded-lg">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-neutral-550 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full border border-neutral-800 border-t-purple-500 animate-spin" />
              <span>Loading User Records...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-xs text-neutral-550">
              No user records matched your criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950 text-neutral-450 border-b border-neutral-850">
                  <th className="p-3.5 font-bold">ID</th>
                  <th className="p-3.5 font-bold">Email</th>
                  <th className="p-3.5 font-bold">Role</th>
                  <th className="p-3.5 font-bold">Subscription Status</th>
                  <th className="p-3.5 font-bold">Expiration Date</th>
                  <th className="p-3.5 font-bold">Joined At</th>
                  <th className="p-3.5 font-bold">Last Active</th>
                  <th className="p-3.5 font-bold text-center">Campaigns</th>
                  <th className="p-3.5 font-bold text-center">Emails Sent</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isUserPaid = u.paid || u.role === 'super_admin' || u.role === 'admin';
                  return (
                    <tr key={u.id} className="border-b border-neutral-900 hover:bg-neutral-900/30 transition-colors">
                      <td className="p-3.5 font-mono text-neutral-400 font-bold">{u.id}</td>
                      <td className="p-3.5 text-neutral-200 font-semibold">{u.email || 'Local Owner / Admin'}</td>
                      <td className="p-3.5 text-neutral-400 font-mono text-[10px]">{u.role}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          isUserPaid
                            ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/20'
                            : 'bg-rose-950/20 text-rose-450 border-rose-900/20'
                        }`}>
                          {isUserPaid ? `${u.plan || 'Admin Bypass'}` : 'Unpaid'}
                        </span>
                      </td>
                      <td className="p-3.5 text-neutral-450">
                        {u.plan === 'yearly' && u.paidUntil 
                          ? new Date(u.paidUntil).toLocaleDateString()
                          : u.plan === 'lifetime' || u.role === 'super_admin'
                          ? 'Never'
                          : 'N/A'
                        }
                      </td>
                      <td className="p-3.5 text-neutral-450">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-neutral-450 font-mono text-[10px]">
                        {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="p-3.5 text-center text-neutral-300 font-semibold">{u.campaignsCount}</td>
                      <td className="p-3.5 text-center text-neutral-300 font-semibold">{u.emailsSent}</td>
                      <td className="p-3.5 text-right">
                        {!isUserPaid ? (
                          <button
                            onClick={() => handleBypassPayment(u.id, u.email)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-900 hover:bg-purple-800 text-purple-200 hover:text-purple-100 rounded text-[10px] font-bold transition-all shadow shadow-purple-950/40"
                          >
                            <Unlock className="w-3 h-3" />
                            Bypass Pay
                          </button>
                        ) : (
                          <div className="flex justify-end items-center gap-2">
                            <span className="text-[10px] text-neutral-600 font-medium flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-700" />
                              Paid
                            </span>
                            {u.role !== 'super_admin' && u.id !== currentUser?.id && (
                              <button
                                onClick={() => handleCancelSubscription(u.id, u.email)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 border border-rose-900/30 hover:border-rose-800/60 bg-rose-950/10 hover:bg-rose-950/20 text-rose-450 rounded text-[10px] font-bold transition-all shadow shadow-rose-950/40"
                              >
                                <Lock className="w-3 h-3" />
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
