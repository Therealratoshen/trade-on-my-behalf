# Submission (stub — final on D15, submitted D17)

## Project

Trade On My Behalf — programmable on-chain perps agent for time-poor
Solana traders. Rules enforced at the wallet's signing layer via an
Anchor program.

## Track

Solana (primary).

> Note: in earlier drafts an LTC bridge was planned for track-
> differentiation. After D3' it was dropped because Litecoin is not
> an official track lane and "forced crypto integration" is a
> common loss-pattern (per rules §14(e-l) and Superteam Türkiye
> post-mortem).

## Videos (URLs filled D13-D14, unlisted-YouTube preferred)

- Pitch (2-3 min): TBD
- Demo (<= 3 min): TBD

## Repo

(Repo URL filled D15 — placeholder left intentionally blank until
the public GitHub remote is created and the D16 outside-person
link check passes.)

## Prior-work disclosure (required by rules §6)

Skills installed pre-window (no functional code shipped):

- `npx skills add ColosseumOrg/colosseum-copilot` (research skill)
- `npx skills add https://github.com/solana-foundation/solana-dev-skill`
- `npx skills add helius-labs/core-ai --skill {build,jupiter,phantom,svm}`

Per official rules §6: work done *inside* the window (Sep 14 - Oct
12, 2026) is judged. Pre-window skills/MCP installation does not
constitute functional code.

## Team

Solo: Filberthenrico. Location: <filled D15>.

## GTM

See `GTM.md`. Pricing posture (D6 founder call): path (c) hybrid —
open-source kernel + SDK + integration + dashboard (MIT); proprietary
Telegram control surface + hosted alert + PnL reporting.

## Security claim (D7 BRD correction → D8 drawdown shipped)

Honest read of `authorize_spend.rs` after the BRD review on
2026-09-26 17:15 PT, **updated D8**:

- **On-chain enforced today** (D7): vendor whitelist, per-tx cap,
  per-day cap, TTL, leverage cap.
- **On-chain enforced today** (D8): drawdown kill-switch via
  `record_pnl` instruction + monotonic `peak_equity_usdc` watermark
  + drawdown check at the top of `authorize_spend`.
- **Best-effort runtime-supplied** (caveat): the implied-current-
  equity number that triggers the on-chain drawdown check is
  reported by the runtime from off-chain venue reconciliation.
  A compromised runtime can lie about current equity. The peak
  is on-chain monotonic; the *delta* is best-effort.
- **Off-chain (runtime) enforced**: signal classification, TG bot
  60s TTL, position sizing before CPI.

If the pitch says "I cannot break your rules", it is the first
six above, with the runtime-supplied-equity caveat called out
explicitly.

---
Updated D8 — on-chain drawdown shipped at commit `fd2b449`;
prior D7' BRD revision kept (project name, repo URL placeholder,
track clarification, honest security claim).
