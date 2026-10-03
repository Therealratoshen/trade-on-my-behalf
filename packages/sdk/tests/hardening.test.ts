import assert from 'node:assert/strict';
import test from 'node:test';
import BN from 'bn.js';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { assertDevnetWrite, assertPolicyBinding, DEVNET_GENESIS_HASH, registrationSigners } from '../src/registration';
import { withTrader, TREASURY_PROGRAM_ID, TREASURY_IDL } from '../src/withTrader';
import { createRuntime } from '../../agent/src/runtime.js';

const owner = Keypair.generate(), agent = Keypair.generate(), stranger = Keypair.generate();
const input = { agent: agent.publicKey, vendors: [SystemProgram.programId], perTxCapUsd: 10, perDayCapUsd: 20 };

function data(policyOwner = owner.publicKey, policyAgent = agent.publicKey): Buffer {
  const bytes = Buffer.alloc(136);
  Buffer.from(TREASURY_IDL.accounts[0].discriminator).copy(bytes);
  policyOwner.toBuffer().copy(bytes, 8); policyAgent.toBuffer().copy(bytes, 40);
  let offset = 76;
  for (const value of [10_000_000n, 20_000_000n, 0n, 1000n, 0n, 0n]) {
    bytes.writeBigUInt64LE(value, offset); offset += 8;
  }
  bytes.writeUInt16LE(500, offset);
  return bytes;
}

function connection(account: Buffer | null = null, genesis = DEVNET_GENESIS_HASH, programOwner = new PublicKey(TREASURY_PROGRAM_ID)) {
  return {
    rpcEndpoint: 'https://api.devnet.solana.com', commitment: 'confirmed',
    getGenesisHash: async () => genesis,
    getAccountInfo: async () => account ? { data: account, owner: programOwner } : null,
  } as unknown as Connection;
}

test('registration requires matching agent consent; one-wallet registration needs no extra keypair', () => {
  assert.throws(() => registrationSigners(owner, agent.publicKey), /consent/);
  assert.throws(() => registrationSigners(owner, agent.publicKey, stranger), /does not match/);
  assert.equal(registrationSigners(owner, agent.publicKey, agent)[0].publicKey.toBase58(), agent.publicKey.toBase58());
  assert.deepEqual(registrationSigners(owner, owner.publicKey), []);
});

test('compiled contract interface marks BOTH creation parties as signers', async () => {
  const handle = withTrader({ connection: connection(), wallet: owner, policy: agent.publicKey });
  const ix = await handle.program.methods.createPolicy(
    input.vendors, new BN(10_000_000), new BN(20_000_000), new BN(1000), 500, 25,
  ).accounts({ policy: handle.policyPda, agent: agent.publicKey, owner: owner.publicKey, systemProgram: SystemProgram.programId }).instruction();
  assert.equal(ix.keys.find(k => k.pubkey.equals(agent.publicKey))?.isSigner, true);
  assert.equal(ix.keys.find(k => k.pubkey.equals(owner.publicKey))?.isSigner, true);
});

test('ensurePolicy passes the matching consent signer to the transaction builder', async () => {
  const handle = withTrader({ connection: connection(), wallet: owner, policy: agent.publicKey });
  let calls = 0, signers: string[] = [];
  const builder = {
    accounts: () => builder,
    signers: (keys: Keypair[]) => { signers = keys.map(k => k.publicKey.toBase58()); return builder; },
    rpc: async () => { calls++; return 'test-fixture-only'; },
  };
  (handle.program.methods as Record<string, unknown>).createPolicy = () => builder;
  await assert.rejects(handle.ensurePolicy(input), /consent/);
  assert.equal(calls, 0);
  const created = await handle.ensurePolicy({ ...input, agentSigner: agent });
  assert.equal(created.createdNew, true);
  assert.deepEqual(signers, [agent.publicKey.toBase58()]);
  assert.equal(calls, 1);
});

test('an existing policy is never silently reused for the wrong owner', async () => {
  const wrong = withTrader({ connection: connection(data(stranger.publicKey)), wallet: owner, policy: agent.publicKey });
  await assert.rejects(wrong.ensurePolicy(input), /expected owner/);
  const correct = withTrader({ connection: connection(data()), wallet: owner, policy: agent.publicKey });
  assert.equal((await correct.ensurePolicy(input)).createdNew, false);
});

test('SDK rejects wrong-program and wrong-agent accounts', async () => {
  await assert.rejects(withTrader({ connection: connection(data(), DEVNET_GENESIS_HASH, stranger.publicKey), wallet: owner, policy: agent.publicKey }).fetchPolicy(), /treasury program/);
  await assert.rejects(withTrader({ connection: connection(data(owner.publicKey, stranger.publicKey)), wallet: owner, policy: agent.publicKey }).fetchPolicy(), /different agent/);
});

test('agent SDK mutations reject missing or mismatched expected owner before signing', async () => {
  const missing = withTrader({ connection: connection(data()), wallet: agent, policy: agent.publicKey });
  await assert.rejects(missing.recordPnl({ agent: agent.publicKey, newEquityUsd: 1000 }), /expectedOwner/);
  const wrong = withTrader({ connection: connection(data(stranger.publicKey)), wallet: agent, policy: agent.publicKey, expectedOwner: owner.publicKey });
  await assert.rejects(wrong.recordPnl({ agent: agent.publicKey, newEquityUsd: 1000 }), /expected owner/);
  await assert.rejects(wrong.authorizeSpend({ agent: agent.publicKey, vendor: SystemProgram.programId, amountUsd: 1, leverageBps: 100, impliedCurrentEquityUsd: 1000 }), /expected owner/);
});

test('SDK signing checks actual chain identity, including localhost mainnet proxies', async () => {
  await assertDevnetWrite(connection());
  await assert.rejects(assertDevnetWrite(connection(null, '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')), /signing/);
  await assert.rejects(assertDevnetWrite(connection(null, 'unknown-chain')), /signing/);
  const local = { rpcEndpoint: 'http://127.0.0.1:8899', getGenesisHash: async () => 'ephemeral-validator-genesis' };
  await assert.rejects(assertDevnetWrite(local), /signing/);
  await assertDevnetWrite(local, true);
  await assert.rejects(assertDevnetWrite({ ...local, getGenesisHash: async () => '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' }, true), /signing/);
  await assert.rejects(assertDevnetWrite({ ...local, getGenesisHash: async () => '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z' }, true), /signing/);
  await assert.rejects(assertDevnetWrite({ ...local, getGenesisHash: async () => '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d' }, true), /signing/);
  await assert.rejects(assertDevnetWrite({ ...local, getGenesisHash: async () => '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY' }, true), /signing/);
  await assert.rejects(assertDevnetWrite({ ...local, getGenesisHash: async () => 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1' }, true), /signing/);
  assert.equal(DEVNET_GENESIS_HASH, 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG');
  await assert.rejects(assertDevnetWrite({ ...local, rpcEndpoint: 'https://remote-validator.example' }, true), /signing/);
});

test('binding validation refuses an unexpected agent', () => {
  assert.throws(() => assertPolicyBinding({ owner: owner.publicKey, agent: stranger.publicKey }, agent.publicKey, owner.publicKey), /configured agent/);
});

test('runtime blocks wrong ownership before equity writes or paper position changes', async () => {
  let writes = 0, opens = 0, closes = 0;
  const snapshot = {
    owner: stranger.publicKey, agent: agent.publicKey, vendors: [SystemProgram.programId], bump: 0,
    per_tx_cap_usdc: 10_000_000n, per_day_cap_usdc: 20_000_000n, day_spent_usdc: 0n,
    ttl_slots: 1000n, created_at_slot: 0n, last_reset_slot: 0n, max_leverage_bps: 500,
    peak_equity_usdc: 0n, kill_switch_drawdown_pct: 25,
  };
  const trader = { fetchPolicy: async () => snapshot, authorizeSpend: async () => { writes++; throw new Error('must not authorize'); }, recordPnl: async () => { writes++; return { signature: 'fixture' }; } };
  const venue = { name: 'jupiter-perps' as const, mode: 'paper' as const, programId: SystemProgram.programId, equityUsd: async () => 1000, listPositions: async () => [], openPosition: async () => { opens++; throw new Error('must not open'); }, closePosition: async () => { closes++; throw new Error('must not close'); } };
  const runtime = createRuntime({ trader, venue, agent: agent.publicKey, expectedOwner: owner.publicKey, getSlot: async () => 1 });
  await assert.rejects(runtime.handle({ market: 'SOL-PERP', side: 'long', collateralUsd: 1, leverageBps: 100 }), /expected owner/);
  await assert.rejects(runtime.syncEquity(), /expected owner/);
  await assert.rejects(runtime.close('fixture-position'), /expected owner/);
  assert.equal(writes + opens + closes, 0);
});