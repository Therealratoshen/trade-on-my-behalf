# Demo Receipts — Solscan-Verifiable Proof

> **Status:** Placeholder as of D8.5+ (2026-09-27 15:36 WIB).
> Receipts filled D10–D14 from real on-chain transactions.
> Every claim in [SUBMISSION.md](../SUBMISSION.md) and [README.md](../README.md)
> is downstream of these receipts.

The headline *"I cannot break your rules — within the as-stored
caps"* is only as strong as the receipts that back it. This file
holds three verifiable receipts that judges (and the founder) can
point at on Solscan:

1. **Approve** — an `AuditEvent { approved: true, reason_code: 0 }` for a policy-compliant trade. Proves the happy path works end-to-end.
2. **Leverage deny** — an `AuditEvent { approved: false, reason_code: 6 }` when `leverage_bps > max_leverage_bps`. Proves the leverage gate fires on-chain.
3. **Drawdown deny** — an `AuditEvent { approved: false, reason_code: 7 }` when `implied_current_equity_usdc < threshold`. Proves the kill-switch is on-chain.

Until these three receipts land, the kernel's claims are
testable (6/6 LiteSVM tests pass) but not yet *demonstrated on
devnet*. **The receipts move the claim from "the kernel enforces"
to "I watched it enforce."**

---

## How a receipt is captured

For each demo trade:

1. The runtime builds a v1 transaction containing
   `authorize_spend` (and, on approve, the follow-through venue CPI).
2. The transaction is signed by the devnet keypair and submitted.
3. The receipt is the `(slot, signature)` pair of the
   `authorize_spend` instruction, plus the parsed `AuditEvent` payload.
4. Solscan URL: `https://solscan.io/tx/<signature>?cluster=devnet`.

The runtime mirrors the `AuditEvent` to the webapp via SWR; the
webapp shows the row within ~2 s of slot confirmation.

---

## Receipt 1 — Approve (target D10)

| Field | Value |
|---|---|
| Tester | (founder, devnet) |
| Rule | `maxLeverage: 500` bps · `maxPositionUsd: $200` · `maxDailyLossUsd: $60` · `killSwitchDrawdownPct: 0` (disabled) |
| Trade | side: `long` · market: `SOL-PERP` · sizeUsd: `$150` · lev: `300` bps (3×) |
| Outcome | approved |
| Reason code | 0 (`REASON_OK`) |
| Slot | TBD |
| Signature | TBD |
| Solscan | TBD |

**What this proves:** A policy-compliant trade passes the gate and
the follow-through CPI lands. The headline reads true for the
happy path.

---

## Receipt 2 — Leverage deny (target D11)

| Field | Value |
|---|---|
| Tester | outside-dev #1 (Solana-native dev) |
| Rule | `maxLeverage: 100` bps (1× cap) · `maxPositionUsd: $200` · `maxDailyLossUsd: $60` · `killSwitchDrawdownPct: 0` |
| Trade | side: `long` · market: `SOL-PERP` · sizeUsd: `$150` · lev: `500` bps (5×) |
| Outcome | denied |
| Reason code | 6 (`REASON_LEVERAGE_CAP`) |
| Slot | TBD |
| Signature | TBD |
| Solscan | TBD |

**What this proves:** A leverage-busting trade is denied *by the
on-chain gate*, not by the runtime. The `AuditEvent` carries
`approved: false, reason_code: 6`, verifiable on Solscan. The
headline reads true for the leverage envelope.

**This is the red-row moment of the demo.** The runtime pushes the
intent; the kernel denies; the webapp lights up within ~2 s; the
user (and the judge) see the `reason_code: 6` and the slot number.

---

## Receipt 3 — Drawdown deny (target D11)

| Field | Value |
|---|---|
| Tester | outside-dev #3 (kill-switch stress) |
| Rule | `maxLeverage: 500` bps · `maxPositionUsd: $200` · `maxDailyLossUsd: $60` · `killSwitchDrawdownPct: 25` (25 %) |
| Setup | `record_pnl(new_equity_usdc: 1000)` ⇒ `peak_equity_usdc = 1000` |
| Trade | side: `long` · market: `SOL-PERP` · sizeUsd: `$50` · lev: `100` bps (1×) · `implied_current_equity_usdc: 700` |
| Outcome | denied |
| Reason code | 7 (`REASON_DRAWDOWN_KILLSWITCH`) |
| Threshold math | `1000 × (10_000 − 2_500) / 10_000 = 750` ; `700 < 750` ⇒ KILL |
| Slot | TBD |
| Signature | TBD |
| Solscan | TBD |

**What this proves:** The on-chain kill-switch fires at the
as-stored `peak_equity_usdc` watermark. The `record_pnl` instruction
is the *only* path that mutates `peak_equity_usdc`, and it is
monotonic (`max(peak, new)`). The headline reads true for the
drawdown envelope.

**Why the implied value is `700` here:** the runtime reports
current equity from off-chain venue reconciliation. The runtime is
trusted to pass an honest value, but cannot *widen* the kill-switch
by lying (see [security-model.md §"Scenario 1"](security-model.md)).
The on-chain watermark is what defends the envelope; the runtime
provides the delta.

---

## How judges verify

1. Open the Solscan link for each receipt.
2. Confirm the program id is `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`.
3. Confirm the `AuditEvent` payload matches the table above.
4. Confirm the slot number is real (Solana explorer will resolve).
5. Confirm the policy PDA at `[b"policy", agent_pubkey]` was created
   with the same parameters the founder claims.

---

## What is *not* a receipt

- The 6/6 LiteSVM tests in `programs/treasury/tests/treasury.ts` —
  those are unit tests against the kernel. They prove the
  kernel *would* enforce. The receipts prove the kernel *did*
  enforce, on a real cluster, with real signatures.
- The on-chain `treasury.so` artifact size (209 KB) — proves the
  program compiled. Does not prove it ran.
- The IDL at `programs/treasury/target/idl/treasury.json` — proves
  the instruction surface. Does not prove the instructions fired.

---

## Update cadence

- D10: Receipt 1 (Approve) added.
- D11: Receipts 2 + 3 (Leverage deny + Drawdown deny) added.
- D14: Receipt 4 (Drift-fallback deny, if Drift adapter ships)
  added as stretch.
- D15: Receipt table finalised. Solscan URLs cross-checked by the
  outside-person link check (see [gtm-and-submission.md §10](gtm-and-submission.md)).