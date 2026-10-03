# 00 — Challenge Brief

> **Historical record / planning background — labelled 2026-10-03.** Preserved original contents, not current implementation, runnable instructions, test-pass evidence or a freshly verified venue/event claim. Current product requirements: [PRD](../../../PRD.md); technical contracts: [TRD](../../../TRD.md); test status: [testing plan](../../../docs/testing-plan.md).


> Stage 0 of the design-thinking pass for **Trade On My Behalf**.
> Saved D6 (2026-09-26). One artifact per stage; do not advance until
> the previous stage exists, even rough.

## Goal

Ship a product that solves *the founder's* pain as the primary user,
validated by 3 outside-dev testers on D10–D11, and judged as a
**top-10 winner in the Solana track at Crypto World's Fair 2026**
(minimum bar) with the wedge line — *"I trade for you, and I cannot
break your rules"* — holding together under judges' reading.

## Scope

The 6 official hackathon judging criteria are the surface area we
optimize against (the `docs/gtm-and-submission.md` mapping holds,
this brief is the upstream of that):

| # | Criterion (paraphrased) | What it means for design |
|---|---|---|
| 1 | **Technical implementation** | Anchor `treasury` policy kernel compiles (D4 ✅); leverage cap + drawdown kill-switch land D7; Surfpool demo runs D10. |
| 2 | **Business potential** | Performance-fee frame in pitch (`agent-arc` precedent); wedge = on-chain rules for time-poor retail. |
| 3 | **Novelty / originality** | 5-dim dimension map at `docs/research/dimension-map.md` shows the intersection P + A + X + T + M is empty; SPEC.md §"Wedge" states it. |
| 4 | **User experience** | TG DM approve/deny as primary control surface (per `docs/control-surface.md`); 60-second auto-skip is a feeling moment. |
| 5 | **Open-source contribution** | Anchor program + SDK + agent runtime + venues + dashboard all MIT; `scripts/devnet-demo.sh` reproducible end-to-end. |
| 6 | **Composability** | Jupiter Perps / Drift venues; Helius webhooks; AgentBazaar signals; Phantom wallet; every layer a primitive the judges reward. |

Out of scope (frozen in SPEC §"Explicit non-goals"): no credit
lines, no multi-chain, no LTC bridge, no mobile-first, no AI signal
generation v1.

## Constraints

| Constraint | Value | Source |
|---|---|---|
| Time-to-deadline | **16 days** (Oct 12, 2026 11:59pm PT) | `PM-LOG.md` §1 |
| Team | **solo** founder | `PM-LOG.md` §1 |
| Founder profile | newcomer to Solana (skills installed D1; treasury program first on-chain code D4) | `PM-LOG.md` §1 + `README.md` §Status |
| Compute budget | personal machine; LiteSVM + Surfpool for tests | `SPEC.md` §"Tech stack" |
| External API access | needs `~/.config/solana/id.json`, Helius key, Jupiter API key (U1–U3 in PM-LOG §6) | `PM-LOG.md` §6 |
| Cluster context | v1-c9 "Solana DEX and Trading", 323 projects, 23 winners; dense | `SPEC.md` §"Perps-agent deep dive (D5)" |
| Cluster verdict | PARTIAL GAP (per D5); 0 projects at P + A + X + T + M | `SPEC.md` §"Perps-agent deep dive (D5)" |

## Success

> **Top-10 winner in the Solana track at Crypto World's Fair 2026**
> *at minimum.*

Stretch:

- top-3 in track;
- weekly update video D11/D14/D16 cited by judge in feedback;
- performance-fee pitch line lands without a question;
- 3/3 outside-dev testers describe a *measurable before→after
  feeling shift* (Stage 5 test rubric).

Hard kill criteria (we don't ship if):

- the on-chain policy kernel does not actually sign-or-deny (the
  "physically cannot break your rules" claim fails);
- the TG bot cannot deliver a DM within 60s end-to-end on devnet;
- the wedge is contested by a project we did not surface in
  `docs/research/dimension-map.md`.

## Research mode

**`assumption` — explicit.**

We have **no live user interviews before D17.** Founder chat-history
quotes (see Stage 1) are the only direct human evidence we have.
Every other claim in this design-thinking pass is labeled
**assumption** and queued for validation on D10–D11 against the 3
outside-dev testers from `docs/user-tests.md`.

Operating rules (from the design-thinking skill):

1. **One artifact per stage.** Do not skip ahead.
2. **Evidence > assumption.** Cite slug, doc, or commit. Else label.
3. **Feeling is the currency.** Plutchik primaries; pair each pain
   emotion with its mirrored gain.
4. **Be decisive.** Write assumptions, do not ask.
5. **No code changes.** This pass is docs-only; code resumes D7.

## Sign-off

Owner: solo. Saved by design-thinking subagent D6. Next artifact:
`01-empathy-map.md`.
