import prisma from './prisma';

export type LogSource = 'CSV_IMPORT' | 'EMAIL_GENERATION' | 'EMAIL_SENDING' | 'OAUTH' | 'API' | 'EXTENSION_SYNC';

export async function logMessage(
  level: 'INFO' | 'WARN' | 'ERROR',
  source: LogSource,
  message: string,
  details?: any,
  userId?: number
) {
  const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details, null, 2)) : null;

  // Print to console for server logs
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] [${source}] ${message}`);
  if (detailsStr) {
    console.log(`Details: ${detailsStr}`);
  }

  try {
    // Save to PostgreSQL db asynchronously
    await prisma.log.create({
      data: {
        level,
        source,
        message,
        details: detailsStr,
        userId: userId || null,
      },
    });
  } catch (err) {
    console.error('Failed to save log to database:', err);
  }
}

export const logger = {
  info: (source: LogSource, message: string, details?: any, userId?: number) => logMessage('INFO', source, message, details, userId),
  warn: (source: LogSource, message: string, details?: any, userId?: number) => logMessage('WARN', source, message, details, userId),
  error: (source: LogSource, message: string, details?: any, userId?: number) => logMessage('ERROR', source, message, details, userId),
};
