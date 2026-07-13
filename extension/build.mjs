/**
 * Chrome Extension Build Script
 * 
 * Builds all three parts of the extension:
 * 1. Popup (React app via Vite)
 * 2. Background service worker (TypeScript → IIFE via esbuild)
 * 3. Content script (TypeScript → IIFE via esbuild)
 * 
 * Run: node build.mjs
 */

import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, 'dist');

console.log('🔨 Building Outreach AI Chrome Extension...\n');

// Step 1: Build popup via Vite
console.log('📦 [1/4] Building popup (React)...');
execSync('npx vite build', { cwd: __dirname, stdio: 'inherit' });

// Step 2: Build background service worker
console.log('\n📦 [2/4] Building background service worker...');
execSync(
  `npx esbuild src/background/service-worker.ts --bundle --format=esm --target=esnext --outfile=dist/background.js`,
  { cwd: __dirname, stdio: 'inherit' }
);

// Step 3: Build content script  
console.log('\n📦 [3/4] Building content script...');
execSync(
  `npx esbuild src/content/content-script.ts --bundle --format=iife --target=esnext --outfile=dist/content.js`,
  { cwd: __dirname, stdio: 'inherit' }
);

// Step 4: Copy manifest and icons
console.log('\n📦 [4/4] Copying manifest and icons...');
const publicDir = resolve(__dirname, 'public');

if (existsSync(resolve(publicDir, 'manifest.json'))) {
  cpSync(resolve(publicDir, 'manifest.json'), resolve(distDir, 'manifest.json'));
}

const iconsDir = resolve(publicDir, 'icons');
const distIconsDir = resolve(distDir, 'icons');
if (existsSync(iconsDir)) {
  if (!existsSync(distIconsDir)) mkdirSync(distIconsDir, { recursive: true });
  cpSync(iconsDir, distIconsDir, { recursive: true });
}

console.log('\n✅ Extension built successfully!');
console.log(`📂 Output: ${distDir}`);
console.log('\n📋 To load in Chrome:');
console.log('   1. Open chrome://extensions');
console.log('   2. Enable "Developer mode"');
console.log('   3. Click "Load unpacked"');
console.log(`   4. Select: ${distDir}`);
