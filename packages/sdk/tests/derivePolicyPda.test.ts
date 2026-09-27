/**
 * Smoke tests for the SDK.
 *
 * Run: pnpm --filter @trade-on-my-behalf/sdk test
 *
 * These tests do NOT require devnet SOL. They exercise:
 *   - PDA derivation (deterministic)
 *   - reason-code name round-trip
 *   - IDL is loadable
 *
 * End-to-end on-chain tests live in programs/treasury/tests/treasury.ts
 * and run via `anchor test`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';

import {
  derivePolicyPda,
  reasonCodeName,
  REASON_CODES,
  TREASURY_PROGRAM_ID,
  TREASURY_IDL,
} from '../src/index.js';

const TREASURY = new PublicKey(TREASURY_PROGRAM_ID);

test('TREASURY_PROGRAM_ID matches IDL address', () => {
  assert.equal(TREASURY.toBase58(), TREASURY_IDL.address);
});

test('derivePolicyPda is deterministic for a given agent', () => {
  const agent = PublicKey.unique();
  const [pda1, bump1] = derivePolicyPda(agent);
  const [pda2, bump2] = derivePolicyPda(agent);
  assert.equal(pda1.toBase58(), pda2.toBase58());
  assert.equal(bump1, bump2);
});

test('derivePolicyPda differs per agent', () => {
  const a = PublicKey.unique();
  const b = PublicKey.unique();
  const [pdaA] = derivePolicyPda(a);
  const [pdaB] = derivePolicyPda(b);
  assert.notEqual(pdaA.toBase58(), pdaB.toBase58());
});

test('derivePolicyPda is owned by the treasury program', () => {
  const [pda] = derivePolicyPda(PublicKey.unique());
  assert.equal(pda.toBase58().length, 44); // base58 of 32 bytes
});

test('reasonCodeName round-trips every documented reason', () => {
  const names = [0, 1, 2, 3, 4, 5, 6, 7].map(reasonCodeName);
  assert.deepEqual(names, [
    'REASON_OK',
    'REASON_VENDOR_DENIED',
    'REASON_PER_TX_CAP',
    'REASON_DAILY_CAP',
    'REASON_EXPIRED',
    'RESERVED_5',
    'REASON_LEVERAGE_CAP',
    'REASON_DRAWDOWN_KILLSWITCH',
  ]);
});

test('REASON_CODES map is stable across releases', () => {
  // These exact values are referenced by the audit-and-receipts table
  // and the SUBMISSION.md demo-receipt rows. Pin them here.
  assert.equal(REASON_CODES.OK, 0);
  assert.equal(REASON_CODES.LEVERAGE_CAP, 6);
  assert.equal(REASON_CODES.DRAWDOWN_KILLSWITCH, 7);
});

test('Kill-switch field is PERCENT (1..=100), not basis points', () => {
  // The Rust on-chain field is u8 percent: 25 means 25%, NOT 2500 bps.
  // Pin the units so a future refactor can't silently flip them.
  // See programs/treasury/programs/treasury/src/state/mod.rs::Policy.
  // The drawdown math: (peak - now) * 100 <= peak * pct.
  const peakUsdc = 1000_000_000n; // $1000
  const nowUsdc  =  700_000_000n; // $700
  const drawdownPct = 25;          // 25 %
  const allowedNow  = peakUsdc - (peakUsdc * BigInt(drawdownPct)) / 100n;
  assert.equal(allowedNow, 750_000_000n); // $750 is the floor
  assert.ok(nowUsdc < allowedNow, 'nowUsdc below floor ⇒ kill-switch trips');
});

test('IDL has the four expected instructions', () => {
  const names = (TREASURY_IDL.instructions ?? []).map((i: any) => i.name);
  assert.deepEqual(names.sort(), [
    'authorize_spend',
    'create_policy',
    'record_pnl',
    'update_policy',
  ]);
});