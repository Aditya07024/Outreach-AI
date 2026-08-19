import http from 'http';
import https from 'https';

async function pingUrl(targetUrl: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const client = targetUrl.startsWith('https') ? https : http;
    const req = client.get(targetUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[KeepAlive Ping] Success (${res.statusCode}) from ${targetUrl}:`, data);
          resolve(true);
        } else {
          console.warn(`[KeepAlive Ping] Probe to ${targetUrl} returned HTTP ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`[KeepAlive Ping] Connection error for ${targetUrl}:`, err.message);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function pingServer() {
  const port = process.env.PORT || 5000;
  const baseUrl = process.env.SERVER_URL || process.env.VITE_API_URL || `http://localhost:${port}`;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  const endpoints = [
    `${cleanBase}/health/ping`,
    `${cleanBase}/api/health/ping`,
    `${cleanBase}/health`,
    `${cleanBase}/api/health`,
  ];

  console.log(`[KeepAlive Ping] Starting ping probe at ${new Date().toISOString()}...`);

  for (const endpoint of endpoints) {
    const ok = await pingUrl(endpoint);
    if (ok) {
      return true;
    }
  }

  throw new Error('All keep-alive probe endpoints failed or server is offline.');
}

pingServer()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[KeepAlive Ping] Final Result:', err.message);
    process.exit(1);
  });
