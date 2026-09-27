/**
 * TypeScript types mirroring the Anchor `treasury` IDL.
 *
 * Source of truth: programs/treasury/programs/treasury/src/{state,instructions}/.
 * These types are the SDK's promise that the JS shape stays in lockstep
 * with the on-chain shape. If you change the Rust, change this file in
 * the same commit.
 */

import type { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// ============================================================================
// Reason codes (mirror src/state/mod.rs)
// ============================================================================

/** All reason codes emitted by `authorize_spend`. */
export const REASON_CODES = {
  OK: 0,
  VENDOR_DENIED: 1,
  PER_TX_CAP: 2,
  DAILY_CAP: 3,
  EXPIRED: 4,
  /** Reserved 5 — used by early devnet builds; not present in v1 ship. */
  RESERVED_5: 5,
  LEVERAGE_CAP: 6,
  DRAWDOWN_KILLSWITCH: 7,
} as const;

export type ReasonCode = (typeof REASON_CODES)[keyof typeof REASON_CODES];

export function reasonCodeName(c: number): string {
  switch (c) {
    case 0: return 'REASON_OK';
    case 1: return 'REASON_VENDOR_DENIED';
    case 2: return 'REASON_PER_TX_CAP';
    case 3: return 'REASON_DAILY_CAP';
    case 4: return 'REASON_EXPIRED';
    case 5: return 'RESERVED_5';
    case 6: return 'REASON_LEVERAGE_CAP';
    case 7: return 'REASON_DRAWDOWN_KILLSWITCH';
    default: return `UNKNOWN_${c}`;
  }
}

// ============================================================================
// Policy shape (mirror src/state/mod.rs::Policy)
// ============================================================================

/**
 * The on-chain `Policy` PDA, decoded.
 *
 * Source: programs/treasury/programs/treasury/src/state/mod.rs.
 */
export interface Policy {
  /** Wallet that funded the policy; signs every subsequent update. */
  owner: PublicKey;
  /** Wallet the policy applies to (used as the PDA seed). */
  agent: PublicKey;
  /** Whitelisted vendor pubkeys. Max 16 (enforced in `create_policy`). */
  vendors: PublicKey[];
  /** Per-transaction cap in USDC micro-units (1e6 = $1). */
  perTxCapUsdc: BN;
  /** Per-day loss cap in USDC micro-units (1e6 = $1). */
  perDayCapUsdc: BN;
  /** Policy TTL in slots (~0.4 s/slot). */
  ttlSlots: BN;
  /** Maximum leverage in basis points (10_000 = 100x). D7+. */
  maxLeverageBps: number;
  /** Drawdown kill-switch threshold (PERCENT, 1..=100). D8+. 0 = disabled. */
  killSwitchDrawdownPct: number;
  /** Highest observed equity in USDC micro-units; monotonic. D8+. */
  peakEquityUsdc: BN;
  /** Spent USDC micro-units in the current window (resets SLOTS_PER_DAY after lastResetSlot). */
  daySpentUsdc: BN;
  /** Slot the policy was created at. */
  createdAtSlot: BN;
  /** Slot of last daily-cap reset. */
  lastResetSlot: BN;
  /** Bump seed for the PDA. */
  bump: number;
}

/** Friendly Rust-style snake_case mirror, used internally. */
export interface PolicyLike {
  owner: PublicKey;
  agent: PublicKey;
  vendors: PublicKey[];
  per_tx_cap_usdc: BN | number | bigint;
  per_day_cap_usdc: BN | number | bigint;
  day_spent_usdc: BN | number | bigint;
  ttl_slots: BN | number | bigint;
  created_at_slot: BN | number | bigint;
  last_reset_slot: BN | number | bigint;
  max_leverage_bps: number;
  peak_equity_usdc: BN | number | bigint;
  /** Percent (1..=100). 0 = disabled. */
  kill_switch_drawdown_pct: number;
  bump: number;
}

// ============================================================================
// Audit event (mirror src/instructions/authorize_spend.rs)
// ============================================================================

/**
 * The `AuditEvent` emitted by `authorize_spend` (every call, approve or
 * deny), `update_policy` and `record_pnl` (vendor = system program).
 * Decoded from the transaction's `Program data:` log lines.
 */
export interface AuditEvent {
  /** Policy PDA the event belongs to. */
  policy: PublicKey;
  /** Agent the policy applies to. */
  agent: PublicKey;
  /** Vendor the runtime asked about. */
  vendor: PublicKey;
  /** Spend amount in USDC micro-units. */
  amountUsdc: BN;
  approved: boolean;
  reasonCode: ReasonCode;
  /** Caller-supplied nonce for `authorize_spend`; the slot for admin events. Not checked on-chain in v1. */
  nonce: BN;
  /** On-chain `at_slot`. */
  slot: number;
  /** Signature of the enclosing transaction. */
  signature: string;
  /** Wall-clock timestamp the SDK first observed the event. */
  observedAt: number;
}

// ============================================================================
// Inputs (mirror SDK-facing ergonomics — JS camelCase)
// ============================================================================

/** Inputs to `createPolicy`. All amounts are human-units; SDK converts to micro. */
export interface CreatePolicyInput {
  /** Agent wallet the policy applies to. PDA seed. */
  agent: PublicKey;
  /** Whitelisted venues (vendor pubkeys). Max 16. */
  vendors: PublicKey[];
  /** Per-tx cap in USD (e.g. 200 = $200). */
  perTxCapUsd: number;
  /** Per-day loss cap in USD (e.g. 60 = $60). */
  perDayCapUsd: number;
  /** Policy TTL in slots (~0.4 s/slot). Default 7 days = ~1.5M slots. */
  ttlSlots?: bigint | number;
  /** Max leverage in basis points. 500 = 5x. Default 500. */
  maxLeverageBps?: number;
  /** Drawdown kill-switch in PERCENT (1..=100). 0 = disabled. Default 25. */
  killSwitchDrawdownPct?: number;
  /** Initial peak equity in USD (used by `record_pnl` baseline). Default 0. */
  initialPeakEquityUsd?: number;
}

/** Inputs to `authorizeSpend`. Mirrors the on-chain instruction. */
export interface AuthorizeSpendInput {
  /** Agent the policy applies to (PDA seed). */
  agent: PublicKey;
  /** Vendor pubkey being asked about. Must be in `policy.vendors`. */
  vendor: PublicKey;
  /** Spend amount in USD (SDK converts to micro). */
  amountUsd: number;
  /** Trade leverage in basis points (10_000 = 100x). Must be ≤ maxLeverageBps. */
  leverageBps: number;
  /** Runtime-reported current equity in USD. Drives drawdown kill-switch. */
  impliedCurrentEquityUsd: number;
  /** Optional explicit nonce. Default: strictly increasing per process. */
  nonce?: bigint | number;
}

/** Inputs to `updatePolicy`. All fields optional; only the ones present are updated. */
export interface UpdatePolicyInput {
  agent: PublicKey;
  perTxCapUsd?: number;
  perDayCapUsd?: number;
  ttlSlots?: bigint | number;
  maxLeverageBps?: number;
  /** Percent (1..=100). 0 = disabled. */
  killSwitchDrawdownPct?: number;
}

/** Inputs to `replaceVendors` — emits a new policy with the same other fields. */
export interface ReplaceVendorsInput {
  agent: PublicKey;
  vendors: PublicKey[];
}

/** Inputs to `recordPnl`. */
export interface RecordPnlInput {
  agent: PublicKey;
  /** New equity observation in USD. Monotonic `max(peak, new)`. */
  newEquityUsd: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Micro-units per USD (USDC has 6 decimals). */
export const MICRO_USDC_PER_USD = 1_000_000n;

/** Anchor program id (must match `declare_id!` in lib.rs). */
export const TREASURY_PROGRAM_ID = '4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph';

/** Max vendors per policy (enforced on-chain in `create_policy`). */
export const MAX_VENDORS = 16;

/** Rolling daily-cap window, in slots (24h at ~0.4 s/slot). Mirrors state/mod.rs. */
export const SLOTS_PER_DAY = 216_000;

/** Default TTL: 7 days at ~0.4 s/slot = ~1.5M slots. */
export const DEFAULT_TTL_SLOTS = 1_512_000;

/** Default leverage cap: 5x. */
export const DEFAULT_MAX_LEVERAGE_BPS = 500;

/** Default drawdown kill-switch: 25%. Stored as integer percent on-chain. */
export const DEFAULT_KILL_SWITCH_DRAWDOWN_PCT = 25;