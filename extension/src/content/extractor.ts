/**
 * Email Extraction Engine
 * 
 * Extracts publicly visible business email addresses from web pages using 10 methods:
 * 1. Regex scan of visible text
 * 2. mailto: links
 * 3. Visible HTML text nodes
 * 4. JavaScript-rendered DOM (MutationObserver)
 * 5. Contact page detection
 * 6. About page detection
 * 7. Careers page detection
 * 8. Footer scan
 * 9. Header scan
 * 10. Structured data (JSON-LD, Schema.org)
 * 
 * Post-processing: normalize, deduplicate, classify, filter fakes.
 */

export interface ExtractedEmail {
  email: string;
  classification: string;
  source: string;
}

/** Comprehensive email regex — RFC 5322 simplified */
const EMAIL_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g;

/** Fake / noise emails to ignore */
const FAKE_EMAIL_PATTERNS = [
  /^test@/i,
  /^example@/i,
  /^user@/i,
  /^email@/i,
  /^name@/i,
  /^your@/i,
  /^someone@/i,
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^do-not-reply@/i,
  /^mailer-daemon@/i,
  /^postmaster@/i,
  /^webmaster@/i,
  /^localhost$/i,
  /^sentry\./i,
  /^wixpress\.com$/i,
  /@example\./i,
  /@test\./i,
  /@localhost/i,
  /@sentry\./i,
];

/** Fake TLDs and file extensions that look like emails but aren't */
const FAKE_TLDS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'css', 'js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'woff', 'woff2', 'ttf', 'eot', 'map', 'min'];

/** Email prefix → classification mapping */
const CLASSIFICATION_MAP: Record<string, string> = {
  'hr': 'Recruitment',
  'career': 'Recruitment',
  'careers': 'Recruitment',
  'jobs': 'Recruitment',
  'recruiting': 'Recruitment',
  'recruitment': 'Recruitment',
  'talent': 'Recruitment',
  'hiring': 'Recruitment',
  'support': 'Support',
  'help': 'Support',
  'helpdesk': 'Support',
  'customerservice': 'Support',
  'service': 'Support',
  'sales': 'Sales',
  'business': 'Sales',
  'partnerships': 'Sales',
  'partner': 'Sales',
  'info': 'General',
  'hello': 'General',
  'contact': 'General',
  'general': 'General',
  'office': 'General',
  'team': 'General',
  'founder': 'Founder',
  'ceo': 'Founder',
  'cto': 'Founder',
  'coo': 'Founder',
  'cfo': 'Founder',
  'admin': 'Administration',
  'administrator': 'Administration',
  'operations': 'Administration',
  'engineering': 'Engineering',
  'dev': 'Engineering',
  'developer': 'Engineering',
  'tech': 'Engineering',
  'marketing': 'Marketing',
  'press': 'Marketing',
  'media': 'Marketing',
  'pr': 'Marketing',
  'legal': 'Legal',
  'compliance': 'Legal',
  'privacy': 'Legal',
  'finance': 'Finance',
  'billing': 'Finance',
  'accounting': 'Finance',
  'invoices': 'Finance',
  'payments': 'Finance',
};

/**
 * Classifies an email based on its prefix.
 */
export function classifyEmail(email: string): string {
  const prefix = email.split('@')[0].toLowerCase().replace(/[._-]/g, '');
  
  for (const [key, classification] of Object.entries(CLASSIFICATION_MAP)) {
    if (prefix === key || prefix.startsWith(key)) {
      return classification;
    }
  }
  
  return 'Unknown';
}

/**
 * Validates whether an email is a real business email worth collecting.
 */
function isValidBusinessEmail(email: string): boolean {
  // Must have @ and at least one dot in domain
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [, domain] = parts;
  if (!domain || !domain.includes('.')) return false;
  
  // Check for fake TLDs (image/code file extensions)
  const tld = domain.split('.').pop()?.toLowerCase() || '';
  if (FAKE_TLDS.includes(tld)) return false;
  
  // Check against fake email patterns
  for (const pattern of FAKE_EMAIL_PATTERNS) {
    if (pattern.test(email) || pattern.test(domain)) return false;
  }
  
  // Must be reasonable length
  if (email.length < 5 || email.length > 254) return false;
  
  // Domain must be at least 3 chars (a.b)
  if (domain.length < 3) return false;
  
  return true;
}

/**
 * Method 1: Regex scan of full page text
 */
function extractFromText(text: string, source: string): ExtractedEmail[] {
  const matches = text.match(EMAIL_REGEX) || [];
  return matches.map(email => ({
    email: email.toLowerCase().trim(),
    classification: classifyEmail(email),
    source,
  }));
}

/**
 * Method 2: mailto: links
 */
function extractFromMailtoLinks(): ExtractedEmail[] {
  const links = document.querySelectorAll('a[href^="mailto:"]');
  const results: ExtractedEmail[] = [];
  
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
    if (email && email.includes('@')) {
      results.push({
        email,
        classification: classifyEmail(email),
        source: 'mailto-link',
      });
    }
  });
  
  return results;
}

/**
 * Method 3: Visible HTML text nodes only (excludes script, style, hidden elements)
 */
function extractFromVisibleText(): ExtractedEmail[] {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'template'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip hidden elements
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let allVisibleText = '';
  let node: Node | null;
  while ((node = walker.nextNode())) {
    allVisibleText += ' ' + (node.textContent || '');
  }
  
  return extractFromText(allVisibleText, 'visible-text');
}

/**
 * Method 8: Footer-specific scan
 */
function extractFromFooter(): ExtractedEmail[] {
  const footers = document.querySelectorAll('footer, [role="contentinfo"], .footer, #footer, .site-footer');
  const results: ExtractedEmail[] = [];
  
  footers.forEach(footer => {
    const text = footer.textContent || '';
    results.push(...extractFromText(text, 'footer'));
    
    // Also check mailto links within footer
    const links = footer.querySelectorAll('a[href^="mailto:"]');
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (email && email.includes('@')) {
        results.push({ email, classification: classifyEmail(email), source: 'footer-mailto' });
      }
    });
  });
  
  return results;
}

/**
 * Method 9: Header-specific scan
 */
function extractFromHeader(): ExtractedEmail[] {
  const headers = document.querySelectorAll('header, [role="banner"], .header, #header, .site-header, .top-bar, .topbar');
  const results: ExtractedEmail[] = [];
  
  headers.forEach(header => {
    const text = header.textContent || '';
    results.push(...extractFromText(text, 'header'));
  });
  
  return results;
}

/**
 * Method 10: Structured data (JSON-LD, Schema.org, microdata)
 */
function extractFromStructuredData(): ExtractedEmail[] {
  const results: ExtractedEmail[] = [];
  
  // JSON-LD scripts
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  jsonLdScripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '');
      extractEmailsFromObject(data, results, 'json-ld');
    } catch {
      // Invalid JSON, skip
    }
  });
  
  // Microdata - itemtype with email property
  const itemElements = document.querySelectorAll('[itemprop="email"]');
  itemElements.forEach(el => {
    const email = (el.getAttribute('content') || el.textContent || '').trim().toLowerCase();
    if (email && email.includes('@')) {
      results.push({ email, classification: classifyEmail(email), source: 'microdata' });
    }
  });
  
  return results;
}

/**
 * Recursively extract emails from a JSON-LD object
 */
function extractEmailsFromObject(obj: any, results: ExtractedEmail[], source: string): void {
  if (!obj || typeof obj !== 'object') return;
  
  if (Array.isArray(obj)) {
    obj.forEach(item => extractEmailsFromObject(item, results, source));
    return;
  }
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && (key.toLowerCase().includes('email') || key === 'contactPoint')) {
      const matches = value.match(EMAIL_REGEX);
      if (matches) {
        matches.forEach(email => {
          results.push({ email: email.toLowerCase(), classification: classifyEmail(email), source });
        });
      }
    } else if (typeof value === 'object') {
      extractEmailsFromObject(value, results, source);
    }
  }
}

/**
 * Detect related pages (Contact, About, Careers) from the navigation
 */
export function detectRelatedPages(): { contactUrls: string[]; aboutUrls: string[]; careersUrls: string[] } {
  const contactUrls: string[] = [];
  const aboutUrls: string[] = [];
  const careersUrls: string[] = [];
  
  const links = document.querySelectorAll('a[href]');
  const seen = new Set<string>();
  const baseUrl = window.location.origin;
  
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    const text = (link.textContent || '').trim().toLowerCase();
    
    let fullUrl: string;
    try {
      fullUrl = new URL(href, baseUrl).href;
    } catch {
      return;
    }
    
    // Only same-origin links
    if (!fullUrl.startsWith(baseUrl)) return;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);
    
    const pathLower = fullUrl.toLowerCase();
    
    if (/\/(contact|contact-us|contactus|get-in-touch|reach-us)/i.test(pathLower) || /contact/i.test(text)) {
      contactUrls.push(fullUrl);
    }
    if (/\/(about|about-us|aboutus|our-story|who-we-are)/i.test(pathLower) || /about/i.test(text)) {
      aboutUrls.push(fullUrl);
    }
    if (/\/(careers|jobs|join-us|join|openings|positions|hiring|work-with-us)/i.test(pathLower) || /careers|jobs|join/i.test(text)) {
      careersUrls.push(fullUrl);
    }
  });
  
  return {
    contactUrls: [...new Set(contactUrls)].slice(0, 3),
    aboutUrls: [...new Set(aboutUrls)].slice(0, 3),
    careersUrls: [...new Set(careersUrls)].slice(0, 3),
  };
}

/**
 * Main extraction function — runs all methods and returns deduplicated results.
 */
export function extractEmails(): ExtractedEmail[] {
  const allEmails: ExtractedEmail[] = [];
  
  // Method 1: Full page text regex
  const fullText = document.body?.innerText || '';
  allEmails.push(...extractFromText(fullText, 'page-text'));
  
  // Method 2: mailto links
  allEmails.push(...extractFromMailtoLinks());
  
  // Method 3: Visible text nodes
  allEmails.push(...extractFromVisibleText());
  
  // Method 8: Footer
  allEmails.push(...extractFromFooter());
  
  // Method 9: Header
  allEmails.push(...extractFromHeader());
  
  // Method 10: Structured data
  allEmails.push(...extractFromStructuredData());
  
  // Deduplicate and filter
  const emailMap = new Map<string, ExtractedEmail>();
  
  for (const entry of allEmails) {
    const normalized = entry.email.toLowerCase().trim();
    if (!isValidBusinessEmail(normalized)) continue;
    
    // Keep first occurrence (preserves source info) but prefer more specific classification
    if (!emailMap.has(normalized)) {
      emailMap.set(normalized, { ...entry, email: normalized });
    } else {
      const existing = emailMap.get(normalized)!;
      if (existing.classification === 'Unknown' && entry.classification !== 'Unknown') {
        emailMap.set(normalized, { ...entry, email: normalized });
      }
    }
  }
  
  return Array.from(emailMap.values());
}

/**
 * Extract emails from a fetched HTML string (for scanning Contact/About/Careers pages).
 */
export function extractEmailsFromHTML(html: string, source: string): ExtractedEmail[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const allEmails: ExtractedEmail[] = [];
  
  // Text content
  const text = doc.body?.textContent || '';
  allEmails.push(...extractFromText(text, source));
  
  // mailto links
  const links = doc.querySelectorAll('a[href^="mailto:"]');
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
    if (email && email.includes('@')) {
      allEmails.push({ email, classification: classifyEmail(email), source: `${source}-mailto` });
    }
  });
  
  // JSON-LD
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  jsonLdScripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '');
      extractEmailsFromObject(data, allEmails, `${source}-jsonld`);
    } catch { /* skip */ }
  });
  
  // Deduplicate and validate
  const emailMap = new Map<string, ExtractedEmail>();
  for (const entry of allEmails) {
    const normalized = entry.email.toLowerCase().trim();
    if (!isValidBusinessEmail(normalized)) continue;
    if (!emailMap.has(normalized)) {
      emailMap.set(normalized, { ...entry, email: normalized });
    }
  }
  
  return Array.from(emailMap.values());
}
