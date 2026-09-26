# OSS Precedent Search — path (c) verification

> One-page summary of `docs/research/copilot-oss-{01..04}.json`.
> Headline question: does any open-source project on Solana combine
> wallet-level policy + perps venue + Telegram control? (Three layers
> we'd ship as MIT on the path-c hybrid build.)
> Generated D6 (2026-09-26 16:55 PT).

## Method

4 sequential `/search/projects` queries, 2s sleep between, against
the live Colosseum Copilot corpus. One MIT-verified repo per bucket
where possible. No file modification.

## Bucket 1 — wallet policy / spend caps (15 hits)

- **`smart-wallet`** — only result whose oneLiner literally says
  *customizable spending limits using PDAs.*
- **`spl-cards`** — programmable policy via Token Extensions.
- **`open-source:-geyser-gateway`** — verified **MIT**.
- **`solibra-wallet`** — verified **GPL-3**.
- 7 of 15 self-describe as OSS but most have **no LICENSE file**.

## Bucket 2 — TG bot × perps (15 hits)

- Heavy on TG bots (`dex-sentinel`, `pot-bot-1/2`, `kiwi`, `helix`,
  `jumpa-bot`, `solbet`) but **none target a perps venue** —
  DEX / LP / copy-trade only.
- `polyct` is Polymarket, not Solana perps.
- **Zero MIT / Apache hits.**

## Bucket 3 — SDK + treasury + agent policy (15 hits)

- **Closest to "policy SDK" semantics**:
  - `mercantill` — spending safeguards for AI agents, Squads Grid.
  - `blockpal-smart-delegation` — programmable guardrails.
- Zero MIT / Apache hits.

## Bucket 4 — personal AI × perps (12 hits)

- **`fridonai`** — only verified **MIT** project across the
  full 57-result universe.
- `infty.trade` is the only one mentioning perps + AI (200x
  PRMM DEX) but **unlicensed**.

## Synthesis (8 lines)

1. **Cross-bucket overlap = 1** (`mev-bot` shows in B2 and B3 — a
   Jito reference repo, not a policy / perps / chat system).
2. **No project combines all three layers**, or even policy + chat.
3. **MIT / Apache picture is thin**: only **2 verified MIT**
   (`fridonai`, `ample_geyser_gateway`) + **1 GPL-3**
   (`solibra-wallet`) across 57 unique projects + Drift's
   Apache-2.0 SDKs as the perps venue.
4. **Density: sparse, in our favor.** Each of the three layers
   is addressed in isolation by separate teams with separate
   repos. **No fork-and-swap target.** No copycat problem in
   the open-source-native sense.
5. **Closest MIT project combining all 4 buckets: none qualifies.**
6. Strongest MIT candidate is `fridonai` — personal-AI crypto
   framework — covers AI but ships no wallet-policy primitives,
   no perps-venue integration, no Telegram control surface.
7. **`smart-wallet` is the closest precedent on the policy axis**
   but is not MIT-licensed and ships no perps integration or TG
   surface. It is a *prior-art citation* not a *fork-and-swap*.
8. **The path-c OSS position is open.**

## Decision enabled by this artifact

Path (c) — open-source the kernel + SDK + agent runtime,
proprietary the TG chat agent + alert heuristics + PnL
reporting — is *now justified by evidence*:

- The kernel has prior art (`smart-wallet`) but no cross-license
  conflict and no MIT competitor.
- The TG-chat × on-chain-policy intersection is empty.
- The perps × on-chain-policy intersection is empty.
- The triple (P + X + T) intersection is empty in OSS-native land.

So shipping the kernel under MIT is *defensible* (would not be
seen as a copy), the proprietary TG layer is *non-forkable*
(involves Helius Sender heuristics, drawdown algorithm, signal-
to-DM template that are not open-sourceable), and the whole
package beats every corpus precedent on at least one wedge
dimension.

## Raw data

- `docs/research/copilot-oss-01.json` — wallet policy / spend caps
- `docs/research/copilot-oss-02.json` — TG bot × perps
- `docs/research/copilot-oss-03.json` — SDK + treasury + agent policy
- `docs/research/copilot-oss-04.json` — personal AI × perps
- `docs/research/oss-precedent-synthesis.md` — full synthesis by subagent

---
Updated 2026-09-26 16:55 PT.
