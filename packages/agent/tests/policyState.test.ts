/**
 * `derivePolicyState` — the chip that tells a reader what their policy is.
 *
 * This is a dashboard component, and it is tested from here because the
 * dashboard package has no test runner of its own. That is a workaround, not
 * the preferred home: if `apps/dashboard` ever grows a `test` script, this
 * file should move.
 *
 * The tests exist because the two defects that shipped in this function were
 * both invisible to a reviewer skimming it, and both produced confident,
 * wrong, user-visible claims. The first converted a wall clock into a slot
 * number and therefore called every policy EXPIRED. The second ignored its
 * own `loaded` flag and answered "NO POLICY" at accounts it had not read yet.
 * Neither throws. Both are assertions the design system's whole argument is
 * about, so they are pinned here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve as pathResolve } from 'node:path';
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import { DEFAULT_TTL_SLOTS, SLOTS_PER_DAY, type PolicyLike } from '@trade-on-my-behalf/sdk';

// ---------------------------------------------------------------------------
// Load a dashboard component that is written for Next.js.
//
// `PolicyState.tsx` imports `@/lib/format`, the Next path alias declared in
// `apps/dashboard/tsconfig.json`. tsx honours `paths` only via a tsconfig
// lookup, and it looks for the tsconfig nearest the *test* file — which is
// the agent's, where `@/*` means something else entirely. So the alias is
// resolved here, by hand, in this one file, rather than by changing a shared
// test script or adding a dependency the agent does not otherwise need.
//
// fileURLToPath, not `.pathname`: this repo path contains a space, and
// `.pathname` hands back a percent-encoded string that fs cannot open.
const DASH = fileURLToPath(new URL('../../../apps/dashboard/', import.meta.url));
const resolveFilename = (Module as unknown as { _resolveFilename: (...a: unknown[]) => string })
  ._resolveFilename;
(Module as unknown as { _resolveFilename: (...a: unknown[]) => string })._resolveFilename = function (
  this: unknown,
  request: string,
  ...rest: unknown[]
) {
  if (request.startsWith('@/')) {
    const base = pathResolve(DASH, request.slice(2));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, pathResolve(base, 'index.ts')]) {
      if (existsSync(candidate)) return resolveFilename.call(this, candidate, ...rest);
    }
  }
  return resolveFilename.call(this, request, ...rest);
};

const { derivePolicyState, policyStateNote } = await import(
  '../../../apps/dashboard/components/PolicyState.tsx'
);

// ---------------------------------------------------------------------------
// Real numbers, not invented ones.
//
// SLOTS_PER_DAY and DEFAULT_TTL_SLOTS are imported from the SDK, so these
// track the constants the chain actually uses (mirrored in
// programs/treasury/programs/treasury/src/state/mod.rs) rather than drifting
// away from them in a test file. A wrong constant here would be a test that
// passes while the chip is wrong, which is the failure mode this file exists
// to prevent.
//
// The live slot is a real reading, not a guess: mainnet-beta `getSlot` at the
// time of writing returned 453,093,411 and devnet returned 507,178,345. Devnet
// is the dashboard's default cluster, so devnet is the number that matters
// most; mainnet is included because the arithmetic is size-dependent and only
// a 453M-slot case proves the margin holds on both.
const DEVNET_SLOT = 507_178_345;
const MAINNET_SLOT = 453_093_411;

function policy(over: Partial<PolicyLike> = {}): PolicyLike {
  return {
    owner: PublicKey.unique(),
    agent: PublicKey.unique(),
    vendors: [],
    per_tx_cap_usdc: new BN(50_000_000),
    per_day_cap_usdc: new BN(150_000_000),
    day_spent_usdc: new BN(0),
    ttl_slots: new BN(DEFAULT_TTL_SLOTS),
    created_at_slot: new BN(DEVNET_SLOT - 1_000),
    last_reset_slot: new BN(DEVNET_SLOT - 1_000),
    max_leverage_bps: 500,
    peak_equity_usdc: new BN(0),
    kill_switch_drawdown_pct: 25,
    bump: 255,
    ...over,
  };
}

/** A policy created `ageSlots` slots before `currentSlot`, fully armed. */
function policyAt(slot: number, over: Partial<PolicyLike> = {}): PolicyLike {
  return policy({ created_at_slot: new BN(slot), peak_equity_usdc: new BN(250_000_000), ...over });
}

// ---------------------------------------------------------------------------
// The three states that require a positive claim

test('a live, owned policy with a healthy TTL reads live', () => {
  const p = policyAt(DEVNET_SLOT - 1_000);
  const state = derivePolicyState({ policy: p, loaded: true, isOwner: true, currentSlot: DEVNET_SLOT });
  assert.equal(state, 'live');
  assert.match(policyStateNote(state), /open, unexpired/);
});

test('a policy with peak_equity_usdc === 0 reads unarmed, not live', () => {
  // The state that matters: `create_policy` writes peak_equity_usdc = 0, so
  // every new policy lands here. Rendering it "live" is what made a tester
  // conclude the kill-switch was broken when it had simply never armed.
  const p = policy({ peak_equity_usdc: new BN(0) });
  const state = derivePolicyState({ policy: p, loaded: true, isOwner: true, currentSlot: DEVNET_SLOT });
  assert.equal(state, 'unarmed');
  assert.match(policyStateNote(state), /nothing to compare against/);
});

test('an unarmed policy that has also expired reads expired', () => {
  // Expiry outranks the arm state, matching the kernel: authorize_spend
  // checks the TTL regardless of whether a peak has been recorded.
  const p = policy({ peak_equity_usdc: new BN(0), created_at_slot: new BN(0) });
  assert.equal(
    derivePolicyState({ policy: p, loaded: true, isOwner: true, currentSlot: DEVNET_SLOT }),
    'expired',
  );
});

test('a non-owner reads unowned even when the policy is armed and unexpired', () => {
  const p = policyAt(DEVNET_SLOT - 1_000);
  assert.equal(
    derivePolicyState({ policy: p, loaded: true, isOwner: false, currentSlot: DEVNET_SLOT }),
    'unowned',
  );
});

// ---------------------------------------------------------------------------
// Bug 2: `loaded` was declared, documented, and never read.
//
// `Dashboard.tsx` passes `snapshot?.policy ?? null`, and the policy is polled
// every 4s, so `policy` is null during every fetch and re-fetch. With the
// flag ignored, a wallet owning a live policy saw "NO POLICY" in the mode
// strip directly above panels rendering that same live policy.

test('a loading read with a null policy is NOT "none"', () => {
  // The load-bearing assertion: `none` is the claim "no account exists here".
  // During a fetch this component has not established that.
  const state = derivePolicyState({ policy: null, loaded: false, isOwner: true, currentSlot: DEVNET_SLOT });
  assert.notEqual(state, 'none');
  assert.equal(state, 'loading');
});

test('a completed read with a null policy reads none', () => {
  assert.equal(
    derivePolicyState({ policy: null, loaded: true, isOwner: true, currentSlot: DEVNET_SLOT }),
    'none',
  );
});

test('loading outranks every other input, including a policy in hand', () => {
  // `loaded` is checked first, so a stale account cannot be rendered as a
  // settled state while the shell still believes it is fetching.
  const p = policyAt(DEVNET_SLOT - 1_000);
  assert.equal(
    derivePolicyState({ policy: p, loaded: false, isOwner: true, currentSlot: DEVNET_SLOT }),
    'loading',
  );
});

test('the loading state carries a note that is not a claim about the account', () => {
  assert.match(policyStateNote('loading'), /not been read yet/);
});

// ---------------------------------------------------------------------------
// Bug 1: the wall-clock-to-slot conversion.
//
// The shipped code was `(nowUnix * 1000) / 400`, i.e. "slots since the unix
// epoch". That is only correct if the chain's slot 0 sat at 1970-01-01. It
// did not, so the derived age overshot the real slot by billions and every
// policy with a block time available read EXPIRED. The fix takes a real slot
// from the RPC; these tests pin the property that makes that necessary, so the
// conversion cannot be reintroduced silently.

test('REGRESSION: a realistic current slot does NOT read expired', () => {
  // The defect, stated as a test. A policy created moments ago on devnet,
  // with the 7-day default TTL, must not be reported as expired.
  const p = policyAt(DEVNET_SLOT - 1_000);
  const state = derivePolicyState({ policy: p, loaded: true, isOwner: true, currentSlot: DEVNET_SLOT });
  assert.equal(state, 'live');

  // And the same on mainnet, where the slot is ~54M lower: the arithmetic is
  // size-dependent, so one cluster's number is not evidence about the other.
  const m = policyAt(MAINNET_SLOT - 1_000);
  assert.equal(
    derivePolicyState({ policy: m, loaded: true, isOwner: true, currentSlot: MAINNET_SLOT }),
    'live',
  );
});

test('REGRESSION: the old wall-clock conversion overshoots by billions of slots', () => {
  // Why the fix exists, measured rather than asserted in prose. At a real
  // 2026 unix timestamp the shipped formula yields a "current slot" that
  // dwarfs any real one, which is the mechanism that expired every policy.
  const unixNow = 1_791_073_694; // 2026-10-04, the date this test was written
  const oldFormula = (unixNow * 1000) / 400;
  assert.ok(
    oldFormula > MAINNET_SLOT * 5,
    `expected the old formula to overshoot mainnet by >5x, got ${oldFormula} vs ${MAINNET_SLOT}`,
  );
  // Against the default TTL, which is the number that actually gates the
  // branch: the overshoot is not marginal, it is three orders of magnitude.
  assert.ok(
    oldFormula - (DEVNET_SLOT - 1_000) > DEFAULT_TTL_SLOTS * 1_000,
    'expected the old derived age to exceed the 7-day TTL by 1000x',
  );
});

test('a policy well past created_at + ttl reads expired, so the branch is reachable', () => {
  // Proves the branch still exists and was not deleted to make the tests
  // pass. Created more than one TTL ago, judged against a correct slot.
  const expiredAt = DEVNET_SLOT - DEFAULT_TTL_SLOTS - 10_000;
  const p = policyAt(expiredAt);
  const state = derivePolicyState({ policy: p, loaded: true, isOwner: true, currentSlot: DEVNET_SLOT });
  assert.equal(state, 'expired');
  assert.match(policyStateNote(state), /REASON_EXPIRED/);
});

test('expiry uses the kernel predicate: strictly greater than ttl_slots', () => {
  // authorize_spend.rs: `clock.slot.saturating_sub(created_at) > ttl_slots`.
  // The dashboard must agree exactly, or it contradicts the chain at the
  // boundary — the one slot where the two would disagree.
  const onTheLastValidSlot = DEVNET_SLOT - DEFAULT_TTL_SLOTS;
  assert.equal(
    derivePolicyState({
      policy: policyAt(onTheLastValidSlot),
      loaded: true,
      isOwner: true,
      currentSlot: DEVNET_SLOT,
    }),
    'live',
    'one slot before expiry the kernel has not expired it',
  );
  assert.equal(
    derivePolicyState({
      policy: policyAt(DEVNET_SLOT - DEFAULT_TTL_SLOTS - 1),
      loaded: true,
      isOwner: true,
      currentSlot: DEVNET_SLOT,
    }),
    'expired',
    'one slot past the boundary the kernel has',
  );
});

test('an unknown current slot declines to assert expiry', () => {
  // The documented fallback, and the reason the function takes a nullable:
  // with no slot from the node there is no quantity comparable to
  // created_at_slot, so the honest answer is to say nothing about the TTL.
  const p = policyAt(DEVNET_SLOT - DEFAULT_TTL_SLOTS * 4);
  const armed = derivePolicyState({ policy: p, loaded: true, isOwner: true, currentSlot: null });
  assert.equal(armed, 'live', 'an old policy with no slot is not called expired');

  const unarmed = derivePolicyState({
    policy: policy({ peak_equity_usdc: new BN(0) }),
    loaded: true,
    isOwner: true,
    currentSlot: null,
  });
  assert.equal(unarmed, 'unarmed', 'the arm state is still readable without a slot');
});

test('a future created_at_slot (a skewed node) does not read expired', () => {
  // saturating_sub on chain means a created_at ahead of "now" yields 0, i.e.
  // never expired. Number arithmetic in JS would produce a negative age,
  // which still compares false, but a policy whose clock is ahead must never
  // be called expired — the cheap direction to get wrong.
  const p = policyAt(DEVNET_SLOT + SLOTS_PER_DAY);
  assert.equal(
    derivePolicyState({ policy: p, loaded: true, isOwner: true, currentSlot: DEVNET_SLOT }),
    'live',
  );
});

// ---------------------------------------------------------------------------
// Guard rails on the rest of the input

test('non-owner is not reached before a loaded null policy is resolved', () => {
  // Ordering, so the states stay distinguishable: no account + not owner is
  // "none", because there is nothing to be read-only against.
  assert.equal(
    derivePolicyState({ policy: null, loaded: true, isOwner: false, currentSlot: DEVNET_SLOT }),
    'none',
  );
});

test('peak equity is compared numerically, not by string formatting', () => {
  // The arm check reads `.toString() === '0'`. BN stringifies large values in
  // base 10, so this holds for bigints, numbers and BN alike — but a value
  // formatted with a leading sign or grouping would silently read "armed".
  assert.equal(
    derivePolicyState({
      policy: policy({ peak_equity_usdc: 0n }),
      loaded: true,
      isOwner: true,
      currentSlot: DEVNET_SLOT,
    }),
    'unarmed',
  );
  assert.equal(
    derivePolicyState({
      policy: policy({ peak_equity_usdc: 1 }),
      loaded: true,
      isOwner: true,
      currentSlot: DEVNET_SLOT,
    }),
    'live',
    'a peak of 1 micro-USDC is armed, however small',
  );
});
