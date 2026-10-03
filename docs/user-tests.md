# User Tests — D11

> **Status:** Templates filled with concrete examples. Actual
> results captured at D11 by the three outside-dev testers.
> Each test logs the user, the rule they configured, the trade they
> attempted, the outcome, and the `AuditEvent` they observed.
> The results are appended verbatim below — no editing, no
> embellishment.
>
> **Target D11 (Fri Oct 2, 2026).** Testers lined up by D9.
> See PM-LOG §5 R19 + §6 (recruiting call).

The three tests are designed to exercise each on-chain gate at
least once:

1. **Test 1 — Solana-native dev** exercises the leverage cap and
   the per-tx cap. Expected outcomes: one approve, one leverage
   deny.
2. **Test 2 — Cross-venue trader** exercises the vendor
   whitelist. Expected outcome: one venue-whitelist deny.
3. **Test 3 — Kill-switch stress** exercises the drawdown
   kill-switch. Expected outcome: one drawdown deny.

If any test deviates from the expected outcome (e.g. a leverage
deny is approved), that is a kernel bug — stop, fix, re-test
before D12.

---

## Test 1 — Solana-native dev

| Field | Value |
|---|---|
| Tester | _(name + background, 1 line; filled at D11)_ |
| Rule | `maxLeverage`: `300` bps (3× cap) · `maxPositionUsd`: `$200` · `dailySpendBudgetUsd`: `$60` · `killSwitchDrawdownPct`: `0` (disabled) |
| Approve trade | side: `long` · market: `SOL-PERP` · sizeUsd: `$150` · lev: `300` bps (3×) |
| Approve outcome | approved · reason code: `0` (`REASON_OK`) |
| Deny trade | side: `long` · market: `SOL-PERP` · sizeUsd: `$150` · lev: `500` bps (5×) |
| Deny outcome | denied · reason code: `6` (`REASON_LEVERAGE_CAP`) |
| Approve observed | slot: _filled_ · tx sig: _filled_ · `approved`: `true` · `reason_code`: `0` |
| Deny observed | slot: _filled_ · tx sig: _filled_ · `approved`: `false` · `reason_code`: `6` |
| Solscan (approve) | `https://solscan.io/tx/<APPROVE_SIG>?cluster=devnet` |
| Solscan (deny) | `https://solscan.io/tx/<DENY_SIG>?cluster=devnet` |
| Webapp latency | _filled_ ms (slot → SWR refresh) |
| Reaction | _(1 sentence — what surprised them; filled at D11)_ |

**Expected per `testing-plan.md`:** The 3× trade at the cap approves;
the 5× trade above the cap denies with `reason_code: 6`. If the 5×
approves, that is a kernel bug.

---

## Test 2 — Cross-venue trader

| Field | Value |
|---|---|
| Tester | _(name + background, 1 line; filled at D11)_ |
| Rule | `maxLeverage`: `300` bps (3× cap) · `maxPositionUsd`: `$500` · `dailySpendBudgetUsd`: `$100` · `killSwitchDrawdownPct`: `0` |
| Vendors whitelisted | Jupiter Perps only (`policy.vendors = [<JUPITER_PERPS_PROGRAM_ID>]`) |
| Approve trade | side: `short` · market: `SOL-PERP` (Jupiter Perps) · sizeUsd: `$400` · lev: `200` bps (2×) |
| Approve outcome | approved · reason code: `0` |
| Deny trade | side: `long` · market: `BTC-PERP` (Drift) — _Drift pubkey NOT in `policy.vendors`_ |
| Deny outcome | denied · reason code: `1` (`REASON_VENDOR_DENIED`) |
| Approve observed | slot: _filled_ · tx sig: _filled_ · `approved`: `true` · `reason_code`: `0` |
| Deny observed | slot: _filled_ · tx sig: _filled_ · `approved`: `false` · `reason_code`: `1` |
| Solscan (approve) | `https://solscan.io/tx/<APPROVE_SIG>?cluster=devnet` |
| Solscan (deny) | `https://solscan.io/tx/<DENY_SIG>?cluster=devnet` |
| Webapp latency | _filled_ ms |
| Reaction | _(1 sentence)_ |

**Expected per `testing-plan.md`:** The Jupiter Perps trade approves;
the Drift trade denies with `reason_code: 1`. If the Drift trade
approves, the vendor whitelist is broken — kernel bug.

---

## Test 3 — Kill-switch stress

| Field | Value |
|---|---|
| Tester | _(name + background, 1 line; filled at D11)_ |
| Rule | `maxLeverage`: `500` bps (5× cap) · `maxPositionUsd`: `$200` · `dailySpendBudgetUsd`: `$60` · `killSwitchDrawdownPct`: `25` (25 %) |
| Setup | `record_pnl(new_equity_usdc: 1000)` ⇒ `peak_equity_usdc = 1000` |
| Approve trade (above water) | side: `long` · market: `SOL-PERP` · sizeUsd: `$50` · lev: `100` bps · `implied_current_equity_usdc: 900` |
| Approve outcome | approved · reason code: `0` |
| Setup (under water) | runtime reconciles losses; reports `implied_current_equity_usdc: 700` |
| Deny trade (under water) | side: `long` · market: `SOL-PERP` · sizeUsd: `$50` · lev: `100` bps · `implied_current_equity_usdc: 700` |
| Deny outcome | denied · reason code: `7` (`REASON_DRAWDOWN_KILLSWITCH`) |
| Threshold math | `1000 × (10_000 − 2_500) / 10_000 = 750` ; `700 < 750` ⇒ KILL |
| Approve observed | slot: _filled_ · tx sig: _filled_ · `approved`: `true` · `reason_code`: `0` |
| Deny observed | slot: _filled_ · tx sig: _filled_ · `approved`: `false` · `reason_code`: `7` |
| Solscan (approve) | `https://solscan.io/tx/<APPROVE_SIG>?cluster=devnet` |
| Solscan (deny) | `https://solscan.io/tx/<DENY_SIG>?cluster=devnet` |
| Webapp latency | _filled_ ms |
| Reaction | _(1 sentence)_ |

**Expected per `testing-plan.md`:** The above-water trade approves
with `reason_code: 0`; the under-water trade denies with
`reason_code: 7` and `day_spent_usdc` is unchanged. If the
under-water trade approves, the kill-switch is broken — kernel bug.

---

## Notes for judges

- **A deny is the product working, not failing.** Read the reason code first.
- **A timeout means the tester's phone wasn't reachable in 60 s.** That's also working as designed. The persona's complaint about being-at-work is the use case.
- **`reason_code` is the canonical output of `authorize_spend`.** Codes 0..7 are defined in [`programs/treasury/programs/treasury/src/state/mod.rs`](../programs/treasury/programs/treasury/src/state/mod.rs). Code 99 is the runtime-local timeout code (off-chain only).
- **Slot numbers are real.** Verifiable on Solscan.
- **`policy.vendors` is a 32-byte Pubkey check** — see [security-model.md §"Scenario 4"](security-model.md) for the SDK-trust caveat that applies to the follow-through CPI.

## What to look for

- Tester 1's deliberately-over-leveraged trade must deny. Reason code expected: `6` (`REASON_LEVERAGE_CAP`). If approved, that's a bug.
- Tester 2's venue-whitelist test (if they try an off-whitelist venue) must deny. Reason code expected: `1` (`REASON_VENDOR_DENIED`).
- Tester 3's repeated losses must trip the kill-switch and the next trade must deny. Reason code expected: `7` (`REASON_DRAWDOWN_KILLSWITCH`).

If any of those three things don't happen, the kernel isn't enforcing and the demo isn't ready. Stop and check the Anchor program state.

## How to fill this template at D11

1. Open the Solscan link for each receipt — verify the program id is `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`.
2. Paste the slot number and base58 signature into the row.
3. Record the webapp latency from the audit-log row timestamp (slot → SWR refresh).
4. Ask the tester for one sentence on what surprised them.
5. Append verbatim — no editing, no embellishment.
6. Once all three rows are filled, the founder signs off in PM-LOG §3 decision log as `D11: 3 outside-dev user tests recorded`.