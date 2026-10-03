import type { PolicyLike } from '@trade-on-my-behalf/sdk';
import { isMarket, type Market, type Side } from './venue/index.js';

/** Whatever a signal source emits (manual CLI, sampler, copy-trade relay). */
export interface Signal {
  market: string;
  side: string;
  collateralUsd: number;
  leverageBps: number;
  rationale?: string;
  source?: string;
}

export interface TradeIntent {
  market: Market;
  side: Side;
  collateralUsd: number;
  leverageBps: number;
  rationale: string;
  source: string;
  /** Human-readable notes on what the classifier changed. */
  clamps: string[];
}

export type Classified = { intent: TradeIntent } | { dropped: string };

/**
 * Normalizes a raw signal. With `clamp` on, size and leverage are cut down
 * to the policy caps so a well-behaved agent never asks for more than the
 * user allowed. With `clamp` off the intent goes to the chain as-is, which
 * is how a buggy or compromised agent would behave — the on-chain check is
 * what stops it.
 */
export function classify(signal: Signal, policy: PolicyLike, clamp: boolean): Classified {
  if (!isMarket(signal.market)) return { dropped: `unknown market ${signal.market}` };
  if (signal.side !== 'long' && signal.side !== 'short') return { dropped: `bad side ${signal.side}` };
  const collateralMicro = Math.round(signal.collateralUsd * 1e6);
  if (!Number.isFinite(signal.collateralUsd) || signal.collateralUsd <= 0
      || !Number.isSafeInteger(collateralMicro) || collateralMicro <= 0) {
    return { dropped: 'collateralUsd must be finite, positive and safely representable in quote microunits' };
  }
  if (!Number.isInteger(signal.leverageBps) || signal.leverageBps < 100 || signal.leverageBps > 65535) {
    return { dropped: 'leverageBps must be an integer from 100 (1x) to 65535' };
  }

  let collateralUsd = signal.collateralUsd;
  let leverageBps = signal.leverageBps;
  const clamps: string[] = [];
  if (clamp) {
    const perTxUsd = Number(policy.per_tx_cap_usdc.toString()) / 1e6;
    if (collateralUsd > perTxUsd) {
      clamps.push(`collateral ${collateralUsd} -> ${perTxUsd} (per-trade cap)`);
      collateralUsd = perTxUsd;
    }
    if (policy.max_leverage_bps !== 0 && leverageBps > policy.max_leverage_bps) {
      clamps.push(`leverage ${leverageBps / 100}x -> ${policy.max_leverage_bps / 100}x (leverage cap)`);
      leverageBps = policy.max_leverage_bps;
    }
    if (leverageBps < 100) return { dropped: 'policy leverage cap is below the minimum supported 1x' };
    if (collateralUsd < 1) return { dropped: 'collateral below $1 after clamping' };
  }

  return {
    intent: {
      market: signal.market,
      side: signal.side,
      collateralUsd,
      leverageBps,
      rationale: signal.rationale ?? '',
      source: signal.source ?? 'manual',
      clamps,
    },
  };
}
