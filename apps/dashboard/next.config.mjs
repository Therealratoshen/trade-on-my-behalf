import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

/**
 * `@coral-xyz/anchor@0.31.1` exports its Node-only `Wallet` class from inside
 * `if (!isBrowser)`, and its `dist/browser` bundle drops the binding entirely.
 * `packages/sdk/src/withTrader.ts` imports it by name, so any browser bundle
 * that reaches the SDK fails to resolve the module.
 *
 * The dashboard does not own `packages/sdk`, so instead of patching the SDK it
 * points webpack at Anchor's browser bundle and supplies the one missing name
 * from a local shim. See `lib/anchor-browser.mjs`.
 */
const ANCHOR_BROWSER = require.resolve('@coral-xyz/anchor/dist/browser/index.js');
const ANCHOR_SHIM = join(here, 'lib', 'anchor-browser.mjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // This app lives inside a pnpm workspace; keep tracing scoped to the repo
  // instead of the nearest parent directory that happens to hold a lockfile.
  outputFileTracingRoot: join(here, '..', '..'),

  // Builds and boots with no network and no validator. Every chain read happens
  // at runtime in the browser (or in a `force-dynamic` route handler).
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      // `$` = exact match, so `@coral-xyz/anchor/dist/...` is untouched.
      '@coral-xyz/anchor$': ANCHOR_SHIM,
    };

    // `@solana/web3.js` reaches for these Node builtins on some code paths.
    // They are not needed in a browser bundle.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
};

export default nextConfig;
