/**
 * Content Script Entry Point
 * 
 * Injected into every webpage. Automatically scans the webpage for emails
 * and company info on load, and caches them in the background service worker.
 * Also listens for scan requests from the popup.
 */

import { extractEmails, extractEmailsFromHTML, detectRelatedPages, type ExtractedEmail } from './extractor';
import { detectCompany, type DetectedCompany } from './company-detector';

/** Message types between popup/background and content script */
interface ScanRequest {
  action: 'SCAN_PAGE' | 'SCAN_CONTACT_PAGES' | 'GET_PAGE_INFO';
}

interface ScanResponse {
  action: string;
  emails: ExtractedEmail[];
  company: DetectedCompany;
  relatedPages: {
    contactUrls: string[];
    aboutUrls: string[];
    careersUrls: string[];
  };
  url: string;
  scannedPages?: string[];
}

/**
 * Handle messages from popup or background script
 */
chrome.runtime.onMessage.addListener((message: ScanRequest, _sender, sendResponse) => {
  if (message.action === 'SCAN_PAGE') {
    handleScanPage().then(sendResponse).catch(err => {
      sendResponse({ action: 'SCAN_ERROR', error: err.message });
    });
    return true; // Keep the message channel open for async response
  }
  
  if (message.action === 'SCAN_CONTACT_PAGES') {
    handleScanContactPages().then(sendResponse).catch(err => {
      sendResponse({ action: 'SCAN_ERROR', error: err.message });
    });
    return true;
  }
  
  if (message.action === 'GET_PAGE_INFO') {
    const company = detectCompany();
    const relatedPages = detectRelatedPages();
    sendResponse({
      action: 'PAGE_INFO',
      company,
      relatedPages,
      url: window.location.href,
    });
    return true;
  }
  
  return false;
});

/**
 * Scan the current page for emails
 */
async function handleScanPage(): Promise<ScanResponse> {
  const emails = extractEmails();
  const company = detectCompany();
  const relatedPages = detectRelatedPages();
  
  return {
    action: 'SCAN_COMPLETE',
    emails,
    company,
    relatedPages,
    url: window.location.href,
  };
}

/**
 * Scan Contact, About, and Careers pages for additional emails.
 * Fetches each page's HTML and extracts emails from it.
 */
async function handleScanContactPages(): Promise<ScanResponse> {
  // First scan the current page
  const currentEmails = extractEmails();
  const company = detectCompany();
  const relatedPages = detectRelatedPages();
  
  const allEmails = [...currentEmails];
  const scannedPages: string[] = [window.location.href];
  
  // Collect all URLs to scan
  const urlsToScan = [
    ...relatedPages.contactUrls,
    ...relatedPages.aboutUrls,
    ...relatedPages.careersUrls,
  ];
  
  // Remove duplicates and current page
  const uniqueUrls = [...new Set(urlsToScan)].filter(url => url !== window.location.href);
  
  // Fetch and scan each page (limit to 6 to avoid excessive requests)
  const pagesToScan = uniqueUrls.slice(0, 6);
  
  for (const url of pagesToScan) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
        signal: AbortSignal.timeout(8000),
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      const pageEmails = extractEmailsFromHTML(html, `page:${new URL(url).pathname}`);
      allEmails.push(...pageEmails);
      scannedPages.push(url);
    } catch {
      // Network error or timeout — skip this page
      console.log(`[Outreach AI] Failed to scan: ${url}`);
    }
  }
  
  // Deduplicate across all scanned pages
  const emailMap = new Map<string, ExtractedEmail>();
  for (const entry of allEmails) {
    const key = entry.email.toLowerCase();
    if (!emailMap.has(key)) {
      emailMap.set(key, entry);
    } else {
      // Prefer more specific classification
      const existing = emailMap.get(key)!;
      if (existing.classification === 'Unknown' && entry.classification !== 'Unknown') {
        emailMap.set(key, entry);
      }
    }
  }
  
  return {
    action: 'SCAN_COMPLETE',
    emails: Array.from(emailMap.values()),
    company,
    relatedPages,
    url: window.location.href,
    scannedPages,
  };
}

/**
 * Automatically scan page and send results to the background cache.
 */
function autoScan() {
  try {
    const emails = extractEmails();
    const company = detectCompany();
    const relatedPages = detectRelatedPages();
    
    // Only send if we found emails or detected a company name
    if (emails.length > 0 || (company && company.name)) {
      chrome.runtime.sendMessage({
        action: 'SAVE_AUTO_SCAN',
        payload: {
          url: window.location.href,
          emails,
          company,
          relatedPages
        }
      }).catch(() => {
        // Suppress errors when message channel is not ready
      });
    }
  } catch (err) {
    console.error('[Outreach AI] Auto-scan error:', err);
  }
}

// Start auto scanning when document becomes idle/interactive
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  autoScan();
} else {
  window.addEventListener('DOMContentLoaded', autoScan);
}

// Observe DOM mutations to scan for dynamically loaded emails (e.g. React/SPA routing)
let mutationTimeout: any;
const observer = new MutationObserver(() => {
  clearTimeout(mutationTimeout);
  mutationTimeout = setTimeout(() => {
    autoScan();
  }, 2000); // 2 second debounce to ensure performance
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  window.addEventListener('load', () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
}

console.log('[Outreach AI] Background auto-scan active');
