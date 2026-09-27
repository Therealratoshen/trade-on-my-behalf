/**
 * Offline tests for the two places where the SDK turns raw chain bytes into
 * decisions: Policy account decoding and AuditEvent log parsing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnchorProvider, BN, Idl, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

import { decodePolicy, parseAuditEvents, TREASURY_IDL, TREASURY_PROGRAM_ID } from '../src/index.js';

const idl = TREASURY_IDL as unknown as Idl;
// Program camelCases the IDL; encode with its coder so field names match what the SDK decodes.
const program = new Program(idl, new AnchorProvider(new Connection("http://127.0.0.1:8899"), new Wallet(Keypair.generate()), {}));
const coder = program.coder;

test('decodePolicy reads u64 fields little-endian', async () => {
  const owner = Keypair.generate().publicKey;
  const agent = Keypair.generate().publicKey;
  const vendor = Keypair.generate().publicKey;
  const data = await coder.accounts.encode('policy', {
    owner,
    agent,
    vendors: [vendor],
    perTxCapUsdc: new BN(200_000_000),
    perDayCapUsdc: new BN(600_000_000),
    daySpentUsdc: new BN(150_000_000),
    ttlSlots: new BN(1_512_000),
    createdAtSlot: new BN(123_456),
    lastResetSlot: new BN(123_456),
    maxLeverageBps: 500,
    peakEquityUsdc: new BN(1_000_000_000),
    killSwitchDrawdownPct: 25,
    bump: 254,
  });

  const p = decodePolicy(data);
  assert.ok(p.owner.equals(owner));
  assert.ok(p.agent.equals(agent));
  assert.equal(p.vendors.length, 1);
  assert.equal(p.per_tx_cap_usdc.toString(), '200000000');
  assert.equal(p.per_day_cap_usdc.toString(), '600000000');
  assert.equal(p.day_spent_usdc.toString(), '150000000');
  assert.equal(p.created_at_slot.toString(), '123456');
  assert.equal(p.max_leverage_bps, 500);
  assert.equal(p.peak_equity_usdc.toString(), '1000000000');
  assert.equal(p.kill_switch_drawdown_pct, 25);
  assert.equal(p.bump, 254);
});

function auditLog(fields: Record<string, unknown>): string[] {
  const disc = Buffer.from(TREASURY_IDL.events.find((e) => e.name === 'AuditEvent')!.discriminator);
  const body = coder.types.encode('auditEvent', fields);
  const b64 = Buffer.concat([disc, body]).toString('base64');
  return [
    `Program ${TREASURY_PROGRAM_ID} invoke [1]`,
    'Program log: Instruction: AuthorizeSpend',
    `Program data: ${b64}`,
    `Program ${TREASURY_PROGRAM_ID} success`,
  ];
}

test('parseAuditEvents surfaces a deny even though the transaction succeeded', () => {
  const policy = PublicKey.unique();
  const logs = auditLog({
    policy,
    agent: PublicKey.unique(),
    vendor: PublicKey.unique(),
    amountUsdc: new BN(500_000),
    approved: false,
    reasonCode: 6,
    nonce: new BN(42),
    atSlot: new BN(999),
  });

  const events = parseAuditEvents(program, logs, 'sig123');
  assert.equal(events.length, 1);
  assert.equal(events[0].approved, false);
  assert.equal(events[0].reasonCode, 6);
  assert.equal(events[0].slot, 999);
  assert.equal(events[0].amountUsdc.toString(), '500000');
  assert.ok(events[0].policy.equals(policy));
  assert.equal(events[0].signature, 'sig123');
});

test('parseAuditEvents returns nothing for logs without an event', () => {
  assert.deepEqual(parseAuditEvents(program, [`Program ${TREASURY_PROGRAM_ID} invoke [1]`], 's'), []);
});
