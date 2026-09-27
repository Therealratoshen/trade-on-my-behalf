# User Tests — D11

> Three outside-dev testers, real names, real numbers. Tester fills
> in; founder does not edit. Appended verbatim.

---

## Test 1 — Solana-native dev

| Field | Value |
|---|---|
| Tester | (name + background, 1 line) |
| Rule | `maxLeverage`: __ bps · `maxPositionUsd`: $__ · `maxDailyLossUsd`: $__ · `killSwitchDrawdownPct`: __% |
| Trade | side: long/short · market: __ · sizeUsd: $__ · lev: __x |
| Outcome | approved / denied / timeout · reason code: __ |
| Observed | slot: __ · tx sig: __ · `approved`: __ · `reason_code`: __ |
| Reaction | (1 sentence — what surprised them) |

## Test 2 — Cross-venue trader

| Field | Value |
|---|---|
| Tester | (name + background, 1 line) |
| Rule | `maxLeverage`: __ bps · `maxPositionUsd`: $__ · `maxDailyLossUsd`: $__ · `killSwitchDrawdownPct`: __% |
| Trade | side: long/short · market: __ · sizeUsd: $__ · lev: __x |
| Outcome | approved / denied / timeout · reason code: __ |
| Observed | slot: __ · tx sig: __ · `approved`: __ · `reason_code`: __ |
| Reaction | (1 sentence) |

## Test 3 — Kill-switch stress

| Field | Value |
|---|---|
| Tester | (name + background, 1 line) |
| Rule | `maxLeverage`: __ bps · `maxPositionUsd`: $__ · `maxDailyLossUsd`: $__ · `killSwitchDrawdownPct`: __% |
| Trade | side: long/short · market: __ · sizeUsd: $__ · lev: __x |
| Outcome | approved / denied / timeout · reason code: __ |
| Observed | slot: __ · tx sig: __ · `approved`: __ · `reason_code`: __ |
| Reaction | (1 sentence) |

---

## Notes for judges

- **A deny is the product working, not failing.** Read the reason code first.
- **A timeout means the tester's phone wasn't reachable in 60 s.** That's also working as designed. The persona's complaint about being-at-work is the use case.
- **`reason_code` is the canonical output of `authorize_spend`.** Codes 0..7 are defined in `programs/treasury/programs/treasury/src/state/mod.rs`. Code 99 is the runtime-local timeout code (off-chain only).
- **Slot numbers are real.** Verifiable on Solscan.

## What to look for

- Tester 1's deliberately-over-leveraged trade must deny. Reason code expected: 6 (REASON_LEVERAGE_CAP). If approved, that's a bug.
- Tester 2's venue-whitelist test (if they try an off-whitelist venue) must deny. Reason code expected: 1 (REASON_VENDOR_DENIED).
- Tester 3's repeated losses must trip the kill-switch and the next trade must deny. Reason code expected: 7 (REASON_DRAWDOWN_KILLSWITCH).

If any of those three things don't happen, the kernel isn't enforcing and the demo isn't ready. Stop and check the Anchor program state.
