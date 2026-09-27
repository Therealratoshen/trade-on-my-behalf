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

- Pitch (2–3 min): TBD *(target D13)*
- Demo (≤ 3 min): TBD *(target D14)*

## Repo

(Repo URL filled D15 — placeholder left intentionally blank until
the public GitHub remote is created and the D16 outside-person
link check passes.)

## Demo receipts (filled D10-D14 from on-chain transactions)

| Receipt | What it proves | Slot / sig | Where to look |
|---|---|---|---|
| **Approve** (D10/D11) | On-chain `AuditEvent { approved: true, reason_code: 0 }` for a policy-compliant trade | TBD | [docs/demo-receipts.md](docs/demo-receipts.md) |
| **Leverage deny** (D11) | On-chain `AuditEvent { approved: false, reason_code: 6 }` when `leverage_bps > max_leverage_bps` | TBD | [docs/demo-receipts.md](docs/demo-receipts.md) |
| **Drawdown deny** (D11) | On-chain `AuditEvent { approved: false, reason_code: 7 }` when `implied_equity < threshold` | TBD | [docs/demo-receipts.md](docs/demo-receipts.md) |

These three receipts — verifiable on Solscan — are the load-bearing
proof of the headline *"I cannot break your rules — within the
as-stored caps."* Every other doc claim is downstream of them.

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
open-source kernel + SDK + integration + webapp control surface (MIT);
proprietary hosted alert + PnL reporting. Telegram bot cut D8.5+;
webapp is v1.

## Security claim (D7 BRD correction → D8 drawdown shipped → D8.5 carve-outs)

> **Submitted headline (verbatim):** *"I cannot break your rules —
> **within the as-stored caps**."*

Honest read of `authorize_spend.rs` after the BRD review on
2026-09-26 17:15 PT, **updated D8**, **revised D8.5 with breach-model
carve-outs** (see [docs/security-model.md](docs/security-model.md)):

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
- **Off-chain (runtime) enforced**: signal classification, position
  sizing before CPI, webapp refresh interval (~2 s), position
  reconciliation, fill-event ingestion.

**Honest carve-outs (D8.5+ breach-model, see [docs/security-model.md](docs/security-model.md) §"Scenario 1" + §"Scenario 4"):**

1. **Stolen `owner` key → `update_policy` loosening.** Today the
   owner-only `update_policy` accepts raising every cap, lengthening
   TTL, disabling the kill-switch, and raising the leverage cap to
   100×. This is a known gap. Mitigated by **tighten-timelock**
   (D10+, queued in [PM-LOG.md](PM-LOG.md) §5 R14). Until that
   ships, the headline above is true only for **as-stored** policy
   values, not for "what an attacker could loosen them to."
2. **On-chain gate does not CPI the venue.** The Anchor program
   approves a `vendor: Pubkey` against the `policy.vendors` whitelist
   (32-byte equality); the *follow-through* venue CPI is constructed
   by the SDK in the next instruction of the same transaction. A
   compromised SDK could target a different program or amount.
   Mitigated by **CPI-wrapper or PDA-bound memo** (D10+, queued in
   [PM-LOG.md](PM-LOG.md) §5 R15). Until that ships, the headline is
   true for the *gate decision*, not for *what happens next*.

The pitch and the README lead with the qualifier *"within the
as-stored caps"* so a judge who reads only the headline knows what
the kernel actually defends. The full honest read lives in
[docs/security-model.md](docs/security-model.md).

---
Updated D8 — on-chain drawdown shipped at commit `fd2b449`;
prior D7' BRD revision kept (project name, repo URL placeholder,
track clarification, honest security claim).
