/**
 * chrome-extension/build.mjs
 *
 * Build script for the KairoLogic Corrections Assistant Chrome extension.
 * Compiles TypeScript files to JavaScript and copies static assets
 * into a dist/ folder ready to load as an unpacked extension or package for the Chrome Web Store.
 *
 * Usage:
 *   node chrome-extension/build.mjs
 *   — or via npm script —
 *   npm run build:extension
 */

import { build } from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, 'dist');

// Ensure dist directory exists
mkdirSync(DIST, { recursive: true });
mkdirSync(resolve(DIST, 'background'), { recursive: true });
mkdirSync(resolve(DIST, 'content'), { recursive: true });
mkdirSync(resolve(DIST, 'popup'), { recursive: true });
mkdirSync(resolve(DIST, 'images'), { recursive: true });

async function run() {
  console.log('🔨 Building KairoLogic Chrome Extension...\n');

  // 1. Compile TypeScript → JavaScript (3 entry points)
  const sharedBuildOptions = {
    bundle: false, // No bundling — Chrome extension scripts run independently
    platform: 'browser',
    target: 'chrome116', // Manifest V3 minimum
    format: 'esm',
    sourcemap: false,
    minify: false, // Keep readable for Chrome Web Store review
    logLevel: 'info',
  };

  // Background service worker
  await build({
    ...sharedBuildOptions,
    entryPoints: [resolve(__dirname, 'background/service-worker.ts')],
    outfile: resolve(DIST, 'background/service-worker.js'),
    // Service workers can't use ESM imports in MV3 — use iife
    format: 'iife',
  });

  // Content script
  await build({
    ...sharedBuildOptions,
    entryPoints: [resolve(__dirname, 'content/content.ts')],
    outfile: resolve(DIST, 'content/content.js'),
    format: 'iife',
  });

  // Popup script
  await build({
    ...sharedBuildOptions,
    entryPoints: [resolve(__dirname, 'popup/popup.ts')],
    outfile: resolve(DIST, 'popup/popup.js'),
    format: 'iife',
  });

  // 2. Copy static assets
  cpSync(resolve(__dirname, 'manifest.json'), resolve(DIST, 'manifest.json'));
  cpSync(resolve(__dirname, 'popup/popup.html'), resolve(DIST, 'popup/popup.html'));

  // Copy images if they exist
  if (existsSync(resolve(__dirname, 'images'))) {
    cpSync(resolve(__dirname, 'images'), resolve(DIST, 'images'), { recursive: true });
  }

  console.log('\n✅ Extension built successfully → chrome-extension/dist/');
  console.log(
    '   Load it in Chrome: chrome://extensions → "Load unpacked" → select the dist/ folder',
  );
}

run().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
