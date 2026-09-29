/**
 * `Buffer` polyfill.
 *
 * MUST be the first import in any client entry point that pulls in
 * `@solana/web3.js` / `@coral-xyz/anchor` — ES module evaluation order means
 * this module body runs before the wallet-adapter graph is initialised.
 */
import { Buffer } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}
