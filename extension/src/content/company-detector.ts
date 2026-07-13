/**
 * Company Detector
 * 
 * Automatically detects company information from the current webpage:
 * - Company name (from title, OG tags, Schema.org, copyright)
 * - Domain
 * - Website URL
 * - LinkedIn URL
 * - Contact/About/Careers page URLs
 */

export interface DetectedCompany {
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

/**
 * Detects company information from the current page.
 */
export function detectCompany(): DetectedCompany {
  const domain = window.location.hostname.replace(/^www\./, '');
  const website = window.location.origin;
  
  const name = detectCompanyName(domain);
  const linkedinUrl = detectLinkedInUrl();
  const pageUrls = detectPageUrls();
  const industry = detectIndustry();
  const location = detectLocation();
  
  return {
    name,
    domain,
    website,
    linkedinUrl,
    industry,
    location,
    ...pageUrls,
  };
}

/**
 * Detect company name from various sources, ordered by reliability.
 */
function detectCompanyName(domain: string): string {
  // 1. Try Schema.org / JSON-LD
  const jsonLdName = getNameFromJsonLd();
  if (jsonLdName) return jsonLdName;
  
  // 2. Try Open Graph
  const ogName = getMetaContent('og:site_name');
  if (ogName) return ogName;
  
  // 3. Try meta application-name
  const appName = getMetaContent('application-name');
  if (appName) return appName;
  
  // 4. Try copyright text in footer
  const copyrightName = getNameFromCopyright();
  if (copyrightName) return copyrightName;
  
  // 5. Try document title (first part before | or -)
  const titleName = getNameFromTitle();
  if (titleName) return titleName;
  
  // 6. Fallback: prettify the domain
  return prettifyDomain(domain);
}

function getNameFromJsonLd(): string | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const obj = Array.isArray(data) ? data[0] : data;
      
      if (obj?.name && typeof obj.name === 'string') {
        return obj.name;
      }
      if (obj?.organization?.name) {
        return obj.organization.name;
      }
      if (obj?.publisher?.name) {
        return obj.publisher.name;
      }
    } catch { /* skip invalid JSON */ }
  }
  return null;
}

function getMetaContent(name: string): string | null {
  const meta = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
  const content = meta?.getAttribute('content')?.trim();
  return content && content.length > 1 && content.length < 100 ? content : null;
}

function getNameFromCopyright(): string | null {
  const footers = document.querySelectorAll('footer, .footer, #footer');
  for (const footer of footers) {
    const text = footer.textContent || '';
    // Match patterns like "© 2024 Company Name" or "Copyright Company Name"
    const match = text.match(/(?:©|copyright)\s*(?:\d{4}\s*[-–]?\s*\d{0,4}\s*)?([A-Z][A-Za-z0-9\s&.,'-]{2,40})/i);
    if (match?.[1]) {
      // Clean up — remove trailing punctuation, "All Rights Reserved", etc.
      return match[1].replace(/\s*(all rights reserved|inc|llc|ltd|co|corp)\.?\s*$/i, '').trim();
    }
  }
  return null;
}

function getNameFromTitle(): string | null {
  const title = document.title || '';
  // Split on common separators
  const parts = title.split(/\s*[|–—·•]\s*/);
  // Usually the company name is the last part, or the first if it's short
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1].trim();
    if (lastPart.length > 1 && lastPart.length < 50) return lastPart;
  }
  // If single part, use it if reasonable length
  if (parts[0] && parts[0].trim().length > 1 && parts[0].trim().length < 50) {
    return parts[0].trim();
  }
  return null;
}

function prettifyDomain(domain: string): string {
  // Remove TLD, capitalize
  const parts = domain.split('.');
  const name = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Detect LinkedIn company URL from page links.
 */
function detectLinkedInUrl(): string | undefined {
  const links = document.querySelectorAll('a[href*="linkedin.com"]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (href.includes('linkedin.com/company/') || href.includes('linkedin.com/in/')) {
      return href;
    }
  }
  return undefined;
}

/**
 * Detect Contact, About, Careers page URLs from navigation.
 */
function detectPageUrls(): { contactUrl?: string; aboutUrl?: string; careersUrl?: string } {
  const baseUrl = window.location.origin;
  const result: { contactUrl?: string; aboutUrl?: string; careersUrl?: string } = {};
  
  const links = document.querySelectorAll('a[href]');
  
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const text = (link.textContent || '').trim().toLowerCase();
    
    let fullUrl: string;
    try {
      fullUrl = new URL(href, baseUrl).href;
    } catch {
      continue;
    }
    
    if (!fullUrl.startsWith(baseUrl)) continue;
    
    const pathLower = fullUrl.toLowerCase();
    
    if (!result.contactUrl && (/\/(contact|contact-us|contactus|get-in-touch)/i.test(pathLower) || text === 'contact' || text === 'contact us')) {
      result.contactUrl = fullUrl;
    }
    if (!result.aboutUrl && (/\/(about|about-us|aboutus|our-story|who-we-are)/i.test(pathLower) || text === 'about' || text === 'about us')) {
      result.aboutUrl = fullUrl;
    }
    if (!result.careersUrl && (/\/(careers|jobs|join|openings|positions|hiring)/i.test(pathLower) || text === 'careers' || text === 'jobs')) {
      result.careersUrl = fullUrl;
    }
  }
  
  return result;
}

/**
 * Detect industry from meta keywords or page content.
 */
function detectIndustry(): string | undefined {
  const keywords = getMetaContent('keywords');
  if (keywords) {
    const industryKeywords = ['technology', 'software', 'fintech', 'healthcare', 'education', 'ecommerce', 'saas', 'ai', 'machine learning', 'consulting', 'marketing', 'design', 'media', 'finance', 'real estate', 'logistics', 'travel', 'food', 'retail'];
    const lowerKeywords = keywords.toLowerCase();
    for (const keyword of industryKeywords) {
      if (lowerKeywords.includes(keyword)) {
        return keyword.charAt(0).toUpperCase() + keyword.slice(1);
      }
    }
  }
  return undefined;
}

/**
 * Detect location from structured data or meta tags.
 */
function detectLocation(): string | undefined {
  // Try JSON-LD
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const obj = Array.isArray(data) ? data[0] : data;
      const address = obj?.address || obj?.location?.address;
      if (address) {
        if (typeof address === 'string') return address;
        const parts = [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    } catch { /* skip */ }
  }
  
  // Try geo meta tags
  const geoRegion = getMetaContent('geo.region');
  const geoPlacename = getMetaContent('geo.placename');
  if (geoPlacename) return geoPlacename + (geoRegion ? `, ${geoRegion}` : '');
  
  return undefined;
}
