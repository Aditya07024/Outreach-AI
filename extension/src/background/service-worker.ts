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
 * Make an authenticated API request to the backend.
 */
async function apiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const apiUrl = await getApiUrl();
  const token = await getToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }
  
  const url = `${apiUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    // Token expired — clear it
    await chrome.storage.local.remove(STORAGE_KEYS.TOKEN);
    throw new Error('Session expired. Please log in again.');
  }
  
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || `API error: ${response.status}`);
  }
  
  return response.json();
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
      } catch (err) {
        // If we still have the token in local storage, keep user logged in.
        // The token is only removed during explicit logout or on a definitive 401 response in apiRequest.
        const tokenExists = await getToken();
        if (tokenExists) {
          const storageData = await chrome.storage.local.get('cached_user');
          return { 
            authenticated: true, 
            user: storageData.cached_user || { id: 0, email: 'Offline Mode', role: 'user', paid: true } 
          };
        }
        return { authenticated: false };
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
      const { campaignId, contacts, companyName, companyDomain, sourceUrl } = message;
      return await apiRequest('/api/extension/sync', {
        method: 'POST',
        body: JSON.stringify({ campaignId, contacts, companyName, companyDomain, sourceUrl }),
      });
    }
    
    // ─── Content Script Relay ───
    case 'SCAN_ACTIVE_TAB': {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.id) throw new Error('No active tab found.');
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_PAGE' });
        return response;
      } catch (err) {
        throw new Error('Please refresh this tab or try scanning a different website. Note that standard security policies prevent extension execution on internal chrome:// pages.');
      }
    }
    
    case 'SCAN_CONTACT_PAGES': {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.id) throw new Error('No active tab found.');
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_CONTACT_PAGES' });
        return response;
      } catch (err) {
        throw new Error('Please refresh this tab or try scanning a different website. Note that standard security policies prevent extension execution on internal chrome:// pages.');
      }
    }
    
    case 'GET_PAGE_INFO': {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.id) throw new Error('No active tab found.');
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_INFO' });
        return response;
      } catch (err) {
        // Return null/empty info gracefully rather than throwing
        return { action: 'PAGE_INFO', company: null, relatedPages: { contactUrls: [], aboutUrls: [], careersUrls: [] }, url: tab.url || '' };
      }
    }
    
    default:
      throw new Error(`Unknown action: ${message.action}`);
  }
}

// Log that service worker is running
console.log('[Outreach AI] Background service worker loaded');
