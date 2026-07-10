import OpenAI from 'openai';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

interface EmailGenerationResult {
  subject: string;
  body: string;
}

export class AIService {
  private static getOpenAIClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.xai.com/v1',
    });
  }

  /**
   * Generates a personalized email for a contact based on global settings
   */
  static async generateEmail(contactId: number): Promise<EmailGenerationResult> {
    try {
      // 1. Load Contact and Settings
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
      if (!contact) {
        throw new Error(`Contact with ID ${contactId} not found`);
      }

      const settings = await prisma.settings.findUnique({
        where: { id: 1 },
      });
      if (!settings) {
        throw new Error('Default system settings not found');
      }

      // Check if Grok API key is configured
      const apiKey = process.env.GROK_API_KEY || '';
      if (!apiKey || apiKey.includes('your_grok_api_key') || apiKey === 'xai-your-grok-api-key-here') {
        await logger.warn(
          'EMAIL_GENERATION',
          `Grok API key is not configured. Generating template email for contact: ${contact.email}`
        );
        return this.generateFallbackTemplate(contact, settings);
      }

      // 2. Build the AI Context and Prompt
      const openai = this.getOpenAIClient(apiKey);

      const systemPrompt = `You are a professional assistant generating highly personalized cold emails for job outreach.
Your task is to write a compelling, custom email to a hiring contact and output it strictly in JSON format.

Your output must be a valid JSON object matching this structure:
{
  "subject": "Unique, eye-catching subject line",
  "body": "Natural, human-like email body"
}

Writing Guidelines:
- Style: Professional, confident, and warm. Avoid corporate cliches like "I hope this email finds you well" or robotic openings. Write as a real software engineer.
- Word count: The email body must be between 120 and 180 words.
- Variation: Create different phrasing and sentence structures each time. Never reuse exact templates.
- Relevance: Mention the company and role if available. Explain why their engineering team is a great fit.
- Integration: Weave in details from the Candidate Profile naturally.

Candidate Profile:
- Name: ${settings.name}
- Phone: ${settings.phone}
- Portfolio: ${settings.portfolio}
- GitHub: ${settings.github}
- LinkedIn: ${settings.linkedin}
- Preferred Role: ${settings.preferredRole}
- Location: ${settings.location}

Writing Prompt Instructions:
${settings.customPrompt}`;

      const userPrompt = `Generate a cold email to the following contact:
- First Name: ${contact.firstName || 'Recruiter'}
- Last Name: ${contact.lastName || ''}
- Company: ${contact.company || 'the company'}
- Title/Role: ${contact.title || contact.role || 'Hiring Manager'}
- Active Email: ${contact.email}
- LinkedIn Profile: ${contact.linkedin || 'Not provided'}
- Country: ${contact.country || 'Not specified'}

If only the email address is available, write a professional, high-converting, semi-generic cold email asking about software engineering opportunities.`;

      await logger.info('EMAIL_GENERATION', `Calling Grok for contact: ${contact.email}`);

      const model = process.env.GROK_MODEL || 'grok-2-1212';
      const response = await openai.chat.completions.create({
        model: model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Grok returned an empty response');
      }

      const parsed: EmailGenerationResult = JSON.parse(content);
      if (!parsed.subject || !parsed.body) {
        throw new Error('Grok JSON response missing subject or body fields');
      }

      await logger.info('EMAIL_GENERATION', `Successfully generated email via Grok for: ${contact.email}`);
      return {
        subject: parsed.subject.trim(),
        body: parsed.body.trim(),
      };
    } catch (error: any) {
      await logger.warn(
        'EMAIL_GENERATION',
        `Grok generation failed for contact ID ${contactId} (${error.message || error}). Falling back to template cover letter.`
      );
      
      try {
        const contact = await prisma.contact.findUnique({ where: { id: contactId } });
        const settings = await prisma.settings.findUnique({ where: { id: 1 } });
        if (contact && settings) {
          return this.generateFallbackTemplate(contact, settings);
        }
      } catch (innerErr) {
        console.error('Failed to generate fallback after Grok failure', innerErr);
      }
      
      throw error;
    }
  }

  /**
   * Local fallback template generation if Grok is not set up
   */
  private static generateFallbackTemplate(contact: any, settings: any): EmailGenerationResult {
    const candidateName = settings.name || 'Candidate';
    const companyName = contact.company || 'your team';
    const roleName = contact.role || settings.preferredRole || 'Software Engineer';
    const contactName = contact.firstName || 'Hiring Team';

    const subject = `Opportunities at ${companyName} - ${roleName} Application`;
    
    let body = `Hi ${contactName},\n\n`;
    body += `I've been following ${companyName}'s work and am highly impressed by your engineering culture. I am reaching out to express interest in software development opportunities, specifically as a ${roleName}.\n\n`;
    body += `I bring strong experience in web technologies and software engineering. I love building performant products and working with modern stacks. You can find examples of my projects on my GitHub (${settings.github || 'GitHub'}) and view my portfolio at ${settings.portfolio || 'my portfolio'}.\n\n`;
    body += `I have attached my resume for your review. I would love to connect for a short chat to discuss how my background aligns with your engineering goals. Thank you for your time.\n\n`;
    body += `Best regards,\n`;
    body += `${candidateName}\n`;
    if (settings.phone) body += `Phone: ${settings.phone}\n`;
    if (settings.linkedin) body += `LinkedIn: ${settings.linkedin}`;

    return {
      subject,
      body,
    };
  }
}
