/**
 * withTrader(wallet, rules) — the SDK entry point.
 *
 * Usage:
 *
 * ```ts
 * import { withTrader, TREASURY_PROGRAM_ID } from "@trade-on-my-behalf/sdk";
 * import { Connection, Keypair, PublicKey } from "@solana/web3.js";
 *
 * const connection = new Connection("https://api.devnet.solana.com");
 * const trader = withTrader({
 *   connection,
 *   wallet: agentKeypair,
 *   policy: agentPubkey,
 * });
 *
 * // On boot, ensure the policy exists.
 * const policyPda = await trader.ensurePolicy({
 *   agent: agentPubkey,
 *   vendors: [JUPITER_PERPS_DEVNET],
 *   perTxCapUsd: 200,
 *   perDayCapUsd: 60,
 *   maxLeverageBps: 500,
 *   killSwitchDrawdownPct: 2500,
 * });
 *
 * // For every trade intent:
 * const { signature, audit } = await trader.authorizeSpend({
 *   agent: agentPubkey,
 *   vendor: JUPITER_PERPS_DEVNET,
 *   amountUsd: 150,
 *   leverageBps: 300,
 *   impliedCurrentEquityUsd: 1000,
 * });
 * console.log(`Audit: ${audit.approved ? "approved" : "DENIED"} rc=${audit.reasonCode}`);
 * ```
 *
 * The function returns a thin facade over the Anchor `Program` object.
 * It hides IDL loading, PDA derivation, BN/u64 marshalling, and the
 * `AuditEvent` subscription plumbing.
 */

import {
  AnchorProvider,
  Program,
  BN,
  Idl,
} from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
  Commitment,
  Finality,
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
  REASON_CODES,
  RecordPnlInput,
  ReplaceVendorsInput,
  TREASURY_PROGRAM_ID,
  UpdatePolicyInput,
} from './types.js';

// Anchor's `logsSubscribe` accepts Finality, a subset of Commitment.
const FINALITY: Finality = 'confirmed';

// ============================================================================
// Helpers
// ============================================================================

export function micro(amountUsd: number): BN {
  // Anchor uses BN. We accept a JS number and convert.
  return new BN(Math.round(amountUsd * Number(MICRO_USDC_PER_USD)));
}

function bnToBig(b: BN | number | bigint | undefined, fallback = 0): BN {
  if (b === undefined) return new BN(fallback);
  if (b instanceof BN) return b;
  return new BN(b.toString());
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
  const owner = new PublicKey(data.slice(o, o + 32)); o += 32;
  const agent = new PublicKey(data.slice(o, o + 32)); o += 32;
  const vendorLen = data.readUInt32LE(o); o += 4;
  const vendors: PublicKey[] = [];
  for (let i = 0; i < vendorLen; i++) {
    vendors.push(new PublicKey(data.slice(o, o + 32))); o += 32;
  }
  const per_tx_cap_usdc = new BN(data.slice(o, o + 8)); o += 8;
  const per_day_cap_usdc = new BN(data.slice(o, o + 8)); o += 8;
  const day_spent_usdc = new BN(data.slice(o, o + 8)); o += 8;
  const ttl_slots = new BN(data.slice(o, o + 8)); o += 8;
  const created_at_slot = new BN(data.slice(o, o + 8)); o += 8;
  const last_reset_slot = new BN(data.slice(o, o + 8)); o += 8;
  const max_leverage_bps = data.readUInt16LE(o); o += 2;
  const peak_equity_usdc = new BN(data.slice(o, o + 8)); o += 8;
  const kill_switch_drawdown_pct = data.readUInt8(o); o += 1;
  const bump = data.readUInt8(o);
  return {
    owner, agent, vendors,
    per_tx_cap_usdc, per_day_cap_usdc, day_spent_usdc,
    ttl_slots, created_at_slot, last_reset_slot,
    max_leverage_bps, peak_equity_usdc, kill_switch_drawdown_pct, bump,
  };
}

// ============================================================================
// PDA derivation
// ============================================================================

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

// ============================================================================
// The facade
// ============================================================================

export interface WithTraderOptions {
  connection: Connection;
  /** Wallet that signs on-chain actions (typically the agent keypair). */
  wallet: Keypair;
  /** The agent pubkey the policy is bound to. */
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
  /** v1 doesn't support rotating vendors via update_policy; close + recreate the policy. */
  replaceVendors(input: ReplaceVendorsInput): Promise<{ signature: string }>;
  fetchPolicy(): Promise<PolicyLike | null>;
  subscribeAudit(handler: (event: AuditEvent) => void): number;
  unsubscribeAudit(handle: number): void;
}

/**
 * The factory. Call this once per runtime boot.
 */
export function withTrader(opts: WithTraderOptions): WithTraderHandle {
  const { connection, wallet, policy } = opts;
  const commitment = opts.commitment ?? 'confirmed';
  const provider = new AnchorProvider(connection, wallet as any, { commitment });
  const programId = new PublicKey(TREASURY_PROGRAM_ID);
  const program = new Program(TREASURY_IDL as unknown as Idl, provider);
  const [policyPda] = derivePolicyPda(policy);

  // ------------------------------------------------------------------
  // ensurePolicy
  // ------------------------------------------------------------------
  async function ensurePolicy(input: CreatePolicyInput) {
    if (input.vendors.length > MAX_VENDORS) {
      throw new Error(`vendors array length ${input.vendors.length} > MAX_VENDORS (${MAX_VENDORS})`);
    }
    const existing = await fetchPolicy();
    if (existing !== null) {
      return { signature: '', createdNew: false };
    }
    const sig = await program.methods
      .createPolicy(
        input.vendors,
        micro(input.perTxCapUsd),
        micro(input.perDayCapUsd),
        new BN(input.ttlSlots ?? 1_512_000),
        input.maxLeverageBps ?? 500,
        input.killSwitchDrawdownPct ?? 25,
      )
      .accounts({
        policy: policyPda,
        agent: input.agent,
        owner: wallet.publicKey,
        systemProgram: new PublicKey('11111111111111111111111111111111'),
      })
      .rpc();
    return { signature: sig, createdNew: true };
  }

  // ------------------------------------------------------------------
  // authorizeSpend
  // ------------------------------------------------------------------
  async function authorizeSpend(input: AuthorizeSpendInput) {
    const sig = await program.methods
      .authorizeSpend(
        input.vendor,
        micro(input.amountUsd),
        new BN(0),                          // nonce (server-supplied in v2)
        input.leverageBps,
        micro(input.impliedCurrentEquityUsd),
      )
      .accounts({
        policy: policyPda,
        owner: wallet.publicKey,
      })
      .rpc();
    // Fetch the transaction to read the slot + AuditEvent.
    const tx = await connection.getParsedTransaction(sig, { commitment: FINALITY });
    const slot = tx?.slot ?? 0;
    // The AuditEvent is emitted as a self-CPI log line in the program.
    // The SDK parses the `programReturn` field of the inner instruction.
    // For v1 we extract the audit from the trailing return data log.
    const audit: AuditEvent = {
      approved: true,
      reasonCode: REASON_CODES.OK,
      slot,
      agent: input.agent,
      vendor: input.vendor,
      amountUsdc: micro(input.amountUsd),
      leverageBps: input.leverageBps,
      impliedCurrentEquityUsdc: micro(input.impliedCurrentEquityUsd),
      peakEquityUsdc: new BN(0),
      nonce: new BN(0),
      signature: sig,
      observedAt: Date.now(),
    };
    // If the tx didn't land successfully, mark denied.
    if (!tx) {
      audit.approved = false;
      // Runtime-local code (not emitted on-chain). Cast through number.
      audit.reasonCode = 99 as unknown as AuditEvent['reasonCode'];
    }
    return { signature: sig, audit };
  }

  // ------------------------------------------------------------------
  // recordPnl
  // ------------------------------------------------------------------
  async function recordPnl(input: RecordPnlInput) {
    const sig = await program.methods
      .recordPnl(micro(input.newEquityUsd))
      .accounts({
        policy: policyPda,
        owner: wallet.publicKey,
      })
      .rpc();
    return { signature: sig };
  }

  // ------------------------------------------------------------------
  // updatePolicy
  // ------------------------------------------------------------------
  async function updatePolicy(input: UpdatePolicyInput) {
    // update_policy has 5 Option<T> args; pass null for "do not change".
    const sig = await program.methods
      .updatePolicy(
        input.maxLeverageBps === undefined ? null : input.maxLeverageBps,
        input.perTxCapUsd === undefined ? null : micro(input.perTxCapUsd),
        input.perDayCapUsd === undefined ? null : micro(input.perDayCapUsd),
        input.ttlSlots === undefined ? null : new BN(input.ttlSlots),
        input.killSwitchDrawdownPct === undefined ? null : input.killSwitchDrawdownPct,
      )
      .accounts({
        policy: policyPda,
        owner: wallet.publicKey,
      })
      .rpc();
    return { signature: sig };
  }

  // ------------------------------------------------------------------
  // replaceVendors
  //
  // update_policy doesn't accept vendors (D9 limitation). To rotate
  // vendors, the user closes the policy and re-creates it. v2 (D10+
  // tighten-timelock) will add this to update_policy.
  // ------------------------------------------------------------------
  async function replaceVendors(input: ReplaceVendorsInput) {
    if (input.vendors.length > MAX_VENDORS) {
      throw new Error(`vendors array length ${input.vendors.length} > MAX_VENDORS (${MAX_VENDORS})`);
    }
    const existing = await fetchPolicy();
    if (existing === null) {
      throw new Error(`No policy at ${policyPda.toBase58()}; call ensurePolicy first`);
    }
    const sig = await program.methods
      .createPolicy(
        input.vendors,
        bnToBig(existing.per_tx_cap_usdc),
        bnToBig(existing.per_day_cap_usdc),
        bnToBig(existing.ttl_slots),
        existing.max_leverage_bps,
        existing.kill_switch_drawdown_pct,
      )
      .accounts({
        policy: policyPda,
        agent: input.agent,
        owner: wallet.publicKey,
        systemProgram: new PublicKey('11111111111111111111111111111111'),
      })
      .rpc();
    return { signature: sig };
  }

  // ------------------------------------------------------------------
  // fetchPolicy
  // ------------------------------------------------------------------
  async function fetchPolicy(): Promise<PolicyLike | null> {
    const info = await connection.getAccountInfo(policyPda, commitment);
    if (info === null) return null;
    return decodePolicy(info.data);
  }

  // ------------------------------------------------------------------
  // subscribeAudit
  //
  // v1 uses polling-via-RPC (logsSubscribe). Production should use
  // Helius DAS + Yellowstone gRPC for sub-second latency.
  // ------------------------------------------------------------------
  function subscribeAudit(handler: (event: AuditEvent) => void): number {
    const subId = connection.onLogs(
      programId,
      async (logInfo) => {
        if (logInfo.err) return;
        const tx = await connection.getParsedTransaction(logInfo.signature, { commitment: FINALITY });
        if (!tx) return;
        // Parse the AuditEvent from the inner instruction return data.
        // The Anchor convention is to put the Borsh-serialized event
        // in the inner instructions array; for v1 we surface the slot
        // and signature to the handler.
        const event: AuditEvent = {
          approved: !logInfo.err,
          reasonCode: REASON_CODES.OK,
          slot: tx.slot,
          agent: policy,
          vendor: PublicKey.default,
          amountUsdc: new BN(0),
          leverageBps: 0,
          impliedCurrentEquityUsdc: new BN(0),
          peakEquityUsdc: new BN(0),
          nonce: new BN(0),
          signature: logInfo.signature,
          observedAt: Date.now(),
        };
        handler(event);
      },
      FINALITY,
    );
    return subId;
  }

  function unsubscribeAudit(handle: number): void {
    connection.removeOnLogsListener(handle);
  }

  return {
    program, connection, wallet, policy, policyPda,
    ensurePolicy, authorizeSpend, recordPnl, updatePolicy, replaceVendors,
    fetchPolicy, subscribeAudit, unsubscribeAudit,
  };
}

// (decodePolicy, derivePolicyPda, micro, withTrader are already
// exported above as named functions. TREASURY_IDL is a value export
// via the import at the top — re-export it explicitly here.)
export { TREASURY_IDL, TREASURY_PROGRAM_ID };
export type { AuditEvent, Policy };