import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { CheckCircle2, Loader2, AlertCircle, Globe, ArrowRight, ShieldCheck, RefreshCw, LayoutDashboard } from 'lucide-react';

export const ExtensionLogin: React.FC = () => {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();

  const [extensionDetected, setExtensionDetected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Send auth token to extension via window.postMessage
  const transmitTokenToExtension = useCallback(async () => {
    try {
      setConnecting(true);
      setErrorMsg(null);

      // Get Clerk session JWT
      let token: string | null = null;
      if (typeof getToken === 'function') {
        token = await getToken();
      }

      if (!token && (window as any).__clerkGetToken) {
        token = await (window as any).__clerkGetToken();
      }

      if (!token) {
        token = localStorage.getItem('token');
      }

      if (!token) {
        setConnecting(false);
        return;
      }

      // Broadcast authentication payload to the extension content script
      window.postMessage(
        {
          type: 'OUTREACH_EXTENSION_AUTH_REQUEST',
          token,
          user: {
            email: clerkUser?.primaryEmailAddress?.emailAddress || null,
            name: clerkUser?.fullName || null,
          },
        },
        '*'
      );
    } catch (err: any) {
      console.error('Failed to resolve auth token for extension:', err);
      setErrorMsg(err.message || 'Failed to authenticate extension.');
      setConnecting(false);
    }
  }, [getToken, clerkUser]);

  // Listen for extension handshake & auth responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data?.type === 'OUTREACH_EXTENSION_PONG') {
        setExtensionDetected(true);
      }

      if (event.data?.type === 'OUTREACH_EXTENSION_AUTH_SUCCESS') {
        setConnected(true);
        setConnecting(false);
        const email =
          event.data.user?.email ||
          clerkUser?.primaryEmailAddress?.emailAddress ||
          'your account';
        setConnectedEmail(email);
      }

      if (event.data?.type === 'OUTREACH_EXTENSION_AUTH_ERROR') {
        setConnecting(false);
        setErrorMsg(event.data.error || 'Failed to link extension.');
      }
    };

    window.addEventListener('message', handleMessage);

    // Ping extension content script
    window.postMessage({ type: 'OUTREACH_EXTENSION_PING' }, '*');
    const pingInterval = setInterval(() => {
      window.postMessage({ type: 'OUTREACH_EXTENSION_PING' }, '*');
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(pingInterval);
    };
  }, [clerkUser]);

  // When user is signed in, automatically trigger token transfer
  useEffect(() => {
    if (authLoaded && isSignedIn && !connected) {
      transmitTokenToExtension();
      // Retry after 1s in case content script was initializing
      const timer = setTimeout(() => {
        if (!connected) transmitTokenToExtension();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [authLoaded, isSignedIn, connected, transmitTokenToExtension]);

  const handleSignInClick = () => {
    if (clerk && clerk.openSignIn) {
      clerk.openSignIn({
        afterSignInUrl: '/extension-login',
        afterSignUpUrl: '/extension-login',
      });
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-neutral-100 py-16 px-6 relative overflow-hidden flex flex-col items-center justify-center font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-xl shadow-violet-500/10">
            <img src="/logo.png" className="w-10 h-10 object-contain" alt="Outreach AI" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-100">Outreach AI Chrome Extension</h1>
            <p className="text-xs text-neutral-400 mt-0.5">Automated 1-Click Extension Authentication</p>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-7 space-y-5 shadow-2xl backdrop-blur-md">
          {connected ? (
            /* Connected state */
            <div className="text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-neutral-100">Extension Connected!</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Your extension is now successfully linked to{' '}
                  <span className="text-neutral-200 font-mono font-medium">{connectedEmail}</span>.
                </p>
              </div>

              <div className="p-3 bg-zinc-800/40 border border-zinc-800 rounded-xl text-[11px] text-neutral-400 text-left space-y-1.5">
                <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-violet-400" />
                  What to do next:
                </div>
                <p>1. Open any company website or job board in Chrome.</p>
                <p>2. Click the Outreach AI extension icon in your toolbar to extract emails and sync contacts directly.</p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => window.close()}
                  className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-violet-900/20 cursor-pointer"
                >
                  Close This Tab
                </button>
                <button
                  onClick={() => (window.location.href = '/')}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-neutral-300 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Go to Outreach AI Dashboard
                </button>
              </div>
            </div>
          ) : !authLoaded ? (
            /* Loading Clerk Auth state */
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
              <span className="text-xs text-neutral-400">Loading session...</span>
            </div>
          ) : !isSignedIn ? (
            /* Not logged in yet */
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
                <Globe className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-sm font-bold text-neutral-100">Sign in to Connect Extension</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Sign in with the same account you use on Outreach AI. Your extension will connect automatically with one click.
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleSignInClick}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In with Outreach AI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Signed in, connecting to extension */
            <div className="space-y-5 text-center py-2">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-ping" />
                <div className="w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-sm font-bold text-neutral-100">Connecting Extension...</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Transferring login credentials for{' '}
                  <span className="text-neutral-200 font-mono font-medium">
                    {clerkUser?.primaryEmailAddress?.emailAddress || 'your account'}
                  </span>
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={transmitTokenToExtension}
                  disabled={connecting}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-neutral-200 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
                  <span>{connecting ? 'Syncing...' : 'Retry Connection'}</span>
                </button>

                {!extensionDetected && (
                  <p className="text-[10px] text-neutral-500">
                    If this tab doesn't connect within 5 seconds, ensure the extension is installed and enabled in Chrome.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer badge */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-center gap-1.5 text-[10px] text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure direct browser session handshake</span>
          </div>
        </div>
      </div>
    </div>
  );
};
