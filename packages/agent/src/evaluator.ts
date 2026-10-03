import type { PublicKey } from '@solana/web3.js';
import { REASON_CODES, SLOTS_PER_DAY, type PolicyLike, type ReasonCode } from '@trade-on-my-behalf/sdk';

export interface Decision {
  approved: boolean;
  reasonCode: ReasonCode;
}

export interface EvalInput {
  vendor: PublicKey;
  amountUsd: number;
  leverageBps: number;
  equityUsd: number;
  slot: number;
}

const U64_MAX = (1n << 64n) - 1n;
const big = (v: { toString(): string } | number | bigint): bigint => {
  const value = BigInt(v.toString());
  if (value < 0n || value > U64_MAX) throw new Error('Invalid unsigned policy value.');
  return value;
};
export function equityMicros(usd: number): bigint {
  const value = Math.round(usd * 1_000_000);
  if (!Number.isFinite(usd) || usd < 0 || !Number.isSafeInteger(value)) {
    throw new Error('Equity or collateral must be finite, non-negative and precisely representable.');
  }
  return BigInt(value);
}
const saturatingSub = (a: bigint, b: bigint) => a > b ? a - b : 0n;

/**
 * Off-chain mirror of `authorize_spend`. Same check order and the same
 * integer math, so a disagreement with the chain means the mirror or the
 * policy snapshot is stale — the chain's answer always wins.
 */
export function evaluate(policy: PolicyLike, i: EvalInput): Decision {
  if (!Number.isSafeInteger(i.slot) || i.slot < 0
      || !Number.isInteger(i.leverageBps) || i.leverageBps < 0 || i.leverageBps > 65535) {
    throw new Error('Slot and leverage must fit their unsigned integer ranges.');
  }
  const slot = BigInt(i.slot);
  const amount = equityMicros(i.amountUsd);
  const equity = equityMicros(i.equityUsd);

  let daySpent = big(policy.day_spent_usdc);
  if (saturatingSub(slot, big(policy.last_reset_slot)) >= BigInt(SLOTS_PER_DAY)) daySpent = 0n;

  const peak = big(policy.peak_equity_usdc);
  const killPct = BigInt(policy.kill_switch_drawdown_pct);
  if (killPct > 0n && peak > 0n) {
    const thresholdBps = 10_000n - killPct * 100n;
    const threshold = (peak * (thresholdBps < 0n ? 0n : thresholdBps)) / 10_000n;
    if (equity < threshold) return { approved: false, reasonCode: REASON_CODES.DRAWDOWN_KILLSWITCH };
  }

  if (!policy.vendors.some((v) => v.equals(i.vendor))) {
    return { approved: false, reasonCode: REASON_CODES.VENDOR_DENIED };
  }
  if (amount > big(policy.per_tx_cap_usdc)) return { approved: false, reasonCode: REASON_CODES.PER_TX_CAP };
  // Candidate hardened contract denies rather than under-charging overflow.
  if (daySpent + amount > U64_MAX || daySpent + amount > big(policy.per_day_cap_usdc)) return { approved: false, reasonCode: REASON_CODES.DAILY_CAP };
  if (saturatingSub(slot, big(policy.created_at_slot)) > big(policy.ttl_slots)) return { approved: false, reasonCode: REASON_CODES.EXPIRED };
  if (policy.max_leverage_bps !== 0 && i.leverageBps > policy.max_leverage_bps) {
    return { approved: false, reasonCode: REASON_CODES.LEVERAGE_CAP };
  }
  return { approved: true, reasonCode: REASON_CODES.OK };
}
