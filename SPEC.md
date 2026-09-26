# SPEC — Trade On My Behalf (pivot from Agent Treasury SDK, frozen D3')

> Pivot effective Sep 26 16:07 PT. Treasury program from D4 becomes the
> **risk-gate kernel** of the larger product. LTC-bridge dropped (saves D8-D9).
> Re-validates after next Copilot Deep Dive lands.

## Problem (reframed)

I'm a person who can recognize a tradable setup (a trend, a momentum
shift, a news-driven move), and I know what the right action would be —
long SOL here, short this pair there, exit now. But I don't have the time
to sit in front of charts, monitor price action, and pull the trigger at
the right second. The setup's gone before I get to it, or worse, I miss
the window and end up chasing.

Existing bots solve a different problem: they run 24/7 and execute
*whatever signals come in*. They don't care whether the user has a
recognizable setup pattern in their head. They leak: a single bad signal
or a compromised signal source oversizes, levers up, hits an off-venue
pair, drains the wallet, or trades *against* the user's stated rules
while the user sleeps. There's no end-user product where "I trade for you"
and "I cannot break your rules" are the *same statement*.

What I want is software that lets me say:

> "When my conditions fire, take *this* trade, with *these* constraints,
> without me needing to be watching. If a trade would break a rule, don't
> take it — even if the signal says to."

## Target user (pivoted)

1. **Me, and people like me.** Time-poor retail traders who can describe
   setups but cannot watch charts. The product is the founder's pain
   first; the market is downstream.
2. **Prop-trading firms / teams** with a wallet-per-strategy setup and
   hard risk limits per strategy.
3. **Influencer-signal followers** who want copy-trading with hard caps
   ("follow this trader up to $500/day, kill if drawdown > 20%").

## Top-5 user stories (frozen)

1. As a user, I write my setup in plain English once
   ("long SOL when 15m RSI < 30 and 1h trend is up; exit at +3% or -1.5%"),
   set a budget ("max $200 per trade, max 3 trades a day, kill if down 15%"),
   and walk away. The trader runs it 24/7. I check the app when I have time.
2. As a user, I `pnpm add @trade-on-my-behalf/sdk` (or use the dashboard)
   and configure rules:
   ```ts
   { venues: ['jupiter-perps','drift'],
     maxLeverage: 5,
     maxPositionUsd: 200,
     maxDailyLossUsd: 60,
     killSwitchDrawdownPct: 15 }
   ```
   These rules are enforced **at the signing layer** by the Anchor
   program; no rogue path can bypass them — including a compromised
   signal source.
3. When the trader's signal fires, I get a Telegram DM *before* the trade
   with the rationale: "Long SOL perp 0.1 at 3x — RSI 27, trend up, $40
   risk. Tap approve in 60s or it auto-skips." So I stay in control
   without watching charts.
4. As an operator, I see a `RiskFlag` event in the dashboard for every
   denied or skipped trade, with the reason code (leverage exceeded,
   drawdown hit, venue-denied, expired, kill-switch active).
5. As an auditor (or myself in retrospect), I export every on-chain
   decision (allowed and denied) with the policy inputs at decision
   time, the signal that triggered it, the market state, and the fill.

## Explicit non-goals (frozen)

- No credit lines.
- No multi-chain. Solana only.
- No LTC bridge (pivot dropped it). Track purity wins.
- No mobile-first design.
- No AI signal generation v1 — we route human/strategy signals through
  the agent. LLM-driven signals are a v2 extension.

## Architecture diagram

```
+-----------------------+        +-----------------+        +-------------------+
| User intent           | -----> | Trade O.M.B     | -----> | Anchor treasury   |
| (signal: RSI, P&L,    |        | agent runtime   |        | (policy gate)     |
|  conditional, manual) |        | packages/agent/ |        | programs/treasury |
+-----------------------+        +-----------------+        +-------------------+
                                                                       |
                                            (approved only)             v
                                                              +-------------------+
                                                              | Jupiter Perps /   |
                                                              | Drift / Zeta      |
                                                              | (venue router)    |
                                                              +-------------------+
                                                                       |
                                            (signal events)            v
                                                              +-------------------+
                                                              | apps/dashboard    |
                                                              | (audit + rules)   |
                                                              +-------------------+
```

## Tech stack (frozen)

- Anchor **0.31.1** — treasury program (already compiling, D4).
- `@solana/kit` + `@solana/react` for the SDK + dashboard client.
- **Jupiter Perps** as primary venue (`packages/agent/venues/jupiter-perps.ts`).
- **Drift** as secondary venue (`packages/agent/venues/drift.ts`).
- **Helius webhooks + DAS** for fills, mark-price, liquidation signals.
- **AgentBazaar MCP** for an *optional* paid signal marketplace integration
  (the user can subscribe to a paid signal stream with a daily USDC cap).
- **Telegram bot** as the primary *control surface* — the user does not
  want a web dashboard open; wants a phone notification with approve/deny.
- **Phantom Connect** for embedded wallet in the dashboard fallback.
- **LiteSVM** for unit tests, **Surfpool** for devnet fork + cheatcodes D10.

## Repo layout (frozen; renamed)

```
programs/treasury/             Anchor program: per-agent policy engine (DONE D4)
packages/sdk/                  @trade-on-my-behalf/sdk: 5-line `withTrader` wrap
packages/agent/                trader runtime: signal handlers, venue router
packages/policy-engine/        off-chain evaluator (LiteSVM-tested)
packages/venues/               per-venue adapters (jupiter-perps, drift, zeta)
apps/dashboard/                Next.js 15 audit + rules editor
scripts/devnet-demo.sh         one-shot judges run cold
docs/                          architecture, user-tests, venue-comparison
```

## Adapter surface (frozen; 1 file per venue)

```ts
// packages/venues/jupiter-perps.ts
export interface Venue {
  name: string;
  openPosition(p: { side:'long'|'short', sizeUsd:number, lev:number, market:string }): Promise<TxSig>;
  closePosition(id:string): Promise<TxSig>;
  listPositions(): Promise<Position[]>;
}
```

## Iteration cadence

Weekly 1-min update videos:
- D11 — SDK ships + first Jupiter Perps test trade through policy gate.
- D14 — Drift adapter wired, drawdown kill-switch demo.
- D16 — Three outside-dev user tests + final cut.

## Risk gates (re-used directly from D4 treasury program)

| Gate | Source field |
|---|---|
| Venue whitelist | `policy.vendors` |
| Per-trade size cap | `policy.per_tx_cap_usdc` |
| Per-day loss cap | `policy.per_day_cap_usdc` + decrement on adverse fills |
| TTL on policies | `policy.ttl_slots` |
| Audit event on every decision | `AuditEvent` in state |

**To add for perps:**
- Leverage cap (need a `max_leverage_bps` u16 field on Policy).
- Drawdown kill-switch (a daily-spend vs peak-equity check; may need
  an off-chain indexer feeding `treasury.drawdown_reset`).

## Open questions (resolve D5-D9)

- D5: Should leverage cap live in the Anchor program or be enforced off-chain?
- D6: How does the trader fund its treasury PDA — user transfer pre-trade?
- D7: Insurance fund exposure on Kill-Switch vs liquidation delay.
- D9: Telegram/Slack control surface — open-source bot vs Paywalled via AgentBazaar?

## Removed (from prior pivot, no longer applicable)

- LTC bridge package.
- USDC -> wSOL swap path inside program.
- Web2 non-x402 fallback.

## Adjacent protocol scan (D3''')

Scanned for adjacent projects on D3''' (Sep 26). Confirmed:

- **Pieverse (PIEVERSE)** — real Solana SPL token; live on CoinMarketCap,
  CoinGecko, Phantom, Solflare, Kraken, OKX. Web3 payment infrastructure
  with on-chain legal receipts via x402b protocol; chat-agent surface on
  WhatsApp/LINE/Kakao. *Does not solve the same pain:* Pieverse watches
  *transactions* not market price action, doesn't target perps venues,
  and its compliance layer records rather than prevents bad trades.
  Could become a *receipt layer* downstream (D14-D17 stretch) but is
  not a competitor for our wedge.

## Top-5 user stories (frozen)

(The stories and tech stack above are still the source of truth; not
duplicated here.)

---
Updated D3'-pivot. Awaiting Copilot Deep Dive on perps agents to confirm
wedge before code resumes. D3''' adds Pieverse adjacencies without
changing the wedge.
