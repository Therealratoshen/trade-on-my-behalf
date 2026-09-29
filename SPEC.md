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

## Licensing posture (path c, D6 founder call)

- `programs/treasury/` — **MIT** (the on-chain policy kernel)
- `packages/sdk/`, `packages/agent/` (incl. venue adapters),
  `apps/dashboard/` — **MIT** (the integration + UI layer; webapp v1
  control surface ships here)
- Hosted alert + PnL reporting — **Proprietary** (v2)
- ~~`packages/agent/telegram/` — cut D8.5+~~ (Telegram bot moved to v3, never; superseded by webapp)

OSS-native precedent is empty on the (P + X + W) intersection —
where **W** = "transport-pluggable control surface (webapp v1)" —
see `docs/oss-precedent.md` for evidence. `fridonai` is the
strongest MIT candidate overall; it ships no policy / perps / wallet
control layer.

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
3. *(Superseded D8.5+)* The kernel decides; there is no human
   approve/deny step. The webapp (`apps/dashboard/`) shows every
   `AuditEvent` — approve or deny — with the rule inputs, the
   reason code, the slot number, and the venue position if any.
   The user does not need to be present.
4. As an operator, I see a `RiskFlag` row in the webapp's audit
   log for every denied trade, with the reason code (leverage
   exceeded, drawdown hit, venue-denied, expired, kill-switch
   active). The row lights up within ~2 s of the runtime pushing
   the intent (SWR refresh of the Helius-indexed event stream).
5. As an auditor (or myself in retrospect), I export every on-chain
   decision (allowed and denied) with the policy inputs at decision
   time, the signal that triggered it, the market state, and the fill.

## Explicit non-goals (frozen)

- No credit lines.
- No multi-chain. Solana only.
- No LTC bridge (pivot dropped it). Track purity wins.
- No mobile-first design.
- **No LLM signal generation v1.** Specialists write their own
  skills; no AI agent invents signals for them. The kernel enforces
  the algorithm; the specialist owns the skill. See
  `docs/skills-and-algorithms.md` for the SAS model.

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
- `@solana/kit` + `@solana/react` for the SDK + webapp client.
- **Next.js 15** for the v1 control surface webapp (`apps/dashboard/`) —
  Phantom Connect **or** Trust Wallet via `@solana/wallet-adapter-react`,
  SWR for periodic refresh, no server-side state.
- **Jupiter Perps** as primary venue (`packages/agent/venues/jupiter-perps.ts`).
- **Drift** as secondary venue (v2; `packages/agent/venues/drift.ts`).
- **Helius webhooks + DAS** for fills, mark-price, liquidation signals,
  and indexed `AuditEvent` history for the webapp audit-log panel.
- ~~**AgentBazaar MCP** for paid signal marketplace integration~~ —
  **dropped from v1** D8.5+ (moved to v3 "specialist skill marketplace"
  if demand emerges). The SAS framing means specialists own their
  skills; v1 ships no signal-marketplace layer.
- ~~**Telegram bot** — cut D8.5+, moved to v3 (never)~~ (superseded by webapp)
- **LiteSVM** for unit tests, **Surfpool** for devnet fork + cheatcodes D10.

The control surface is **transport-pluggable**. The kernel decides;
the webapp shows the receipts. v2 may add Discord / Slack / push
notifications as additional transports — none change the kernel.

## Repo layout (frozen; renamed)

```
programs/treasury/             Anchor program: per-agent policy engine (DONE D4)
packages/sdk/                  @trade-on-my-behalf/sdk: 5-line `withTrader` wrap
packages/agent/                runtime, evaluator, `tomb` CLI
packages/agent/src/venue/      venue adapters (jupiter-perps, paper mode in v1)
apps/dashboard/                Next.js 15 audit + rules editor
scripts/demo.sh                one-shot judges run cold (`pnpm demo` / `pnpm devnet:demo`)
docs/                          architecture, user-tests, venue-comparison
```

## Adapter surface (1 file per venue)

Shipped D10 at `packages/agent/src/venue/index.ts`; see
[docs/venues.md](docs/venues.md#adapter-contract) for the current
interface (`openPosition`, `closePosition`, `listPositions`, `equityUsd`).
v1 ships `jupiter-perps` in paper mode.

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
- ~~D9: Telegram/Slack control surface — open-source bot vs Paywalled via AgentBazaar?~~ **Closed D8.5+** — webapp is v1 control surface (Phantom Connect or Trust Wallet + viewer + rule editor). Telegram bot moved to v3, never. See `docs/control-surface.md`.
- **D10+ hardening queue** — tracked in [PM-LOG.md §5 R14–R16](PM-LOG.md) (the canonical surface for risks and follow-ups, not this spec doc). The three items, named here for cross-reference:
  - **R14** — **tighten-timelock** on `update_policy` so a stolen `owner` key cannot loosen caps within the policy's TTL window. The current `update_policy` accepts loosening — flagged in `docs/security-model.md` §"Scenario 1".
  - **R15** — **CPI-wrapper or PDA-bound memo** so `authorize_spend` becomes the *authoritative* enforcer of "venue CPI actually targets the whitelisted program." Current defense is SDK-trust — flagged in `docs/security-model.md` §"Scenario 4`.
  - **R16** — document "what kills an open position" — venue liquidation only; the on-chain gate does not see venue-side state. Flagged in `docs/security-model.md` §"Scenario 2".

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

## Perps-agent deep dive (D5 — DONE, 16:39 PT)

> Historical. The wedge has since pivoted from "Telegram-bot-fronted"
> to "webapp-fronted" (D8.5+, see `docs/control-surface.md`). The
> competitor landscape this section documents still holds — many
> other projects use Telegram as their control surface; ours no
> longer does. The wedge-line "no project combines personal AI agent
> + perps venue + on-chain policy gates" is still true.

**Verdict: PARTIAL GAP inside v1-c9.** Both halves of the market exist
separately (perps venues + Telegram/chat bots), but **no project
combines personal AI agent + perps venue + on-chain policy gates**.
That's our wedge.

### Cluster context

- **`v1-c9 "Solana DEX and Trading Infrastructure"`**: 323 projects,
  ~23 winners in the corpus.
- Density is high but the personal-time-poor-retail wedge is empty.

### Nearest winners (15 of 16 returned)

| Slug | Hackathon | Prize | Closest because |
|---|---|---|---|
| `agent-arc` | breakout 2025-04 | 3rd Place - AI | AI agent, but no perps claim in oneLiner |
| `stonksbot-ai` | renaissance 2024-03 | HM - DeFi & Pay | AI trading bot, Renaissance era |
| `armor-wallet` | breakout 2025-04 | HM - AI | AI wallet with autonomous trading — *closest analog* |
| `project-plutus` | breakout 2025-04 | 2nd Place - AI | AI agent on Solana |
| `daiko` | breakout 2025-04 | 4th Place - AI | AI agent on Solana |
| `forge-ai` | breakout 2025-04 | HM - AI | AI agent on Solana |
| `bananazone` | breakout 2025-04 | 4th Place - DeFi | DeFi, not AI |
| `xaam` | breakout 2025-04 | HM - AI | AI agent |
| `synto` | breakout 2025-04 | University Prize - AI | AI agent |
| `bullbot` | renaissance 2024-03 | HM - DeFi & Pay | DeFi |
| `neutral-trade` | radar 2024-09 | 4th Place - DeFi | DeFi |
| `mercantill` | cypherpunk 2025-09 | 4th Stablecoins $10K | Policy engine for agent banking (D2 prior) |
| `blueprint` | cypherpunk 2025-09 | HM - DeFi | DeFi |
| `destreet` | renaissance 2024-03 | 2nd DAOs | Social trading |
| `toaster.trade` | cypherpunk 2025-09 | 4th Consumer Apps | Consumer trader |

The pattern: AI-agent winners from Breakout 2025 / Cypherpunk 2025 are
*infra-style* (agent frameworks, wallets). None of them are
*personal-automation-product* (a thing a single person uses to trade
their own book with their own rules). That's where we sit.

### Corpus 'perpetual futures' top 13

| Slug | OneLiner |
|---|---|
| `perfx` | 24/7 perps DEX for FX |
| `alma` | Synthetic cash-settled futures, low-cost market creation |
| `perc-o-dex` | Sharded perps DEX |
| `perpetuity` | Perpetual opinion/narrative markets, non-expiring |
| `autonom-unleashing-rwas-in-solana` | RWA oracle |
| `solfuturenft` | NFT floor price futures/options |
| `paperfi` | Paper trading for spot + perps |
| **`infty.trade`** | **AI-powered perpetual DEX using a Pool Rate-Based AMM, up to 200x leverage** |
| `hakata-finance` | Synthetic perps DEX for stocks |
| `giftrix` | Futures platform for GIF popularity |
| `deserialize` | All-in-one DeFi on 0G |
| `fandy-hedging-and-earning-from-the-funding-rates` | Hedge + earn from perps funding |

**`infty.trade` is the closest precedent**: AI-driven perps venue. But
per the description it's still a *venue* with an AI pricing model,
not a personal-trading *client* with on-chain policy gates. The wedge
remains: who gives end-users an AI agent that respects their rules at
the wallet layer.

### Corpus 'chat agent telegram' top 11

| Slug | OneLiner |
|---|---|
| `pot-bot-1` | TG bot for group chat pool trading |
| `chattatrader` | Multi-modal crypto research/analysis/trading via text |
| `debonk-1` | Multichain TG trading bot + mini-app |
| `jumpa-bot` | TG multichain trading bot w/ group treasuries |
| `nft-trading` | NFT trading consumer app |
| `solmind` | TG AI agent — natural language wallet/swap operations |
| `futard-trade` | Orderbook for MetaDAO futarchy |
| `safe-agent` | P2P gift card/stablecoin trade, AI escrow |
| `dex-sentinel` | TG-based DeFi bot |
| `group-trade` | TG groups as social hedge funds |

Pattern: TG-trading bots are saturated. AI-on-Solana via chat exists
(`solmind`, `chattatrader`). **None combine: (a) perps venue
integration + (b) on-chain enforcement of user-defined rules + (c)
end-user product framing.** Our wedge.

### Final wedge verdict (D5)

- **Cluster:** v1-c9, 323 projects, 23 winners.
- **Direct precedents** in cluster for our wedge: 0.
- **Closest analogs:**
  - `infty.trade` for venue + AI pricing (not personal-client).
  - `armor-wallet` for AI agent + autonomous trading (no perps, no
    on-chain policy).
  - `mercantill` for on-chain policy engine (no perps, no agent).
  - TG bots for chat UX (no policy layer).
- **Wedge:** Compose ALL FOUR. End-user perps agent where:
  1. Trades through Jupiter Perps / Drift / `infty.trade`-style AMM.
  2. Signals from any source (RSI, LLM, copy-trade, TG).
  3. On-chain treasury program gates every signed tx to user rules.
  4. TG DM approve/deny as control surface.
- **Build as scoped.** SPEC v1-c9 / D3'' / D3''' stands.

### Raw Deep Dive outputs

- `docs/research/copilot-perp-deepdive-01.json` — winners filter
- `docs/research/copilot-perp-deepdive-02.json` — cluster v1-c9
- `docs/research/copilot-perp-deepdive-03.json` — broad 'perpetual futures'
- `docs/research/copilot-perp-deepdive-04.json` — 'chat agent telegram'
- `docs/research/perps-deepsafe-status.md` — earlier retry log

## Top-5 user stories (frozen)

(The stories and tech stack above are still the source of truth; not
duplicated here.)

---
Updated D3'-pivot. Awaiting Copilot Deep Dive on perps agents to confirm
wedge before code resumes. D3''' adds Pieverse adjacencies without
changing the wedge.
