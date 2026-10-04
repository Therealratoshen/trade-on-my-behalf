import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { PublicKey } from '@solana/web3.js';

import type { Fill, Market, OpenParams, Position, PriceFeed, Side, Venue } from './index.js';
import { consumePermit } from './permit.js';

/** Jupiter Perps mainnet program. Also the `vendor` pubkey the policy whitelists. */
export const JUPITER_PERPS_PROGRAM_ID = new PublicKey('PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu');

/** Jupiter Perps base open/close fee: 6 bps of notional. */
export const JUPITER_PERPS_FEE_BPS = 6;

interface PaperPosition {
  venuePositionId: string;
  market: Market;
  side: Side;
  collateralUsd: number;
  leverageBps: number;
  entryPriceUsd: number;
  openedAt: number;
}

export interface PaperState {
  cashUsd: number;
  positions: PaperPosition[];
}

export interface PaperStore {
  load(): PaperState | null;
  save(s: PaperState): void;
}

export class MemoryStore implements PaperStore {
  private state: PaperState | null = null;
  load() { return this.state ? structuredClone(this.state) : null; }
  save(s: PaperState) { this.state = structuredClone(s); }
}

/** Persists paper state between CLI invocations. */
export class FileStore implements PaperStore {
  constructor(private readonly path: string) {}
  load(): PaperState | null {
    if (!existsSync(this.path)) return null;
    return JSON.parse(readFileSync(this.path, 'utf8')) as PaperState;
  }
  save(s: PaperState): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(s, null, 2));
  }
}

export function unrealizedPnlUsd(p: PaperPosition, markPriceUsd: number): number {
  const notional = p.collateralUsd * (p.leverageBps / 100);
  const move = markPriceUsd / p.entryPriceUsd - 1;
  const pnl = notional * (p.side === 'long' ? move : -move);
  // Liquidation is not simulated; a position can lose at most its collateral.
  return Math.max(pnl, -p.collateralUsd);
}

/**
 * Jupiter Perps adapter, paper mode.
 *
 * Fills are simulated at the live Jupiter oracle price with Jupiter Perps'
 * 6 bps fee; no order reaches Jupiter.
 *
 * **Execution binding.** `openPosition` requires a `SpendPermit` minted from
 * an approved `authorize_spend` and recomputes the binding itself
 * (`consumePermit`) before touching any state. A missing, forged, mismatched
 * or replayed permit throws `PermitError` and no position is opened. This is
 * an off-chain gate inside this process — see `venue/permit.ts` for exactly
 * what it does and does not prove.
 *
 * Live mode (building the Jupiter Perps
 * `createIncreasePositionMarketRequest` transaction) is not implemented:
 * Jupiter Perps is mainnet-only, and v1 targets devnet.
 */
export class JupiterPerpsPaperVenue implements Venue {
  readonly name = 'jupiter-perps' as const;
  readonly mode = 'paper' as const;
  readonly programId = JUPITER_PERPS_PROGRAM_ID;

  constructor(
    private readonly prices: PriceFeed,
    private readonly store: PaperStore,
    startingCashUsd = 1_000,
  ) {
    if (!store.load()) store.save({ cashUsd: startingCashUsd, positions: [] });
  }

  private state(): PaperState {
    return this.store.load()!;
  }

  async openPosition(p: OpenParams): Promise<Fill> {
    // The permit gate runs FIRST, before any validation, state read or
    // mutation. A rejected order must leave the account byte-identical, and
    // "was this approved?" is the question that must be asked first.
    consumePermit(p.permit, {
      vendor: this.programId.toBase58(),
      market: p.market,
      side: p.side,
      collateralUsd: p.collateralUsd,
      leverageBps: p.leverageBps,
    });

    if (!(p.collateralUsd > 0)) throw new Error('collateralUsd must be > 0');
    if (p.leverageBps < 100) throw new Error('leverageBps must be >= 100 (1x)');
    const s = this.state();
    const notional = p.collateralUsd * (p.leverageBps / 100);
    const feeUsd = (notional * JUPITER_PERPS_FEE_BPS) / 10_000;
    if (p.collateralUsd + feeUsd > s.cashUsd) {
      throw new Error(`insufficient paper cash: need ${(p.collateralUsd + feeUsd).toFixed(2)}, have ${s.cashUsd.toFixed(2)}`);
    }
    const priceUsd = await this.prices.priceUsd(p.market);
    const venuePositionId = `paper-${randomUUID().slice(0, 8)}`;
    s.cashUsd -= p.collateralUsd + feeUsd;
    s.positions.push({
      venuePositionId,
      market: p.market,
      side: p.side,
      collateralUsd: p.collateralUsd,
      leverageBps: p.leverageBps,
      entryPriceUsd: priceUsd,
      openedAt: Math.floor(Date.now() / 1000),
    });
    this.store.save(s);
    return { signature: `paper:${venuePositionId}`, venuePositionId, priceUsd, feeUsd, simulated: true };
  }

  async closePosition(venuePositionId: string) {
    const s = this.state();
    const idx = s.positions.findIndex((x) => x.venuePositionId === venuePositionId);
    if (idx < 0) throw new Error(`no open paper position ${venuePositionId}`);
    const pos = s.positions[idx];
    const priceUsd = await this.prices.priceUsd(pos.market);
    const realizedPnlUsd = unrealizedPnlUsd(pos, priceUsd);
    const notional = pos.collateralUsd * (pos.leverageBps / 100);
    const feeUsd = (notional * JUPITER_PERPS_FEE_BPS) / 10_000;
    s.cashUsd += Math.max(0, pos.collateralUsd + realizedPnlUsd - feeUsd);
    s.positions.splice(idx, 1);
    this.store.save(s);
    return { signature: `paper:close:${venuePositionId}`, venuePositionId, priceUsd, feeUsd, simulated: true, realizedPnlUsd };
  }

  async listPositions(): Promise<Position[]> {
    const s = this.state();
    const out: Position[] = [];
    for (const p of s.positions) {
      const mark = await this.prices.priceUsd(p.market);
      out.push({
        ...p,
        notionalUsd: p.collateralUsd * (p.leverageBps / 100),
        markPriceUsd: mark,
        unrealizedPnlUsd: unrealizedPnlUsd(p, mark),
      });
    }
    return out;
  }

  async equityUsd(): Promise<number> {
    let equity = this.state().cashUsd;
    for (const p of await this.listPositions()) equity += p.collateralUsd + p.unrealizedPnlUsd;
    return equity;
  }
}
