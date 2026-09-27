# Agent Runtime — `packages/agent`

> Frozen for D6. Updated D8.5+ to webapp-first control surface. Updated D9' to mark D7 + D8 rules as shipped (present-tense).
> The agent runtime is the long-running process that listens for
> signals, evaluates them against rules, routes through the venue
> adapter, and surfaces decisions to the user via the webapp
> (`apps/dashboard/`).

## What it does

The runtime turns the SDK into a product. A developer who installs
`@trade-on-my-behalf/sdk` gets a `TradeAPI` and calls it; a user who
wants a 24/7 trader installs the runtime + the webapp, points it at
their wallet, and gets a wallet-connected viewer + rule editor +
an on-chain audit log on top.

The runtime is intentionally thin. The Anchor program is the gate;
the SDK is the ergonomic wrapper; the runtime is the glue.

## Lifecycle

```mermaid
sequenceDiagram
    participant Signal as Signal source
    participant Runtime as Trader runtime
    participant Eval as Policy evaluator (off-chain mirror)
    participant Anchor as Anchor treasury
    participant Venue as Venue adapter
    participant Web as Webapp (apps/dashboard)
    participant Helius as Helius DAS index

    Signal->>Runtime: Signal (market, side, size, lev, rationale)
    Runtime->>Eval: rules + intent
    Eval-->>Runtime: pass | deny(reasonCode)
    Runtime->>Anchor: authorize_spend(vendor, size, nonce, leverage_bps, implied_equity)
    Anchor-->>Runtime: AuditEvent (on-chain) — REASON_OK or one of REASON_*
    Runtime->>Venue: openPosition(intent) (only if APPROVE)
    Venue-->>Runtime: Fill
    Runtime->>Helius: emit fills / mark prices via webhook
    Helius-->>Web: indexed AuditEvent (within ~2 s of slot confirmation)
    Web->>User: red row in audit log panel (if deny) or position row (if approve)
```

## Module map (sketch)

```text
packages/agent/
├── src/
│   ├── index.ts                # boot: load wallet, rules, venues
│   ├── signals/
│   │   ├── helius.ts           # webhook receiver: mark price, funding, liquidations
│   │   ├── skill-runner.ts     # Specialist's skill code (private, not vendored)
│   │   ├── samplers/
│   │   │   ├── helius.ts       # webhook receiver: mark price, funding, liquidations
│   │   │   ├── rsi.ts          # RSI calculation sampler
│   │   │   └── funding.ts      # funding rate sampler
│   │   └── manual.ts           # local CLI signal trigger
│   │   └── copytrade.ts        # follower relay
│   ├── classifier.ts           # normalizes raw Signal -> TradeIntent
│   ├── evaluator.ts            # off-chain mirror of authorize_spend rules
│   ├── router.ts               # picks venue, builds CPI, submits tx v1
│   ├── venue/
│   │   ├── index.ts            # Venue interface
│   │   ├── jupiter-perps.ts    # primary adapter
│   │   ├── drift.ts            # secondary adapter (v2)
│   │   └── zeta.ts             # stretch (v3)
│   ├── audit/
│   │   ├── log.ts              # in-memory mirror of AuditEvent stream
│   │   └── http.ts             # local push to apps/dashboard (webapp reads)
│   └── webapp-bridge/          # webhook receiver for apps/dashboard (SWR source)
│       └── serve.ts            # localhost:3000/api/audit tail
```

`apps/dashboard/` is the Next.js 15 webapp — read-only viewer +
rule editor. It does NOT live under `packages/agent/` because
it's a separate runtime with its own deploy target (Vercel).

## Venue interface

```ts
// packages/agent/src/venue/index.ts
export interface Venue {
  readonly name: 'jupiter-perps' | 'drift' | 'zeta';

  openPosition(p: {
    side: 'long' | 'short';
    sizeUsd: number;
    leverage: number;          // bps (500 = 5x)
    market: string;            // e.g. 'SOL-PERP'
  }): Promise<{ signature: string; venuePositionId: string }>;

  closePosition(id: string): Promise<{ signature: string }>;

  listPositions(): Promise<Array<{
    venuePositionId: string;
    market: string;
    side: 'long' | 'short';
    sizeUsd: number;
    leverage: number;
    unrealizedPnlUsd: number;
    openedAt: number;          // unix seconds
  }>>;

  /** Cheapest venue that quotes the market; runtime uses for routing. */
  quote(p: { market: string; side: 'long' | 'short'; sizeUsd: number }): Promise<{
    priceUsd: number;
    feeBps: number;
    available: boolean;
  }>;
}
```

The runtime holds one adapter per whitelisted `VenueId`. `router.ts`
calls `quote` on each in priority order (cheapest fee), picks the
first `available: true`, and routes through it.

## Signal -> Intent flow

A `Signal` is whatever the source wants to send. The runtime
normalizes it to a `TradeIntent` with these invariants:

- `sizeUsd <= rules.maxPositionUsd`. If a signal would exceed, the
  intent is **clamped down** to the cap, not denied. The rationale
  string is updated to note the clamp.
- `leverage <= rules.maxLeverage`. Same clamp.
- `side in {'long', 'short'}`.
- `market` must be available on at least one configured venue.

If `intent.sizeUsd < 1` after clamping, the signal is dropped silently.

## Concurrency model

- One async loop per sampler (`helius.ts`, `rsi.ts`, `funding.ts`, etc.).
  Each feeds typed events into the skill runner. The skill produces
  intents; the runtime calls `authorize_spend`.
  Each pushes typed `Signal`s into a shared `Channel<TradeIntent>`.
- A single consumer (`router.ts`) reads from the channel, calls
  `evaluator.ts`, and forwards approved intents to the venue.
- **No human approve/deny.** The kernel decides. The runtime
  submits `authorize_spend` for every intent; the chain returns
  `AuditEvent { approved, reasonCode, ... }`. The webapp picks up
  the event via Helius DAS index and renders the red/green row
  within ~2 s. There is no 60-second timeout because the user is
  not in the loop. (Telegram-DM approve/deny with 60s `Promise.race`
  was the v2 control-surface design; superseded D8.5+.)

## Rule evaluation order (mirrors on-chain)

The off-chain mirror in `evaluator.ts` runs checks in the same order
as `authorize_spend` so the off-chain deny reasons line up with what
the chain would have said:

1. Vendor in `policy.vendors` → else `REASON_VENDOR_DENIED` (1).
2. `intent.sizeUsd <= per_tx_cap_usdc / 1e6` → else `REASON_PER_TX_CAP` (2).
3. `todayLoss + intent.sizeUsd <= per_day_cap_usdc / 1e6` → else
   `REASON_DAILY_CAP` (3). `todayLoss` is tracked off-chain from
   `Fill.unrealizedPnlUsd` and confirmed by the `AuditEvent` stream.
4. `Clock.slot - created_at_slot <= ttl_slots` → else `REASON_EXPIRED` (4).
5. *(shipped D7)* `intent.leverage <= policy.max_leverage_bps` → else
   `REASON_LEVERAGE_CAP` (6).
6. *(shipped D8)* `(peakEquity - nowEquity) / peakEquity * 100 <= killSwitchDrawdownPct`
   → else `REASON_DRAWDOWN_KILLSWITCH` (7).

The runtime never trusts its own evaluation as final for an *approve*.
It always sends `authorize_spend` and waits for the chain. For a
*deny* the off-chain mirror is the source of truth and no transaction
is sent.

## Boot sequence

```ts
// packages/agent/src/index.ts (sketch)
import { createClient } from '@solana/kit';
import { solanaDevnetRpc } from '@solana/kit-plugin-rpc';
import { signerFromFile } from '@solana/kit-plugin-signer';
import { loadRules } from './rules';
import { bindVenues } from './venue';
import { startAuditBridge } from './webapp-bridge/serve';
import { startSignalLoops } from './signals';

export async function boot(opts: { keyfile: string; rulesFile: string; rpcUrl?: string }) {
  const wallet = await signerFromFile(opts.keyfile);
  const client = createClient()
    .use(signer(wallet))
    .use(solanaDevnetRpc(opts.rpcUrl));
  const rules = await loadRules(opts.rulesFile);
  const venues = await bindVenues(rules.venues, client);
  // Tail AuditEvent stream to the webapp via localhost SSE.
  // Webapp itself reads on-chain state via Phantom Connect; this is
  // a low-latency push for the red-row moment.
  startAuditBridge(client, rules);
  await startSignalLoops(client, rules, venues);
}
```

`pnpm --filter @trade-on-my-behalf/agent dev` boots locally with a
devnet keyfile. The webapp runs separately via
`pnpm --filter @trade-on-my-behalf/dashboard dev` on Vercel in
production. The same code path runs in production against mainnet
by swapping the RPC plugin.