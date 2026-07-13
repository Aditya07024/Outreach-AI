/**
 * Login Panel
 * 
 * Allows users to authenticate the extension by entering their JWT token
 * and optionally configuring the API URL.
 */

import React, { useState } from 'react';
import { KeyRound, Globe, ArrowRight, AlertCircle, Shield } from 'lucide-react';

interface LoginPanelProps {
  onLogin: (user: any) => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ onLogin }) => {
  const [token, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.outreachai.aditya07.me');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!token.trim()) {
      setError('Please enter your JWT token.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Set the API URL first if customized
      if (apiUrl !== 'http://localhost:5000') {
        await chrome.runtime.sendMessage({ action: 'SET_API_URL', apiUrl });
      }

      const response = await chrome.runtime.sendMessage({
        action: 'LOGIN',
        token: token.trim(),
        apiUrl: apiUrl.trim(),
      });

      if (response?.error) {
        setError(response.error);
      } else if (response?.success) {
        onLogin(response.user);
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect. Check your API URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[570px] px-6 py-8 animate-fade-in">
      {/* Logo & Title */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg shadow-violet-500/5">
          <img src="/logo.png" className="w-10 h-10 object-contain" alt="Logo" />
        </div>
        <div className="text-center">
          <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Outreach AI</h1>
          <p className="text-[10px] text-zinc-500 mt-0.5">Connect to your dashboard to get started</p>
        </div>
      </div>

      {/* Token Input */}
      <div className="w-full space-y-3">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            <KeyRound className="w-3 h-3" />
            JWT Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste your token from the dashboard..."
            className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
          />
          <p className="text-[9px] text-zinc-650 leading-relaxed">
            To find your token visit Outreach.aditya07.me → Settings → Chrome Extension Connection → Copy
          </p>
        </div>



        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-[10px] text-red-400 leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading || !token.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/15 cursor-pointer"
        >
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              Connect
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Security Note */}
      <div className="flex items-center gap-1.5 mt-6 text-[9px] text-zinc-600">
        <Shield className="w-3 h-3" />
        <span>Token is stored securely in the extension</span>
      </div>
    </div>
  );
};
