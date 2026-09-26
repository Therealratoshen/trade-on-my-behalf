# Dimension Map — why 'everyone is doing the same thing' is mostly not true

Pulled from `docs/research/copilot-perp-deepdive-{01,03,04}.json`,
`docs/copilot-verdict.md`, and `docs/research/copilot-bizmodel-{01,02}.json`.
Each project is scored on 5 dimensions of our wedge.

## Dimensions (from SPEC.md §"Tech stack")

- **P** = Perps venue (Jupiter Perps / Drift / Zeta / Infinity-style AMM).
- **A** = AI agent runtime that decides trades.
- **X** = On-chain policy gate at signing layer (the wedge; the hard one).
- **T** = Telegram chat as primary control surface.
- **M** = Personal end-user product (vs infra / SDK for builders).

## Why most prior winners DON'T do what we do

| Project | P | A | X | T | M | One-liner |
|---|:-:|:-:|:-:|:-:|:-:|---|
| agent-arc | Y | Y | . | . | partial | non-custodial AI trading terminal |
| armor-wallet | . | Y | . | . | partial | AI wallet + autonomous trading, no perps |
| mcpay | (pay) | partial | . | . | . | monetize MCP tools via x402 (not perps) |
| corbits.dev | (pay) | . | . | . | partial | x402 reverse proxy + merchant dashboard |
| latinum | (pay) | partial | . | . | partial | payment middleware + MCP wallet |
| infinity.trade | Y | Y_pricing | . | . | . | AI-powered perps DEX, 200x leverage |
| stonksbot-ai | . | Y | . | . | partial | AI trading bot, Renaissance HM |
| xaam | . | Y | . | . | partial | marketplace where AI agents hire each other |
| pot-bot-1 | . | . | . | Y | Y | TG bot, group pool trading |
| debonk-1 | partial | . | . | Y | Y | multichain TG trading bot |
| jumpa-bot | Y | . | . | Y | Y | TG multichain trading bot w/ group treasuries |
| solmind | . | Y | . | Y | . | TG AI agent — natural language wallet ops |
| mercantill | . | partial | Y | . | partial | policy-based spending safeguards for AI agents |
| pieverse | (pay) | . | Y_compliance | Y_wa | partial | compliance receipts via x402b, chat-agent |
| toaster.trade | Y | . | . | . | Y | consumer perps trading |

## What's empty

The intersection of all five (P + A + X + T + M):
0 projects.

The intersection of (A + X) — AI agent + on-chain policy gate:
0 projects. (mercantill has X but only partial A; armor has A but no X.)

The intersection of (P + X) — perps venue + on-chain policy gate:
0 projects. Toaster.trade is P + M but no A, no X.

## Reading the map

People are doing *one* of these in isolation. Lots of perps venues
(7+). Lots of AI agents (10+). Lots of TG bots (7+). Only one
"policy engine" on Solana (`mercantill`), and none that runs against
perps or as a personal end-user product.

**They look similar because they all sit in v1-c9 / v1-c14 / v1-c22.
But on a 5-dimensional wedge, the overlap is mostly one-dimensional.
The wedge is genuinely empty.**

## Why this happens

1. **Perps infra is commoditized** — Jupiter Perps, Drift, Zeta,
   Infinity all solved the venue problem. Anyone can build atop them.
2. **AI agents are easy to demo** — a few hundred LOC and a SIG of
   "agent." The hacks cluster here for prize optics, not product.
3. **Policy-at-signing is the hard one** — it requires an on-chain
   program (Anchor / Pinocchio) that signs-or-doesn't-sign based on
   declared rules. Most AI-agent projects don't want to write a
   program; they ship an off-chain service.
4. **Telegram is a UX layer** — anyone can wrap their service in a
   bot. None of the TG-trading-bot projects have an on-chain policy
   gate behind their chat commands.

So: lots of projects occupy one axis each, very few combine. The
combination is the wedge, and it is empty inside the corpus.
