import { google } from 'googleapis';
import { encrypt, decrypt } from '../utils/encryption';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export class GmailService {
  private static oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  /**
   * Get OAuth authorization URL, encoding userId or action in the state query parameter
   */
  static getAuthUrl(userId: number | string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // crucial to get refresh token
      prompt: 'consent',      // force consent screen to guarantee refresh token
      state: String(userId),  // pass user ID or action state parameter
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
  }

  /**
   * Complete Google Sign-In and save credentials under the user's ID
   */
  static async handleCallback(code: string, userId: number): Promise<string> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Fetch the user's email address
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email;

      if (!email) {
        throw new Error('Could not retrieve email from Google OAuth profile');
      }

      const encryptedAccessToken = encrypt(tokens.access_token || '');
      const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

      // Update or create Gmail credentials for this specific user
      await prisma.gmailCredentials.upsert({
        where: { id: userId },
        update: {
          email,
          accessToken: encryptedAccessToken,
          ...(encryptedRefreshToken ? { refreshToken: encryptedRefreshToken } : {}),
          expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
          tokenType: tokens.token_type,
          scope: tokens.scope,
        },
        create: {
          id: userId,
          email,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
          tokenType: tokens.token_type,
          scope: tokens.scope,
        },
      });

      await logger.info('OAUTH', `Connected Gmail account for user ${userId}: ${email}`);
      return email;
    } catch (error: any) {
      await logger.error('OAUTH', `Failed to handle Google OAuth callback for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Exchange OAuth authorization code for user email and tokens (for sign-in authentication)
   */
  static async getEmailFromCode(code: string): Promise<{ email: string; tokens: any }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email;
      if (!email) {
        throw new Error('Could not retrieve email from Google OAuth profile');
      }
      return { email, tokens };
    } catch (error: any) {
      await logger.error('OAUTH', 'Failed to retrieve email from code', error);
      throw error;
    }
  }

  /**
   * Disconnect Gmail connection for a user
   */
  static async disconnect(userId: number): Promise<void> {
    try {
      await prisma.gmailCredentials.delete({
        where: { id: userId }
      });
      await logger.info('OAUTH', `Disconnected Gmail account for user ${userId}`);
    } catch (error: any) {
      await logger.error('OAUTH', `Failed to disconnect Gmail credentials for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get connection status details for a user
   */
  static async getConnectionStatus(userId: number): Promise<{ connected: boolean; email?: string }> {
    const creds = await prisma.gmailCredentials.findUnique({ where: { id: userId } });
    if (!creds) {
      return { connected: false };
    }
    return { connected: true, email: creds.email };
  }

  /**
   * Get an authorized Gmail client instance, refreshing tokens if expired
   */
  static async getClient(userId: number): Promise<any> {
    const dbCreds = await prisma.gmailCredentials.findUnique({ where: { id: userId } });
    if (!dbCreds) {
      throw new Error('Gmail account not connected. Please authenticate via settings first.');
    }

    const accessToken = decrypt(dbCreds.accessToken);
    const refreshToken = dbCreds.refreshToken ? decrypt(dbCreds.refreshToken) : undefined;
    const expiryDate = dbCreds.expiryDate ? Number(dbCreds.expiryDate) : undefined;

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate,
      token_type: dbCreds.tokenType || undefined,
      scope: dbCreds.scope || undefined,
    });

    // Check if access token is expired or close to expiry (within 5 minutes)
    const isExpired = expiryDate ? expiryDate - Date.now() < 5 * 60 * 1000 : true;

    if (isExpired && refreshToken) {
      try {
        await logger.info('OAUTH', `Gmail access token expired for user ${userId}. Refreshing token...`);
        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials);

        // Update DB with new tokens
        await prisma.gmailCredentials.update({
          where: { id: userId },
          data: {
            accessToken: encrypt(credentials.access_token || ''),
            expiryDate: credentials.expiry_date ? BigInt(credentials.expiry_date) : null,
          },
        });
      } catch (err: any) {
        await logger.error('OAUTH', `Failed to refresh Gmail access token for user ${userId}`, err);
        throw new Error('Gmail session has expired. Please disconnect and reconnect Gmail.');
      }
    } else if (isExpired && !refreshToken) {
      throw new Error('Gmail session has expired and no refresh token is available. Please reconnect Gmail.');
    }

    return google.gmail({ version: 'v1', auth: client });
  }

  /**
   * Send an email with optional PDF resume attachment (Base64 encoded)
   */
  static async sendEmail(
    userId: number,
    to: string,
    subject: string,
    body: string,
    attachmentBase64?: string,
    attachmentName?: string
  ): Promise<string> {
    try {
      const gmail = await this.getClient(userId);
      const rawMime = this.buildMimeMessage(to, subject, body, attachmentBase64, attachmentName);
      
      // Base64URL encode the MIME message
      const encodedRaw = Buffer.from(rawMime)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedRaw,
        },
      });

      return response.data.id;
    } catch (error: any) {
      await logger.error('EMAIL_SENDING', `Failed to send email to ${to} for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Helper to build a standard RFC 2822 multipart mixed email string
   */
  private static buildMimeMessage(
    to: string,
    subject: string,
    body: string,
    attachmentBase64?: string,
    attachmentName?: string
  ): string {
    const boundary = `__boundary_${Date.now().toString(16)}__`;
    
    // Format subject to support Unicode safely in mail clients
    const formattedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    const headers = [
      `To: ${to}`,
      `Subject: ${formattedSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
    ];

    const bodyParts = [
      `--${boundary}`,
      'Content-Type: text/html; charset="utf-8"',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      // Clean HTML conversion of newlines to linebreaks
      body.replace(/\n/g, '<br />'),
      '',
    ];

    const attachmentParts: string[] = [];

    if (attachmentBase64) {
      try {
        const filename = attachmentName || 'resume.pdf';

        attachmentParts.push(
          `--${boundary}`,
          `Content-Type: application/pdf; name="${filename}"`,
          `Content-Disposition: attachment; filename="${filename}"`,
          'Content-Transfer-Encoding: base64',
          '',
          attachmentBase64.match(/.{1,76}/g)?.join('\r\n') || attachmentBase64,
          ''
        );
      } catch (err) {
        console.error('Failed to attach PDF to mime message:', err);
      }
    }

    const message = [
      ...headers,
      ...bodyParts,
      ...attachmentParts,
      `--${boundary}--`,
    ].join('\r\n');

    return message;
  }
}
