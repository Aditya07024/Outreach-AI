/**
 * Scan View
 * 
 * Main extension interface for scanning websites, viewing extracted emails,
 * selecting contacts, and syncing them to the Outreach AI dashboard.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Globe,
  Building2,
  Mail,
  ScanLine,
  FileSearch,
  CheckSquare,
  Square,
  PlusCircle,
  Send,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Sparkles,
  Shield,
  Lock,
} from 'lucide-react';

interface ExtractedEmail {
  email: string;
  classification: string;
  source: string;
}

interface DetectedCompany {
  name: string;
  domain: string;
  website: string;
  linkedinUrl?: string;
  careersUrl?: string;
  contactUrl?: string;
  aboutUrl?: string;
  industry?: string;
  location?: string;
}

interface Campaign {
  id: number;
  name: string;
  status: string;
  contactCount: number;
}

type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export const ScanView: React.FC = () => {
  // Scan state
  const [emails, setEmails] = useState<ExtractedEmail[]>([]);
  const [company, setCompany] = useState<DetectedCompany | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedPages, setScannedPages] = useState<string[]>([]);

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Domain whitelisting state
  const [isDomainAllowed, setIsDomainAllowed] = useState<boolean | null>(null);
  const [currentDomain, setCurrentDomain] = useState('');

  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncResult, setSyncResult] = useState<{ imported: number; duplicates: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  /** Fetch campaigns from backend */
  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_CAMPAIGNS' });
      if (Array.isArray(response)) {
        setCampaigns(response);
        
        // Load selected campaign ID from storage
        const storageData = await chrome.storage.local.get('selected_campaign_id');
        const savedId = storageData.selected_campaign_id;
        
        if (savedId && response.some(c => c.id === savedId)) {
          setSelectedCampaignId(savedId);
        } else if (response.length > 0) {
          setSelectedCampaignId(response[0].id);
          await chrome.storage.local.set({ selected_campaign_id: response[0].id });
        }
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }
  }, []);

  useEffect(() => {
    const initScanAndCampaigns = async () => {
      // 1. Fetch campaigns first
      await fetchCampaigns();

      // 2. Fetch active tab URL
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (!tab?.url) {
          setScanStatus('idle');
          return;
        }

        // Standard chrome page check
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
          setScanStatus('error');
          setScanError('Extensions cannot scan internal chrome:// pages. Navigate to a regular website to see automatically extracted emails.');
          return;
        }

        setCurrentUrl(tab.url);

        let domain = '';
        try {
          domain = new URL(tab.url).hostname;
          setCurrentDomain(domain);
        } catch (e) {
          setScanStatus('error');
          setScanError('Invalid tab URL.');
          return;
        }

        const storageData = await chrome.storage.local.get('allowed_domains');
        const allowedList = storageData.allowed_domains || [];
        const isAllowed = allowedList.includes(domain);
        setIsDomainAllowed(isAllowed);

        if (!isAllowed) {
          setScanStatus('idle');
          return;
        }

        setScanStatus('scanning');

        // 3. Try to load cached autoscan results from background storage
        const cached = await chrome.runtime.sendMessage({
          action: 'GET_CACHED_SCAN',
          url: tab.url,
        });

        if (cached && cached.emails && cached.emails.length > 0) {
          setEmails(cached.emails);
          setCompany(cached.company);
          setScannedPages([tab.url]);
          setSelected(new Set(cached.emails.map((e: ExtractedEmail) => e.email)));
          setScanStatus('done');
        } else {
          // If no cache is found, run the active tab scan automatically
          const response = await chrome.runtime.sendMessage({ action: 'SCAN_ACTIVE_TAB' });

          if (response?.error) {
            throw new Error(response.error);
          }

          setEmails(response.emails || []);
          setCompany(response.company || null);
          setScannedPages([tab.url]);
          setSelected(new Set((response.emails || []).map((e: ExtractedEmail) => e.email)));
          setScanStatus('done');
        }
      } catch (err: any) {
        setScanStatus('error');
        setScanError(err.message || 'Failed to automatically scan page.');
      }
    };

    initScanAndCampaigns();
  }, [fetchCampaigns]);

  // Listen for real-time background scan updates while popup is open
  useEffect(() => {
    if (!currentUrl) return;

    const handleRuntimeMessage = (message: any) => {
      if (message.action === 'SAVE_AUTO_SCAN' && message.payload) {
        const { url, emails: newEmails, company: newCompany } = message.payload;
        if (url === currentUrl && newEmails && newEmails.length > 0) {
          setEmails(newEmails);
          setCompany(newCompany);
          setScanStatus('done');
          setSelected(prev => {
            const next = new Set(prev);
            newEmails.forEach((e: ExtractedEmail) => next.add(e.email));
            return next;
          });
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    return () => chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
  }, [currentUrl]);

  /** Scan the current page */
  const handleScanPage = async () => {
    setScanStatus('scanning');
    setScanError(null);
    setEmails([]);
    setScannedPages([]);

    try {
      const response = await chrome.runtime.sendMessage({ action: 'SCAN_ACTIVE_TAB' });

      if (response?.error) {
        throw new Error(response.error);
      }

      setEmails(response.emails || []);
      setCompany(response.company || null);
      setCurrentUrl(response.url || '');
      setScannedPages([response.url]);
      setScanStatus('done');

      // Auto-select all emails
      setSelected(new Set((response.emails || []).map((e: ExtractedEmail) => e.email)));
    } catch (err: any) {
      setScanStatus('error');
      setScanError(err.message || 'Failed to scan page. Try refreshing.');
    }
  };

  /** Scan Contact, About, and Careers pages */
  const handleScanContactPages = async () => {
    setScanStatus('scanning');
    setScanError(null);

    try {
      const response = await chrome.runtime.sendMessage({ action: 'SCAN_CONTACT_PAGES' });

      if (response?.error) {
        throw new Error(response.error);
      }

      setEmails(response.emails || []);
      setCompany(response.company || null);
      setCurrentUrl(response.url || '');
      setScannedPages(response.scannedPages || []);
      setScanStatus('done');

      // Auto-select all
      setSelected(new Set((response.emails || []).map((e: ExtractedEmail) => e.email)));
    } catch (err: any) {
      setScanStatus('error');
      setScanError(err.message || 'Failed to scan contact pages.');
    }
  };

  /** Allow domain and scan immediately */
  const handleAllowDomain = async () => {
    if (!currentDomain) return;
    setScanStatus('scanning');
    try {
      const storageData = await chrome.storage.local.get('allowed_domains');
      const allowedList = storageData.allowed_domains || [];
      if (!allowedList.includes(currentDomain)) {
        const nextList = [...allowedList, currentDomain];
        await chrome.storage.local.set({ allowed_domains: nextList });
      }
      setIsDomainAllowed(true);
      
      const response = await chrome.runtime.sendMessage({ action: 'SCAN_ACTIVE_TAB' });
      if (response?.error) {
        throw new Error(response.error);
      }
      
      setEmails(response.emails || []);
      setCompany(response.company || null);
      setScannedPages([response.url || currentUrl]);
      setSelected(new Set((response.emails || []).map((e: ExtractedEmail) => e.email)));
      setScanStatus('done');
    } catch (err: any) {
      setScanStatus('error');
      setScanError(err.message || 'Failed to scan page after allowing domain.');
    }
  };

  /** Toggle individual email selection */
  const toggleSelect = (email: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  /** Select / deselect all */
  const toggleSelectAll = () => {
    if (selected.size === emails.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(emails.map(e => e.email)));
    }
  };

  /** Create a new campaign */
  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    setCreatingCampaign(true);
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'CREATE_CAMPAIGN',
        name: newCampaignName.trim(),
      });
      if (result?.id) {
        setCampaigns(prev => [result, ...prev]);
        setSelectedCampaignId(result.id);
        await chrome.storage.local.set({ selected_campaign_id: result.id });
        setNewCampaignName('');
        setShowCampaignDropdown(false);
      }
    } catch (err) {
      console.error('Failed to create campaign:', err);
    } finally {
      setCreatingCampaign(false);
    }
  };

  /** Sync selected emails to the backend */
  const handleSync = async (emailsToSync?: ExtractedEmail[]) => {
    const contactsToSync = emailsToSync || emails.filter(e => selected.has(e.email));
    if (contactsToSync.length === 0) return;
    if (!selectedCampaignId) return;

    setSyncStatus('syncing');
    setSyncError(null);
    setSyncResult(null);

    try {
      const result = await chrome.runtime.sendMessage({
        action: 'SYNC_CONTACTS',
        campaignId: selectedCampaignId,
        contacts: contactsToSync.map(e => ({
          email: e.email,
          classification: e.classification,
          company: company?.name,
          sourceUrl: currentUrl,
        })),
        companyName: company?.name,
        companyDomain: company?.domain,
        sourceUrl: currentUrl,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      setSyncStatus('success');
      setSyncResult({ imported: result.imported, duplicates: result.duplicates });
      fetchCampaigns(); // Refresh campaign counts

      // Reset after delay
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err.message || 'Failed to sync contacts.');
    }
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  if (isDomainAllowed === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Verifying Permissions...
        </span>
      </div>
    );
  }

  if (isDomainAllowed === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] px-6 py-8 text-center animate-fade-in space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg shadow-violet-500/5 relative">
          <Shield className="w-6 h-6 text-zinc-400" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Lock className="w-2.5 h-2.5 text-amber-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-zinc-200">
            Allow scanning on {currentDomain || 'this website'}?
          </h2>
          <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[280px] mx-auto">
            Enable automatic email extraction and synchronization for this domain. Outreach AI will run in the background to sync business contacts. 
          </p>
          <p className="text-[10px] text-zinc-650 leading-relaxed font-semibold">
            Private mail, online banking, and personal pages are never scanned.
          </p>
        </div>

        <div className="w-full space-y-2.5">
          <button
            onClick={handleAllowDomain}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/10 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Allow & Scan Website
          </button>
          
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-zinc-600">
            <Shield className="w-3.5 h-3.5 text-zinc-500" />
            <span>Secure background permission sandbox</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* ─── Company & URL Info ─── */}
      {company && (
        <div className="px-4 py-3 border-b border-zinc-800/40 space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-zinc-800 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate">{company.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{company.domain}</p>
            </div>
            {company.industry && (
              <span className="badge badge-engineering flex-shrink-0">{company.industry}</span>
            )}
          </div>
          {currentUrl && (
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <Globe className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{currentUrl}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Automated Scan Status Badge ─── */}
      <div className="px-4 py-2 border-b border-zinc-800/40 bg-zinc-900/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-ring" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Auto-Scan & Sync Active</span>
        </div>
        {scannedPages.length > 0 && (
          <span className="text-[9px] text-zinc-500">
            Page verified
          </span>
        )}
      </div>

      {/* ─── Scan Error ─── */}
      {scanStatus === 'error' && scanError && (
        <div className="mx-4 mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-[10px] text-red-400 leading-relaxed">{scanError}</span>
        </div>
      )}

      {/* ─── Loading State ─── */}
      {scanStatus === 'scanning' && (
        <div className="px-4 py-8 flex flex-col items-center gap-3 animate-fade-in">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-zinc-900/50 flex items-center justify-center">
              <Search className="w-4 h-4 text-violet-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-medium text-zinc-300">Scanning for emails...</p>
            <p className="text-[9px] text-zinc-650 mt-0.5">Analyzing page content, links, and structured data</p>
          </div>
        </div>
      )}

      {/* ─── Empty State ─── */}
      {scanStatus === 'idle' && (
        <div className="px-4 py-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-medium text-zinc-400">Ready to scan</p>
            <p className="text-[9px] text-zinc-650 mt-0.5">Navigate to any webpage to see automatically extracted emails</p>
          </div>
        </div>
      )}

      {/* ─── No Results ─── */}
      {scanStatus === 'done' && emails.length === 0 && (
        <div className="px-4 py-8 flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Mail className="w-5 h-5 text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-medium text-zinc-400">No emails found</p>
            <p className="text-[9px] text-zinc-650 mt-0.5">No emails were detected on this webpage.</p>
          </div>
        </div>
      )}

      {/* ─── Email Results ─── */}
      {scanStatus === 'done' && emails.length > 0 && (
        <div className="animate-fade-in">
          {/* Results header */}
          <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-800/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                {emails.length} Email{emails.length !== 1 ? 's' : ''} Synced
              </span>
            </div>
            <div className="text-[9px] text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              Auto-Added
            </div>
          </div>

          {/* Email list */}
          <div className="max-h-[200px] overflow-y-auto">
            {emails.map((entry, idx) => (
              <div
                key={entry.email}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                  idx !== emails.length - 1 ? 'border-b border-zinc-800/20' : ''
                } hover:bg-zinc-850/30`}
              >
                {/* Success Sync Icon */}
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />

                {/* Email info */}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-zinc-200 truncate">{entry.email}</p>
                  <p className="text-[9px] text-zinc-500 truncate">automatically synced</p>
                </div>

                {/* Classification badge */}
                <span className={`badge badge-${entry.classification.toLowerCase()} flex-shrink-0`}>
                  {entry.classification}
                </span>
              </div>
            ))}
          </div>

          {/* ─── Campaign Selector & Actions ─── */}
          <div className="px-4 py-3 border-t border-t-zinc-800/40 space-y-2.5">
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
              Target Campaign
            </div>
            {/* Campaign dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:border-zinc-700 transition-all cursor-pointer"
              >
                <span className="truncate">
                  {selectedCampaign ? selectedCampaign.name : 'Select Campaign...'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showCampaignDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showCampaignDropdown && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl shadow-black/30 z-20 max-h-[180px] overflow-y-auto animate-fade-in">
                  {campaigns.map(campaign => (
                    <button
                      key={campaign.id}
                      onClick={async () => {
                        setSelectedCampaignId(campaign.id);
                        await chrome.storage.local.set({ selected_campaign_id: campaign.id });
                        setShowCampaignDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-[11px] hover:bg-zinc-800/60 transition-colors cursor-pointer ${
                        campaign.id === selectedCampaignId ? 'text-violet-400 bg-violet-500/5' : 'text-zinc-300'
                      }`}
                    >
                      <span className="truncate">{campaign.name}</span>
                      <span className="text-[9px] text-zinc-500 flex-shrink-0">{campaign.contactCount} contacts</span>
                    </button>
                  ))}
                  {/* Create new */}
                  <div className="border-t border-zinc-800 p-2">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCampaign()}
                        placeholder="New campaign name..."
                        className="flex-1 px-2 py-1.5 bg-zinc-800/60 border border-zinc-700/50 rounded text-[10px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all"
                      />
                      <button
                        onClick={handleCreateCampaign}
                        disabled={!newCampaignName.trim() || creatingCampaign}
                        className="p-1.5 rounded bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
                      >
                        {creatingCampaign ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Feedback Message */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[10px] leading-relaxed">
                All found contacts are automatically saved to your campaign.
              </span>
            </div>

            {/* Open Dashboard link */}
            <button
              onClick={() => {
                chrome.tabs.create({ url: 'https://outreach.aditya07.me/' });
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Outreach Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
