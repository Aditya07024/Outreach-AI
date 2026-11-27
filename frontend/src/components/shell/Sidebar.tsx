import React, { useRef, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import logo from '../../assets/logo.png';
import {
  SquaresFour,
  Stack,
  Tray,
  Sparkle,
  FileText,
  ClockCounterClockwise,
  Gear,
  CreditCard,
  Question,
  ShieldWarning,
  Flame,
  CheckCircle,
  SignOut,
  X,
  ArrowRight,
  LockSimple,
  WarningCircle,
  ArrowLeft,
} from '@phosphor-icons/react';

gsap.registerPlugin(Flip);

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
  userRole,
  isOpen = false,
  onClose,
  currentUser,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navContainerRef = useRef<HTMLDivElement>(null);
  const activeBubbleRef = useRef<HTMLDivElement>(null);
  const resumesLinkRef = useRef<HTMLAnchorElement>(null);
  const warningCardRef = useRef<HTMLDivElement>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resume status tracking: campaigns requires at least 1 resume
  const [resumeCount, setResumeCount] = useState<number>(() => {
    const cached = localStorage.getItem('outreach_resume_count');
    return cached !== null ? parseInt(cached, 10) : 0;
  });
  const [showResumeWarning, setShowResumeWarning] = useState(false);
  const [warningTop, setWarningTop] = useState<number>(220);

  const fetchResumeCount = async (retries = 3) => {
    try {
      const res = await fetch('/api/resumes');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.resumes || [];
        const count = list.length;
        setResumeCount(count);
        localStorage.setItem('outreach_resume_count', String(count));
        return;
      }
      if (res.status === 401 && retries > 0) {
        setTimeout(() => fetchResumeCount(retries - 1), 800);
      }
    } catch (e) {
      if (retries > 0) {
        setTimeout(() => fetchResumeCount(retries - 1), 800);
      }
    }
  };

  const updateWarningPosition = () => {
    if (resumesLinkRef.current) {
      const rect = resumesLinkRef.current.getBoundingClientRect();
      setWarningTop(rect.top - 8);
    }
  };

  useEffect(() => {
    fetchResumeCount();

    // Listen to custom event fired by Resumes.tsx upon upload/delete
    const handleUpdate = () => {
      fetchResumeCount();
      setShowResumeWarning(false);
    };
    window.addEventListener('resumesUpdated', handleUpdate);

    // Global listener so dashboard or any page can trigger the resume arrow warning
    const handleGlobalTrigger = () => triggerResumeWarning();
    window.addEventListener('showResumeWarning', handleGlobalTrigger);

    return () => {
      window.removeEventListener('resumesUpdated', handleUpdate);
      window.removeEventListener('showResumeWarning', handleGlobalTrigger);
    };
  }, []);

  // Update warning coordinates on resize or scroll
  useEffect(() => {
    if (showResumeWarning) {
      updateWarningPosition();
      window.addEventListener('resize', updateWarningPosition);
      window.addEventListener('scroll', updateWarningPosition);
      return () => {
        window.removeEventListener('resize', updateWarningPosition);
        window.removeEventListener('scroll', updateWarningPosition);
      };
    }
  }, [showResumeWarning]);

  // Dismiss warning when clicking outside
  useEffect(() => {
    if (!showResumeWarning) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (warningCardRef.current && !warningCardRef.current.contains(e.target as Node)) {
        setShowResumeWarning(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showResumeWarning]);

  const triggerResumeWarning = () => {
    updateWarningPosition();
    setShowResumeWarning(true);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setShowResumeWarning(false);
    }, 8000);
  };

  interface NavItem {
    to: string;
    name: string;
    icon: React.ElementType;
    badge: string | null;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navigationSections: NavSection[] = [
    {
      title: 'Outreach',
      items: [
        { to: '/', name: 'Overview', icon: SquaresFour, badge: null },
        { to: '/campaigns', name: 'Campaigns', icon: Stack, badge: null },
        { to: '/outbox', name: 'Review Emails', icon: Tray, badge: null },
      ],
    },
    {
      title: 'Resumes & History',
      items: [
        { to: '/resumes', name: 'Resumes', icon: FileText, badge: null },
        { to: '/history', name: 'Sent Emails', icon: ClockCounterClockwise, badge: null },
      ],
    },
    {
      title: 'Account & Settings',
      items: [
        { to: '/settings', name: 'Settings & Safety', icon: Gear, badge: null },
        { to: '/subscription', name: 'Billing & Plans', icon: CreditCard, badge: null },
        { to: '/support', name: 'Help & Docs', icon: Question, badge: null },
      ],
    },
  ];

  if (userRole === 'super_admin') {
    navigationSections.push({
      title: 'Admin',
      items: [
        { to: '/admin-portal', name: 'Admin Panel', icon: ShieldWarning, badge: 'PRO' },
      ],
    });
  }

  // GSAP Flip animation when route changes
  useEffect(() => {
    if (!navContainerRef.current) return;
    const activeEl = navContainerRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl && activeBubbleRef.current) {
      const state = Flip.getState(activeBubbleRef.current);
      activeEl.appendChild(activeBubbleRef.current);
      Flip.from(state, {
        duration: 0.35,
        ease: 'power3.out',
      });
    }
  }, [location.pathname]);

  // Calculate Trial Status
  const trialEndsAt = currentUser?.trialEndsAt;
  let trialHoursLeft = 0;
  if (trialEndsAt) {
    const ends = new Date(trialEndsAt);
    const diffMs = ends.getTime() - Date.now();
    trialHoursLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  }

  return (
    <>
      {/* Mobile Dimmer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Floating Inset Glass Sidebar Card (Light Warm Glass) */}
      <aside
        className={`
          fixed top-4 bottom-4 left-4 z-50 w-64
          bg-white/80 backdrop-blur-[28px] saturate-[160%]
          border border-white/90
          shadow-[0_20px_45px_-12px_rgba(42,26,15,0.08),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(42,26,15,0.03)]
          rounded-[32px] overflow-hidden flex flex-col justify-between
          transition-transform duration-300 ease-out
          lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-[115%]'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[16px] bg-gradient-to-br from-[#FF6B1A] to-[#FF8C42] p-2 shadow-[0_4px_12px_rgba(255,107,26,0.35)] flex items-center justify-center text-white">
                <img src={logo} alt="Outreach AI" className="h-6 w-6 object-contain invert brightness-0" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display tracking-tight text-[#2A1A0F] leading-tight">
                  Outreach AI
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF6B1A] font-bold">
                  Job Engine
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-full hover:bg-black/5 text-[#735E50] hover:text-[#2A1A0F]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Groups */}
        <div
          ref={navContainerRef}
          onScroll={() => {
            if (showResumeWarning) updateWarningPosition();
          }}
          className="flex-1 px-3 py-2 space-y-4 overflow-y-auto relative"
        >
          {navigationSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#735E50]/70 font-mono">
                {section.title}
              </div>

              <div className="space-y-0.5 pt-0.5">
                {section.items.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  const isCampaigns = link.to === '/campaigns';
                  const isResumes = link.to === '/resumes';

                  return (
                    <div key={link.to} className="relative">
                      <NavLink
                        ref={isResumes ? resumesLinkRef : undefined}
                        to={link.to}
                        onClick={(e) => {
                          if (isCampaigns && resumeCount === 0) {
                            e.preventDefault();
                            triggerResumeWarning();
                            return;
                          }
                          setShowResumeWarning(false);
                          onClose?.();
                        }}
                        data-active={isActive ? 'true' : 'false'}
                        className={`
                          relative flex items-center justify-between px-3 py-2 rounded-[14px] text-xs font-medium transition-all duration-150 group cursor-pointer
                          ${isActive
                            ? 'text-[#2A1A0F] font-bold'
                            : 'text-[#735E50] hover:text-[#2A1A0F] hover:bg-white/60'
                          }
                          ${isResumes && showResumeWarning
                            ? 'ring-2 ring-[#FF6B1A] bg-[#FF6B1A]/15 text-[#FF6B1A] font-bold animate-pulse shadow-sm'
                            : ''
                          }
                        `}
                      >
                        {/* Morphing Liquid Bubble for active item */}
                        {isActive && (
                          <div
                            ref={activeBubbleRef}
                            className="absolute inset-0 rounded-[14px] bg-[#FF6B1A]/12 border border-[#FF6B1A]/25 -z-0 shadow-[0_2px_8px_rgba(255,107,26,0.12)]"
                          />
                        )}

                        <div className="flex items-center gap-2.5 relative z-10 min-w-0">
                          <Icon
                            size={17}
                            weight="duotone"
                            className={`shrink-0 transition-colors ${
                              isActive
                                ? 'text-[#FF6B1A]'
                                : isResumes && showResumeWarning
                                ? 'text-[#FF6B1A]'
                                : 'text-[#735E50] group-hover:text-[#2A1A0F]'
                            }`}
                          />
                          <span className="truncate">
                            {link.name}
                          </span>
                        </div>

                        {/* Status Badges */}
                        {isResumes && showResumeWarning ? (
                          <span className="relative z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider bg-[#FF6B1A] text-white animate-pulse shadow-xs">
                            START HERE
                          </span>
                        ) : link.badge ? (
                          <span
                            className={`
                              relative z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider
                              ${link.badge === 'AI'
                                ? 'bg-[#FF6B1A] text-white shadow-xs'
                                : 'bg-[#D99B00]/15 text-[#D99B00] border border-[#D99B00]/30'
                              }
                            `}
                          >
                            {link.badge}
                          </span>
                        ) : null}
                      </NavLink>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: Trial status & Account Controls */}
        <div className="p-3 bg-white/40 border-t border-[rgba(42,26,15,0.06)] space-y-2 rounded-b-[31px]">
          {/* Trial / Quota warning badge */}
          {currentUser && !currentUser.paid && currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && (
            <div className="p-2.5 rounded-[16px] bg-amber-50/80 border border-amber-200/80 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[#D99B00]">
                  <Flame size={15} weight="fill" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#2A1A0F]">
                    {trialHoursLeft > 0 ? `${trialHoursLeft}h trial left` : 'Trial ended'}
                  </div>
                  <div className="text-[9px] text-[#735E50] font-mono">Free trial</div>
                </div>
              </div>
              <NavLink
                to="/subscription"
                className="px-2.5 py-1 rounded-[10px] bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white text-[10px] font-bold tracking-tight shadow-xs"
              >
                Upgrade
              </NavLink>
            </div>
          )}

          {/* Gmail Account Card */}
          <div className="p-2.5 rounded-[16px] bg-white/70 border border-white/90 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                gmailStatus?.connected 
                  ? 'bg-[#1DA365] ring-2 ring-[#1DA365]/20' 
                  : 'bg-[#E63946] animate-pulse ring-2 ring-[#E63946]/20'
              }`} />
              <div className="min-w-0">
                <div className="text-[9px] font-mono text-[#735E50] uppercase tracking-wider font-semibold">
                  {gmailStatus?.connected ? 'Gmail Connected' : 'Gmail Disconnected'}
                </div>
                <div className="text-xs font-semibold text-[#2A1A0F] truncate max-w-[120px]">
                  {gmailStatus?.connected ? gmailStatus.email : 'Connect Gmail'}
                </div>
              </div>
            </div>
            {!gmailStatus?.connected ? (
              <NavLink
                to="/settings"
                className="text-[10px] font-mono font-bold text-[#E63946] hover:underline shrink-0"
              >
                Connect
              </NavLink>
            ) : (
              <span className="text-[#1DA365]">
                <CheckCircle size={15} weight="fill" />
              </span>
            )}
          </div>

          {/* Sign Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-[12px] bg-transparent hover:bg-black/5 text-xs font-medium text-[#735E50] hover:text-[#E63946] transition-all cursor-pointer"
            >
              <SignOut size={13} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* ========================================================
          TOP-LEVEL FIXED ARROW WARNING CALLOUT (Rendered outside aside so it NEVER clips or hides!)
         ======================================================== */}
      {showResumeWarning && (
        <div
          ref={warningCardRef}
          className={`
            fixed z-[9999] pointer-events-auto
            w-[320px] p-4 rounded-[22px]
            bg-white/95 backdrop-blur-[32px]
            border-2 border-[#FF6B1A]
            shadow-[0_25px_60px_-10px_rgba(255,107,26,0.4),0_12px_28px_-6px_rgba(42,26,15,0.18)]
            text-[#2A1A0F] space-y-2.5 animate-in fade-in zoom-in-95 duration-200
          `}
          style={{
            top: window.innerWidth < 1024 ? '90px' : `${Math.max(20, warningTop)}px`,
            left: window.innerWidth < 1024 ? '20px' : '286px',
          }}
        >
          {/* Physical Directional Pointer Arrow pointing directly at Resumes in the sidebar */}
          <div className="hidden lg:block absolute -left-3 top-6 w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-r-[12px] border-r-[#FF6B1A]" />
          <div className="hidden lg:block absolute -left-2 top-6 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[11px] border-r-white" />

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-[#FF6B1A] font-bold text-xs font-display">
              <WarningCircle size={18} weight="fill" />
              <span>Upload Resume First</span>
            </div>
            <button
              onClick={() => setShowResumeWarning(false)}
              className="p-1 rounded-full text-[#735E50] hover:text-[#2A1A0F] hover:bg-stone-100 transition-colors cursor-pointer"
              title="Dismiss warning"
            >
              <X size={14} />
            </button>
          </div>

          {/* Message */}
          <p className="text-xs text-[#735E50] leading-relaxed">
            Please upload your resume first. You need at least one resume profile before creating or viewing email campaigns.
          </p>

          {/* Action Footer */}
          <div className="pt-1 flex items-center justify-between gap-2">
            {/* <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#FF6B1A]">
              <ArrowLeft size={13} weight="bold" className="animate-pulse" />
              <span>Click Resumes tab</span>
            </div> */}

            <button
              onClick={() => {
                setShowResumeWarning(false);
                navigate('/resumes');
                onClose?.();
              }}
              className="px-3.5 py-1.5 rounded-[12px] bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>Upload Resume</span>
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
