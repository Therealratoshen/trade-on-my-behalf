# Roadmap — D5 (today) through D17 (Oct 12)

> Frozen for D6. Solo time budget: realistic, not aspirational. Each
> day lists the goal, the exit criteria, the owner (you), and the
> commit-name pattern.

The hackathon window ends **Oct 12, 2026, 11:59 pm PT**. The
founder submits on D17. This document is the day-by-day plan for
the remaining 13 days. It assumes 6-8 productive hours per day on
weekdays and 2-3 on weekends.

Owner is **solo** for the entire window. Where the day requires an
outside-dev test, the "owner" still costs founder time to run the
session and capture the result.

## Day-by-day

| Day | Date | Goal | Exit criteria | Owner | Commit pattern |
|---|---|---|---|---|---|
| D5 | Sat Sep 26 (today) | Deep Dive verdict on perps wedge + Copilot PAT noted flaky | Perps-deepdive-01..04 saved; verdict logged in SPEC.md | you | `D5: perps-agent Deep Dive verdict — PARTIAL GAP in v1-c9` (already in) |
| D6 | Sun Sep 27 | Documentation-first scaffold | All 12 docs + GTM merged; README points at `docs/architecture.md`, `docs/onboarding.md`, `docs/roadmap.md` | you | `D6: documentation-first scaffold (12 docs + GTM)` |
| D7 | Mon Sep 28 | SDK skeleton + first Jupiter Perps adapter sketch | `withTrader(...)` signature compiles; Tier 1 LiteSVM tests still green | you | `D7: SDK skeleton + first TypeScript binding for treasury IDL` |
| D8 | Tue Sep 29 | Anchor program extended with `max_leverage_bps` + `drawdown_peak_usdc` | New fields in `state/mod.rs`, `REASON_LEVERAGE_CAP` and `REASON_DRAWDOWN_KILLSWITCH`; Tier 1 tests updated; program re-compiles | you | `D8: treasury v0.2 — leverage cap + drawdown kill` |
| D9 | Wed Sep 30 | Drift adapter + Telegram bot binding flow | Adapter passes Tier 2 `s03_drift_fallback`; Telegram bind issues an HMAC-signed challenge; off-chain evaluator mirrors new REASON codes | you | `D9: Drift adapter + Telegram bind flow` |
| D10 | Thu Oct 1 | Surfpool integration test + first end-to-end Tier 2 | `s01_full_flow` green; dashboard renders two `AuditEvent`s from `s04_daily_cap_on_chain` | you | `D10: Surfpool Tier 2 integration green` |
| D11 | Fri Oct 2 | Three outside-dev user tests | `docs/user-tests.md` filled by three testers; founder signs off | you (run) | `D11: 3 outside-dev user tests recorded` |
| D12 | Sat Oct 3 | Weekly 1-min update #1 recorded + pitched to founders' group | Loom of the founder narrating "SDK ships, first Jupiter Perps test through policy gate" | you | `D12: 1-min update #1 (SDK + first Jupiter test)` |
| D13 | Sun Oct 4 | Pitch video (2-3 min) recorded | Unlisted YouTube link pasted into `docs/gtm-and-submission.md`; 8 slides ≤40 words each | you | `D13: pitch video recorded` |
| D14 | Mon Oct 5 | Demo video (≤3 min) recorded + Drift extension to drawdown kill | Unlisted demo link; `s05_kill_switch` green | you | `D14: demo video + Drift drawdown kill wired` |
| D15 | Tue Oct 6 | Polish pass: README, SUBMISSION.md, GTM.md cross-check | All links resolve from a fresh `git clone`; `docs/architecture.md` matches the current IDL | you | `D15: docs polish + cross-doc consistency` |
| D16 | Wed Oct 7 | Outside-person link check + final read-through of submission package | One outside person clicks every link in the form preview and the README | you (run) | `D16: outside-person link check passed` |
| D17 | Thu Oct 8 *(target submit EOD D16)* | Submit | Form submitted; backup screenshots saved | you | `D17: SUBMITTED` |

> **Calendar note.** Sep 26 is a Saturday. Oct 12 is a Monday. The
> "D17" column above maps to Oct 8; the founder's own target is to
> submit by EOD D16 (Oct 7) so D17 is buffer. Re-read SPEC.md's
> "Iteration cadence" section for the original weekly cadence.

## Weekend fall-back

If a weekday slips, the weekend days D12 and D13 are the natural
buffer. Each is rated "2-3 productive hours" rather than the
weekday "6-8".

## What gets *cut* if time is short

In descending order of cut-priority:

1. **D14 Drift extension to drawdown kill** — useful but optional.
   The kill-switch is already on-chain via the off-chain evaluator.
2. **D14 Zeta adapter** — explicitly stretch. Cut.
3. **D14-D17 Pieverse-style receipts** — explicitly stretch. Cut.
4. **D13 slide-7 "Two precedents" comparison** — useful but the
   pitch can survive with the closer "DEMO" slide only.

The "must ship" minimum is everything above the first cut line.

## Commit naming

Every commit message in this window follows the pattern:

```text
<Day>: <one-line summary>
```

Where `<Day>` is one of `D6`, `D7`, ..., `D17`. Branch name is
`main`. The README's `## Status` section is updated in the same
commit that completes the day's exit criteria.

## Re-read these before starting each day

- SPEC.md — for the frozen scope and the wedge.
- docs/architecture.md — for the canonical diagram.
- docs/roadmap.md (this doc) — for what today is.

The day starts by reading these three. The day ends by writing the
day's commit.