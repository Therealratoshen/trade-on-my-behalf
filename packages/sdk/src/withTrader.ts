/**
 * withTrader(wallet, rules) — the SDK entry point.
 *
 * Two keys, two handles. The owner (the user's wallet) creates and tightens
 * the policy; the agent (a hot key on the runtime host) asks for permission
 * on every trade. Both handles point at the same policy PDA, which is keyed
 * by the agent pubkey.
 *
 * ```ts
 * import { withTrader } from "@trade-on-my-behalf/sdk";
 * import { Connection } from "@solana/web3.js";
 *
 * const connection = new Connection("https://api.devnet.solana.com");
 *
 * // Owner, once:
 * const owner = withTrader({ connection, wallet: ownerKeypair, policy: agentKeypair.publicKey });
 * await owner.ensurePolicy({
 *   agent: agentKeypair.publicKey,
 *   vendors: [JUPITER_PERPS_PROGRAM_ID],
 *   perTxCapUsd: 200,
 *   perDayCapUsd: 600,
 *   maxLeverageBps: 500,        // 5x
 *   killSwitchDrawdownPct: 25,  // percent, not bps
 * });
 *
 * // Agent, for every trade intent:
 * const agent = withTrader({ connection, wallet: agentKeypair, policy: agentKeypair.publicKey });
 * const { audit } = await agent.authorizeSpend({
 *   agent: agentKeypair.publicKey,
 *   vendor: JUPITER_PERPS_PROGRAM_ID,
 *   amountUsd: 150,
 *   leverageBps: 300,
 *   impliedCurrentEquityUsd: 1000,
 * });
 * if (!audit.approved) console.log(`DENIED: ${reasonCodeName(audit.reasonCode)}`);
 * ```
 */

import {
  AnchorProvider,
  EventParser,
  Idl,
  Program,
  Wallet,
} from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
  Commitment,
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';

import { IDL as TREASURY_IDL } from './treasury.idl.js';
import {
  AuditEvent,
  AuthorizeSpendInput,
  CreatePolicyInput,
  MAX_VENDORS,
  MICRO_USDC_PER_USD,
  Policy,
  PolicyLike,
  RecordPnlInput,
  ReplaceVendorsInput,
  TREASURY_PROGRAM_ID,
  UpdatePolicyInput,
} from './types.js';

// ============================================================================
// Helpers
// ============================================================================

export function micro(amountUsd: number): BN {
  return new BN(Math.round(amountUsd * Number(MICRO_USDC_PER_USD)));
}

/**
 * Decode the on-chain `Policy` account into a typed JS object.
 *
 * Mirror of `programs/treasury/programs/treasury/src/state/mod.rs::Policy`.
 * Borsh layout is in declaration order with no padding. The Anchor
 * 8-byte discriminator precedes the fields.
 */
export function decodePolicy(data: Buffer): PolicyLike {
  let o = 8; // skip Anchor discriminator
  const owner = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const agent = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const vendorLen = data.readUInt32LE(o); o += 4;
  const vendors: PublicKey[] = [];
  for (let i = 0; i < vendorLen; i++) {
    vendors.push(new PublicKey(data.subarray(o, o + 32))); o += 32;
  }
  const u64 = () => { const v = new BN(data.subarray(o, o + 8), 'le'); o += 8; return v; };
  const per_tx_cap_usdc = u64();
  const per_day_cap_usdc = u64();
  const day_spent_usdc = u64();
  const ttl_slots = u64();
  const created_at_slot = u64();
  const last_reset_slot = u64();
  const max_leverage_bps = data.readUInt16LE(o); o += 2;
  const peak_equity_usdc = u64();
  const kill_switch_drawdown_pct = data.readUInt8(o); o += 1;
  const bump = data.readUInt8(o);
  return {
    owner, agent, vendors,
    per_tx_cap_usdc, per_day_cap_usdc, day_spent_usdc,
    ttl_slots, created_at_slot, last_reset_slot,
    max_leverage_bps, peak_equity_usdc, kill_switch_drawdown_pct, bump,
  };
}

/**
 * Derive the policy PDA for a given agent.
 * Seeds: [b"policy", agent_pubkey]
 */
export function derivePolicyPda(agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('policy'), agent.toBuffer()],
    new PublicKey(TREASURY_PROGRAM_ID),
  );
}

interface RawAuditEvent {
  policy: PublicKey;
  agent: PublicKey;
  vendor: PublicKey;
  amountUsdc: BN;
  approved: boolean;
  reasonCode: number;
  nonce: BN;
  atSlot: BN;
}

function toAuditEvent(raw: RawAuditEvent, signature: string): AuditEvent {
  return {
    policy: raw.policy,
    agent: raw.agent,
    vendor: raw.vendor,
    amountUsdc: raw.amountUsdc,
    approved: raw.approved,
    reasonCode: raw.reasonCode as AuditEvent['reasonCode'],
    nonce: raw.nonce,
    slot: raw.atSlot.toNumber(),
    signature,
    observedAt: Date.now(),
  };
}

/**
 * Parse every `AuditEvent` out of a transaction's log messages.
 * `authorize_spend` returns Ok on deny, so the event is the only place the
 * approve/deny decision lives — never infer it from transaction success.
 */
export function parseAuditEvents(program: Program, logs: string[], signature: string): AuditEvent[] {
  const parser = new EventParser(program.programId, program.coder);
  const out: AuditEvent[] = [];
  for (const ev of parser.parseLogs(logs)) {
    if (ev.name === 'auditEvent' || ev.name === 'AuditEvent') {
      out.push(toAuditEvent(ev.data as unknown as RawAuditEvent, signature));
    }
  }
  return out;
}

let lastNonce = 0n;
/** Strictly increasing per process: microseconds since epoch, bumped on collision. */
function nextNonce(): BN {
  let n = BigInt(Date.now()) * 1000n;
  if (n <= lastNonce) n = lastNonce + 1n;
  lastNonce = n;
  return new BN(n.toString());
}

// ============================================================================
// The facade
// ============================================================================

export interface WithTraderOptions {
  connection: Connection;
  /** Keypair that signs: the owner for policy admin, the agent for trades. */
  wallet: Keypair;
  /** The agent pubkey the policy is bound to (PDA seed). */
  policy: PublicKey;
  /** Commitment level. Default 'confirmed'. */
  commitment?: Commitment;
}

export interface WithTraderHandle {
  program: Program;
  connection: Connection;
  wallet: Keypair;
  policy: PublicKey;
  policyPda: PublicKey;

  ensurePolicy(input: CreatePolicyInput): Promise<{ signature: string; createdNew: boolean }>;
  authorizeSpend(input: AuthorizeSpendInput): Promise<{ signature: string; audit: AuditEvent }>;
  recordPnl(input: RecordPnlInput): Promise<{ signature: string }>;
  updatePolicy(input: UpdatePolicyInput): Promise<{ signature: string }>;
  /** Not supported by the v1 program; throws. See the method body. */
  replaceVendors(input: ReplaceVendorsInput): Promise<{ signature: string }>;
  fetchPolicy(): Promise<PolicyLike | null>;
  /** Subscribe to decoded AuditEvents for this policy only. */
  subscribeAudit(handler: (event: AuditEvent) => void): number;
  unsubscribeAudit(handle: number): Promise<void>;
}

export function withTrader(opts: WithTraderOptions): WithTraderHandle {
  const { connection, wallet, policy } = opts;
  const commitment = opts.commitment ?? 'confirmed';
  const confirmOpts: ConfirmOptions = { commitment, preflightCommitment: commitment };
  const provider = new AnchorProvider(connection, new Wallet(wallet), confirmOpts);
  const program = new Program(TREASURY_IDL as unknown as Idl, provider);
  const [policyPda] = derivePolicyPda(policy);

  async function fetchPolicy(): Promise<PolicyLike | null> {
    const info = await connection.getAccountInfo(policyPda, commitment);
    if (info === null) return null;
    return decodePolicy(info.data);
  }

  async function ensurePolicy(input: CreatePolicyInput) {
    if (input.vendors.length > MAX_VENDORS) {
      throw new Error(`vendors array length ${input.vendors.length} > MAX_VENDORS (${MAX_VENDORS})`);
    }
    if (!input.agent.equals(policy)) {
      throw new Error(`input.agent ${input.agent.toBase58()} does not match handle policy ${policy.toBase58()}`);
    }
    if (await fetchPolicy()) return { signature: '', createdNew: false };
    const signature = await program.methods
      .createPolicy(
        input.vendors,
        micro(input.perTxCapUsd),
        micro(input.perDayCapUsd),
        new BN((input.ttlSlots ?? 1_512_000).toString()),
        input.maxLeverageBps ?? 500,
        input.killSwitchDrawdownPct ?? 25,
      )
      .accounts({
        policy: policyPda,
        agent: input.agent,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc(confirmOpts);
    return { signature, createdNew: true };
  }

  async function authorizeSpend(input: AuthorizeSpendInput) {
    const signature = await program.methods
      .authorizeSpend(
        input.vendor,
        micro(input.amountUsd),
        input.nonce !== undefined ? new BN(input.nonce.toString()) : nextNonce(),
        input.leverageBps,
        micro(input.impliedCurrentEquityUsd),
      )
      .accounts({ policy: policyPda, authority: wallet.publicKey })
      .rpc(confirmOpts);

    const tx = await connection.getTransaction(signature, {
      commitment: commitment === 'finalized' ? 'finalized' : 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    const audits = parseAuditEvents(program, tx?.meta?.logMessages ?? [], signature);
    if (audits.length !== 1) {
      throw new Error(
        `authorize_spend ${signature}: expected 1 AuditEvent in logs, found ${audits.length}. ` +
        'Refusing to guess the decision.',
      );
    }
    return { signature, audit: audits[0] };
  }

  async function recordPnl(input: RecordPnlInput) {
    const signature = await program.methods
      .recordPnl(micro(input.newEquityUsd))
      .accounts({ policy: policyPda, authority: wallet.publicKey })
      .rpc(confirmOpts);
    return { signature };
  }

  async function updatePolicy(input: UpdatePolicyInput) {
    // update_policy takes 5 Option<T> args; null means "do not change".
    const signature = await program.methods
      .updatePolicy(
        input.maxLeverageBps ?? null,
        input.perTxCapUsd === undefined ? null : micro(input.perTxCapUsd),
        input.perDayCapUsd === undefined ? null : micro(input.perDayCapUsd),
        input.ttlSlots === undefined ? null : new BN(input.ttlSlots.toString()),
        input.killSwitchDrawdownPct ?? null,
      )
      .accounts({ policy: policyPda, owner: wallet.publicKey })
      .rpc(confirmOpts);
    return { signature };
  }

  async function replaceVendors(_input: ReplaceVendorsInput): Promise<{ signature: string }> {
    // The v1 program has no instruction that edits `vendors` and no
    // close_policy, and create_policy uses `init` so it cannot overwrite the
    // PDA. Rotating venues today means a new agent key (new PDA).
    throw new Error(
      'replaceVendors is not supported by the v1 program: vendors are fixed at create_policy. ' +
      'Generate a new agent keypair and call ensurePolicy with the new vendor list.',
    );
  }

  function subscribeAudit(handler: (event: AuditEvent) => void): number {
    return program.addEventListener('auditEvent', (raw: unknown, _slot: number, signature: string) => {
      const ev = raw as RawAuditEvent;
      if (!ev.policy.equals(policyPda)) return;
      handler(toAuditEvent(ev, signature));
    });
  }

  async function unsubscribeAudit(handle: number): Promise<void> {
    await program.removeEventListener(handle);
  }

  return {
    program, connection, wallet, policy, policyPda,
    ensurePolicy, authorizeSpend, recordPnl, updatePolicy, replaceVendors,
    fetchPolicy, subscribeAudit, unsubscribeAudit,
  };
}

export { TREASURY_IDL, TREASURY_PROGRAM_ID };
export type { AuditEvent, Policy };
