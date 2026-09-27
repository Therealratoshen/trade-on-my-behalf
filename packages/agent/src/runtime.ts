import type { PublicKey } from '@solana/web3.js';
import type { AuditEvent, AuthorizeSpendInput, PolicyLike, RecordPnlInput } from '@trade-on-my-behalf/sdk';

import { classify, type Signal, type TradeIntent } from './classifier.js';
import { evaluate, type Decision } from './evaluator.js';
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
  const clamp = opts.clamp ?? true;

  async function loadPolicy(): Promise<PolicyLike> {
    const policy = await trader.fetchPolicy();
    if (!policy) throw new Error('no policy on-chain for this agent; run `tomb init-policy` first');
    return policy;
  }

  /** Raises the on-chain peak-equity watermark when equity makes a new high. */
  async function syncEquity(policy?: PolicyLike): Promise<string | undefined> {
    const p = policy ?? (await loadPolicy());
    const equityUsd = await venue.equityUsd();
    const equityMicro = BigInt(Math.round(equityUsd * 1e6));
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
    receipt.equityUsd = equityUsd;
    receipt.preflight = evaluate(policy, {
      vendor: venue.programId,
      amountUsd: intent.collateralUsd,
      leverageBps: intent.leverageBps,
      equityUsd,
      slot: await opts.getSlot(),
    });

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
    const fill = await venue.closePosition(venuePositionId);
    const recordPnlSignature = await syncEquity();
    return { fill, recordPnlSignature };
  }

  return { handle, close, syncEquity };
}

export type Runtime = ReturnType<typeof createRuntime>;
