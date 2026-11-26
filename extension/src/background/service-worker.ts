/**
 * Background Service Worker
 * 
 * Handles all communication between the extension popup, content scripts,
 * and the backend API. Manages JWT token storage and refresh.
 */

/** Locked production API server URL */
const DEFAULT_API_URL = 'https://api.outreachai.aditya07.me';

/** Storage keys */
const STORAGE_KEYS = {
  TOKEN: 'outreach_jwt_token',
  API_URL: 'outreach_api_url',
} as const;

/**
 * Get the configured API URL (locked to production).
 */
async function getApiUrl(): Promise<string> {
  return DEFAULT_API_URL;
}

/**
 * Get the stored JWT token.
 */
async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN);
  return result[STORAGE_KEYS.TOKEN] || null;
}

/**
 * Make an authenticated API request to the backend with timeout and failover.
 */
async function apiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  // Candidate API base URLs: production API and main website proxy
  const candidateUrls = [
    'https://api.outreachai.aditya07.me',
    'https://outreach.aditya07.me',
  ];

  const storageData = await chrome.storage.local.get(STORAGE_KEYS.API_URL);
  if (storageData[STORAGE_KEYS.API_URL]) {
    candidateUrls.unshift(storageData[STORAGE_KEYS.API_URL]);
  }

  let lastError: any = null;

  for (const baseUrl of candidateUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers as Record<string, string> || {}),
      };
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      
      if (response.status === 401 || response.status === 403) {
        // Token expired or invalid — clear it immediately so user isn't trapped
        await chrome.storage.local.remove([STORAGE_KEYS.TOKEN, 'cached_user']);
        throw new Error('Session expired. Please log in again.');
      }
      
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: `API error: ${response.status}` }));
        throw new Error(body.error || `API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = err;
      if (err.message?.includes('Session expired') || err.message?.includes('Not authenticated')) {
        throw err;
      }
      // Try next candidate URL
    }
  }

  throw lastError || new Error('Failed to connect to server.');
}

/**
 * Handle messages from the popup.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(err => {
    sendResponse({ error: err.message || 'Unknown error' });
  });
  return true; // Keep channel open for async
});

async function handleMessage(message: any): Promise<any> {
  switch (message.action) {
    // ─── Authentication ───
    case 'LOGIN': {
      const { token } = message;
      if (!token) throw new Error('Token is required.');
      
      // Clean legacy API URLs from storage to avoid localhost conflicts
      await chrome.storage.local.remove(STORAGE_KEYS.API_URL);
      
      await chrome.storage.local.set({
        [STORAGE_KEYS.TOKEN]: token,
      });
      // Verify the token works
      const status = await apiRequest('/api/extension/status');
      // Store cached user info on successful login
      await chrome.storage.local.set({ cached_user: status.user });
      return { success: true, user: status.user };
    }
    
    case 'LOGOUT': {
      await chrome.storage.local.remove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.API_URL, 'cached_user']);
      return { success: true };
    }
    
    case 'CHECK_AUTH': {
      const token = await getToken();
      if (!token) return { authenticated: false };
      try {
        const status = await apiRequest('/api/extension/status');
        await chrome.storage.local.set({ cached_user: status.user });
        return { authenticated: true, user: status.user };
      } catch (err: any) {
        if (err.message?.includes('Session expired') || err.message?.includes('Not authenticated') || err.message?.includes('401') || err.message?.includes('403')) {
          await chrome.storage.local.remove([STORAGE_KEYS.TOKEN, 'cached_user']);
          return { authenticated: false };
        }
        // If server is temporarily unreachable, check if we have cached user info
        const storageData = await chrome.storage.local.get('cached_user');
        if (storageData.cached_user) {
          return { 
            authenticated: true, 
            user: storageData.cached_user,
            offline: true 
          };
        }
        // If no cached user and connection failed, clear token to allow re-login!
        await chrome.storage.local.remove([STORAGE_KEYS.TOKEN, 'cached_user']);
        return { authenticated: false, error: err.message };
      }
    }
    
    case 'GET_SETTINGS': {
      return { apiUrl: DEFAULT_API_URL };
    }

    // ─── Cache Management ───
    case 'SAVE_AUTO_SCAN': {
      const { url, emails, company, relatedPages } = message.payload;
      const key = `autoscan_${url}`;
      await chrome.storage.local.set({
        [key]: {
          url,
          emails,
          company,
          relatedPages,
          timestamp: Date.now()
        }
      });

      // Automatically sync to selected campaign if authenticated and a campaign is selected
      const token = await getToken();
      const storageData = await chrome.storage.local.get('selected_campaign_id');
      const campaignId = storageData.selected_campaign_id;

      if (token && campaignId && emails && emails.length > 0) {
        try {
          const contactsPayload = emails.map((e: any) => ({
            email: e.email,
            classification: e.classification,
            company: company?.name,
            sourceUrl: url,
          }));

          await apiRequest('/api/extension/sync', {
            method: 'POST',
            body: JSON.stringify({
              campaignId,
              contacts: contactsPayload,
              companyName: company?.name,
              companyDomain: company?.domain,
              sourceUrl: url,
            }),
          });
          console.log(`[Outreach AI] Background auto-synced ${emails.length} contacts to campaign ${campaignId}`);
        } catch (err) {
          console.error('[Outreach AI] Background auto-sync failed:', err);
        }
      }

      return { success: true };
    }

    case 'GET_CACHED_SCAN': {
      const { url } = message;
      const key = `autoscan_${url}`;
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    }
    
    // ─── Campaigns ───
    case 'GET_CAMPAIGNS': {
      return await apiRequest('/api/extension/campaigns');
    }
    
    case 'CREATE_CAMPAIGN': {
      const { name, description } = message;
      return await apiRequest('/api/extension/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
    }
    
    // ─── Sync Contacts ───
    case 'SYNC_CONTACTS': {
      let { campaignId, contacts, companyName, companyDomain, sourceUrl, excludeGmail } = message;
      if (excludeGmail === undefined) {
        const stored = await chrome.storage.local.get('exclude_gmail');
        excludeGmail = stored.exclude_gmail !== false;
      }
      return await apiRequest('/api/extension/sync', {
        method: 'POST',
        body: JSON.stringify({ campaignId, contacts, companyName, companyDomain, sourceUrl, excludeGmail }),
      });
    }
    
    // ─── Content Script Relay ───
    case 'START_AUTO_SCROLL':
    case 'STOP_AUTO_SCROLL':
    case 'PAUSE_AUTO_SCROLL':
    case 'RESUME_AUTO_SCROLL':
    case 'GET_AUTO_SCROLL_STATUS':
    case 'SCAN_ACTIVE_TAB':
    case 'SCAN_CONTACT_PAGES':
    case 'GET_PAGE_INFO': {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.id) throw new Error('No active tab found.');
      
      const payloadAction = message.action === 'SCAN_ACTIVE_TAB' ? 'SCAN_PAGE' : message.action;
      return await sendTabMessageWithFallback(tab.id, { ...message, action: payloadAction });
    }
    
    default:
      throw new Error(`Unknown action: ${message.action}`);
  }
}

/**
 * Safely send a message to a tab's content script, auto-injecting content.js if missing.
 */
async function sendTabMessageWithFallback(tabId: number, message: any): Promise<any> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (injectErr) {
      if (message.action === 'GET_PAGE_INFO') {
        return { action: 'PAGE_INFO', company: null, relatedPages: { contactUrls: [], aboutUrls: [], careersUrls: [] }, url: '' };
      }
      throw new Error(
        'Please refresh this tab or try scanning a different website. Note that standard security policies prevent extension execution on internal chrome:// pages.'
      );
    }
  }
}

// On initial extension installation: automatically open Outreach AI login tab
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      const token = await getToken();
      if (!token) {
        chrome.tabs.create({
          url: 'https://outreach.aditya07.me/extension-login',
          active: true,
        });
      }
    } catch (err) {
      chrome.tabs.create({
        url: 'https://outreach.aditya07.me/extension-login',
        active: true,
      });
    }
  }
});

// Log that service worker is running
console.log('[Outreach AI] Background service worker loaded');
