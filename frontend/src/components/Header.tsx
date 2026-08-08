import React from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Mail, CheckCircle, AlertTriangle, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title: string;
  gmailStatus: { connected: boolean; email?: string } | null;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, gmailStatus, onMenuClick }) => {
  const { isSignedIn } = useUser();

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg md:hidden transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-slate-800 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection status badge click redirection */}
        <Link 
          to="/settings"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all duration-150 shadow-2xs"
        >
          {gmailStatus?.connected ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gmail Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full hover:bg-rose-100/80">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>Connect Gmail Account</span>
            </div>
          )}
        </Link>

        {/* {isSignedIn && (
          <UserButton 
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 ring-2 ring-indigo-500/20"
              }
            }}
          />
        )} */}
      </div>
    </header>
  );
};

