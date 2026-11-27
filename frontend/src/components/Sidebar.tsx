import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import { 
  LayoutDashboard, 
  Send, 
  FileText, 
  Settings, 
  History, 
  Mail, 
  PenSquare, 
  Lock, 
  CreditCard, 
  ShieldAlert, 
  HelpCircle,
  Sparkles,
  ChevronRight,
  Flame,
  Layers,
  Clock
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
  const navigationSections: {
    title: string;
    items: {
      to: string;
      name: string;
      icon: any;
      badge: string | null;
      color: string;
    }[];
  }[] = [
    {
      title: 'Workflow Pipeline',
      items: [
        { to: '/', name: 'Overview Dashboard', icon: LayoutDashboard, badge: null, color: 'text-blue-600' },
        { to: '/campaigns', name: 'Campaigns & Leads', icon: Layers, badge: null, color: 'text-orange-500' },
        { to: '/outbox', name: 'Outbox Queue', icon: Clock, badge: null, color: 'text-amber-500' },
      ]
    },
    {
      title: 'Audience & Assets',
      items: [
        { to: '/resumes', name: 'Resumes & Profiles', icon: FileText, badge: null, color: 'text-slate-500' },
        { to: '/history', name: 'Outreach History', icon: History, badge: null, color: 'text-slate-500' },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { to: '/settings', name: 'Safety & Settings', icon: Settings, badge: null, color: 'text-slate-500' },
        { to: '/subscription', name: 'Plans & Billing', icon: CreditCard, badge: null, color: 'text-slate-500' },
        { to: '/support', name: 'Help & Support', icon: HelpCircle, badge: null, color: 'text-slate-500' },
      ]
    }
  ];

  if (userRole === 'super_admin') {
    navigationSections.push({
      title: 'Administration',
      items: [
        { to: '/admin-portal', name: 'Admin Portal', icon: ShieldAlert, badge: 'PRO', color: 'text-rose-500' }
      ]
    });
  }

  return (
    <>
      {/* Backdrop for mobile screens */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`w-64 border-r border-slate-200/90 bg-white flex flex-col justify-between h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out shadow-sm md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Scrollable Nav Area */}
        <div className="p-4 sm:p-5 flex flex-col gap-5 overflow-y-auto">
          
          {/* App Logo & Header */}
          <div className="flex items-center gap-3 px-2 pt-1 pb-2 border-b border-slate-100">
            <img src={logo} alt="Outreach AI" className="h-8 object-contain rounded-lg shadow-2xs" />
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none">Outreach AI</h3>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Campaign Engine</span>
            </div>
          </div>

          {/* Categorized Navigation Sections */}
          <nav className="flex flex-col gap-5" aria-label="Sidebar Navigation">
            {navigationSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
                <div className="space-y-1 pt-1">
                  {section.items.map((link) => {
                    const Icon = link.icon;
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => onClose?.()}
                        className={({ isActive }) =>
                          `group flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive ? 'text-blue-600' : `${link.color} group-hover:text-slate-900`
                              }`} />
                              <span className="truncate">{link.name}</span>
                            </div>
                            {link.badge && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                link.badge === 'AI'
                                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                                  : 'bg-rose-100 text-rose-700'
                              }`}>
                                {link.badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Section: Trial Status & Account Controls */}
        <div className="border-t border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
          
          {/* Trial / Quota Status Warning Badge */}
          {currentUser && !currentUser.paid && currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && (
            <div className="p-3 rounded-xl border text-[11px] space-y-1 bg-amber-50 border-amber-200 text-amber-900">
              {(() => {
                const trialEndsAt = currentUser.trialEndsAt;
                if (!trialEndsAt) return <span className="text-slate-500">Free Tier Account</span>;
                const ends = new Date(trialEndsAt);
                const diffMs = ends.getTime() - Date.now();
                const hoursLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
                if (hoursLeft > 0) {
                  return (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-amber-900 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-orange-600" />
                          <span>Free Trial Active</span>
                        </div>
                        <div className="text-amber-700 font-medium text-[10px]">{hoursLeft} hours remaining</div>
                      </div>
                      <NavLink
                        to="/subscription"
                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition-colors"
                      >
                        Upgrade
                      </NavLink>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex items-center justify-between text-rose-900">
                      <div>
                        <div className="font-extrabold text-rose-800">Trial Ended</div>
                        <div className="text-rose-600 text-[10px]">Upgrade to send emails.</div>
                      </div>
                      <NavLink
                        to="/subscription"
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition-colors"
                      >
                        Renew
                      </NavLink>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* Connection Status Pill */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              gmailStatus?.connected 
                ? 'bg-emerald-500 ring-2 ring-emerald-200' 
                : 'bg-rose-500 animate-pulse ring-2 ring-rose-200'
            }`} />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {gmailStatus?.connected ? 'Gmail Connected' : 'Gmail Alert'}
              </span>
              <span className="text-xs text-slate-800 font-bold truncate">
                {gmailStatus?.connected ? gmailStatus.email : 'Action Required'}
              </span>
            </div>
            {!gmailStatus?.connected && (
              <NavLink 
                to="/settings"
                className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 underline shrink-0"
              >
                Link
              </NavLink>
            )}
          </div>

          {/* Sign Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              Sign Out
            </button>
          )}

        </div>
      </aside>
    </>
  );
};
