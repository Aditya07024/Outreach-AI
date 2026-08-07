import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import { 
  LayoutDashboard, 
  Send, 
  FileText, 
  Settings, 
  History, 
  Terminal,
  Mail,
  PenSquare,
  Lock,
  CreditCard,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

interface SidebarProps {
  gmailStatus: { connected: boolean; email?: string } | null;
  onLogout?: () => void;
  isPaid?: boolean;
  userRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
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

export const Sidebar: React.FC<SidebarProps> = ({ 
  gmailStatus, 
  onLogout, 
  isPaid = true, 
  userRole,
  isOpen = false,
  onClose,
  currentUser
}) => {
  const links = [
    { to: '/', name: 'Dashboard', icon: LayoutDashboard },
    { to: '/compose', name: 'Compose Email', icon: PenSquare },
    { to: '/campaigns', name: 'Campaigns', icon: Send },
    { to: '/outbox', name: 'Outbox / Queue', icon: Mail },
    { to: '/resumes', name: 'Resumes', icon: FileText },
    { to: '/history', name: 'History', icon: History },
    // { to: '/logs', name: 'Logs', icon: Terminal },
    { to: '/settings', name: 'Settings', icon: Settings },
    { to: '/subscription', name: 'Subscription', icon: CreditCard },
    { to: '/support', name: 'Support Help', icon: HelpCircle },
  ];

  const activeLinks = [...links];
  if (userRole === 'super_admin') {
    activeLinks.push({ to: '/admin-portal', name: 'Admin Portal', icon: ShieldAlert });
  }

  return (
    <>
      {/* Backdrop for mobile screens */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`w-64 border-r border-slate-200/80 bg-white flex flex-col justify-between h-screen fixed left-0 top-0 z-30 transition-transform duration-300 ease-in-out shadow-sm md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 flex flex-col gap-6">
          {/* App Title */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <img src={logo} alt="Outreach AI" className="h-8 object-contain rounded-lg shadow-sm" />
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5" aria-label="Sidebar Navigation">
            {activeLinks.map((link) => {
              const isLinkDisabled = false;

              return (
                <NavLink
                  key={link.to}
                  to={isLinkDisabled ? '#' : link.to}
                  onClick={(e) => {
                    if (isLinkDisabled) {
                      e.preventDefault();
                    } else {
                      onClose?.();
                    }
                  }}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-150 ${
                      isLinkDisabled
                        ? 'text-slate-400 cursor-not-allowed opacity-50'
                        : isActive
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </div>
                  {isLinkDisabled && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Trial Status Warning Badge */}
        {currentUser && !currentUser.paid && currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && (
          <div className="mx-5 px-3.5 py-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] space-y-1">
            {(() => {
              const trialEndsAt = currentUser.trialEndsAt;
              if (!trialEndsAt) return <span className="text-slate-500">No active trial</span>;
              const ends = new Date(trialEndsAt);
              const diffMs = ends.getTime() - Date.now();
              const hoursLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
              if (hoursLeft > 0) {
                return (
                  <>
                    <div className="font-bold text-slate-900">Free Trial Active</div>
                    <div className="text-slate-600 font-medium">{hoursLeft} hours remaining</div>
                  </>
                );
              } else {
                return (
                  <>
                    <div className="font-bold text-slate-900">Trial Expired</div>
                    <div className="text-slate-600">Please subscribe to link Gmail.</div>
                  </>
                );
              }
            })()}
          </div>
        )}

        {/* Connection & Sign Out Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 space-y-2.5">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="relative flex">
              <span className={`h-2.5 w-2.5 rounded-full ${gmailStatus?.connected ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-rose-500 animate-pulse ring-2 ring-rose-200'}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Gmail Status</span>
              <span className="text-xs text-slate-800 font-bold truncate">
                {gmailStatus?.connected ? gmailStatus.email : 'Not Connected'}
              </span>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Sign Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
