# Demo Receipts — Solscan-Verifiable Proof

> **Status (2026-10-03 WIB): NOT CAPTURED.** No verified public devnet transaction signatures or slots are recorded. The sections below are capture templates: policy/trade inputs are planned, outcomes and reason codes are expected, and the tester/signature/PDA placeholders are not evidence.
>
> PM-LOG decision 20 records a 9/9 local-validator demo run on 2026-09-29. That historical local run is not a Solscan-verifiable devnet receipt and does not satisfy the three outside-dev tests.

The headline *"I cannot break your rules — within the as-stored
caps"* is only as strong as the receipts that back it. This file is a template for three receipt types that judges (and the founder) can verify on Solscan after actual transactions are captured:

1. **Planned approve receipt** — a future `AuditEvent { approved: true, reason_code: 0 }` for a compliant trade would evidence the approve path.
2. **Planned leverage-deny receipt** — a future `AuditEvent { approved: false, reason_code: 6 }` when `leverage_bps > max_leverage_bps` would evidence the leverage gate.
3. **Planned drawdown-deny receipt** — a future `AuditEvent { approved: false, reason_code: 7 }` below the drawdown threshold would evidence the kill-switch.

Until these three receipts are captured, these scenarios are specified but not demonstrated on public devnet. Local tests and the previously recorded local demo are separate evidence. **A verified receipt would move a claim from "the kernel enforces" to "I watched it enforce."**

---

## How a receipt is captured

For each demo trade:

1. The runtime builds a v1 transaction containing
   `authorize_spend` (and, on approve, the follow-through venue CPI).
2. The transaction is signed by the devnet keypair and submitted.
3. The receipt is the `(slot, signature)` pair of the
   `authorize_spend` instruction, plus the parsed `AuditEvent` payload.
4. Solscan URL: `https://solscan.io/tx/<signature>?cluster=devnet`.

The runtime is intended to mirror the `AuditEvent` to the webapp via SWR. The ~2 s visibility figure is an unverified target here; no user-test latency was measured.

---

## Receipt 1 — Approve (target D10)

| Field | Value |
|---|---|
| Tester ID | NOT RUN — no participant session was recorded. |
| Planned policy (not configured) | `maxLeverage: 500` bps · `maxPositionUsd: $200` · `maxDailyLossUsd: $60` · `killSwitchDrawdownPct: 0` (disabled) |
| Planned trade (not attempted) | side: `long` · market: `SOL-PERP` · sizeUsd: `$150` · lev: `300` bps (3×) |
| Expected outcome (not observed) | approved |
| Expected reason code (not observed) | 0 (`REASON_OK`) |
| Slot | NOT CAPTURED — no verified transaction signature. |
| Signature | NOT CAPTURED — no verified devnet transaction. |
| Solscan | NOT AVAILABLE — no real signature recorded. |
| Expected Anchor program (not verified) | `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph` |
| Policy PDA | NOT CAPTURED — no verified policy transaction. |
| Capture method | Planned only; no receipt was captured. |

**Evidence a future verified receipt would provide:** A compliant trade with reason code `0` would show the approve path. No public devnet receipt is currently recorded for this case.

**Capture script (one-liner):**

```bash
# After the runtime prints the receipt, copy/paste into this row.
slot=$(solana transaction-history --signature <SIG> --url devnet | jq '.slot')
sig=<SIG>
solscan="https://solscan.io/tx/${sig}?cluster=devnet"
```

---

## Receipt 2 — Leverage deny (target D11)

| Field | Value |
|---|---|
| Tester ID | NOT RUN — no participant session was recorded. |
| Planned policy (not configured) | `maxLeverage: 100` bps (1× cap) · `maxPositionUsd: $200` · `maxDailyLossUsd: $60` · `killSwitchDrawdownPct: 0` |
| Planned trade (not attempted) | side: `long` · market: `SOL-PERP` · sizeUsd: `$150` · lev: `500` bps (5×) |
| Expected outcome (not observed) | denied |
| Expected reason code (not observed) | 6 (`REASON_LEVERAGE_CAP`) |
| Slot | NOT CAPTURED — no verified transaction signature. |
| Signature | NOT CAPTURED — no verified devnet transaction. |
| Solscan | NOT AVAILABLE — no real signature recorded. |
| Expected Anchor program (not verified) | `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph` |
| Policy PDA | NOT CAPTURED — no verified policy transaction. |
| Capture method | Planned only; no receipt was captured. |

**Evidence a future verified receipt would provide:** A trade above the stored leverage cap with `approved: false` and reason code `6` would show the leverage gate. No public devnet receipt is currently recorded for this case.

**Expected demo flow (not observed):** If run, the intent should be denied by the kernel and shown in the webapp with reason code `6` and a real slot. No such user interaction or receipt is recorded here.

**Capture script (one-liner):**

```bash
# Confirm the deny reason via RPC.
sig=<SIG>
solana confirm <SIG> --url devnet
solana transaction-history --signature <SIG> --url devnet | jq '.slot, .transaction.message.instructions[0].data'
```

---

## Receipt 3 — Drawdown deny (target D11)

| Field | Value |
|---|---|
| Tester ID | NOT RUN — no participant session was recorded. |
| Planned policy (not configured) | `maxLeverage: 500` bps · `maxPositionUsd: $200` · `maxDailyLossUsd: $60` · `killSwitchDrawdownPct: 25` (25 %) |
| Planned setup (not executed) | `record_pnl(new_equity_usdc: 1000)` ⇒ `peak_equity_usdc = 1000` |
| Planned trade (not attempted) | side: `long` · market: `SOL-PERP` · sizeUsd: `$50` · lev: `100` bps (1×) · `implied_current_equity_usdc: 700` |
| Expected outcome (not observed) | denied |
| Expected reason code (not observed) | 7 (`REASON_DRAWDOWN_KILLSWITCH`) |
| Expected threshold math (not observed) | `1000 × (10_000 − 2_500) / 10_000 = 750` ; `700 < 750` ⇒ KILL |
| Slot | NOT CAPTURED — no verified transaction signature. |
| Signature | NOT CAPTURED — no verified devnet transaction. |
| Solscan | NOT AVAILABLE — no real signature recorded. |
| Expected Anchor program (not verified) | `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph` |
| Policy PDA | NOT CAPTURED — no verified policy transaction. |
| Capture method | Planned only; no receipt was captured. |

**Evidence a future verified receipt would provide:** A trade below the drawdown threshold with reason code `7` would show the kill-switch path. No public devnet receipt is currently recorded for this case.

**Why the implied value is `700` here:** the runtime reports
current equity from off-chain venue reconciliation. The runtime is
trusted to pass an honest value, but cannot *widen* the kill-switch
by lying (see [security-model.md §"Scenario 1"](security-model.md)).
The on-chain watermark is what defends the envelope; the runtime
provides the delta.

**Capture script (one-liner):**

```bash
# Confirm the kill-switch math by reading the policy PDA.
pda=$(solana account --keypair <AGENT_KEYPAIR> --url devnet | jq -r '.pubkey')
solana account <PDA> --url devnet | jq '.data | from_base64 | {peak_equity_usdc, kill_switch_drawdown_pct}'
# Expected: {"peak_equity_usdc": 1000, "kill_switch_drawdown_pct": 25}
```

---

## How judges verify

No signatures are recorded yet, so these steps cannot currently verify a public receipt. Use them only after actual transaction evidence is added.


1. Open the Solscan link for each receipt.
2. Confirm the program id is `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`.
3. Confirm the `AuditEvent` payload matches the table above.
4. Confirm the slot number is real (Solana explorer will resolve).
5. Confirm the policy PDA at `[b"policy", agent_pubkey]` was created
   with the same parameters the founder claims.

---

## What is *not* a receipt

- Local program, SDK, or agent tests exercise their configured test environment. They do not prove a transaction executed on public devnet.
- A compiled program artifact or IDL shows that code or an instruction surface exists; neither proves the instructions ran on devnet.

---

## Update cadence

No public devnet receipts were captured as of 2026-10-03 WIB. When a receipt is actually captured, add its real signature, slot, parsed event, and a verified Solscan URL; record the actual capture date. Do not mark a target date as a completed receipt.
