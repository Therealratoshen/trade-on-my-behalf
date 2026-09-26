# 03 — Ideation

> Stage 3 of the design-thinking pass.
> 12+ raw ideas brainstormed across the top 3 HMWs from
> `02-problem-statement.md`; 4–6 shortlist across the
> Desirability-Feasibility-Viability (DFV) sweet spot; one we
> ship, with a 1-line DFV defense per criterion.
> Research mode: **assumption** (declared in `00-challenge-brief.md`).

## The 3 HMWs in scope

| # | HMW | After-feeling |
|---|---|---|
| 1 | **HMW-A3** lock rules at the wallet's signing layer | Trust (mirrors Distrust) |
| 2 | **HMW-A4** approve-or-skip from a 60s TG DM | Joy (mirrors Frustration) |
| 3 | **HMW-A5** `RiskFlag` DM for every denied trade | Anticipation (mirrors Distrust) |

---

## Raw ideas (14)

### Cluster — HMW-A3 (rules at signing layer)

1. **Anchor `treasury` `Policy` PDA** — every venue tx is a CPI that
   checks the PDA at signing time. Already compiling D4. *(canonical
   answer)*
2. **Phantom Connect session key + allowlist** — wrap a session
   key with a rule set; runtime signs within the envelope.
   *(assumption)* Faster to ship, weaker trust anchor.
3. **Helius Sender rule-envelope + on-chain hash** — sign the rule
   hash into the memo program; Helius Sender rejects mismatches.
   *(assumption)* Hybrid; novel but unproven.
4. **Off-chain rule engine + escrow PDA** — runtime evaluates; PDA
   holds funds and only releases to venue on match. *(assumption)*
   Two points of failure; not the wedge.

### Cluster — HMW-A4 (TG approve/deny)

5. **TG Bot API long-poll + inline `Approve` / `Deny` buttons** —
   60-second TTL with `Promise.race` auto-skip. *(canonical answer;
   matches `docs/control-surface.md`)*
6. **Telegram Mini-App** as a thin rules editor + approve surface.
   *(assumption)* Heavier; defer to v2 per PM-LOG §6 Q3.
7. **SMS approve via Twilio** — no app install. *(assumption)*
   Wrong UX, expensive, not TG-native.

### Cluster — HMW-A5 (RiskFlag DM)

8. **Single combined DM: trade-proposal + RiskFlag reason inline**
   — one DM per intent, reason-code rendered in the message body.
   *(canonical answer)*
9. **Separate RiskFlag channel vs trade-proposal channel** —
   reduces noise, but breaks the "every decision visible in one
   place" feel. *(assumption)*
10. **RiskFlag only on deny** (not on timeout/approve) — quieter,
    but loses the "the rules just fired" feeling moment.
    *(assumption)*

### Cross-cluster (catches two HMWs at once)

11. **`RiskFlag` DM auto-fires on any deny — and the trade-proposal
    DM shows a *previewed* reason code if it *would* deny**. This
    is ideas 5 + 8 + 10 fused: every intent gets a DM with the
    would-be outcome already filled in. *(canonical answer;
    elevates the feeling shift)*
12. **After-action DM at close** — when a position closes (TP/SL/
    liquidation/manual), the runtime DMs the PnL + the rule that
    triggered the close. *(assumption)* Strong but v2.

### Wild-cards

13. **"Demo mode" — a fake TG chat visible on the pitch video page**
    showing a 4-message thread (propose → approve → RiskFlag →
    close). Defer; v2.
14. **Public RiskFlag feed (anonymized) on the dashboard** so the
    founder sees their rules firing *visually*. *(assumption)* v2.

---

## Shortlist (5) — DFV screening

| # | Idea | Desirability | Feasibility | Viability | Riskiest assumption |
|---|---|---|---|---|---|
| 1 | Anchor `Policy` PDA + `AuditEvent` on every decision | **High** — wedge-defining; this is the SPEC promise | **High** — compiles D4; extends D7 | **High** — required by 5/6 judging criteria | that judges read "physically cannot break your rules" as a feature, not a constraint |
| 2 | TG Bot API + 60s `Promise.race` | **High** — UX-defining | **High** — already designed (`docs/control-surface.md`); ships D9 | **High** — judges reward TG-native | that testers have TG open during D11 demo (3/3, very likely) |
| 3 | Combined DM: proposal + previewed reason | **High** — *delivers* the feeling-shift (HMW-A5 in the body of HMW-A4) | **High** — reuses template at `docs/control-surface.md` §"Approve / deny" | **Medium** — small risk: doubles DM frequency in edge cases | that the previewed reason doesn't *cause* the user to second-guess their own rules |
| 4 | `RiskFlag` DM on every *deny* (not on timeout/approve) | **High** — surface area for the wedge demonstration | **High** — single off-chain emit; no chain change | **High** — demo-able in `scripts/devnet-demo.sh` | that "deny fires often enough in 90s demo" — mitigation: pre-stage a rule that will deny |
| 5 | 60-second auto-skip timeout (mirrors Telegram pattern) | **Medium** — judges may ask "what if I miss the ping?" | **High** — already specced | **High** — required for safety | that 60s is the right number — assumption; can tune |

(Ideas 11, 13, 14 folded into 3 and 4. Ideas 2, 6, 7, 9, 10, 12
dropped — wrong fidelity, wrong cluster, or wrong demo timing.)

---

## The idea we ship

> **The combined "Trade On My Behalf" TG control plane** — a single
> end-user perps product where:
>
> 1. every intent is a DM with the trade proposal **and** the
>    would-be rule outcome already filled in,
> 2. the on-chain Anchor `Policy` PDA is the *only* signing path
>    (no off-chain bypass possible),
> 3. every approved and denied decision emits an `AuditEvent`,
>    surfaced as a `RiskFlag` DM on deny and as a dashboard row on
>    approve,
> 4. a 60-second auto-skip timeout protects the founder from
>    unreachable-phone scenarios.

This is *not a new idea* — it is the shape of SPEC.md v1-c9 / D3'
frozen on 2026-09-26. The ideation pass confirms the SPEC matches
the wedge and validates the three HMWs against the same shape.

### 1-line DFV defense per criterion

- **Desirability** — delivers the three after-feelings (Trust via
  the on-chain gate firing, Joy via the 60s approve-or-skip,
  Anticipation via the `RiskFlag` previewed in the proposal DM)
  that the empathy map's Persona A row says the founder is buying.
- **Feasibility** — the on-chain kernel compiles D4; the TG bot is
  already specced in `docs/control-surface.md`; venue adapters
  are 200 LOC each (per SPEC §"Tech stack"); `scripts/devnet-demo.sh`
  reproduces end-to-end by D10.
- **Viability** — 5/6 judging criteria are met by this shape
  (Tech: kernel compiles + extends; Biz: performance-fee pitch;
  Novelty: P+A+X+T+M empty in `docs/research/dimension-map.md`;
  UX: TG DM primary; OSS: MIT across the board). The sixth
  (composability) is delivered by Jupiter Perps + Drift + Helius
  + AgentBazaar as primitives.

### Riskiest assumption

> **The on-chain gate must demonstrably deny in the demo.**
> If the pitch video's *"rules just fired"* scene is mocked or
> hand-waved, judges will down-score Technical and Novelty both.
>
> **Mitigation:** the demo script pre-stages a rule that *will*
> deny (e.g. `maxLeverage: 1`, trade proposed at 5x), so the
> `RiskFlag` DM is observed in real time, not narrated.

> Research-mode reminder: idea #1 and #5 cite slugs and docs
> (evidence); ideas #2, #3, #4, and the wild-cards are assumption
> — the design passes the screen but must be validated on D10–D11.