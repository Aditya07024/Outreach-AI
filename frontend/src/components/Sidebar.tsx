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
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  gmailStatus: { connected: boolean; email?: string } | null;
  onLogout?: () => void;
  isPaid?: boolean;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ gmailStatus, onLogout, isPaid = true, userRole }) => {
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
  ];

  const activeLinks = [...links];
  if (userRole === 'super_admin') {
    activeLinks.push({ to: '/admin-portal', name: 'Admin Portal', icon: ShieldAlert });
  }

  return (
    <aside className="w-64 border-r border-neutral-800 bg-zinc-950 flex flex-col justify-between h-screen fixed left-0 top-0 z-20">
      <div className="p-6 flex flex-col gap-6">
        {/* App Title */}
        <div className="flex items-center gap-2 px-2">
          <img src={logo} alt="Outreach AI Logo" className="h-8 object-contain rounded-md" />
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1">
          {activeLinks.map((link) => {
            const isLinkRestricted = link.to !== '/' && link.to !== '/settings' && link.to !== '/subscription' && link.to !== '/admin-portal';
            const isLinkDisabled = !isPaid && isLinkRestricted;

            return (
              <NavLink
                key={link.to}
                to={isLinkDisabled ? '#' : link.to}
                onClick={(e) => {
                  if (isLinkDisabled) {
                    e.preventDefault();
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    isLinkDisabled
                      ? 'text-neutral-600 cursor-not-allowed opacity-50'
                      : isActive
                      ? 'bg-neutral-900 text-neutral-100'
                      : 'text-neutral-400 hover:bg-neutral-900/50 hover:text-neutral-200'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </div>
                {isLinkDisabled && <Lock className="w-3.5 h-3.5 text-neutral-650" />}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Gmail Connection Status Footer */}
      <div className="p-4 border-t border-neutral-900 bg-zinc-950/40 space-y-2">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-neutral-900/30 border border-neutral-900">
          <div className="relative flex">
            <span className={`h-2.5 w-2.5 rounded-full ${gmailStatus?.connected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Gmail Status</span>
            <span className="text-xs text-neutral-200 font-medium truncate">
              {gmailStatus?.connected ? gmailStatus.email : 'Not Connected'}
            </span>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-neutral-400 hover:text-neutral-300 rounded-md text-[10px] font-semibold transition-all cursor-pointer"
          >
            Sign Out
          </button>
        )}
      </div>
    </aside>
  );
};
