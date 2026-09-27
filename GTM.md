# GTM — Trade On My Behalf

> Frozen for D6. Final pass on D15. Form-mirror at `docs/gtm-and-submission.md`.
>
> Pricing decision evidence last refreshed D6 (commit `dcc6e91` — pending).
> See `docs/research/copilot-bizmodel-{01..04}.json` for raw Copilot output.

## Path (c) — slow B2C, hybrid open-source (D6 founder call)

Per the founder's call: ship as **path (c) — slow B2C with a
hybrid open-source model**. See `docs/oss-precedent.md` for the
evidence that this position is uncrowded.

Layer | License | Why
|---|---|---|
| `programs/treasury/` Anchor kernel | **MIT** | The on-chain policy gate. Earns Open-source criterion. No MIT cross-license conflict (`smart-wallet` is the closest precedent but unlicensed).
| `packages/sdk/` + `packages/agent/` + `packages/venues/` | **MIT** | The integration layer. Earns Composability criterion. `fridonai` is the strongest MIT candidate in adjacent space but ships no policy / perps / wallet-control primitives.
| `apps/dashboard/` webapp (v1 control surface) | **MIT** | Phantom Connect or Trust Wallet, viewer + rule editor. Earns Business Plan and Open-source both.
| ~~Telegram control surface~~ | v3, never (cut D8.5+) | Superseded by webapp. Replaced at the design table, not the code table.
| Hosted alert + PnL reporting | **Proprietary (hosted)** | Optional v2; aligns with performance-fee pricing.

## Pricing model (evidence-led, D6)

**v1 stance:** Performance-fee framing for the pitch. The user never
pays out of pocket; we take 5% of realized PnL on approved trades.

**Why performance-fee wins the evidence floor** (Copilot queries
`docs/research/copilot-bizmodel-01..04`):

- `agent-arc` (Breakout 2025-04, 3rd Place - AI, $15K) is the
  strongest single precedent: a non-custodial AI trading terminal
  that won a prize explicitly under the performance-fee frame.
- `mcpay`, `corbits.dev`, `latinum-agentic-commerce` (1st/2nd in
  Stablecoins/Infrastructure/AI 2025) operate on x402 take-rate
  micropayments — same shape, per-trade rather than per-PnL.
- `algoflow` (Radar 2024, copy-trading precedent) implicitly uses
  profit-share framing.
- No prior crypto-agent winner monetized via subscription.
- Per-policy has no oneLiner precedent in the corpus.
- Archive search returned only DEX-protocol-fee docs (Raydium,
  Meteora, Marinade, Orca) — no a16z / Galaxy / Paradigm essays on
  agent-pricing landed; thesis must lean on builder precedent.

**v2 candidate pricing models** (deferred, ordered by preference):
1. **Performance fee** — 5% of realized PnL on approved trades.
   Mirrors `agent-arc`. Aligns incentives. The user never pays out
   of pocket.
2. **Subscription** — $29/mo for >3 policies, $99/mo for
   white-label copy-trading. Predictable revenue. Misaligned when
   user is not trading.
3. **Per-policy one-time** — $49 to publish a policy to the
   registry. Easy to anchor to judges.

**Why-not-subscription for v1** (deferred from prior draft):
`linkwave`, `blocksub`, `sol-subscribe-hub`, `tributary`,
`bundl`, `debyth`, `aeon-protocol` (7+ projects!) all already
monetize recurring-crypto as their thesis. Going subscription-first
is the more crowded lane and explicitly NOT how `agent-arc` won.

## Customer

The wedge customer is **the founder**. Persona: time-poor retail
trader who can describe a setup (a trend, an RSI dip, a news-driven
move) but cannot watch charts. The product exists because the
founder needed it first; the market is downstream.

Adjacent customer segments the same wedge serves without changing the
product:
- **Prop-trading firms / teams** with a wallet-per-strategy setup
  and hard per-strategy risk limits.
- **Influencer-signal followers** who want copy-trading with hard
  caps ("follow this trader up to $500/day, kill if drawdown > 20%").

The primary persona is solo retail. The adjacent segments matter
for v2 pricing but not for v1 GTM.

## Wedge

Three words: **on-chain rules**. Not "AI agent," not "perps bot,"
not "telegram bot." Every existing project has at most two of those
three. We have all three, and the rules are enforced at the wallet's
signing layer so they cannot be bypassed by a rogue signal, a
compromised dependency, or a buggy runtime.

The wedge is the *one statement* that combines all three:

> "I trade for you, and I cannot break your rules."

**Updated framing (D8.5+, see `docs/skills-and-algorithms.md`):**
the wedge is *for specialists who already have a setup*. The
algorithm enforces their rules; the skill decides what to trade;
the runtime samples. We don't promise AI — we promise discipline.
That's the SAS model: Specialist, Algorithm, Skill.

No existing perps bot can say both halves of that sentence truthfully
because none of them has an on-chain policy gate.

## Pricing model

v1 is **free**, capped at 3 policies per wallet on devnet and 1
policy per wallet on mainnet. The intent is to maximize the number
of users we onboard before D17, not to maximize revenue.

v2 (post-hackathon) candidate pricing models, in order of preference:

1. **Performance fee** — 5% of realized PnL on approved trades.
   Mirrors `agent-arc` (3rd Place - AI, Breakout 2025-04). Aligns
   incentives. The user never pays out of pocket.
2. **Subscription** — $29/mo for >3 policies, $99/mo for white-label
   copy-trading. Predictable revenue. Misaligned with the user when
   they are not trading.
3. **Per-policy one-time** — $49 to publish a policy to the
   registry. Easy to anchor to judges.

Decision deferred to v2. For the hackathon, performance-fee is the
position the pitch uses ("if you make money, we make money") and
the README hints at it under "Pricing."

## Why now

Three converging signals:

1. **Perps DEX infra on Solana is mature.** Jupiter Perps and Drift
   both shipped production-grade perps venues in 2024-2025. The
   perps DEX infrastructure exists; the *personal* automation layer
   does not.
2. **Anchor + Kit 8 + Surfpool make policy gates cheap.** A solo
   developer can ship an audited-by-construction policy program in
   days, not months. The treasury program already compiles at
   203 KB and emits a clean `AuditEvent`.
3. **Phantom Connect / Trust Wallet + Next.js 15 make the
   webapp-first v1 control surface cheap.** A solo developer can
   ship a wallet-connected viewer + rule editor in days. The
   combination of Kit 8 + `@solana/wallet-adapter-react` + Helius
   DAS event index makes this a small monorepo, not a chat-bot
   surface to maintain.

If any of those three were missing, the wedge would not exist. All
three are present *now*; the wedge closes if any of them goes away.

## Alternative wedge (fallback)

If the perps-on-webapp wedge proves too crowded between D5 and
D17, the fallback wedge is the **non-perps version of the same
product**: an on-chain risk-gated spending agent for *any* Solana
transaction type, not just perps. The treasury program as it exists
on D4 already supports this — `vendor: Pubkey`, `amount_usdc: u64`
are generic. The fallback customer is an AI-agent dev who wants
hard caps on what their agent can spend.

The fallback loses the perps novelty but keeps the on-chain policy
wedge, which is the harder-to-copy half. We would rename to
"Trade On My Behalf" -> "Agent Treasury SDK" (the D3' name), pitch
to the v1-c14 cluster ("Solana AI Agent Infrastructure"), and lean
harder on the Mercantill-vs-us composition story from
`docs/copilot-verdict.md`.

The fallback is a real product; we do not need to ship it, but we
could pivot to it on D8-D9 if needed.

## Alternative wedge (stretch)

If the wedge is uncontested on D7-D9, the stretch wedge is
**on-chain payroll** — a per-agent wallet with rules for paying
multiple contractors (a DAO treasury with line items). Same
program, different `vendor` semantics (a `vendor` is a contractor
pubkey; the policy caps "spend per contractor per day" instead of
"spend per venue per trade"). This is deferred to v3.

## Pitch-deck rules (Superteam Türkiye blog patterns)

- **Takeaway in title.** Every slide's title is the takeaway,
  4-6 words. No "Problem Statement" or "Solution Overview".
- **<40 words per slide.** A judge should be able to read each
  slide in 15 seconds.
- **15 seconds readable.** If a slide takes longer than 15 seconds
  to read, it is two slides.
- **Supersede proof with numbers.** The closest precedent,
  `agent-arc`, won 3rd Place at Breakout 2025-04. We say it on
  slide 7 with the dollar amount ($15k). No adjectives.

## One-line pitch

> "When my conditions fire, take *this* trade, with *these*
> constraints. If a trade would break a rule, don't take it — even
> if the signal says to."

This is the pitch. If the slide title is longer than this, the
slide is wrong.