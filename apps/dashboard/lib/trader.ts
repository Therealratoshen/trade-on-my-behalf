/**
 * Chain access for the dashboard.
 *
 * Everything here is read-mostly. There is exactly one write path
 * (`updatePolicy`) and it is signed by the user's own Phantom wallet — the
 * dashboard never holds a key and never pushes an intent to the kernel.
 *
 * On `withTrader`: the SDK's `withTrader({ wallet })` takes a
 * `@solana/web3.js` `Keypair` because the v1 use case is the runtime's hot
 * key. A browser wallet is not a keypair and the SDK has no adapter-wallet
 * entry point, so this module reproduces the two calls the dashboard needs
 * (`fetchPolicy` + `updatePolicy`) directly on top of the SDK's exported IDL,
 * PDA derivation, borsh decoder and log parser. Argument order and account
 * metas are identical to `packages/sdk/src/withTrader.ts`; keep them in sync.
 */

import {
  AnchorProvider,
  BN,
  Program,
  type AnchorWallet,
  type Idl,
} from '@coral-xyz/anchor';
import { Connection, PublicKey, type Transaction } from '@solana/web3.js';
import {
  decodePolicy,
  derivePolicyPda,
  micro,
  parseAuditEvents,
  TREASURY_IDL,
  TREASURY_PROGRAM_ID,
  type AuditEvent,
  type PolicyLike,
  type UpdatePolicyInput,
} from '@trade-on-my-behalf/sdk';

const COMMITMENT = 'confirmed' as const;

/** An `AuditEvent` plus the wall-clock the RPC gave us for its block. */
export interface AuditRow extends AuditEvent {
  /** unix seconds, or null when the node did not return a block time. */
  blockTime: number | null;
}

export function makeConnection(endpoint: string): Connection {
  return new Connection(endpoint, COMMITMENT);
}

export function makeProgram(connection: Connection, wallet: AnchorWallet): Program {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: COMMITMENT,
    preflightCommitment: COMMITMENT,
  });
  return new Program(TREASURY_IDL as unknown as Idl, provider);
}

/** `derivePolicyPda` is the SDK's; re-exported so callers need one import. */
export { derivePolicyPda, TREASURY_PROGRAM_ID };

export interface PolicySnapshot {
  pda: PublicKey;
  policy: PolicyLike | null;
}

export async function fetchPolicy(
  connection: Connection,
  agent: PublicKey,
): Promise<PolicySnapshot> {
  const [pda] = derivePolicyPda(agent);
  const info = await connection.getAccountInfo(pda, COMMITMENT);
  return { pda, policy: info === null ? null : decodePolicy(info.data) };
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

/** How many recent program signatures to look at per poll. */
const SIGNATURE_WINDOW = 50;

/** Keep at most this many decoded transactions in memory. */
const CACHE_LIMIT = 250;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Polls the program for new `AuditEvent`s.
 *
 * A cheap `getSignaturesForAddress` runs on every tick; `getTransaction` (the
 * expensive call) only runs for signatures we have not decoded yet. That keeps
 * a 2s poll interval affordable on a public RPC.
 */
export class AuditFeed {
  private readonly cache = new Map<string, AuditRow[]>();

  constructor(
    private readonly connection: Connection,
    private readonly program: Program,
  ) {}

  /** Drops decoded history, e.g. after a wallet switch. */
  reset(): void {
    this.cache.clear();
  }

  async poll(policyPda: PublicKey): Promise<AuditRow[]> {
    const programId = new PublicKey(TREASURY_PROGRAM_ID);
    const latest = await this.connection.getSignaturesForAddress(programId, {
      limit: SIGNATURE_WINDOW,
    });

    const missing = latest.map((s) => s.signature).filter((sig) => !this.cache.has(sig));

    // 8 at a time: enough to stay under a public RPC's per-method rate limit
    // while still catching up within a couple of polls.
    for (const batch of chunk(missing, 8)) {
      await Promise.all(
        batch.map(async (signature) => {
          let rows: AuditRow[] = [];
          try {
            const tx = await this.connection.getTransaction(signature, {
              commitment: COMMITMENT,
              maxSupportedTransactionVersion: 0,
            });
            const events = parseAuditEvents(this.program, tx?.meta?.logMessages ?? [], signature);
            rows = events.map((e) => ({ ...e, blockTime: tx?.blockTime ?? null }));
          } catch {
            // A node that cannot serve this transaction is not fatal; an empty
            // row set simply means "no events here".
            rows = [];
          }
          this.cache.set(signature, rows);
        }),
      );
    }

    if (this.cache.size > CACHE_LIMIT) {
      const drop = this.cache.size - CACHE_LIMIT;
      let i = 0;
      for (const key of this.cache.keys()) {
        if (i++ >= drop) break;
        this.cache.delete(key);
      }
    }

    const out: AuditRow[] = [];
    for (const rows of this.cache.values()) {
      for (const row of rows) {
        if (row.policy.equals(policyPda)) out.push(row);
      }
    }
    out.sort((a, b) => b.slot - a.slot || Number(b.nonce.toString()) - Number(a.nonce.toString()));
    return out;
  }
}

// ---------------------------------------------------------------------------
// The single write path
// ---------------------------------------------------------------------------

export type UpdateResult = { signature: string };

/**
 * `update_policy`, owner-signed through Phantom Connect.
 *
 * Mirrors `withTrader().updatePolicy`: each of the five args is an
 * `Option<T>` on chain, and `undefined` means "leave this field alone".
 */
export async function updatePolicy(
  program: Program,
  policyPda: PublicKey,
  owner: PublicKey,
  input: UpdatePolicyInput,
): Promise<UpdateResult> {
  const signature: string = await program.methods
    .updatePolicy(
      input.maxLeverageBps ?? null,
      input.perTxCapUsd === undefined ? null : micro(input.perTxCapUsd),
      input.perDayCapUsd === undefined ? null : micro(input.perDayCapUsd),
      input.ttlSlots === undefined ? null : new BN(input.ttlSlots.toString()),
      input.killSwitchDrawdownPct ?? null,
    )
    .accounts({ policy: policyPda, owner })
    .rpc({ commitment: COMMITMENT, preflightCommitment: COMMITMENT });
  return { signature };
}

/** Type re-export so the Phantom adapter can be dropped in without a cast. */
export type { AnchorWallet, Transaction };
