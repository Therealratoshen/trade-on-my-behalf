# Design: Aster long/short with an on-chain policy gate

Date: 2026-10-04
Status: approved in dialogue; not yet implemented
Author: Filbert Henrico (Terading)

## Problem

Terading has a working constraint engine and no way to trade. The user wants
to open a long or short position, and asks how to add "quantum trading skills".

Two findings from research reframe the request before any design is possible.

### Finding 1: Aster already implements the custody model we designed

Aster's V3 futures API uses an **Agent wallet** model rather than API-key +
HMAC. `POST /fapi/v3/approveAgent` creates a signer with explicit permissions:
`canSpotTrade`, `canPerpTrade`, and `canWithdraw` — documented as
"recommended default false" — plus an IP whitelist and an expiry timestamp.

This is the "ephemeral session key with no withdrawal rights" chosen for the
MCP design, implemented by the venue. We are not inventing it; we are
composing with it.

**What Aster cannot do**, and therefore where Terading remains distinct:

- Permissions are **binary**. Trade or don't; withdraw or don't. There is no
  per-position cap, no daily budget, no leverage ceiling, no drawdown
  kill-switch, no TTL.
- Denials are **not recorded**. Aster refuses by not being asked.
- Aster cannot refuse a *specific* trade. `authorize_spend` can return
  `REASON_DAILY_CAP` and that record is permanent.

So the product is not "an agent that can trade safely". It is **a limits layer
with an immutable denial trail, sitting above a venue that already has safe
keys**.

### Finding 2: "Quantum trading skills" is the wrong instrument

No quantum-computing framework is applicable to a 4-day hackathon build, and
none would be honest to claim. The real open-source engines are Freqtrade and
NautilusTrader; both are **complete trading bots that would replace Terading's
agent rather than feed it**, and adopting either adds a second language and a
second engine to maintain.

The genuinely valuable use of intelligence here is the **psychology-based
evaluator that already exists** in `packages/agent/src/evaluator.ts`. That is
the differentiator, and it needs no new dependency. This design therefore adds
**no Python and no new engine**.

Freqtrade's one genuinely useful capability is dry-run against real market
data. This design achieves the same honesty more cheaply, by using **live
Aster prices with simulated fills**.

## Decision

Three constraints were chosen:

1. **The on-chain program remains the source of truth.** Aster is one venue
   adapter among several, not the authority. `vendor` is already a policy field
   for exactly this.
2. **Live Aster market data, paper fills.** Real prices and a real order book,
   simulated execution. The demo is truthful today and needs no funds.
3. **The existing psychology-based evaluator decides.** No Freqtrade, no
   Python, no second engine.

## Architecture

```
   psychology profile + market data
              |
              v
     evaluator.evaluate()      [existing, extended with real signals]
              |  approve / deny + reason
              v
    withTrader().ensurePolicy()  ->  treasury.authorize_spend
              |                     [on-chain source of truth]
              |  approved?
              v
   AsterVenue (mode = 'paper')   <-- real prices, simulated fill
              |
              v
     record_pnl  (equity feeds the drawdown kill-switch)
```

The `Venue` interface in `packages/agent/src/venue/index.ts` already declares
`mode: 'paper' | 'live'`, `openPosition`, `closePosition`, `listPositions` and
`equityUsd`. The adapter was anticipated. **No interface change is required.**

## Components

| Unit | Change | Notes |
|---|---|---|
| `packages/agent/src/venue/aster.ts` | **new** | `mode = 'paper'`. Public endpoints only. |
| `packages/agent/src/venue/aster-client.ts` | **new** | Thin fetch wrapper, injectable for tests. |
| `packages/agent/src/venue/index.ts` | unchanged | `Venue` already fits. |
| `packages/agent/src/evaluator.ts` | **extended** | Consume real market data instead of a fixed feed. |
| `treasury` program | **unchanged** | Already expresses every cap we need. |
| `packages/sdk` | **unchanged** | Signing path is venue-agnostic. |

Two new files and one extension. The program is untouched, which matters: it
is the defensible asset and it is covered by 20 passing tests.

## Aster API facts this design depends on

Verified against Aster's published V3 documentation:

- Base URL `https://fapi.asterdex.com`, paths under `/fapi/v3`
- `POST /fapi/v3/order` with `symbol`, `type` (MARKET/LIMIT/STOP/STOP_MARKET/
  TAKE_PROFIT/TRAILING_STOP_MARKET), `side` (BUY/SELL), `quantity`, optional
  `price`
- `GET /fapi/v3/exchangeInfo` for symbol filters (`PRICE_FILTER`, `LOT_SIZE`,
  `MARKET_LOT_SIZE`, `MIN_NOTIONAL`, `PERCENT_PRICE`)
- `POST /fapi/v3/leverage` with leverage 1..125
- `GET /fapi/v3/positionRisk` exposing `markPrice`, `entryPrice`,
  `unrealizedProfit`, `leverage`
- `GET /fapi/v3/premiumIndex` (mark/index price and funding), `/fapi/v3/depth`,
  `/fapi/v3/klines` for market data
- `GET /fapi/v3/exchangeInfo` `triggerProtect` per symbol

**Only public, unauthenticated endpoints are used in v1.** No signing, no
nonce, no EIP-712, no agent wallet. That keeps the dangerous half of Aster's
API out of scope and means this change cannot move funds.

### Quantities must respect venue filters

Aster rejects an entry order when `quantity < marketMinQty` or
`quantity × markPrice < minNotional` (`QTY_LESS_THAN_MIN_QTY` /
`MIN_NOTIONAL`). A paper venue that ignores these produces fills that could
never have happened. The adapter must read `exchangeInfo` and clamp
accordingly, and the paper fill must record when a clamp was applied — the
dashboard already has a `state` family for exactly this.

## Honesty rules, enforced not asserted

This project's failure mode is documentation that claims more than the code
does. Three rules, each mechanically checkable:

1. **`mode = 'paper'` is non-negotiable in v1.** A single `live` string in the
   adapter must be impossible to ship accidentally. The paper fill signature
   stays `paper:<id>`, and `Fill.simulated` stays `true`, so a reader can tell
   from the receipt alone.
2. **A failed price fetch returns `null`, never a stale or invented price.**
   This already matches `app/api/quote/route.ts` and must match the adapter.
3. **Equity for the kill-switch is labelled.** With simulated fills there is no
   independent source of truth, so the drawdown comparison is against
   *caller-reported* equity. This is already disclosed in
   `docs/security-model.md` and must stay disclosed.

## What this does NOT do

- No real order is placed. No funds move. No agent wallet is created.
- No Freqtrade, no NautilusTrader, no Python, no new dependency.
- No new on-chain instruction. The program already expresses every cap.
- `vendor` is checked against Aster's venue program id, so a policy must
  explicitly whitelist Aster before its orders are approved.

## Testing

- **Adapter**: symbol filter clamping (`marketMinQty`, `minNotional`), with an
  injected fake client. No network in tests.
- **Fill honesty**: a paper fill must never produce a `signature` that looks
  like a real one, and `simulated` must be `true`.
- **Null price**: a rejected price fetch yields `null`, never a fallback.
- **Regression**: the existing 20 program tests, 37 agent tests, 31 SDK tests
  stay green and unchanged. New code in `packages/agent` requires new tests
  there, per `AGENTS.md`.
- **No live-order test exists**, by design.

## Honest limitations

- **Paper fills are our model, not Aster's.** They will not match real
  slippage, funding, or liquidation. The demo proves the decision loop, not the
  economics.
- **Latency is real.** Public REST prices are slower than a websocket feed; a
  long-running position is marked at rest prices between polls.
- **Aster is one venue.** The architecture is venue-agnostic, but only one
  adapter exists.
- **The kill-switch is only as good as reported equity**, which is the
  weakest link and is already documented.
- **No human has watched this run live.** As with the rest of the dashboard,
  verification is static until Filbert runs it.

## Open questions

1. **Which markets?** `exchangeInfo` will list many. A demo that opens one
   long and one short on a liquid pair is stronger than breadth.
2. **Funding rate.** Aster perps are funded. Ignoring funding in a paper
   position that is held long enough will overstate PnL. Decide whether v1
   accounts for it or explicitly excludes holding periods that make it
   material.
3. **Astrum vs the psychology profile.** The evaluator currently mirrors policy
   bounds. Whether real market data should also feed a discretionary layer is
   the same open question as the MCP spec's "psychology profile format", and
   the two documents should converge.
