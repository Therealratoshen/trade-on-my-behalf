import type { PublicKey } from '@solana/web3.js';
import type { AuditEvent, AuthorizeSpendInput, PolicyLike, RecordPnlInput } from '@trade-on-my-behalf/sdk';
import { SLOTS_PER_DAY, assertPolicyBinding } from '@trade-on-my-behalf/sdk';

import { classify, type Signal, type TradeIntent } from './classifier.js';
import { equityMicros, evaluate, type Decision } from './evaluator.js';
import type { Fill, Venue } from './venue/index.js';

/** The slice of the SDK handle the runtime needs; lets tests swap in a fake chain. */
export interface TraderLike {
  fetchPolicy(): Promise<PolicyLike | null>;
  authorizeSpend(input: AuthorizeSpendInput): Promise<{ signature: string; audit: AuditEvent }>;
  recordPnl(input: RecordPnlInput): Promise<{ signature: string }>;
}

export interface RuntimeOptions {
  trader: TraderLike;
  venue: Venue;
  agent: PublicKey;
  /** Trusted user wallet, supplied independently of the fetched policy. */
  expectedOwner: PublicKey;
  getSlot: () => Promise<number>;
  /** Clamp signals to the policy caps before asking the chain. Default true. */
  clamp?: boolean;
}

export interface TradeReceipt {
  signal: Signal;
  intent?: TradeIntent;
  dropped?: string;
  equityUsd?: number;
  preflight?: Decision;
  audit?: AuditEvent;
  /** Off-chain mirror disagreed with the chain. The chain's answer was used. */
  mismatch?: boolean;
  fill?: Fill;
  /** Venue failed after the chain approved; the spend is still counted on-chain. */
  venueError?: string;
  recordPnlSignature?: string;
}

export function createRuntime(opts: RuntimeOptions) {
  const { trader, venue, agent } = opts;
  if (venue.mode !== 'paper') throw new Error('Live venue execution is disabled in this project. Use paper mode.');
  if (!opts.expectedOwner) throw new Error('An independently configured expectedOwner is required.');
  const clamp = opts.clamp ?? true;

  async function loadPolicy(): Promise<PolicyLike> {
    const policy = await trader.fetchPolicy();
    if (!policy) throw new Error('no policy on-chain for this agent; run `tomb init-policy` first');
    assertPolicyBinding(policy, agent, opts.expectedOwner);
    return policy;
  }

  /** Raises the on-chain peak-equity watermark when equity makes a new high. */
  async function syncEquity(policy?: PolicyLike): Promise<string | undefined> {
    const p = policy ?? (await loadPolicy());
    assertPolicyBinding(p, agent, opts.expectedOwner);
    const equityUsd = await venue.equityUsd();
    const equityMicro = equityMicros(equityUsd);
    if (equityMicro <= BigInt(p.peak_equity_usdc.toString())) return undefined;
    const { signature } = await trader.recordPnl({ agent, newEquityUsd: equityUsd });
    return signature;
  }

  async function handle(signal: Signal): Promise<TradeReceipt> {
    const receipt: TradeReceipt = { signal };
    let policy = await loadPolicy();

    const classified = classify(signal, policy, clamp);
    if ('dropped' in classified) {
      receipt.dropped = classified.dropped;
      return receipt;
    }
    const intent = classified.intent;
    receipt.intent = intent;

    const pnlSig = await syncEquity(policy);
    if (pnlSig) {
      receipt.recordPnlSignature = pnlSig;
      policy = await loadPolicy();
    }

    const equityUsd = await venue.equityUsd();
    equityMicros(equityUsd);
    if (equityUsd <= 0) throw new Error('No positive paper equity is available; authorization is blocked.');
    receipt.equityUsd = equityUsd;
    const slot = await opts.getSlot();
    receipt.preflight = evaluate(policy, {
      vendor: venue.programId,
      amountUsd: intent.collateralUsd,
      leverageBps: intent.leverageBps,
      equityUsd,
      slot,
    });
    // The existing contract saturates its u64 counter. At a maximum-sized
    // daily cap, an overflow could otherwise approve without charging fully.
    const spent = BigInt(slot) - BigInt(policy.last_reset_slot.toString()) >= BigInt(SLOTS_PER_DAY)
      ? 0n : BigInt(policy.day_spent_usdc.toString());
    if (spent + equityMicros(intent.collateralUsd) > (1n << 64n) - 1n) {
      receipt.dropped = 'Daily-spend counter would overflow; authorization skipped.';
      return receipt;
    }

    // Every intent goes to the chain, denies included: the deny receipt is the product.
    const { audit } = await trader.authorizeSpend({
      agent,
      vendor: venue.programId,
      amountUsd: intent.collateralUsd,
      leverageBps: intent.leverageBps,
      impliedCurrentEquityUsd: equityUsd,
    });
    receipt.audit = audit;
    receipt.mismatch =
      audit.approved !== receipt.preflight.approved || audit.reasonCode !== receipt.preflight.reasonCode;

    if (!audit.approved) return receipt;

    try {
      receipt.fill = await venue.openPosition({
        market: intent.market,
        side: intent.side,
        collateralUsd: intent.collateralUsd,
        leverageBps: intent.leverageBps,
      });
    } catch (e) {
      receipt.venueError = e instanceof Error ? e.message : String(e);
    }
    return receipt;
  }

  async function close(venuePositionId: string) {
    await loadPolicy();
    const fill = await venue.closePosition(venuePositionId);
    const recordPnlSignature = await syncEquity();
    return { fill, recordPnlSignature };
  }

  return { handle, close, syncEquity };
}

export type Runtime = ReturnType<typeof createRuntime>;
