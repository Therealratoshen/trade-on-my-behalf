import { test } from 'node:test';
import assert from 'node:assert/strict';
import BN from 'bn.js';
import { Keypair, PublicKey } from '@solana/web3.js';
import type { AuditEvent, AuthorizeSpendInput, PolicyLike, RecordPnlInput } from '@trade-on-my-behalf/sdk';

import { classify } from '../src/classifier.js';
import { evaluate } from '../src/evaluator.js';
import { createRuntime, type TraderLike } from '../src/runtime.js';
import { JupiterPerpsPaperVenue, JUPITER_PERPS_PROGRAM_ID, MemoryStore, unrealizedPnlUsd } from '../src/venue/jupiter-perps.js';
import { StaticPriceFeed } from '../src/venue/prices.js';

/** In-memory stand-in for the chain: applies the same rules as the program. */
class FakeChain implements TraderLike {
  authorizeCalls: AuthorizeSpendInput[] = [];
  recordCalls: RecordPnlInput[] = [];
  slot = 10_000;
  constructor(public policy: PolicyLike, private readonly lie?: Partial<AuditEvent>) {}

  async fetchPolicy() { return this.policy; }

  async authorizeSpend(input: AuthorizeSpendInput) {
    this.authorizeCalls.push(input);
    const d = evaluate(this.policy, {
      vendor: input.vendor,
      amountUsd: input.amountUsd,
      leverageBps: input.leverageBps,
      equityUsd: input.impliedCurrentEquityUsd,
      slot: this.slot,
    });
    if (d.approved) {
      this.policy.day_spent_usdc = new BN(this.policy.day_spent_usdc.toString()).add(new BN(Math.round(input.amountUsd * 1e6)));
    }
    const audit: AuditEvent = {
      policy: PublicKey.unique(), agent: input.agent, vendor: input.vendor,
      amountUsdc: new BN(Math.round(input.amountUsd * 1e6)),
      approved: d.approved, reasonCode: d.reasonCode,
      nonce: new BN(1), slot: this.slot, signature: `sig${this.authorizeCalls.length}`, observedAt: 0,
      ...this.lie,
    };
    return { signature: audit.signature, audit };
  }

  async recordPnl(input: RecordPnlInput) {
    this.recordCalls.push(input);
    const m = new BN(Math.round(input.newEquityUsd * 1e6));
    if (m.gt(new BN(this.policy.peak_equity_usdc.toString()))) this.policy.peak_equity_usdc = m;
    return { signature: `pnl${this.recordCalls.length}` };
  }
}

function policy(): PolicyLike {
  return {
    owner: PublicKey.unique(), agent: PublicKey.unique(), vendors: [JUPITER_PERPS_PROGRAM_ID],
    per_tx_cap_usdc: new BN(50_000_000), per_day_cap_usdc: new BN(150_000_000), day_spent_usdc: new BN(0),
    ttl_slots: new BN(1_000_000), created_at_slot: new BN(9_000), last_reset_slot: new BN(9_000),
    max_leverage_bps: 500, peak_equity_usdc: new BN(0), kill_switch_drawdown_pct: 25, bump: 255,
  };
}

function setup(opts: { clamp?: boolean; lie?: Partial<AuditEvent> } = {}) {
  const chain = new FakeChain(policy(), opts.lie);
  const prices = new StaticPriceFeed({ 'SOL-PERP': 100 });
  const venue = new JupiterPerpsPaperVenue(prices, new MemoryStore(), 1_000);
  const runtime = createRuntime({
    trader: chain, venue, agent: chain.policy.agent, expectedOwner: chain.policy.owner,
    getSlot: async () => chain.slot, clamp: opts.clamp,
  });
  return { chain, prices, venue, runtime };
}

const sig = { market: 'SOL-PERP', side: 'long', collateralUsd: 40, leverageBps: 300 };

test('approved intent opens a paper position and arms the kill-switch', async () => {
  const { chain, venue, runtime } = setup();
  const r = await runtime.handle(sig);
  assert.equal(r.audit?.approved, true);
  assert.equal(r.mismatch, false);
  assert.ok(r.fill?.simulated);
  assert.equal((await venue.listPositions()).length, 1);
  assert.equal(chain.recordCalls.length, 1, 'first trade records the starting equity as peak');
  assert.equal(chain.recordCalls[0].newEquityUsd, 1_000);
});

test('raw over-leveraged intent reaches the chain and is denied; no position opens', async () => {
  const { chain, venue, runtime } = setup({ clamp: false });
  const r = await runtime.handle({ ...sig, leverageBps: 2_000 });
  assert.equal(chain.authorizeCalls.length, 1, 'denies are still sent on-chain for the receipt');
  assert.equal(r.audit?.approved, false);
  assert.equal(r.audit?.reasonCode, 6);
  assert.equal(r.fill, undefined);
  assert.equal((await venue.listPositions()).length, 0);
});

test('clamped intent is cut to the caps and approved', async () => {
  const { chain, runtime } = setup();
  const r = await runtime.handle({ ...sig, collateralUsd: 500, leverageBps: 2_000 });
  assert.equal(r.intent?.collateralUsd, 50);
  assert.equal(r.intent?.leverageBps, 500);
  assert.equal(r.intent?.clamps.length, 2);
  assert.equal(r.audit?.approved, true);
  assert.equal(chain.authorizeCalls[0].amountUsd, 50);
});

test('a full wipe-out of one day of positions stays inside the daily cap', async () => {
  const { prices, venue, runtime } = setup();
  for (let i = 0; i < 3; i++) {
    assert.equal((await runtime.handle({ ...sig, collateralUsd: 50, leverageBps: 500 })).audit?.approved, true);
  }
  prices.set('SOL-PERP', 1); // every long loses its full collateral
  const equity = await venue.equityUsd();
  assert.ok(equity > 849 && equity < 850, `equity ${equity}: $150 collateral lost plus fees`);
  const r = await runtime.handle(sig);
  assert.equal(r.audit?.reasonCode, 3, '$150/day cap binds before the 25% kill-switch ($750 floor)');
});

test('kill-switch denies when equity falls more than 25% below the recorded peak', async () => {
  const { chain, runtime } = setup();
  chain.policy.peak_equity_usdc = new BN(1_400_000_000); // peak $1400, floor $1050; paper equity is $1000
  const r = await runtime.handle(sig);
  assert.equal(r.audit?.approved, false);
  assert.equal(r.audit?.reasonCode, 7);
  assert.equal(r.fill, undefined);
});

test('chain answer wins over the off-chain preflight and the mismatch is flagged', async () => {
  const { venue, runtime } = setup({ lie: { approved: false, reasonCode: 1 } });
  const r = await runtime.handle(sig);
  assert.equal(r.preflight?.approved, true);
  assert.equal(r.audit?.approved, false);
  assert.equal(r.mismatch, true);
  assert.equal((await venue.listPositions()).length, 0);
});

test('unknown market is dropped before touching the chain', async () => {
  const { chain, runtime } = setup();
  const r = await runtime.handle({ ...sig, market: 'DOGE-PERP' });
  assert.match(r.dropped ?? '', /unknown market/);
  assert.equal(chain.authorizeCalls.length, 0);
});

test('paper PnL: 5x long, +10% move = +50% on collateral; loss capped at collateral', () => {
  const pos = { venuePositionId: 'x', market: 'SOL-PERP' as const, side: 'long' as const, collateralUsd: 100, leverageBps: 500, entryPriceUsd: 100, openedAt: 0 };
  assert.equal(Math.round(unrealizedPnlUsd(pos, 110)), 50);
  assert.equal(Math.round(unrealizedPnlUsd({ ...pos, side: 'short' }, 110)), -50);
  assert.equal(unrealizedPnlUsd(pos, 1), -100);
});

test('classifier rejects fractional leverage bps and sub-1x leverage', () => {
  const p = policy();
  assert.ok('dropped' in classify({ ...sig, leverageBps: 50 }, p, true));
  assert.ok('dropped' in classify({ ...sig, leverageBps: 150.5 }, p, true));
});
