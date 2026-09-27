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

const big = (v: { toString(): string } | number | bigint): bigint => BigInt(v.toString());
const toMicro = (usd: number): bigint => BigInt(Math.round(usd * 1_000_000));

/**
 * Off-chain mirror of `authorize_spend`. Same check order and the same
 * integer math, so a disagreement with the chain means the mirror or the
 * policy snapshot is stale — the chain's answer always wins.
 */
export function evaluate(policy: PolicyLike, i: EvalInput): Decision {
  const slot = BigInt(i.slot);
  const amount = toMicro(i.amountUsd);
  const equity = toMicro(i.equityUsd);

  let daySpent = big(policy.day_spent_usdc);
  if (slot - big(policy.last_reset_slot) >= BigInt(SLOTS_PER_DAY)) daySpent = 0n;

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
  if (daySpent + amount > big(policy.per_day_cap_usdc)) return { approved: false, reasonCode: REASON_CODES.DAILY_CAP };
  if (slot - big(policy.created_at_slot) > big(policy.ttl_slots)) return { approved: false, reasonCode: REASON_CODES.EXPIRED };
  if (policy.max_leverage_bps !== 0 && i.leverageBps > policy.max_leverage_bps) {
    return { approved: false, reasonCode: REASON_CODES.LEVERAGE_CAP };
  }
  return { approved: true, reasonCode: REASON_CODES.OK };
}
