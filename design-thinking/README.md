# Design Thinking — Trade On My Behalf

> One artifact per stage; do not skip ahead. D6 (2026-09-26) pass.
> Research mode: **ASSUMPTION**. Assumptions to be tested on D10–D11
> with outside-dev users per `docs/user-tests.md`.

## Index

1. [`00-challenge-brief.md`](00-challenge-brief.md) — goal, scope (6 hackathon criteria), constraints (16 days, solo, newcomer to Solana), success (= top-10 Solana track winner), research-mode declaration.
2. [`01-empathy-map.md`](01-empathy-map.md) — two personas (founder primary; prop-trading firm operator adjacent); Says / Thinks / Does / Feels; Plutchik primaries paired with mirrored gains; founder quotes cited as evidence.
3. [`02-problem-statement.md`](02-problem-statement.md) — POV problem statements per persona; 6–10 HMWs across all 5 wedge dimensions; **top 3 HMWs advanced**: HMW-A3, HMW-A4, HMW-A5.
4. [`03-ideation.md`](03-ideation.md) — 14 raw ideas; 5-item DFV shortlist; **one shipped: the combined "Trade On My Behalf" TG control plane** (matches SPEC.md v1-c9 / D3' frozen shape).
5. [`04-prototype.md`](04-prototype.md) — 8-slide pitch-video script with feeling-shift arc per slide; TG wireframe ASCII for risk-flag auto-skip; one demo-video *"the thing runs"* passage.
6. [`05-test.md`](05-test.md) — 3 outside-dev tests (same 3 from `docs/user-tests.md`); feeling-shift measurement via semantic pairs + behavioral signs; continue/iterate/kill decision rule; D10 dry run, D11 formal three, D12 synthesize.

## Top 3 HMWs advanced (Stage 2 → Stage 3)

- **HMW-A3** — empower the founder to lock rules at the wallet's
  signing layer → **Trust** (mirrors Distrust). Wedge-defining.
- **HMW-A4** — enable the founder to approve-or-skip from a 60s
  TG DM → **Joy** (mirrors Frustration). UX-defining.
- **HMW-A5** — help the founder see a `RiskFlag` DM (or
  previewed reason in the proposal) for every denied trade →
  **Anticipation** (mirrors Distrust). Demonstration-defining.

## Idea we ship

> The combined "Trade On My Behalf" TG control plane — Anchor
> `Policy` PDA at signing layer + 60s TG DM with inline rule
> preview + `AuditEvent` for every approve/deny + on-chain `Policy`
> PDA as the only signing path.

**1-line DFV defense:** delivers the three after-feelings the
empathy map says the founder is buying (Trust, Joy, Anticipation);
feasibility = on-chain kernel compiles D4 + TG bot specced in
`docs/control-surface.md` + venue adapters 200 LOC each; viability
= 5/6 judging criteria met by this shape, with `agent-arc`
performance-fee pitch frame as the sixth (Biz).

## Date stamp

Saved 2026-09-26 (D6). Next pass after D11 outside-dev tester
results; Stage 5 will iterate Stage 4's Slide 6 and Stage 1's
Persona A `Feels` row from the empirical deltas.

---

**Research mode: ASSUMPTION.** Assumptions to be tested on D10–D11
with outside-dev users per `docs/user-tests.md`. Every claim in
this folder without a slug / doc / commit citation is assumption.
Founder chat-history quotes (in `01-empathy-map.md`) are the only
direct human evidence available before D17.