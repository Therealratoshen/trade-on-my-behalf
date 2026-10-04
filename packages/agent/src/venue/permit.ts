/**
 * SpendPermit — the artifact that binds an approved authorization to one
 * exact venue order.
 *
 * ## The gap this closes
 *
 * `authorize_spend` emits an `AuditEvent` carrying a `nonce`, a `vendor` and
 * an `amount_usdc`, but nothing consumed the nonce. The runtime gated the
 * venue call on an in-memory boolean (`audit.approved`), so a different
 * process, a mutated intent, or a replayed approval could all reach the venue
 * with no check that the executed order was the approved one.
 *
 * ## What this is
 *
 * A `SpendPermit` is the runtime's own capability object, minted from an
 * approved `AuditEvent` and required by `Venue.openPosition`. The venue
 * adapter recomputes the binding from the permit and the order it was asked
 * to fill, and refuses on any mismatch.
 *
 * ## What this is NOT — read this before claiming anything from it
 *
 * **The binding is off-chain and lives in code this repository controls.**
 * It is a real gate inside the runtime: the venue will not fill a permit
 * whose vendor, amount, leverage, market or side differs from the order, and
 * a nonce authorizes exactly one fill. But the honest boundary is:
 *
 *   * **The chain does not know a permit exists.** `authorize_spend` does not
 *     consume the nonce, store a permit, or enforce any of this. `nonce` is
 *     still a caller-supplied `u64` that is logged and never checked
 *     (see `packages/sdk/src/types.ts` and `state::REASON_*`).
 *   * **The chain's `AuditEvent` carries only `vendor` and `amount_usdc` of
 *     the order.** It does NOT echo `leverage_bps`, `market` or `side` — the
 *     program never receives them. So of the five fields this module checks,
 *     two (vendor, amount) are bound to values the chain actually decided on,
 *     and three (leverage, market, side) are bound to what this runtime
 *     *recorded* having sent. Leverage is genuinely enforced on-chain against
 *     the cap; the permit's leverage field proves the fill matches the value
 *     the runtime submitted, not that the chain read it back.
 *   * **A process that skips `authorize_spend` and builds its own permit
 *     object can still open a position.** The issuer marker makes a bare
 *     object literal fail, but that marker is a string in this file, not a
 *     signature. The permit defends against substitution and replay *within*
 *     the runtime; it does not make an unapproved execution impossible.
 *   * **The venue cannot enforce anything.** `JupiterPerpsPaperVenue` is a
 *     local simulation, and a live venue enforces its own rules on its own
 *     accounts regardless of what this process believes.
 *
 * The supportable claim is therefore: **the runtime will not execute what it
 * did not approve.** The stronger claim — on-chain, an unapproved execution
 * is impossible — is NOT true today. The on-chain follow-up is recorded in
 * `docs/security-model.md`.
 */

import type { AuditEvent } from '@trade-on-my-behalf/sdk';
import type { Market, Side } from './index.js';

/** Distinct, testable reasons a permit does not authorize an order. */
export const PermitErrorCode = {
  /** The value is not a permit issued by {@link issuePermit}. */
  NOT_ISSUED: 'PERMIT_NOT_ISSUED',
  /** The chain denied the spend. There is nothing to permit. */
  DENIED: 'PERMIT_IS_DENIAL',
  /** The nonce is already spent in this process. */
  REPLAYED: 'PERMIT_REPLAYED',
  /** `vendor` differs from the vendor the chain approved. */
  VENDOR_MISMATCH: 'PERMIT_VENDOR_MISMATCH',
  /** Collateral differs from the approved amount. */
  AMOUNT_MISMATCH: 'PERMIT_AMOUNT_MISMATCH',
  /** Leverage differs from the leverage the runtime submitted. */
  LEVERAGE_MISMATCH: 'PERMIT_LEVERAGE_MISMATCH',
  /** Market differs from the market the permit was issued for. */
  MARKET_MISMATCH: 'PERMIT_MARKET_MISMATCH',
  /** Side differs from the side the permit was issued for. */
  SIDE_MISMATCH: 'PERMIT_SIDE_MISMATCH',
} as const;

export type PermitErrorCode = (typeof PermitErrorCode)[keyof typeof PermitErrorCode];

/**
 * Thrown when a permit does not authorize the order presented with it.
 *
 * The venue adapter throws this instead of filling. A caller that catches it
 * must treat the trade as not executed.
 */
export class PermitError extends Error {
  constructor(
    readonly code: PermitErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PermitError';
  }
}

/** USDC micro-units per USD. Mirrors `MICRO_USDC_PER_USD` in the SDK. */
const MICRO_USDC_PER_USD = 1_000_000;

/** Issuer marker. Identity check only — not a cryptographic signature. */
const PERMIT_ISSUER = 'tomb:authorize_spend@1' as const;

/** The order a permit is checked against. Structurally the venue's `OpenParams`. */
export interface PermitOrder {
  /** Base58 vendor pubkey the venue will act as. */
  vendor: string;
  market: Market;
  side: Side;
  collateralUsd: number;
  leverageBps: number;
}

/**
 * A single approved spend, bound to the exact order it may be spent on.
 *
 * Mint one with {@link issuePermit} from an approved `AuditEvent`. Consumers
 * must gate on {@link isIssuedPermit} first — that is what makes a
 * hand-constructed object literal unusable, even though it typechecks.
 */
export interface SpendPermit {
  /**
   * The chain's `AuditEvent.nonce`. Single-use within this process: the
   * first matching {@link consumePermit} marks it spent and a second is
   * rejected as a replay.
   */
  readonly nonce: string;
  /** Base58 vendor the chain approved. Chain-decided. */
  readonly vendor: string;
  /** Market the permit was issued for. Not a chain field — runtime-recorded. */
  readonly market: Market;
  /** Side the permit was issued for. Not a chain field — runtime-recorded. */
  readonly side: Side;
  /** Approved collateral in USD. Chain-decided (`amount_usdc`). */
  readonly collateralUsd: number;
  /** Leverage submitted to the chain. Not echoed by the AuditEvent. */
  readonly leverageBps: number;
  /** Signature of the `authorize_spend` transaction that issued this permit. */
  readonly auditSignature: string;
  /** Slot the chain approved at. */
  readonly slot: number;
  /** Marker so a bare object literal cannot pass as a permit. */
  readonly issuedBy: typeof PERMIT_ISSUER;
}

/**
 * Set of nonces already spent by this process.
 *
 * Module-level on purpose. The replay window must outlive a single
 * `createRuntime` call, or constructing a second runtime over the same module
 * would silently re-open every consumed nonce.
 */
const consumedNonces = new Set<string>();

/** Mark `nonce` used. Returns false when it was already consumed. */
function consumeNonce(nonce: string): boolean {
  if (consumedNonces.has(nonce)) return false;
  consumedNonces.add(nonce);
  return true;
}

/** True when `nonce` has already been spent by this process. */
export function isNonceConsumed(nonce: string): boolean {
  return consumedNonces.has(nonce);
}

/** Test-only: forget every consumed nonce. Never call this in production. */
export function _resetConsumedNonces(): void {
  consumedNonces.clear();
}

/**
 * Narrow a value to a `SpendPermit` by its issuer marker.
 *
 * A permit is only real if it carries the marker. Anything else — including a
 * structurally identical object literal written by a caller — is not a
 * permit, and every check below refuses it.
 */
export function isIssuedPermit(value: unknown): value is SpendPermit {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Partial<SpendPermit>;
  return (
    c.issuedBy === PERMIT_ISSUER &&
    typeof c.nonce === 'string' &&
    typeof c.vendor === 'string' &&
    typeof c.collateralUsd === 'number' &&
    typeof c.leverageBps === 'number' &&
    typeof c.auditSignature === 'string'
  );
}

/** Inputs to {@link issuePermit}: the chain's decision plus the order it covers. */
export interface IssuePermitInput {
  /** The `AuditEvent` returned by `authorize_spend`. */
  audit: AuditEvent;
  /** Base58 vendor that was submitted to the chain. */
  vendor: string;
  /** Market the runtime submitted. */
  market: Market;
  /** Side the runtime submitted. */
  side: Side;
  /** Collateral the runtime submitted. */
  collateralUsd: number;
  /** Leverage the runtime submitted. */
  leverageBps: number;
}

/** Narrow an unknown value to an `AuditEvent`-shaped object. */
function isAuditEvent(value: unknown): value is AuditEvent {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Partial<AuditEvent>;
  return (
    typeof a.approved === 'boolean' &&
    typeof a.reasonCode === 'number' &&
    a.amountUsdc !== undefined &&
    a.nonce !== undefined
  );
}

/** USD -> whole micro-units, the same rounding the SDK applies on the way in. */
function toMicroUsd(usd: number): bigint {
  return BigInt(Math.round(usd * MICRO_USDC_PER_USD));
}

/**
 * Mint a `SpendPermit` from an approved `AuditEvent`.
 *
 * Throws on a denial — there is no such thing as a spendable denial — and on
 * a chain event whose `vendor`/`amount` disagree with the order it is being
 * bound to, which would otherwise mint a permit for a trade nobody approved.
 *
 * The nonce is NOT consumed here. Consumption happens in
 * {@link consumePermit}, once the order is known to match, so a mismatched
 * attempt cannot burn a permit that a later correct attempt still needs.
 */
export function issuePermit(input: IssuePermitInput): SpendPermit {
  const { audit } = input;
  if (!isAuditEvent(audit)) {
    throw new PermitError(
      PermitErrorCode.NOT_ISSUED,
      'authorize_spend returned something that is not an AuditEvent; refusing to mint a permit',
    );
  }
  if (!audit.approved) {
    throw new PermitError(
      PermitErrorCode.DENIED,
      `chain denied this spend (reasonCode ${audit.reasonCode}); there is nothing to permit`,
    );
  }
  // Vendor: the chain decided on this one, so a mismatch is a real bug.
  if (audit.vendor.toBase58() !== input.vendor) {
    throw new PermitError(
      PermitErrorCode.VENDOR_MISMATCH,
      `chain approved vendor ${audit.vendor.toBase58()}, runtime submitted ${input.vendor}`,
    );
  }
  // Amount: integer micro-units, matching what the chain counted. Comparing
  // USD floats would let a 1-ULP drift pass a $50 permit for a $50.0000001 order.
  const approvedMicro = BigInt(audit.amountUsdc.toString());
  if (approvedMicro !== toMicroUsd(input.collateralUsd)) {
    throw new PermitError(
      PermitErrorCode.AMOUNT_MISMATCH,
      `chain approved ${approvedMicro} micro-USD, runtime submitted ` +
        `${toMicroUsd(input.collateralUsd)} micro-USD; refusing to issue a permit for a different amount`,
    );
  }

  return Object.freeze({
    issuedBy: PERMIT_ISSUER,
    nonce: audit.nonce.toString(),
    vendor: input.vendor,
    market: input.market,
    side: input.side,
    collateralUsd: Number(approvedMicro) / MICRO_USDC_PER_USD,
    leverageBps: input.leverageBps,
    auditSignature: audit.signature,
    slot: audit.slot,
  });
}

/**
 * The whole binding, in one function: prove the presented order is the
 * approved one, then spend the nonce.
 *
 * Called by `Venue.openPosition` before any state is touched. Returns the
 * permit on success; throws `PermitError` on any mismatch or replay.
 *
 * Check order matters. Every field is verified *before* the nonce is
 * consumed, so a mismatched order leaves the permit unspent.
 */
export function consumePermit(permit: unknown, order: PermitOrder): SpendPermit {
  if (!isIssuedPermit(permit)) {
    throw new PermitError(
      PermitErrorCode.NOT_ISSUED,
      'openPosition requires a SpendPermit issued from an approved authorize_spend; ' +
        'a permit cannot be constructed by hand or carried over from another trade',
    );
  }
  if (permit.vendor !== order.vendor) {
    throw new PermitError(
      PermitErrorCode.VENDOR_MISMATCH,
      `permit is for vendor ${permit.vendor}, order targets ${order.vendor}`,
    );
  }
  if (permit.market !== order.market) {
    throw new PermitError(
      PermitErrorCode.MARKET_MISMATCH,
      `permit is for ${permit.market}, order targets ${order.market}`,
    );
  }
  if (permit.side !== order.side) {
    throw new PermitError(
      PermitErrorCode.SIDE_MISMATCH,
      `permit is for ${permit.side}, order is ${order.side}`,
    );
  }
  if (permit.leverageBps !== order.leverageBps) {
    throw new PermitError(
      PermitErrorCode.LEVERAGE_MISMATCH,
      `permit submitted ${permit.leverageBps} bps, order asks ${order.leverageBps} bps`,
    );
  }
  if (toMicroUsd(permit.collateralUsd) !== toMicroUsd(order.collateralUsd)) {
    throw new PermitError(
      PermitErrorCode.AMOUNT_MISMATCH,
      `permit approved ${permit.collateralUsd} USD, order asks ${order.collateralUsd} USD`,
    );
  }
  if (!consumeNonce(permit.nonce)) {
    throw new PermitError(
      PermitErrorCode.REPLAYED,
      `nonce ${permit.nonce} was already spent; a permit authorizes exactly one fill`,
    );
  }
  return permit;
}
