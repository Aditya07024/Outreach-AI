/**
 * Settings Panel
 * 
 * Extension configuration: API URL, logout, about.
 */

import React, { useState, useEffect } from 'react';
import { Globe, LogOut, Info, ExternalLink, CheckCircle2 } from 'lucide-react';

interface SettingsPanelProps {
  onLogout: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onLogout }) => {
  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: 'https://outreachai.aditya07.me' });
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Settings</h2>

      {/* Open Dashboard */}
      <button
        onClick={handleOpenDashboard}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-zinc-100 transition-all cursor-pointer"
      >
        <span className="font-medium">Open Outreach Dashboard</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </button>

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
        <div className="flex items-start gap-2 text-[10px] text-zinc-600">
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
