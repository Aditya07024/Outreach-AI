/**
 * Email & Domain Exclusion Utility
 * 
 * Determines whether a contact email should be excluded/suppressed based on:
 * - Domain endings / suffixes: e.g. ".sparixglobal.com", "@domain.com", "sparixglobal.com"
 * - Exact email addresses: e.g. "ceo@company.com", "aditya.sparixglobal.com"
 * 
 * Supports comma, newline, and semicolon separated inputs.
 */

export function parseExcludedPatterns(patternsInput: string | string[] | null | undefined): string[] {
  if (!patternsInput) return [];
  if (Array.isArray(patternsInput)) {
    return patternsInput.map(p => p.trim().toLowerCase()).filter(Boolean);
  }
  return patternsInput
    .split(/[\n,;]+/)
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailExcluded(email: string, patternsInput: string | string[] | null | undefined): boolean {
  if (!email || !patternsInput) return false;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;

  const patterns = parseExcludedPatterns(patternsInput);
  if (patterns.length === 0) return false;

  // Extract domain part if '@' is present
  const atIndex = normalizedEmail.lastIndexOf('@');
  const emailDomain = atIndex !== -1 ? normalizedEmail.substring(atIndex + 1) : '';

  for (const rawPattern of patterns) {
    const pattern = rawPattern.trim().toLowerCase();
    if (!pattern) continue;

    // 1. Exact match (handles exact emails and strings without '@' like "aditya.sparixglobal.com")
    if (normalizedEmail === pattern) return true;

    // 2. Pattern starts with '@' (e.g., "@sparixglobal.com")
    if (pattern.startsWith('@')) {
      const targetDomain = pattern.substring(1);
      if (normalizedEmail.endsWith(pattern)) return true;
      if (emailDomain === targetDomain || emailDomain.endsWith('.' + targetDomain)) return true;
      continue;
    }

    // 3. Pattern starts with '.' (e.g., ".sparixglobal.com")
    if (pattern.startsWith('.')) {
      // Direct string suffix (e.g., "aditya.sparixglobal.com" ends with ".sparixglobal.com")
      if (normalizedEmail.endsWith(pattern)) return true;
      // Email domain match (e.g., "user@sparixglobal.com" or "user@sub.sparixglobal.com")
      const targetDomain = pattern.substring(1);
      if (normalizedEmail.endsWith('@' + targetDomain)) return true;
      if (emailDomain === targetDomain || emailDomain.endsWith('.' + targetDomain)) return true;
      continue;
    }

    // 4. Pattern is a domain or substring (e.g., "sparixglobal.com")
    if (!pattern.includes('@')) {
      // Matches "user@sparixglobal.com"
      if (normalizedEmail.endsWith('@' + pattern)) return true;
      // Matches "aditya.sparixglobal.com"
      if (normalizedEmail.endsWith('.' + pattern)) return true;
      // Domain equals or is subdomain
      if (emailDomain === pattern || emailDomain.endsWith('.' + pattern)) return true;
    }
  }

  return false;
}
