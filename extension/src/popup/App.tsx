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
import { Settings, ArrowLeft, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

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
  const [loadingTakingLong, setLoadingTakingLong] = useState(false);
  const [view, setView] = useState<View>('scan');

  /** Check if user is already authenticated */
  const checkAuth = useCallback(async () => {
    setLoading(true);
    setLoadingTakingLong(false);

    try {
      // 3-second safety race so the popup UI NEVER hangs on "Connecting..."
      const authPromise = chrome.runtime.sendMessage({ action: 'CHECK_AUTH' });
      const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 3000)
      );

      const response: any = await Promise.race([authPromise, timeoutPromise]);

      if (response && !response.timeout && response.authenticated) {
        setAuth({ authenticated: true, user: response.user });
      } else {
        // If not authenticated, timed out, or connection failed, do not trap the user!
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

    // After 1.5s, flag that connection is taking longer than usual to show helper
    const timer = setTimeout(() => {
      setLoadingTakingLong(true);
    }, 1500);

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.outreach_jwt_token) {
        checkAuth();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      clearTimeout(timer);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [checkAuth]);

  /** Handle successful login */
  const handleLogin = (user: AuthState['user']) => {
    setAuth({ authenticated: true, user });
    setLoading(false);
  };

  /** Handle logout / re-sign */
  const handleLogout = async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'LOGOUT' });
    } catch (e) {}
    try {
      await chrome.storage.local.remove(['outreach_jwt_token', 'cached_user', 'outreach_api_url']);
    } catch (e) {}
    setAuth({ authenticated: false, user: undefined });
    setView('scan');
    setLoading(false);
  };

  // Loading state with instant escape hatch / re-sign option
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[520px] px-6 py-8 animate-fade-in font-sans text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg shadow-violet-500/5 mb-4">
          <img src="/logo.png" className="w-9 h-9 object-contain" alt="Logo" />
        </div>

        <div className="w-7 h-7 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin mb-3" />

        <span className="text-xs font-semibold text-zinc-200">
          Connecting to Outreach AI...
        </span>
        <span className="text-[10px] text-zinc-500 mt-1">
          Verifying your session credentials
        </span>

        {/* Escape hatch: Allow user to re-sign or reset session immediately */}
        <div className="mt-8 flex flex-col items-center gap-2.5 w-full max-w-[240px]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            title="Clear stored session and log in again"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Sign In Again / Re-login</span>
          </button>

          {loadingTakingLong && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] leading-relaxed animate-fade-in">
              Connecting is taking longer than usual. Click above to re-sign or reset session.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!auth.authenticated) {
    return <LoginPanel onLogin={handleLogin} />;
  }

  // Authenticated — show main app
  return (
    <div className="flex flex-col h-full min-h-[520px] animate-fade-in font-sans">
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
            <img src="/logo.png" className="w-6 h-6 object-contain" alt="Logo" />
            <span className="text-xs font-semibold text-zinc-200 tracking-tight">Outreach AI</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {auth.user?.email && (
            <span className="text-[10px] text-zinc-400 font-medium max-w-[130px] truncate" title={auth.user.email}>
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
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Sign Out / Switch Account"
          >
            <LogOut className="w-3.5 h-3.5" />
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
