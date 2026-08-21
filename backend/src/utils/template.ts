/**
 * Template Helper Utility
 * Replaces placeholders in email templates with contact and user setting values.
 */

export function replacePlaceholders(text: string | null, contact: any, settings: any): string {
  if (!text) return '';
  let result = text;
  
  // Recruiter fields
  result = result.replace(/{firstName}/g, contact.firstName || 'Recruiter');
  result = result.replace(/{lastName}/g, contact.lastName || '');
  result = result.replace(/{company}/g, contact.company || 'your company');
  result = result.replace(/{role}/g, contact.role || contact.title || 'Software Engineer');
  result = result.replace(/{title}/g, contact.title || contact.role || 'Hiring Manager');
  result = result.replace(/{email}/g, contact.email || '');
  
  // Settings/Candidate fields
  result = result.replace(/{name}/g, settings.name || '');
  result = result.replace(/{phone}/g, settings.phone || '');
  result = result.replace(/{portfolio}/g, settings.portfolio || '');
  result = result.replace(/{github}/g, settings.github || '');
  result = result.replace(/{linkedin}/g, settings.linkedin || '');
  result = result.replace(/{preferredRole}/g, settings.preferredRole || '');
  result = result.replace(/{location}/g, settings.location || '');
  
  return result;
}
