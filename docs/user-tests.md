# User Tests — D11

> **Status (2026-10-03 WIB): NOT RUN.** No outside-developer test sessions, privacy-safe tester IDs, configured policies, attempted trades, observed outcomes, transaction signatures or slots, latency measurements, or participant reactions are recorded. The cases below are planned scenarios; expected results are not observations. Do not claim these tests passed.
>
> The planned D11 target (Friday, 2026-10-02) has passed. PM-LOG §5 R19 and `docs/whats-missing.md` report that testers were not lined up. The previously recorded local demo is not a substitute for these human devnet tests.

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

> **Run status: NOT RUN (2026-10-03 WIB).** No participant session was recorded for this case. The inputs below are planned only; no policy was configured and no trade was attempted.

| Field | Value |
|---|---|
| Tester ID | NOT RUN — no participant session was recorded. |
| Planned policy (not configured) | `maxLeverage`: `300` bps (3× cap) · `maxPositionUsd`: `$200` · `maxDailyLossUsd`: `$60` · `killSwitchDrawdownPct`: `0` (disabled) |
| Planned approve trade (not attempted) | side: `long` · market: `SOL-PERP` · sizeUsd: `$150` · lev: `300` bps (3×) |
| Expected approve result (not observed) | approved · reason code: `0` (`REASON_OK`) |
| Planned deny trade (not attempted) | side: `long` · market: `SOL-PERP` · sizeUsd: `$150` · lev: `500` bps (5×) |
| Expected deny result (not observed) | denied · reason code: `6` (`REASON_LEVERAGE_CAP`) |
| Actual approve evidence | NOT OBSERVED — no session, slot, signature, or AuditEvent. |
| Actual deny evidence | NOT OBSERVED — no session, slot, signature, or AuditEvent. |
| Solscan approve receipt | NOT AVAILABLE — no transaction signature was recorded. |
| Solscan deny receipt | NOT AVAILABLE — no transaction signature was recorded. |
| Webapp latency | NOT MEASURED — no session or audit refresh was observed. |
| Tester reaction | NOT COLLECTED — no session. |

**Expected per `testing-plan.md`:** The 3× trade at the cap approves;
the 5× trade above the cap denies with `reason_code: 6`. If the 5×
approves, that is a kernel bug.

---

## Test 2 — Cross-venue trader

> **Run status: NOT RUN (2026-10-03 WIB).** No participant session was recorded for this case. The inputs below are planned only; no policy was configured and no trade was attempted.

| Field | Value |
|---|---|
| Tester ID | NOT RUN — no participant session was recorded. |
| Planned policy (not configured) | `maxLeverage`: `300` bps (3× cap) · `maxPositionUsd`: `$500` · `maxDailyLossUsd`: `$100` · `killSwitchDrawdownPct`: `0` |
| Planned vendor whitelist (not configured) | Jupiter Perps only (`policy.vendors = [<JUPITER_PERPS_PROGRAM_ID>]`) |
| Planned approve trade (not attempted) | side: `short` · market: `SOL-PERP` (Jupiter Perps) · sizeUsd: `$400` · lev: `200` bps (2×) |
| Expected approve result (not observed) | approved · reason code: `0` |
| Planned deny trade (not attempted) | side: `long` · market: `BTC-PERP` (Drift) — _Drift pubkey NOT in `policy.vendors`_ |
| Expected deny result (not observed) | denied · reason code: `1` (`REASON_VENDOR_DENIED`) |
| Actual approve evidence | NOT OBSERVED — no session, slot, signature, or AuditEvent. |
| Actual deny evidence | NOT OBSERVED — no session, slot, signature, or AuditEvent. |
| Solscan approve receipt | NOT AVAILABLE — no transaction signature was recorded. |
| Solscan deny receipt | NOT AVAILABLE — no transaction signature was recorded. |
| Webapp latency | NOT MEASURED — no session or audit refresh was observed. |
| Tester reaction | NOT COLLECTED — no session. |

**Expected per `testing-plan.md`:** The Jupiter Perps trade approves;
the Drift trade denies with `reason_code: 1`. If the Drift trade
approves, the vendor whitelist is broken — kernel bug.

---

## Test 3 — Kill-switch stress

> **Run status: NOT RUN (2026-10-03 WIB).** No participant session was recorded for this case. The inputs below are planned only; no policy was configured and no trade was attempted.

| Field | Value |
|---|---|
| Tester ID | NOT RUN — no participant session was recorded. |
| Planned policy (not configured) | `maxLeverage`: `500` bps (5× cap) · `maxPositionUsd`: `$200` · `maxDailyLossUsd`: `$60` · `killSwitchDrawdownPct`: `25` (25 %) |
| Planned setup (not executed) | `record_pnl(new_equity_usdc: 1000)` ⇒ `peak_equity_usdc = 1000` |
| Planned approve trade (not attempted) | side: `long` · market: `SOL-PERP` · sizeUsd: `$50` · lev: `100` bps · `implied_current_equity_usdc: 900` |
| Expected approve result (not observed) | approved · reason code: `0` |
| Planned drawdown setup (not executed) | runtime reconciles losses; reports `implied_current_equity_usdc: 700` |
| Planned deny trade (not attempted) | side: `long` · market: `SOL-PERP` · sizeUsd: `$50` · lev: `100` bps · `implied_current_equity_usdc: 700` |
| Expected deny result (not observed) | denied · reason code: `7` (`REASON_DRAWDOWN_KILLSWITCH`) |
| Expected threshold math (not observed) | `1000 × (10_000 − 2_500) / 10_000 = 750` ; `700 < 750` ⇒ KILL |
| Actual approve evidence | NOT OBSERVED — no session, slot, signature, or AuditEvent. |
| Actual deny evidence | NOT OBSERVED — no session, slot, signature, or AuditEvent. |
| Solscan approve receipt | NOT AVAILABLE — no transaction signature was recorded. |
| Solscan deny receipt | NOT AVAILABLE — no transaction signature was recorded. |
| Webapp latency | NOT MEASURED — no session or audit refresh was observed. |
| Tester reaction | NOT COLLECTED — no session. |

**Expected per `testing-plan.md`:** The above-water trade approves
with `reason_code: 0`; the under-water trade denies with
`reason_code: 7` and `day_spent_usdc` is unchanged. If the
under-water trade approves, the kill-switch is broken — kernel bug.

---

## Planned notes for judges (not observed outcomes)

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

## How to record a completed test

1. Assign a privacy-safe ID such as `UT-01`; record only a broad tester background with consent. Do not include names, handles, or wallet addresses.
2. Record the exact policy that was actually configured and every trade that was actually attempted.
3. Record the observed result and parsed `AuditEvent`. For on-chain runs, verify the program ID and record the real slot, signature, and Solscan link.
4. Measure audit latency from slot confirmation to the audit row appearing in the webapp, and collect one reaction with consent.
5. Append the evidence without embellishment. If the result differs from the expected code, stop and investigate before calling the test passed.
6. Update the status only after the run and its evidence exist. Do not back-date the D11 target or sign off based on a local demo or unit test.
