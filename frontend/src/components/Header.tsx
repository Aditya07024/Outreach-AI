import React from 'react';
import { Mail, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title: string;
  gmailStatus: { connected: boolean; email?: string } | null;
}

export const Header: React.FC<HeaderProps> = ({ title, gmailStatus }) => {
  return (
    <header className="h-14 border-b border-neutral-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
      <h1 className="text-sm font-semibold text-neutral-200 tracking-tight">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Connection status badge click redirection */}
        <Link 
          to="/settings"
          className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-neutral-800 bg-neutral-900/40 text-[11px] text-neutral-300 hover:bg-neutral-900 transition-colors"
        >
          {gmailStatus?.connected ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Gmail Connected</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span className="text-rose-400">Connect Gmail Account</span>
            </>
          )}
        </Link>
      </div>
    </header>
  );
};
