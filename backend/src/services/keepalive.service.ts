import prisma from '../utils/prisma';
import http from 'http';
import https from 'https';

export class KeepAliveService {
  private static timerId: NodeJS.Timeout | null = null;
  private static PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

  /**
   * Start the internal keep-alive cron service.
   */
  static start(): void {
    if (this.timerId) return;

    // Run immediate keep-alive ping on startup
    this.pingDatabase().catch(() => {});

    // Set recurring timer
    this.timerId = setInterval(() => {
      this.tick().catch((err) => {
        console.error('[KeepAliveService] Error during keep-alive tick:', err);
      });
    }, this.PING_INTERVAL_MS);

    console.log('[KeepAliveService] Internal keep-alive cron engine started (Interval: 4 min).');
  }

  /**
   * Stop the internal keep-alive service.
   */
  static stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('[KeepAliveService] Internal keep-alive service stopped.');
    }
  }

  /**
   * Execute one keep-alive tick (DB ping + optional HTTP self ping).
   */
  private static async tick(): Promise<void> {
    await this.pingDatabase();
    await this.pingHttpEndpoint();
  }

  /**
   * Ping database to keep PostgreSQL compute and Prisma connection pool warm.
   */
  private static async pingDatabase(): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      console.warn('[KeepAliveService] Database keep-alive ping failed, re-trying connection:', err?.message || String(err));
      try {
        await prisma.$connect();
      } catch (reconnectErr) {
        console.error('[KeepAliveService] Database reconnection attempt failed:', reconnectErr);
      }
    }
  }

  /**
   * Ping external server URL if set in environment variables to prevent host sleep.
   */
  private static async pingHttpEndpoint(): Promise<void> {
    const targetUrl = process.env.SERVER_URL || process.env.KEEP_ALIVE_URL;
    if (!targetUrl) return;

    try {
      const pingUrl = targetUrl.endsWith('/') ? `${targetUrl}health/ping` : `${targetUrl}/health/ping`;
      const client = pingUrl.startsWith('https') ? https : http;
      
      client.get(pingUrl, (res) => {
        res.resume(); // Consume response data to free memory
      }).on('error', (err) => {
        console.warn(`[KeepAliveService] Self-ping to ${pingUrl} failed:`, err.message);
      });
    } catch (err: any) {
      console.warn('[KeepAliveService] HTTP self-ping error:', err?.message || String(err));
    }
  }
}
