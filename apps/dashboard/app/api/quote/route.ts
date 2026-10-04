/**
 * GET /api/quote?market=SOL-PERP
 *
 * A single **spot** price for one supported market, with the provenance needed
 * to display it honestly.
 *
 * Why this route exists and what it deliberately does not do:
 *
 * The only price source wired into this repo is `JupiterPriceFeed`, which hits
 * `lite-api.jup.ag/price/v3` and returns **one current price**. There is no
 * candles/ohlc endpoint anywhere in this codebase, and this project does not
 * fabricate a history it does not have. So this route returns a spot price and
 * a timestamp, and the client accumulates *real* observations over time.
 *
 * Every sample the chart ever draws is a genuine price that Jupiter actually
 * returned at a genuine moment. Nothing is interpolated, simulated, seeded or
 * smoothed. If the API is unreachable this route says so and returns no price
 * at all — it never substitutes a number the reader could mistake for live.
 *
 * Read-only: no venue is constructed, no state file is touched, nothing mutates.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface QuoteResponse {
  ok: true;
  market: string;
  /** Spot price in USD, exactly as the feed returned it. */
  priceUsd: number;
  /** unix milliseconds — when this server received the price. */
  fetchedAtMs: number;
  /** Human label for the provenance strip. */
  source: string;
  /** What this number is and is not. Kept in the payload so the UI cannot forget. */
  kind: 'spot';
  /** Seconds between samples the client should wait. Advisory only. */
  suggestedRefreshMs: number;
}

/** What the route can answer: a spot price, or a reason it has none. */
export type QuotePayload =
  | QuoteResponse
  | { ok: false; market: string; reason: string; priceUsd: null; fetchedAtMs: null };

const DEFAULT_MARKET = 'SOL-PERP';
const REFRESH_MS = 15_000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const market = url.searchParams.get('market') ?? DEFAULT_MARKET;

  const { JupiterPriceFeed, isMarket } = await import('@trade-on-my-behalf/agent');

  if (!isMarket(market)) {
    return NextResponse.json(
      { ok: false, market, reason: `Unsupported market ${market}`, priceUsd: null, fetchedAtMs: null },
      { status: 200 },
    );
  }

  try {
    const priceUsd = await new JupiterPriceFeed().priceUsd(market);
    return NextResponse.json({
      ok: true,
      market,
      priceUsd,
      fetchedAtMs: Date.now(),
      source: 'jupiter lite-api v3',
      kind: 'spot',
      suggestedRefreshMs: REFRESH_MS,
    } satisfies QuoteResponse);
  } catch (err) {
    // No fallback number. A stale or invented price is worse than no price.
    return NextResponse.json({
      ok: false,
      market,
      reason: err instanceof Error ? err.message : String(err),
      priceUsd: null,
      fetchedAtMs: null,
    } satisfies QuotePayload);
  }
}
