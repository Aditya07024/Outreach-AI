import React from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Mail, CheckCircle, AlertTriangle, Menu, Sparkles, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title: string;
  gmailStatus: { connected: boolean; email?: string } | null;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, gmailStatus, onMenuClick }) => {
  const { isSignedIn } = useUser();

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl md:hidden transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden sm:inline">Workspace</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Jump Shortcuts on Desktop */}
        <div className="hidden lg:flex items-center gap-2">
          <Link
            to="/outbox"
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 text-slate-600 hover:text-amber-800 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-amber-500" />
            <span>Outbox</span>
          </Link>
        </div>

        {/* Gmail Connection Status Pill */}
        <Link 
          to="/settings"
          className="flex items-center gap-2 transition-all duration-150"
        >
          {gmailStatus?.connected ? (
            <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-2xs hover:bg-emerald-100/60 transition-colors">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Gmail Connected</span>
              <span className="sm:hidden">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full text-xs font-bold hover:bg-rose-100 transition-colors shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span className="hidden sm:inline">Connect Gmail</span>
              <span className="sm:hidden">Connect</span>
            </div>
          )}
        </Link>
      </div>
    </header>
  );
};
