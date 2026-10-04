/**
 * Execution-binding tests: the approved intent and the executed intent must
 * be provably the same thing.
 *
 * Scope of the claim under test: the binding is OFF-CHAIN and enforced by
 * code in this repository. These tests prove the runtime path refuses a
 * missing, forged, mismatched or replayed permit. They do NOT prove that an
 * unapproved execution is impossible on-chain, because it is not — the
 * treasury program never sees a permit. See `docs/security-model.md`.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import type { AuditEvent } from '@trade-on-my-behalf/sdk';

import {
  consumePermit,
  isIssuedPermit,
  isNonceConsumed,
  issuePermit,
  PermitError,
  PermitErrorCode,
  _resetConsumedNonces,
} from '../src/venue/permit.js';
import { JupiterPerpsPaperVenue, JUPITER_PERPS_PROGRAM_ID, MemoryStore } from '../src/venue/jupiter-perps.js';
import { StaticPriceFeed } from '../src/venue/prices.js';

const VENDOR = JUPITER_PERPS_PROGRAM_ID.toBase58();
const OTHER_VENDOR = PublicKey.unique().toBase58();

let seq = 0;

/** A chain decision shaped like the real `authorize_spend` AuditEvent. */
function approvedAudit(over: Partial<AuditEvent> = {}): AuditEvent {
  seq += 1;
  return {
    policy: PublicKey.unique(),
    agent: PublicKey.unique(),
    vendor: JUPITER_PERPS_PROGRAM_ID,
    amountUsdc: new BN(50_000_000), // $50
    approved: true,
    reasonCode: 0,
    // Mirrors the real SDK: strictly increasing per process. A constant nonce
    // would make every later permit look like a replay.
    nonce: new BN(seq),
    slot: 10_000 + seq,
    signature: `sig-${seq}`,
    observedAt: 0,
    ...over,
  };
}

const order = (over: Partial<Parameters<typeof consumePermit>[1]> = {}) => ({
  vendor: VENDOR,
  market: 'SOL-PERP' as const,
  side: 'long' as const,
  collateralUsd: 50,
  leverageBps: 300,
  ...over,
});

const permitFor = (over: Partial<Parameters<typeof issuePermit>[0]> = {}) =>
  issuePermit({
    audit: approvedAudit(),
    vendor: VENDOR,
    market: 'SOL-PERP',
    side: 'long',
    collateralUsd: 50,
    leverageBps: 300,
    ...over,
  });

describe('permit is required', () => {
  beforeEach(() => _resetConsumedNonces());

  test('a hand-built permit object is refused', () => {
    // Structurally identical to a real permit except for the issuer marker.
    const forged = {
      nonce: '1',
      vendor: VENDOR,
      market: 'SOL-PERP',
      side: 'long',
      collateralUsd: 500,
      leverageBps: 5000,
      auditSignature: 'made-up',
      slot: 1,
    };
    assert.equal(isIssuedPermit(forged), false);
    assert.throws(
      () => consumePermit(forged, order({ collateralUsd: 500, leverageBps: 5000 })),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.NOT_ISSUED,
    );
  });

  test('undefined, null and a bare string are all refused', () => {
    for (const bad of [undefined, null, 'permit', 42, {}]) {
      assert.throws(
        () => consumePermit(bad, order()),
        (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.NOT_ISSUED,
        `expected ${JSON.stringify(bad)} to be refused`,
      );
    }
  });

  test('the venue refuses to open a position with no permit', async () => {
    const venue = new JupiterPerpsPaperVenue(
      new StaticPriceFeed({ 'SOL-PERP': 100 }),
      new MemoryStore(),
      1_000,
    );
    await assert.rejects(
      // @ts-expect-error deliberately omitting the required permit field
      () => venue.openPosition({ market: 'SOL-PERP', side: 'long', collateralUsd: 50, leverageBps: 300 }),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.NOT_ISSUED,
    );
    assert.equal((await venue.listPositions()).length, 0, 'no position may open');
  });

  test('a denied AuditEvent cannot be turned into a permit', () => {
    const denial = approvedAudit({ approved: false, reasonCode: 2, amountUsdc: new BN(1) });
    assert.throws(
      () => issuePermit({ audit: denial, vendor: VENDOR, market: 'SOL-PERP', side: 'long', collateralUsd: 50, leverageBps: 300 }),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.DENIED,
    );
  });
});

describe('a mismatched permit is rejected', () => {
  beforeEach(() => _resetConsumedNonces());

  test('$50 permit cannot open a $500 position', () => {
    const permit = permitFor();
    assert.throws(
      () => consumePermit(permit, order({ collateralUsd: 500 })),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.AMOUNT_MISMATCH,
    );
    assert.equal(isNonceConsumed(permit.nonce), false, 'a mismatch must not burn the permit');
  });

  test('the amount check is exact, not approximate', () => {
    // One micro-USD over the approved amount. A float comparison would let
    // this through; the permit compares whole micro-units.
    const permit = permitFor();
    assert.throws(
      () => consumePermit(permit, order({ collateralUsd: 50.000001 })),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.AMOUNT_MISMATCH,
    );
  });

  test('wrong vendor is rejected', () => {
    const permit = permitFor();
    assert.throws(
      () => consumePermit(permit, order({ vendor: OTHER_VENDOR })),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.VENDOR_MISMATCH,
    );
  });

  test('wrong leverage is rejected', () => {
    const permit = permitFor();
    assert.throws(
      () => consumePermit(permit, order({ leverageBps: 5000 })),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.LEVERAGE_MISMATCH,
    );
  });

  test('wrong market is rejected', () => {
    const permit = permitFor();
    assert.throws(
      () => consumePermit(permit, order({ market: 'BTC-PERP' })),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.MARKET_MISMATCH,
    );
  });

  test('flipping the side is rejected', () => {
    const permit = permitFor();
    assert.throws(
      () => consumePermit(permit, order({ side: 'short' })),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.SIDE_MISMATCH,
    );
  });

  test('a permit cannot be minted for a different amount than the chain approved', () => {
    // The chain approved $50; the runtime is about to submit $500. Minting
    // must fail here rather than produce a permit for the wrong trade.
    assert.throws(
      () => issuePermit({ audit: approvedAudit(), vendor: VENDOR, market: 'SOL-PERP', side: 'long', collateralUsd: 500, leverageBps: 300 }),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.AMOUNT_MISMATCH,
    );
  });

  test('a permit cannot be minted for a different vendor than the chain approved', () => {
    assert.throws(
      () => issuePermit({ audit: approvedAudit(), vendor: OTHER_VENDOR, market: 'SOL-PERP', side: 'long', collateralUsd: 50, leverageBps: 300 }),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.VENDOR_MISMATCH,
    );
  });

  test('the venue refuses a substituted size and leaves state untouched', async () => {
    const venue = new JupiterPerpsPaperVenue(
      new StaticPriceFeed({ 'SOL-PERP': 100 }),
      new MemoryStore(),
      1_000,
    );
    const permit = permitFor();
    const before = (await venue.listPositions()).length;
    await assert.rejects(
      () => venue.openPosition({ market: 'SOL-PERP', side: 'long', collateralUsd: 500, leverageBps: 300, permit }),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.AMOUNT_MISMATCH,
    );
    assert.equal((await venue.listPositions()).length, before, 'no position may open');
    assert.equal(isNonceConsumed(permit.nonce), false, 'the permit survives a rejected attempt');
  });

  test('the venue refuses a substituted market and leaves state untouched', async () => {
    const venue = new JupiterPerpsPaperVenue(
      new StaticPriceFeed({ 'SOL-PERP': 100, 'BTC-PERP': 60_000 }),
      new MemoryStore(),
      1_000,
    );
    await assert.rejects(
      () => venue.openPosition({ market: 'BTC-PERP', side: 'long', collateralUsd: 50, leverageBps: 300, permit: permitFor() }),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.MARKET_MISMATCH,
    );
    assert.equal((await venue.listPositions()).length, 0);
  });
});

describe('a replayed permit is rejected', () => {
  beforeEach(() => _resetConsumedNonces());

  test('a spent nonce cannot authorize a second fill', () => {
    const permit = permitFor();
    const first = consumePermit(permit, order());
    assert.equal(first.nonce, permit.nonce);
    assert.equal(isNonceConsumed(permit.nonce), true);

    assert.throws(
      () => consumePermit(permit, order()),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.REPLAYED,
    );
  });

  test('replay via the venue is refused and does not open a second position', async () => {
    const venue = new JupiterPerpsPaperVenue(
      new StaticPriceFeed({ 'SOL-PERP': 100 }),
      new MemoryStore(),
      1_000,
    );
    const permit = permitFor();
    const params = { market: 'SOL-PERP' as const, side: 'long' as const, collateralUsd: 50, leverageBps: 300, permit };

    await venue.openPosition(params);
    assert.equal((await venue.listPositions()).length, 1);

    await assert.rejects(
      () => venue.openPosition(params),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.REPLAYED,
    );
    assert.equal((await venue.listPositions()).length, 1, 'the replay must not open a second position');
  });

  test('a copy of a spent permit is also refused', () => {
    const permit = permitFor();
    consumePermit(permit, order());
    // A different object, same nonce: a replay by a different code path.
    const copy = { ...permit };
    assert.throws(
      () => consumePermit(copy, order()),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.REPLAYED,
    );
  });

  test('the replay window survives a second venue over the same nonce set', async () => {
    // The consumed-nonce set is module-level, so rebuilding the venue over the
    // same module cannot re-open a spent nonce.
    const permit = permitFor();
    const prices = new StaticPriceFeed({ 'SOL-PERP': 100 });
    const first = new JupiterPerpsPaperVenue(prices, new MemoryStore(), 1_000);
    const second = new JupiterPerpsPaperVenue(prices, new MemoryStore(), 1_000);
    const params = { market: 'SOL-PERP' as const, side: 'long' as const, collateralUsd: 50, leverageBps: 300, permit };

    await first.openPosition(params);
    await assert.rejects(
      () => second.openPosition(params),
      (e: unknown) => e instanceof PermitError && e.code === PermitErrorCode.REPLAYED,
      'a fresh venue over the same module must still honour the spent nonce',
    );
  });
});

describe('the happy path still fills', () => {
  beforeEach(() => _resetConsumedNonces());

  test('a matching permit authorizes exactly one fill', async () => {
    const venue = new JupiterPerpsPaperVenue(
      new StaticPriceFeed({ 'SOL-PERP': 100 }),
      new MemoryStore(),
      1_000,
    );
    const permit = permitFor();
    const fill = await venue.openPosition({
      market: 'SOL-PERP', side: 'long', collateralUsd: 50, leverageBps: 300, permit,
    });
    assert.ok(fill.simulated);
    assert.equal((await venue.listPositions()).length, 1);
    assert.equal(isNonceConsumed(permit.nonce), true);
  });

  test('the permit carries the chain provenance it was minted from', () => {
    const audit = approvedAudit({ signature: 'chain-sig-xyz' });
    const permit = issuePermit({
      audit, vendor: VENDOR, market: 'SOL-PERP', side: 'long', collateralUsd: 50, leverageBps: 300,
    });
    assert.equal(permit.auditSignature, 'chain-sig-xyz');
    assert.equal(permit.nonce, audit.nonce.toString());
    assert.equal(permit.slot, audit.slot);
    assert.equal(permit.collateralUsd, 50);
  });

  test('a permit is frozen, so the approved fields cannot be edited after minting', () => {
    const permit = permitFor();
    assert.throws(() => {
      (permit as { collateralUsd: number }).collateralUsd = 9_999;
    }, TypeError);
    assert.equal(permit.collateralUsd, 50);
  });
});
