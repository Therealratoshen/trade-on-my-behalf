import type { PublicKey } from '@solana/web3.js';

import type { SpendPermit } from './permit.js';

export type { SpendPermit };

export type Side = 'long' | 'short';
export type VenueName = 'jupiter-perps';

/** Markets the runtime understands. Keys are the names used in signals and the CLI. */
export const MARKETS = {
  'SOL-PERP': { base: 'SOL', mint: 'So11111111111111111111111111111111111111112' },
  'ETH-PERP': { base: 'ETH', mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs' },
  'BTC-PERP': { base: 'BTC', mint: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh' },
} as const;
export type Market = keyof typeof MARKETS;

export function isMarket(m: string): m is Market {
  return Object.prototype.hasOwnProperty.call(MARKETS, m);
}

export interface OpenParams {
  market: Market;
  side: Side;
  /** Collateral committed, in USD. This is the amount the policy caps. */
  collateralUsd: number;
  /** Leverage in basis points (100 = 1x, 500 = 5x). */
  leverageBps: number;
  /**
   * Proof that the on-chain gate approved *this exact* order.
   *
   * Required, not optional. `openPosition` throws `PermitError` without it,
   * or when the permit's vendor/amount/leverage/market/side disagree with the
   * order, or when its nonce was already spent. See `venue/permit.ts` for
   * what this does and does not prove.
   */
  permit: SpendPermit;
}

export interface Position {
  venuePositionId: string;
  market: Market;
  side: Side;
  collateralUsd: number;
  leverageBps: number;
  /** collateralUsd * leverage. */
  notionalUsd: number;
  entryPriceUsd: number;
  openedAt: number;
  markPriceUsd: number;
  unrealizedPnlUsd: number;
}

export interface Fill {
  signature: string;
  venuePositionId: string;
  priceUsd: number;
  feeUsd: number;
  /** True when the fill is simulated (paper mode), not a real venue transaction. */
  simulated: boolean;
}

export interface Venue {
  readonly name: VenueName;
  readonly mode: 'paper' | 'live';
  /** Pubkey the on-chain policy whitelists as the `vendor` for this venue. */
  readonly programId: PublicKey;
  /**
   * Open a position. Refuses unless `p.permit` is a live, unspent
   * `SpendPermit` that matches every field of `p`.
   */
  openPosition(p: OpenParams): Promise<Fill>;
  closePosition(venuePositionId: string): Promise<Fill & { realizedPnlUsd: number }>;
  listPositions(): Promise<Position[]>;
  /** Cash plus unrealized PnL of open positions, in USD. Feeds the drawdown kill-switch. */
  equityUsd(): Promise<number>;
}

export interface PriceFeed {
  priceUsd(market: Market): Promise<number>;
}
