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

import { AnchorProvider, BN, Program, type Idl, type Wallet as AnchorKeypairWallet } from '@coral-xyz/anchor';
import { Connection, PublicKey, type Transaction, type VersionedTransaction } from '@solana/web3.js';
import {
  assertDevnetWrite,
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

/**
 * What `AnchorProvider` actually needs from a signer: a pubkey and the two
 * signing calls. Phantom's wallet adapter satisfies it; Anchor's own `Wallet`
 * type does not describe it (that type is a Node `Keypair` wrapper).
 */
export interface AdapterWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
  signMessage(msg: Uint8Array): Promise<Uint8Array>;
}

export function makeProgram(connection: Connection, wallet: AdapterWallet): Program {
  // `AnchorProvider` only touches `publicKey` / `signTransaction` /
  // `signAllTransactions` on the object it is handed; its `Wallet` type is the
  // Node-keypair wrapper, which is exactly what a browser must not use.
  const provider = new AnchorProvider(connection, wallet as unknown as AnchorKeypairWallet, {
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
  // This is the dashboard's only write path, and it deliberately does NOT go
  // through `withTrader` (see the module header), so the SDK's devnet gate
  // does not cover it. Without this call a build-time `NEXT_PUBLIC_CLUSTER`
  // of `mainnet-beta` would put a real `update_policy` in front of a user's
  // Phantom wallet, on the program address that also exists on mainnet.
  // Chain identity comes from the node, not from `CLUSTER`.
  await assertDevnetWrite(program.provider.connection);

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

export type { Transaction, VersionedTransaction };

// ---------------------------------------------------------------------------
// SWR comparison
// ---------------------------------------------------------------------------

/**
 * A stable string for anything a panel renders.
 *
 * `decodePolicy` returns live `PublicKey` and `BN` instances, which SWR's
 * default deep-equal cannot compare reliably. The fix is *not* to disable
 * comparison — `compare: () => false` tells SWR "never equal", which
 * re-renders on every pass and loops forever. Compare a serialisation
 * instead: equal string means nothing moved on chain, so no repaint.
 */
export function stableKey(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (v === null || v === undefined) return v;
    if (typeof v === 'bigint') return `${v}n`;
    if (typeof v === 'object') {
      const anyV = v as { toBase58?: () => string; toString?: () => string };
      if (typeof anyV.toBase58 === 'function') return anyV.toBase58();
      if (typeof anyV.toString === 'function' && anyV.toString !== Object.prototype.toString) {
        return anyV.toString();
      }
    }
    return v;
  });
}

/** SWR `compare` for a policy snapshot: equal means "the rules did not move". */
export function samePolicySnapshot(a: unknown, b: unknown): boolean {
  return stableKey(a) === stableKey(b);
}
