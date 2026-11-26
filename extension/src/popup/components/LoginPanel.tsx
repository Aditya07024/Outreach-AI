/**
 * Login Panel
 * 
 * Allows users to authenticate the extension via 1-click website login
 * or optionally by entering their JWT token.
 */

import React, { useState, useEffect } from 'react';
import { KeyRound, Globe, ArrowRight, AlertCircle, ChevronDown, CheckCircle2 } from 'lucide-react';

interface LoginPanelProps {
  onLogin: (user: any) => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ onLogin }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);
  const [tabOpened, setTabOpened] = useState(false);

  // Listen for storage changes in case user completes login on the opened tab
  useEffect(() => {
    const handleStorageChange = async (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.outreach_jwt_token && changes.outreach_jwt_token.newValue) {
        try {
          const res = await chrome.runtime.sendMessage({ action: 'CHECK_AUTH' });
          if (res?.authenticated && res?.user) {
            onLogin(res.user);
          }
        } catch (e) {}
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [onLogin]);

  const handleOpenWebLogin = () => {
    setTabOpened(true);
    chrome.tabs.create({ url: 'https://outreach.aditya07.me/extension-login' });
  };

  const handleCheckConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chrome.runtime.sendMessage({ action: 'CHECK_AUTH' });
      if (res?.authenticated && res?.user) {
        onLogin(res.user);
      } else {
        setError('Not connected yet. Please sign in on the opened tab, or paste your token below.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to verify connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearPreviousTokens = async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'LOGOUT' });
    } catch (e) {}
    await chrome.storage.local.remove(['outreach_jwt_token', 'cached_user', 'outreach_api_url']);
    setToken('');
    setError(null);
  };

  const handleManualLogin = async () => {
    if (!token.trim()) {
      setError('Please enter your JWT token.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'LOGIN',
        token: token.trim()
      });

      if (response?.error) {
        setError(response.error);
      } else if (response?.success) {
        onLogin(response.user);
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[520px] px-6 py-8 animate-fade-in font-sans">
      {/* Logo & Title */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg shadow-violet-500/5">
          <img src="/logo.png" className="w-10 h-10 object-contain" alt="Logo" />
        </div>
        <div className="text-center">
          <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Outreach AI</h1>
          <p className="text-[10px] text-zinc-500 mt-0.5">Automated lead extraction & outreach</p>
        </div>
      </div>

      {/* Main 1-Click Login Action */}
      <div className="w-full space-y-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-zinc-200">Connect to Website Account</h2>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Connect automatically using the same account you use on Outreach AI. No code copy-pasting needed.
            </p>
          </div>

          <button
            onClick={handleOpenWebLogin}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/20 transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Sign In with Outreach AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {tabOpened && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-300 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping shrink-0" />
                <span>Waiting for login in tab... This popup will connect automatically!</span>
              </div>
              <button
                onClick={handleCheckConnection}
                disabled={loading}
                className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check Connection Now'}
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-[10px] text-red-400 leading-relaxed">{error}</span>
          </div>
        )}

        {/* Manual Token Fallback */}
        <div className="pt-1">
          <button
            onClick={() => setShowManualToken(!showManualToken)}
            className="w-full flex items-center justify-between text-[10px] text-zinc-500 hover:text-zinc-400 py-1 cursor-pointer transition-colors"
          >
            <span>Or enter JWT token manually</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showManualToken ? 'rotate-180' : ''}`} />
          </button>

          {showManualToken && (
            <div className="space-y-2 mt-2 pt-2 border-t border-zinc-800 animate-fade-in">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualLogin()}
                placeholder="Paste token..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <button
                onClick={handleManualLogin}
                disabled={loading || !token.trim()}
                className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold disabled:opacity-40 transition-all cursor-pointer"
              >
                {loading ? 'Connecting...' : 'Connect Token'}
              </button>
            </div>
          )}
        </div>

        {/* Reset previous session / troubleshooting */}
        <div className="text-center pt-2">
          <button
            onClick={handleClearPreviousTokens}
            className="text-[9.5px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer underline"
          >
            Reset previous session data
          </button>
        </div>
      </div>
    </div>
  );
};
