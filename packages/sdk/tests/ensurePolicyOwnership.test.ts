/**
 * Offline regression tests for the PDA-squatting fix on the SDK side.
 *
 * On-chain, `create_policy` now requires the agent to sign, so a third party
 * can no longer create a policy for a victim agent key. That closes the
 * *create* path. The *adopt* path is what `ensurePolicy` does when a policy
 * already exists — and that is where the silent rules-inheritance lived:
 *
 *   if (await fetchPolicy()) return { signature: '', createdNew: false };
 *
 * A truthy policy of any origin short-circuited, so a caller asking for
 * "$50/trade, 3x" would be handed back `createdNew: false` while actually
 * living under somebody else's caps, with no error to notice.
 *
 * `ensurePolicy` now calls `assertPolicyOwnership`, which throws
 * `ForeignPolicyError` when the on-chain owner is not the handle's wallet.
 * The check is a pure function of the decoded policy, so it is testable here
 * with no validator — the SDK test suite never talks to a cluster.
 *
 * The on-chain half (agent must sign; no PDA after a failed squat) lives in
 * programs/treasury/tests/treasury.ts and runs under `anchor test`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnchorProvider, Idl, Program, Wallet } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

import {
    assertPolicyOwnership,
  decodePolicy,
  ForeignPolicyError,
  TREASURY_IDL,
} from '../src/index.js';

const idl = TREASURY_IDL as unknown as Idl;
const program = new Program(
  idl,
  new AnchorProvider(
    new Connection('http://127.0.0.1:8899'),
    new Wallet(Keypair.generate()),
    {},
  ),
);
const coder = program.coder;

/** Encode a real Policy account, exactly as the chain would store it. */
async function encodePolicy(opts: {
  owner: PublicKey;
  agent: PublicKey;
  perTxCapUsdc?: BN;
  maxLeverageBps?: number;
}) {
  const data = await coder.accounts.encode('policy', {
    owner: opts.owner,
    agent: opts.agent,
    vendors: [Keypair.generate().publicKey],
    perTxCapUsdc: opts.perTxCapUsdc ?? new BN(50_000_000), // $50
    perDayCapUsdc: new BN(150_000_000), // $150
    daySpentUsdc: new BN(0),
    ttlSlots: new BN(1_512_000),
    createdAtSlot: new BN(1),
    lastResetSlot: new BN(1),
    maxLeverageBps: opts.maxLeverageBps ?? 300, // 3x
    peakEquityUsdc: new BN(0),
    killSwitchDrawdownPct: 25,
    bump: 254,
  });
  return decodePolicy(data);
}

// ---------------------------------------------------------------------------
// The core regression: a policy owned by somebody else must be refused.
// ---------------------------------------------------------------------------

test('assertPolicyOwnership throws when the existing policy belongs to another owner', async () => {
  const attacker = Keypair.generate().publicKey;
  const victim = Keypair.generate().publicKey;
  const agent = Keypair.generate().publicKey;

  // The squat landed before the fix: attacker owns, caps are hostile.
  const foreign = await encodePolicy({
    owner: attacker,
    agent,
    perTxCapUsdc: new BN(10_000_000_000), // $10,000
    maxLeverageBps: 10_000, // 100x
  });

  assert.throws(
    () => assertPolicyOwnership(foreign, victim, agent),
    ForeignPolicyError,
    'a foreign-owned policy must never be silently adopted',
  );
});

test('ForeignPolicyError names the real owner and the agent, so the fix is actionable', async () => {
  const attacker = Keypair.generate().publicKey;
  const victim = Keypair.generate().publicKey;
  const agent = Keypair.generate().publicKey;
  const foreign = await encodePolicy({ owner: attacker, agent });

  let caught: unknown;
  try {
    assertPolicyOwnership(foreign, victim, agent);
  } catch (e) {
    caught = e;
  }

  assert.ok(caught instanceof ForeignPolicyError);
  const err = caught as ForeignPolicyError;
  // The whole point is that the user is TOLD, not silently governed.
  assert.equal(err.onChainOwner.toBase58(), attacker.toBase58());
  assert.equal(err.expectedOwner.toBase58(), victim.toBase58());
  assert.equal(err.agent.toBase58(), agent.toBase58());
  assert.match(err.message, new RegExp(attacker.toBase58()));
  assert.match(err.message, /Refusing to continue under rules you did not set/);
  // The message must point at a real recovery path, since the foreign owner
  // cannot be evicted (update_policy is owner-gated).
  assert.match(err.message, /keygen|rotate/);
});

// ---------------------------------------------------------------------------
// The paths that must NOT regress: idempotence and first-time creation.
// ---------------------------------------------------------------------------

test('assertPolicyOwnership passes for a policy this owner created', async () => {
  const me = Keypair.generate().publicKey;
  const agent = Keypair.generate().publicKey;
  const mine = await encodePolicy({ owner: me, agent });

  // Re-running ensurePolicy with identical rules must stay a no-op, not throw.
  assert.doesNotThrow(() => assertPolicyOwnership(mine, me, agent));
});

test('assertPolicyOwnership returns silently when no policy exists yet', async () => {
  const me = Keypair.generate().publicKey;
  const agent = Keypair.generate().publicKey;

  // null == the PDA is uninitialized: this is the first-time creation path.
  assert.doesNotThrow(() => assertPolicyOwnership(null, me, agent));
});

test('ownership is compared by decoded value, not reference identity', async () => {
  const me = Keypair.generate().publicKey;
  const agent = Keypair.generate().publicKey;
  // A distinct PublicKey object holding the same 32 bytes. decodePolicy
  // builds fresh PublicKeys from chain bytes, so a `===` comparison here
  // would reject the user's own policy.
  const sameBytes = new PublicKey(me.toBuffer());

  const mine = await encodePolicy({ owner: me, agent });
  assert.notEqual(mine.owner, me, 'decoded owner is a different object with equal bytes');
  assert.doesNotThrow(() => assertPolicyOwnership(mine, sameBytes, agent));
});
