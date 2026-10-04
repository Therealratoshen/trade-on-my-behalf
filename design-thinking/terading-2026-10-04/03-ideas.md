# 03 — Ideas

Count target: 30 (solo, four days out — a group session's 50+ is not
achievable and pretending otherwise would be dishonest). No self-editing
during generation; screening follows separately.

## Full list

**Make the decision/other split explicit**
1. Add a `--viz` family (teal/orange) for all price and P&L data
2. Reserve `--ok`/`--no` and document the reservation in prose only
3. Add a `tier` prop to `Panel` and colour the left rail by importance
4. Move every verdict to a dedicated top panel
5. Replace colour with iconography + text so meaning survives without colour
6. Render verdicts as a signed event stream (monospace ledger) rather than badges
7. Give P&L a dedicated numeric column with an explicit unit and sign
8. Add a permanent "what this colour means" legend in the masthead
9. Strip all colour from P&L entirely; use sign and arrow glyphs only
10. Reuse `--ok` for P&L but change `--ok` to a less approval-like hue

**Enforce it**
11. A CI script that greps for hexes outside `:root`
12. Extend #11 to off-scale raw px
13. Extend #11 to verdict-class reuse (the R3b rule)
14. A runtime test asserting rendered classes, rather than source greps
15. A design-token package consumed by both dashboard and receipts page
16. Storybook snapshots as the visual regression net
17. A PR checklist that asks "what does this colour claim?"

**Hierarchy**
18. Three tiers via left rail
19. Three tiers via surface elevation (lighter background per tier)
20. Three tiers via type scale — bigger title per tier
21. Collapse reference panels into a details/summary disclosure
22. Two-column layout: workspace left, policy rail right
23. Tabbed panels with a verdict badge in the tab label
24. Sticky verdict summary bar at the top of the viewport

**Truth surface**
25. Always-visible `Policy: devnet` / `Positions: PAPER` strip
26. Provenance line on every number: source · timeframe · age · stale
27. Chart mirrored as a real `<table>`
28. A demo mode that shows receipts without a wallet
29. Print stylesheet that produces the audit trail on paper
30. A receipt deep-link that reproduces the exact panel state

## Screening

Filtered on the three questions from the skill — outcome fit, cheap-in-cheap-out,
riskiest assumption.

| # | Idea | Outcome fit | Cheap | Riskiest assumption | Verdict |
|---|---|---|---|---|---|
| 1 | `--viz` family | ✅ HMW1 | ✅ 1h | teal/orange is distinguishable from ok/no *to a human* | **SHORTLIST** |
| 3 | `tier` prop + rail | ✅ HMW2 | ✅ 45m | a 3px rail creates hierarchy | **SHORTLIST** |
| 5 | icon + text, not colour | ✅ HMW1 | ⚠️ 3h | colour-blind users can distinguish verdicts at all | deferred |
| 8 | colour legend | ✅ HMW4 | ✅ 30m | a judge reads the legend | **SHORTLIST** |
| 11–13 | guard rules R1/R2/R3b | ✅ HMW3 | ✅ 2h | the regex has no false positives | **SHORTLIST** |
| 14 | runtime class assertions | ✅ HMW3 | ❌ needs test infra | vitest/jest is available | ❌ too costly now |
| 15 | shared token package | ⚠️ | ❌ | both surfaces need it | ❌ duplicates for 2 consumers |
| 19 | surface elevation | ✅ | ✅ | lighter bg reads as more important | rejected — competes with verdict colour |
| 20 | type-scale hierarchy | ✅ | ✅ | bigger = more important | rejected — fights the mono data look |
| 21 | disclosure panels | ⚠️ | ✅ | hiding config is fine | deferred — judge may not expand it |
| 22 | two-column workspace | ✅ HMW2 | ⚠️ 4h | a chart needs width | deferred past the fair |
| 24 | sticky verdict bar | ✅ HMW4 | ✅ 1h | judges look at the top | deferred — competes with the masthead |
| 25 | mode strip | ✅ HMW4 | ✅ 30m | PAPER must not read as live | **SHORTLIST** |
| 26 | provenance line | ✅ HMW1 | ✅ 1h | every number *can* have a source | **SHORTLIST** |
| 27 | chart as table | ✅ HMW1 | ✅ 1h | the table doesn't feel redundant | **SHORTLIST** |
| 10 | re-hue `--ok` | ❌ | — | — | rejected — `--ok` is documented and tested |
| 9 | no colour for P&L | ❌ | — | — | rejected — kills scannability |

## Shortlist (5, distinct approaches)

| # | Idea | Approach | Answers |
|---|---|---|---|
| 1 | `--viz` family | palette separation | HMW1 |
| 8+25 | legend + mode strip | explicit labelling | HMW4 |
| 13 | guard rule R3b | automated enforcement | HMW3 |
| 3 | tier rails | visual hierarchy | HMW2 |
| 26+27 | provenance + chart-as-table | accessible truth | HMW1 |

**Merged:** 5 and 9 share the risky assumption "verdicts survive without
colour" — merged into deferred 5. 22 and 3 both restructure layout; kept 3
(cheaper), 22 deferred.

## Riskiest assumption, stated

**That teal/orange reads as "price" and is not confusable with
green/red = "verdict".** Everything else in the shortlist is verifiable by
reading code. This one needs a human eye, and I do not currently have one — see
`05-test-results.md`.
