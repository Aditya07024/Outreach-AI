/**
 * Outreach AI — Chrome Extension Popup
 * 
 * Main React application for the extension popup.
 * Handles scanning, displaying extracted emails, and syncing to the backend.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LoginPanel } from './components/LoginPanel';
import { ScanView } from './components/ScanView';
import { SettingsPanel } from './components/SettingsPanel';
import { Settings, ArrowLeft } from 'lucide-react';

/** View states */
type View = 'scan' | 'settings';

/** Auth state */
interface AuthState {
  authenticated: boolean;
  user?: {
    id: number;
    email: string | null;
    role: string;
    paid: boolean;
  };
}

export const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ authenticated: false });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('scan');

  /** Check if user is already authenticated */
  const checkAuth = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'CHECK_AUTH' });
      if (response?.authenticated) {
        setAuth({ authenticated: true, user: response.user });
      } else {
        setAuth({ authenticated: false });
      }
    } catch {
      setAuth({ authenticated: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /** Handle successful login */
  const handleLogin = (user: AuthState['user']) => {
    setAuth({ authenticated: true, user });
  };

  /** Handle logout */
  const handleLogout = async () => {
    await chrome.runtime.sendMessage({ action: 'LOGOUT' });
    setAuth({ authenticated: false, user: undefined });
    setView('scan');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[520px] gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Connecting...
        </span>
      </div>
    );
  }

  // Not authenticated — show login
  if (!auth.authenticated) {
    return <LoginPanel onLogin={handleLogin} />;
  }

  // Authenticated — show main app
  return (
    <div className="flex flex-col h-full min-h-[520px] animate-fade-in">
      {/* ─── Top Bar ─── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 gradient-header">
        <div className="flex items-center gap-2">
          {view === 'settings' && (
            <button
              onClick={() => setView('scan')}
              className="p-1 rounded-md hover:bg-zinc-800/50 transition-colors text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">OA</span>
            </div>
            <span className="text-xs font-semibold text-zinc-200 tracking-tight">Outreach AI</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {auth.user?.email && (
            <span className="text-[10px] text-zinc-500 font-medium max-w-[140px] truncate">
              {auth.user.email}
            </span>
          )}
          <button
            onClick={() => setView(view === 'settings' ? 'scan' : 'settings')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              view === 'settings' 
                ? 'bg-zinc-800 text-zinc-200' 
                : 'hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto">
        {view === 'scan' && <ScanView />}
        {view === 'settings' && <SettingsPanel onLogout={handleLogout} />}
      </div>
    </div>
  );
};
