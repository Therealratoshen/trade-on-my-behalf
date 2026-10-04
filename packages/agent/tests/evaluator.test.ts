import { test } from 'node:test';
import assert from 'node:assert/strict';
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import { REASON_CODES, SLOTS_PER_DAY, type PolicyLike } from '@trade-on-my-behalf/sdk';

import { evaluate } from '../src/evaluator.js';

const VENDOR = PublicKey.unique();

function policy(over: Partial<PolicyLike> = {}): PolicyLike {
  return {
    owner: PublicKey.unique(),
    agent: PublicKey.unique(),
    vendors: [VENDOR],
    per_tx_cap_usdc: new BN(50_000_000),
    per_day_cap_usdc: new BN(150_000_000),
    day_spent_usdc: new BN(0),
    ttl_slots: new BN(1_000_000),
    created_at_slot: new BN(1_000),
    last_reset_slot: new BN(1_000),
    max_leverage_bps: 500,
    peak_equity_usdc: new BN(0),
    kill_switch_drawdown_pct: 25,
    bump: 255,
    ...over,
  };
}

const base = { vendor: VENDOR, amountUsd: 40, leverageBps: 300, equityUsd: 1000, slot: 2_000 };

test('approves an in-policy intent', () => {
  assert.deepEqual(evaluate(policy(), base), { approved: true, reasonCode: REASON_CODES.OK });
});

test('denies each rule with the on-chain reason code', () => {
  assert.equal(evaluate(policy(), { ...base, vendor: PublicKey.unique() }).reasonCode, REASON_CODES.VENDOR_DENIED);
  assert.equal(evaluate(policy(), { ...base, amountUsd: 50.000001 }).reasonCode, REASON_CODES.PER_TX_CAP);
  assert.equal(evaluate(policy({ day_spent_usdc: new BN(120_000_000) }), base).reasonCode, REASON_CODES.DAILY_CAP);
  assert.equal(evaluate(policy(), { ...base, slot: 1_000 + 1_000_001 }).reasonCode, REASON_CODES.EXPIRED);
  assert.equal(evaluate(policy(), { ...base, leverageBps: 501 }).reasonCode, REASON_CODES.LEVERAGE_CAP);
});

test('allows leverage exactly at the configured cap and denies leverage above it', () => {
  const cappedPolicy = policy({ max_leverage_bps: 300 });
  assert.deepEqual(
    evaluate(cappedPolicy, { ...base, leverageBps: 300 }),
    { approved: true, reasonCode: REASON_CODES.OK },
  );
  assert.deepEqual(
    evaluate(cappedPolicy, { ...base, leverageBps: 301 }),
    { approved: false, reasonCode: REASON_CODES.LEVERAGE_CAP },
  );
});

test('amount exactly at the per-trade cap is allowed', () => {
  assert.equal(evaluate(policy(), { ...base, amountUsd: 50 }).approved, true);
});

test('kill-switch is checked before every other rule', () => {
  const p = policy({ peak_equity_usdc: new BN(1_000_000_000) });
  // 740 < 750 floor, and the vendor is also wrong: kill-switch must win.
  const d = evaluate(p, { ...base, equityUsd: 740, vendor: PublicKey.unique() });
  assert.equal(d.reasonCode, REASON_CODES.DRAWDOWN_KILLSWITCH);
  assert.equal(evaluate(p, { ...base, equityUsd: 750 }).approved, true);
});

test('kill-switch is disarmed until a peak is recorded, and when pct = 0', () => {
  assert.equal(evaluate(policy(), { ...base, equityUsd: 1 }).approved, true);
  const p = policy({ peak_equity_usdc: new BN(1_000_000_000), kill_switch_drawdown_pct: 0 });
  assert.equal(evaluate(p, { ...base, equityUsd: 1 }).approved, true);
});

test('daily counter resets after SLOTS_PER_DAY, like the program', () => {
  const p = policy({ day_spent_usdc: new BN(150_000_000) });
  assert.equal(evaluate(p, { ...base, slot: 1_000 + SLOTS_PER_DAY - 1 }).reasonCode, REASON_CODES.DAILY_CAP);
  assert.equal(evaluate(p, { ...base, slot: 1_000 + SLOTS_PER_DAY }).approved, true);
});

test('max_leverage_bps = 0 means no leverage cap', () => {
  assert.equal(evaluate(policy({ max_leverage_bps: 0 }), { ...base, leverageBps: 10_000 }).approved, true);
  // D9: uncapped stays uncapped — no hidden ceiling is introduced at the top
  // of the range. Mirrors the on-chain decision in authorize_spend.rs.
  assert.equal(evaluate(policy({ max_leverage_bps: 0 }), { ...base, leverageBps: 65_535 }).approved, true);
});

// ---------- D9: request well-formedness (mirror of the on-chain Err! guards) ----------

test('sub-1x leverage is not approved', () => {
  assert.equal(evaluate(policy(), { ...base, leverageBps: 0 }).approved, false);
  assert.equal(evaluate(policy(), { ...base, leverageBps: 99 }).approved, false);
  // The 1x floor itself is fine.
  assert.equal(evaluate(policy(), { ...base, leverageBps: 100 }).approved, true);
});

test('a zero-amount request is not approved', () => {
  assert.equal(evaluate(policy(), { ...base, amountUsd: 0 }).approved, false);
  // Even on an uncapped policy and a valid vendor — the amount guard runs first.
  assert.equal(evaluate(policy({ max_leverage_bps: 0 }), { ...base, amountUsd: 0 }).approved, false);
});

test('a malformed request is not a policy denial', () => {
  // On-chain these throw, so no AuditEvent and no reason code is consumed.
  // The mirror cannot throw, so it reports reasonCode OK with approved:false
  // rather than borrowing a policy reason code it did not earn.
  assert.deepEqual(evaluate(policy(), { ...base, leverageBps: 0 }), { approved: false, reasonCode: REASON_CODES.OK });
  assert.deepEqual(evaluate(policy(), { ...base, amountUsd: 0 }), { approved: false, reasonCode: REASON_CODES.OK });
});

test('the well-formedness guards run before the policy ladder', () => {
  // Vendor is wrong AND leverage is sub-1x. The chain would throw before
  // ever reading the vendor list, so the mirror must not answer VENDOR_DENIED.
  const d = evaluate(policy(), { ...base, leverageBps: 0, vendor: PublicKey.unique() });
  assert.equal(d.approved, false);
  assert.notEqual(d.reasonCode, REASON_CODES.VENDOR_DENIED);
});
