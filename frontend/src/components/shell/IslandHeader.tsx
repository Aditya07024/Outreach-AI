import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  List,
  Sparkle,
  CheckCircle,
  WarningCircle,
  ArrowSquareOut,
  EnvelopeSimple,
  ShieldCheck,
  X,
} from '@phosphor-icons/react';

interface IslandHeaderProps {
  title: string;
  gmailStatus: { connected: boolean; email?: string } | null;
  onMenuClick?: () => void;
}

export const IslandHeader: React.FC<IslandHeaderProps> = ({
  title,
  gmailStatus,
  onMenuClick,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Track window scroll: hides with animation going above when scrolling, comes back when at top
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const atTop = window.scrollY <= 30;
          setIsAtTop(atTop);
          if (!atTop) {
            setIsPopoverOpen(false); // Dismiss open popover when scrolled away
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  return (
    <header
      className={`
        sticky top-4 z-30 px-4 sm:px-6 mb-6
        transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isAtTop
          ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
          : '-translate-y-[150%] opacity-0 scale-[0.98] pointer-events-none'
        }
      `}
    >
      <div className="max-w-7xl mx-auto">
        <div
          className={`
            h-14 px-4 sm:px-6 rounded-full
            bg-white/80 backdrop-blur-[24px] saturate-[160%]
            border border-white/90
            shadow-[0_10px_30px_-8px_rgba(42,26,15,0.07),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(42,26,15,0.03)]
            flex items-center justify-between relative
          `}
        >
          {/* Left: Mobile Menu & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuClick}
              className="p-1.5 rounded-full hover:bg-black/5 text-[#735E50] hover:text-[#2A1A0F] lg:hidden transition-colors cursor-pointer"
              title="Open Navigation Menu"
            >
              <List size={20} />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <h1 className="text-sm sm:text-base font-bold font-display tracking-tight text-[#2A1A0F]">
                {title}
              </h1>
            </div>
          </div>

          {/* Right: Quick Pills & Dynamic Island Gmail Capsule */}
          <div className="flex items-center gap-2.5">
            {/* Expanding Dynamic Island Gmail Capsule */}
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer shadow-2xs
                  ${gmailStatus?.connected
                    ? 'bg-[#1DA365]/10 border border-[#1DA365]/30 text-[#1DA365] hover:bg-[#1DA365]/15'
                    : 'bg-[#E63946]/10 border border-[#E63946]/30 text-[#E63946] hover:bg-[#E63946]/15'
                  }
                `}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    gmailStatus?.connected
                      ? 'bg-[#1DA365] ring-2 ring-[#1DA365]/20'
                      : 'bg-[#E63946] animate-pulse ring-2 ring-[#E63946]/20'
                  }`}
                />
                <span className="hidden sm:inline font-mono text-[11px] font-bold">
                  {gmailStatus?.connected ? 'Gmail Connected' : 'Connect Gmail'}
                </span>
                <span className="sm:hidden font-mono text-[11px] font-bold">
                  {gmailStatus?.connected ? 'Live' : 'Alert'}
                </span>
              </button>

              {/* Dynamic Island Popover */}
              {isPopoverOpen && (
                <div
                  className={`
                    absolute right-0 top-12 w-72 p-4 rounded-[24px] z-50
                    bg-white/95 backdrop-blur-[32px]
                    border border-white/90
                    shadow-[0_20px_50px_-10px_rgba(42,26,15,0.18),inset_0_1px_0_rgba(255,255,255,1)]
                    space-y-3.5 animate-in fade-in zoom-in-95 duration-150 text-[#2A1A0F]
                  `}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[rgba(42,26,15,0.06)]">
                    <div className="flex items-center gap-2">
                      <EnvelopeSimple size={16} className="text-[#FF6B1A]" weight="duotone" />
                      <span className="text-xs font-bold text-[#2A1A0F] font-display">
                        Gmail Account
                      </span>
                    </div>
                    <button
                      onClick={() => setIsPopoverOpen(false)}
                      className="p-1 rounded-full text-[#735E50] hover:text-[#2A1A0F]"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {gmailStatus?.connected ? (
                    <div className="space-y-2.5">
                      <div className="p-2.5 rounded-[16px] bg-[#1DA365]/8 border border-[#1DA365]/20 space-y-1">
                        <div className="text-[10px] uppercase font-mono text-[#1DA365] font-bold flex items-center gap-1.5">
                          <CheckCircle size={12} weight="fill" />
                          <span>Connected & Ready</span>
                        </div>
                        <div className="text-xs font-mono text-[#2A1A0F] font-medium truncate">
                          {gmailStatus.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#735E50]">
                        <ShieldCheck size={14} className="text-[#1DA365]" weight="duotone" />
                        <span>Protected: Sends only with your permission</span>
                      </div>

                      <Link
                        to="/settings"
                        onClick={() => setIsPopoverOpen(false)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[12px] bg-black/5 hover:bg-black/10 text-xs font-semibold text-[#2A1A0F] transition-all"
                      >
                        <span>Manage Connection</span>
                        <ArrowSquareOut size={14} />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="p-2.5 rounded-[16px] bg-[#E63946]/8 border border-[#E63946]/20 space-y-1">
                        <div className="text-[10px] uppercase font-mono text-[#E63946] font-bold flex items-center gap-1.5">
                          <WarningCircle size={12} weight="fill" />
                          <span>Not Connected</span>
                        </div>
                        <div className="text-xs text-[#735E50]">
                          Connect your Gmail account to send approved emails safely.
                        </div>
                      </div>

                      <Link
                        to="/settings"
                        onClick={() => setIsPopoverOpen(false)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[12px] bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-xs font-bold text-white shadow-[0_4px_12px_rgba(255,107,26,0.3)] transition-all"
                      >
                        <span>Connect Gmail Account</span>
                        <ArrowSquareOut size={14} />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
