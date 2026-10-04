# 00 — Challenge Brief

> **Terading design pass — 2026-10-04.** Research mode: **assumption + static
> review evidence**. No human user has looked at the 2026-10-04 design changes.
> Labelled per the skill's rule 4; nothing below is a usability finding.

## Challenge (as stated)

Make the Terading control surface read as a trading terminal, not a settings
page — and do it without weakening the design system's one non-negotiable rule:
a colour may only claim what actually happened.

## Who

| Persona | Source | Role here |
|---|---|---|
| **Owner-trader** (primary) | founder's own words, 2026-09-26 — the only direct evidence in this repo | Sets a policy, watches it enforce itself, must never be misled about *what happened* |
| **Prop-desk operator** (adjacent) | assumption — never interviewed | Needs an auditable decision trail; reads position P&L next to verdicts |
| **Judge at the fair** (real, 4 days out) | assumption | 90 seconds, no wallet, decides whether the kernel is real |

## In scope

- Token architecture and what each colour family is allowed to claim
- Information hierarchy across the five panels
- Verdict vs. market-data semantic separation
- Accessibility of the price surface (chart readable without sight)
- Enforcement of all of the above in CI, not in prose

## Out of scope

Mainnet, multi-venue, chart as an execution surface, and any change to the
kernel. The design must not imply capabilities the product lacks.

## Success

1. No colour on screen claims a decision that did not happen.
2. The page has hierarchy — a reader knows where to look first.
3. The rules are enforced by `pnpm lint`, not by memory.
4. A judge with no wallet sees "this is enforced, and it is honest" in 90 seconds.

## Constraints

- **The browser is unavailable in this sandbox.** Every port I start returns
  `chrome-error://`; `file://` is blocked. Nothing in this pass has been seen
  painted. This is stated again in `05-test-results.md` because it is the
  single biggest gap in the work.
- Solo founder, four days to the fair.
- The existing palette was already token-clean (21/21). This pass had to earn
  its changes, not assert them.
