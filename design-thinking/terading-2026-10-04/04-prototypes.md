# 04 — Prototypes

Fidelity chosen by the question: the open questions here are *does this read
correctly* and *does a rule actually bite* — both answerable at low fidelity.
Three parallel builds, none committed to the product until tested.

## P1 — Palette split (`--viz` family)

**Question:** can price movement be shown without borrowing verdict colours?

Built: 7 new tokens — `--viz-up #3fc9bd`, `--viz-down #e8834f`, two washes,
grid, axis, crosshair. Contrast measured, not guessed: 9.12:1 and 6.90:1 on
`--panel`. Teal and orange chosen specifically so neither is confusable with
`--ok #3ddc97` or `--no #ff5c72`.

Rehomed every price/P&L use: `.pos`, `.neg`, the market badges, the chart
candles, the price-change readout.

**Testable by:** opening `artifacts/design-sheet.html` and checking the two
rows don't blur together.

## P2 — Tier rails

**Question:** can three levels of importance be read without extra chrome?

Built: `tier` prop on `Panel` → 3px left rail. `verdict` (audit log,
`--accent`), `exposure` (positions, `--line`), `reference` (policy, edit,
transparent). Weight via rail rather than border weight or shadow, because the
system forbids gradients and depth would compete with verdict colour.

**Testable by:** squinting at the page. Can you name the most important panel
in one second?

## P3 — Guard with a fourth rule

**Question:** is a source-grep guard trustworthy, or does it lie?

Built: `scripts/check-tokens.mjs`, zero dependencies, four rules.

| Rule | Catches |
|---|---|
| R1 | hex outside `:root` |
| R2 | off-scale raw px (CSS *and* React style objects) |
| R3 | verdict colours on market-data rules |
| R3b | verdict class reused for a non-verdict meaning |
| R4 | text tokens below WCAG AA |

**Tested by deliberately breaking it** — this is the prototype's own test:

| Injected fault | Result |
|---|---|
| `#ff00aa` inline in a component | ✅ R1 fired |
| `margin: 7` in a React style object | ✅ R2 fired (6 real pre-existing hits) |
| `.pos` reverted to `--ok` | ✅ R3 fired |
| `.side-long` given `.yes` | ✅ R3b fired |
| legitimate `APPROVED` in AuditPanel | ⛔ **R3b false-positived on v1** — fixed by scoping to side expressions only |
| `--fg-faint` back to `#5b6373` | ✅ R4 fires (3.30:1) |

Two of my own guard versions were wrong before this one. That is the finding:
**a guard that only ever says "clean" is decoration, not a guard.** The false
positive on AuditPanel is the useful data point — it was caught by running the
guard against known-good code, not by writing it.

## Not prototyped, deliberately

- **Two-column workspace** (#22) — needs a real chart to justify the width
  split, and the chart is not wired to data yet.
- **Sticky verdict bar** (#24) — competes with the masthead for the same
  attention; would need the masthead cut first.
- **Icon + text instead of colour** (#5) — the correct accessibility answer,
  but it is a 3h change and the fair is in four days. Carried to Stage 5 as
  the top deferral, not silently dropped.
