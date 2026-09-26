# SPEC — Trade On My Behalf (pivot from Agent Treasury SDK, frozen D3')

> Pivot effective Sep 26 16:07 PT. Treasury program from D4 becomes the
> **risk-gate kernel** of the larger product. LTC-bridge dropped (saves D8-D9).
> Re-validates after next Copilot Deep Dive lands.

## Problem (reframed)

Every perps trader on Solana configures a bot. None of those bots are
*policy-bound at the wallet layer*. They leak: a single bad signal can
oversize, lever up, hit an off-venue pair, drain the wallet, or trade
against the user's stated rules while the user sleeps. There is no
end-user product where "I trade for you" and "I cannot break your rules"
are the *same statement*.

## Target user (pivoted)

1. **Retail perps traders** on Solana who want rules-bound automation.
2. **Prop-trading firms / teams** with a wallet-per-strategy setup and
   hard risk limits per strategy.
3. **Influencer-signal followers** who want copy-trading with hard caps
   ("follow this trader up to $500/day, kill if drawdown > 20%").

## Top-5 user stories (frozen)

1. As a user, I `pnpm add @trade-on-my-behalf/sdk` and call
   `withTrader(wallet, rules)`, where `rules` is:
   ```ts
   { venues: ['jupiter-perps','drift'],
     maxLeverage: 5,
     maxPositionUsd: 1000,
     maxDailyLossUsd: 200,
     killSwitchDrawdownPct: 20 }
   ```
   The trader enforces this **at the signing layer** via the Anchor
   program; no rogue path can bypass it.
2. As a user, I tell the agent "long SOL 0.1 at 3x if RSI < 30, exit at
   +5%, stop at -2%" — and the trader constructs the conditional, routes
   via Jupiter Perps, signs only if all rules pass.
3. As an operator, I see a `RiskFlag` event in the dashboard for every
   denied trade, with the reason code (leverage exceeded, drawdown hit,
   venue-denied).
4. As a Telegram/Slack user, I get DM control + alerts without giving
   anyone my key.
5. As an auditor, I export every on-chain decision (allowed and
   denied) with policy inputs, signal source, market state at decision
   time, and outcome.

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
- **AgentBazaar MCP** for an *optional* paid signal marketplace integration.
- **Phantom Connect** for embedded wallet in dashboard.
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

---
Updated D3'-pivot. Awaiting Copilot Deep Dive on perps agents to confirm
wedge before code resumes.
