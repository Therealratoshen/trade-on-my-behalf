# 05 — Test Plan

> Stage 5 of the design-thinking pass.
> Three outside-dev user tests (the same 3 from
> `docs/user-tests.md` template), each mapped to a feeling-shift
> measurement.
> Continue / iterate / kill decision rule.
> Schedule: D10 dry run, D11 formal three, D12 synthesize.
> Research mode: **assumption** (declared in `00-challenge-brief.md`).

## Test questions

For each tester (Tester 1, 2, 3 from `docs/user-tests.md`), we
have **three** test questions — one per HMW that advanced from
Stage 2:

| # | Question | Prototype |
|---|---|---|
| Q1 | Does the on-chain `Policy` PDA actually refuse to sign a violating trade? | HMW-A3 (Trust) |
| Q2 | Does the TG DM land within 60s and does the founder feel in control? | HMW-A4 (Joy) |
| Q3 | Does the founder *see* the `RiskFlag` (the rule reason code) before the trade? | HMW-A5 (Anticipation) |

## Feeling-shift measurement (semantic pairs)

For each tester, before and after the 5-minute demo, we ask them
to place themselves on a 7-point semantic pair. The delta is the
**feeling-shift signal**. The behavioral sign is a separate
check.

| Emotion (pain → gain) | Semantic pair (low ↔ high) |
|---|---|
| Distrust → **Trust** (HMW-A3) | "I don't trust this bot" ↔ "I trust this bot" |
| Frustration → **Joy** (HMW-A4) | "I'd still need to watch charts" ↔ "I can walk away" |
| (Distrust) → **Anticipation** (HMW-A5) | "The rules are theoretical" ↔ "I saw the rules fire" |

**Behavioral sign** (the rule from the skill: small shift + polite
praise = not real yet):

- would they *re-open* the dashboard within 24h unprompted?
- would they *tell a friend* about it in 24h?
- did they *abandon a workaround* (e.g. close the manual position
  they had open)?

A +2 delta on any pair **without** a behavioral sign = not real
yet. A +2 delta **with** a behavioral sign = real.

## The 3 outside-dev testers (mirrors `docs/user-tests.md`)

| Tester | Rule they will set (per the stub) | Outcome we want |
|---|---|---|
| **1 — Solana-native dev** | `venues: ['jupiter-perps'], maxLeverage: 3, maxPositionUsd: 200, maxDailyLossUsd: 60, killSwitchDrawdownPct: 15` | Approve path + a *deliberately* oversized trade that **denies**. Want the deny reason code visible in TG *and* on-chain `AuditEvent`. |
| **2 — Cross-venue trader** | `venues: ['drift','jupiter-perps'], maxLeverage: 5, maxPositionUsd: 500, maxDailyLossUsd: 150, killSwitchDrawdownPct: 20` | Two venues; one trade on each; one trade denied via venue whitelist manipulation. Want the dashboard to show both venues' audit trail side-by-side. |
| **3 — Kill-switch stress** | `venues: ['drift'], maxLeverage: 2, maxPositionUsd: 100, maxDailyLossUsd: 30, killSwitchDrawdownPct: 10` | Repeated small losses to trip kill-switch; verify `/kill` flips `policy.kill_switch: true`; verify subsequent trade returns `REASON_DRAWDOWN_TRIPPED (7)`. |

## Schedule

| Day | Date | Action | Output |
|---|---|---|---|
| **D10** | 2026-10-05 | **Dry run with 1 tester** (founder-recruited from Solana Discord / Superteam Türkiye alumni). 30 min, scripted. | Fix the friction the dry run surfaces. Do *not* count toward the 3 formal testers. |
| **D11** | 2026-10-06 | **Formal 3 testers** in parallel; each records rule, trade, outcome, `AuditEvent`, "what surprised them" per the `docs/user-tests.md` template. | The 3 filled-in `docs/user-tests.md` sections. |
| **D11 EOD** | 2026-10-06 | Founder (solo) reviews all 3 fills; tags each as `pass` / `iterate` / `kill` per the decision rule below. | The decision log at the bottom of this file. |
| **D12** | 2026-10-07 | **Synthesize** findings into `GTM.md` §"Customer" + pitch video §"Three testers. Three feeling shifts." | Updated GTM.md; updated pitch script (`04-prototype.md` §Slide 6). |

## Decision rule (continue / iterate / kill)

For each tester's three Q1/Q2/Q3 questions:

| After-feeling delta | Behavioral sign | Decision |
|---|---|---|
| **≥ +2 on all 3** with at least 2 behavioral signs | ✅ | **Continue.** Synthesize into GTM; quote tester in pitch Slide 6. |
| **≥ +2 on 2 of 3** | mixed | **Iterate.** Patch the friction (UI copy / button placement / latency); re-test D12 with the same tester. |
| **+1 on Trust only** (the wedge-defining shift) | ❌ | **Iterate on the demo, not the product.** Trust must land or the pitch fails. Re-script the demo to surface the on-chain gate earlier. |
| **0 or negative on Trust** | ❌ | **Kill.** The wedge is not landing. Pivot to the v2 wedge (`GTM.md` §"Alternative wedge (fallback)") — non-perps on-chain risk-gated spending agent. |
| **New need contradicting the POV** (e.g. tester says "I want a *cheaper* bot, not a *safer* one") | n/a | **Back to Define.** Re-run Stage 2 with the new insight; re-screen HMWs. |

## Pre-staged test scenarios (for D11 reliability)

Per `03-ideation.md` §"Riskiest assumption": the demo must
demonstrably deny. Each tester receives a **pre-staged rule** in
their onboarding script that *will* deny at least one trade in
the 5-minute window. This is the controlled part of the test.

The uncontrolled part is what they *also* try — Tester 2's
venue-whitelist flip, Tester 3's kill-switch trip — which is
where the surprising findings will come from.

## What we expect to learn

(assumption, not committed; logged here for D12 retro.)

- Whether the 60s TTL is felt as **empowering** or as
  **pressuring** (Joy ↔ Anxiety).
- Whether the inline reason-code preview *causes* the founder to
  second-guess their own rules (the Riskiest Assumption in
  ideation).
- Whether Tester 3's kill-switch firing is the moment Trust
  crystallizes (the persona's narrative), or whether it's
  experienced as a *failure* (the user's narrative). The two
  can diverge.

## Iteration handoff to D12

D12's deliverable is a 1-page `GTM.md` diff that says, in plain
language:

1. Which of the 3 testers moved on Trust (the wedge)?
2. What was the most surprising thing each tester said or did?
3. Which slide of `04-prototype.md` changes because of D11?
4. Did we ship, iterate, or pivot?

> Research-mode reminder: this test plan is the **first time** any
> outside-dev data enters the design loop. Everything above
> (the semantic pairs, the schedule, the decision rule) is
> assumption; the D11 results are the first evidence.