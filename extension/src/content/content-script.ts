/**
 * Content Script Entry Point
 * 
 * Injected into every webpage. Listens for messages from the popup/background
 * and runs email extraction + company detection on demand.
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

// Log that content script is loaded (debug only)
console.log('[Outreach AI] Content script loaded');
