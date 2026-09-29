/**
 * GET /api/positions
 *
 * Read-only projection of the paper venue's open positions. The venue adapter
 * (`@trade-on-my-behalf/agent`, `JupiterPerpsPaperVenue`) is a Node module —
 * it persists to a file via `node:fs` — so it cannot run in the browser
 * bundle. This route runs on the Node runtime and hands the client plain JSON.
 *
 * Nothing here mutates: the venue constructor would seed a state file if one
 * is missing, so we check `store.load()` first and bail out instead.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mirrors `Position` in packages/agent/src/venue/index.ts. */
export interface PaperPosition {
  venuePositionId: string;
  market: string;
  side: 'long' | 'short';
  collateralUsd: number;
  leverageBps: number;
  notionalUsd: number;
  entryPriceUsd: number;
  openedAt: number;
  markPriceUsd: number;
  unrealizedPnlUsd: number;
}

export interface PositionsResponse {
  ok: true;
  venue: string;
  mode: string;
  programId: string;
  statePath: string | null;
  foundStateFile: boolean;
  /** True when the live price API was unreachable and mark == entry. */
  pricesStale: boolean;
  priceError: string | null;
  cashUsd: number;
  equityUsd: number;
  positions: PaperPosition[];
}

/** What the route can answer: a projection, or a reason it has none. */
export type PositionsPayload =
  | PositionsResponse
  | { ok: false; reason: string; positions: PaperPosition[] };

function unavailable(reason: string): NextResponse<PositionsPayload> {
  return NextResponse.json({ ok: false, reason, positions: [] }, { status: 200 });
}

/** Walk up from cwd looking for the paper state the demo writes. */
function resolveStatePath(): string | null {
  const fromEnv = process.env.TOMB_PAPER_STATE;
  if (fromEnv) return resolve(fromEnv);

  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    for (const name of ['paper-local.json', 'paper-devnet.json']) {
      const p = join(dir, '.demo', name);
      if (existsSync(p)) return p;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export async function GET() {
  const path = resolveStatePath();

  if (!path) {
    return unavailable('no .demo/paper-*.json found — run `pnpm demo` first');
  }

  const {
    FileStore,
    JupiterPerpsPaperVenue,
    JupiterPriceFeed,
    StaticPriceFeed,
  } = await import('@trade-on-my-behalf/agent');

  const store = new FileStore(path);
  // Bailing before the constructor keeps this route from creating a file.
  const state = store.load();
  if (!state) {
    return unavailable(`${path} is empty or unreadable`);
  }

  const positions: PaperPosition[] = [];
  let pricesStale = false;
  let priceError: string | null = null;
  let equityUsd = state.cashUsd;

  const venues = [
    new JupiterPerpsPaperVenue(new JupiterPriceFeed(), store),
    // Offline fallback: mark every position at its entry, so PnL reads $0
    // rather than the whole panel dying. Flagged in the response so the UI
    // can label it.
    new JupiterPerpsPaperVenue(
      new StaticPriceFeed(
        Object.fromEntries(state.positions.map((p) => [p.market, p.entryPriceUsd])),
      ),
      store,
    ),
  ];

  let venue = venues[0];
  try {
    positions.push(...(await venue.listPositions()));
    equityUsd = await venue.equityUsd();
  } catch (err) {
    pricesStale = true;
    priceError = err instanceof Error ? err.message : String(err);
    venue = venues[1];
    try {
      positions.push(...(await venue.listPositions()));
      equityUsd = await venue.equityUsd();
    } catch {
      return unavailable(`venue adapter failed: ${priceError}`);
    }
  }

  return NextResponse.json({
    ok: true,
    venue: venue.name,
    mode: venue.mode,
    programId: venue.programId.toBase58(),
    statePath: path,
    foundStateFile: true,
    pricesStale,
    priceError,
    cashUsd: state.cashUsd,
    equityUsd,
    positions,
  } satisfies PositionsResponse);
}
