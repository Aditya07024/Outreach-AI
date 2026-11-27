import dotenv from 'dotenv';
const envResult = dotenv.config();

/**
 * Clerk Configuration Resolver
 * Automatically resolves test vs live keys based on NODE in .env or NODE_ENV:
 * - NODE=development (or default): uses TEST keys
 * - NODE=prod / production: uses LIVE keys
 */
export function getClerkKeys() {
  const cliNodeEnv = (process.env.NODE_ENV || process.env.APP_ENV || '').toLowerCase().trim();
  const parsedNode = (envResult.parsed?.NODE || envResult.parsed?.NODE_ENV || '').toLowerCase().trim();

  // If CLI passed NODE_ENV, use it. Otherwise use NODE from .env
  const envVal = cliNodeEnv || parsedNode || 'development';

  const isProd = envVal === 'prod' || envVal === 'production';
  const mode = isProd ? 'production' : 'development';

  const publishableKey = isProd
    ? (process.env.CLERK_PUBLISHABLE_KEY_LIVE || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_LIVE || process.env.CLERK_PUBLISHABLE_KEY || '')
    : (process.env.CLERK_PUBLISHABLE_KEY_TEST || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_TEST || process.env.CLERK_PUBLISHABLE_KEY || '');

  const secretKey = isProd
    ? (process.env.CLERK_SECRET_KEY_LIVE || process.env.CLERK_SECRET_KEY || '')
    : (process.env.CLERK_SECRET_KEY_TEST || process.env.CLERK_SECRET_KEY || '');

  return { isProd, mode, publishableKey, secretKey };
}
