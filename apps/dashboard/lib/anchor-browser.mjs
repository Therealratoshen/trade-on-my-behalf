/**
 * Webpack alias target for `@coral-xyz/anchor` (wired up in `next.config.mjs`).
 *
 * Why this exists
 * ---------------
 * `@coral-xyz/anchor@0.31.1` binds its Node-only `Wallet` export inside
 * `if (!isBrowser)`, and its `dist/browser` bundle omits `Wallet` entirely.
 * `packages/sdk/src/withTrader.ts` does `import { Wallet } from
 * '@coral-xyz/anchor'`, which resolves fine under Node (the CJS build) but
 * fails the moment a bundler targets a browser: "'Wallet' is not exported
 * from '@coral-xyz/anchor'". That makes the SDK — and therefore anything
 * importing it — unbundleable on the client.
 *
 * The dashboard cannot patch `packages/sdk`, so it points webpack at Anchor's
 * official browser bundle and supplies the one missing binding itself.
 *
 * The binding below is a trap, not an implementation: the only code that would
 * construct it is `withTrader()`, the Node-`Keypair` entry point, which this
 * app never calls. The dashboard signs through Phantom instead (see
 * `lib/trader.ts`). Failing loudly is better than silently bundling a
 * keypair-backed wallet into a webapp.
 */

export * from '@coral-xyz/anchor/dist/browser/index.js';

export class Wallet {
  constructor() {
    throw new Error(
      'Anchor `Wallet` is Node-keypair-only and is not available in the browser. ' +
        'Use the Solana Wallet Adapter (see apps/dashboard/lib/trader.ts).',
    );
  }
}
