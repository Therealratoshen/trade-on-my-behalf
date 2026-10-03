# Pitch Script — Truthful Draft, Not a Recorded Video

Updated 2026-10-03. Proposed duration 2:30. Recording/link status is unverified; this is a script.

## 0:00–0:25 — Problem

“I want to take perpetual trades without losing track of the rules I set. A chart tells me about the market; it does not tell me whether an automated trade stayed inside my policy.”

## 0:25–0:50 — Product

“Trade On My Behalf is a Solana devnet-first perps terminal in development. The target is one wallet-connected market workspace with a chart, trade preview, clear policy outcomes and position receipts.”

On screen: label any unbuilt terminal design as **proposed**. The existing page is a viewer and policy editor, not a completed chart/ticket terminal.

## 0:50–1:35 — Demonstration

“The current demo sends authorization requests to our Anchor policy program. It records approval or denial against the stored fields. When approved, the current executor simulates a position using reference-price data. These positions are paper; no order reaches Jupiter.”

Show only actual captured output and its correct local/devnet environment. Explain code 6 leverage denial and code 7 supplied-equity comparison without implying real venue risk verification. Do not put placeholder signatures on screen as proof.

## 1:35–2:05 — What remains

“The next execution boundary is an app-managed account whose authority cannot bypass policy, with a verified devnet venue, authenticated risk data and retry-safe order reconciliation. The chart and trading ticket also remain to be built.”

## 2:05–2:30 — Honest close

“Today we demonstrate explicit policy decisions and simulated positions. We do not yet claim live venue execution, independently verified drawdown or an unbypassable wallet-wide trading guarantee. The repository documents those gaps and the tests needed to close them.”

## Recording gate

Use [SUBMISSION.md](../SUBMISSION.md) and actual [receipts](../docs/demo-receipts.md). Do not say outside users passed before [sessions](../docs/user-tests.md) are recorded. Replace a draft link only with an accessible completed recording.
