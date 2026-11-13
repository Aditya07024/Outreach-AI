/**
 * Settings Panel
 * 
 * Extension configuration: whitelist, logout, about.
 */

import React, { useState, useEffect } from 'react';
import { Globe, LogOut, Info, ExternalLink, CheckCircle2, Trash2 } from 'lucide-react';

interface SettingsPanelProps {
  onLogout: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onLogout }) => {
  const [domains, setDomains] = useState<string[]>([]);
  const [excludeGmail, setExcludeGmail] = useState<boolean>(true);

  useEffect(() => {
    const loadSettings = async () => {
      const storageData = await chrome.storage.local.get(['allowed_domains', 'exclude_gmail']);
      setDomains(storageData.allowed_domains || []);
      if (storageData.exclude_gmail !== undefined) {
        setExcludeGmail(Boolean(storageData.exclude_gmail));
      }
    };
    loadSettings();
  }, []);

  const handleToggleExcludeGmail = async () => {
    const nextVal = !excludeGmail;
    setExcludeGmail(nextVal);
    await chrome.storage.local.set({ exclude_gmail: nextVal });
  };

  const handleRemoveDomain = async (domain: string) => {
    const updated = domains.filter(d => d !== domain);
    await chrome.storage.local.set({ allowed_domains: updated });
    setDomains(updated);
  };

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: 'https://outreach.aditya07.me/' });
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Settings</h2>

      {/* Open Dashboard */}
      <button
        onClick={handleOpenDashboard}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-zinc-100 transition-all cursor-pointer"
        aria-label="Open Outreach AI Dashboard"
      >
        <span className="font-medium">Open Outreach AI Dashboard</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </button>

      {/* Exclude Gmail Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
        <div className="space-y-0.5 pr-2">
          <span className="text-xs font-medium text-zinc-200">Exclude @gmail.com Emails</span>
          <p className="text-[10px] text-zinc-500">
            Do not extract or add personal @gmail.com addresses to campaigns
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleExcludeGmail}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            excludeGmail ? 'bg-violet-600' : 'bg-zinc-700'
          }`}
          title={excludeGmail ? 'Exclude Gmail ON' : 'Exclude Gmail OFF'}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              excludeGmail ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Whitelisted Domains */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Approved Websites</h3>
        {domains.length === 0 ? (
          <div className="text-[10px] text-zinc-600 py-2 px-3 bg-zinc-900/20 border border-zinc-800/40 rounded-lg">
            No websites whitelisted yet. Open the extension on a site to approve it.
          </div>
        ) : (
          <div className="max-h-[140px] overflow-y-auto space-y-1.5 border border-zinc-800/30 rounded-lg p-2 bg-zinc-900/25">
            {domains.map(d => (
              <div key={d} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800/50 text-xs">
                <span className="truncate max-w-[240px] text-zinc-300">{d}</span>
                <button
                  onClick={() => handleRemoveDomain(d)}
                  className="p-1 rounded text-zinc-550 hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
                  title="Revoke Permission"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium hover:bg-red-500/15 hover:border-red-500/30 transition-all cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign Out
      </button>

      {/* About */}
      <div className="pt-2 border-t border-zinc-800/60">
        <div className="flex items-start gap-2 text-[10px] text-zinc-650">
          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-zinc-500 font-medium">Outreach AI Extension v1.0.0</p>
            <p>Extract business emails from any website and sync them to your outreach campaigns.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
