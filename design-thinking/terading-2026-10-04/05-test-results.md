# 05 — Test Results

## Status: NOT RUN. No human has evaluated this design.

Per the skill's rule 4, the research mode declared in `00-challenge-brief.md` is
**assumption + static review evidence**. Nothing in the previous four stages is
a usability finding. This file records that absence explicitly rather than
implying validation.

## What was actually tested

> **Superseded counts (2026-10-04, later pass).** The three automated suites
> in the table below were recorded at the time of this pass and are left
> exactly as they ran. Re-counting the committed test source later the same
> day gives **20 program / 16 SDK / 21 agent = 57** defined cases
> (`programs/treasury/tests/treasury.ts` 20 `it`;
> `packages/sdk/tests/{derivePolicyPda,decode,ensurePolicyOwnership}.test.ts`
> 8 + 3 + 5 `test`; `packages/agent/tests/{evaluator,runtime}.test.ts` 12 + 9
> `test`). The growth is real committed work — agent-consent enforcement and
> argument bounds (`f9c2569`) added 8 program cases and a new SDK ownership
> suite. **57 is a DEFINED count, not a result**: no exit status is recorded
> against the current revision, so nothing here is marked PASS. The
> design-system findings below are unaffected.

Machine checks, with real exit codes:

| Check | Command | Result |
|---|---|---|
| Token guard | `node scripts/check-tokens.mjs` | clean, exit 0 |
| Typecheck x3 + guard | `pnpm lint` | pass |
| Build | `pnpm build` | pass, 4 routes |
| SDK tests | `pnpm --filter @trade-on-my-behalf/sdk test` | 11/11 |
| Agent tests | `pnpm --filter @trade-on-my-behalf/agent test` | 17/17 |
| Program tests | `anchor test` @ `cluster=localnet` | 12/12 |
| Guard fault-injection | 6 injected faults | 5 caught, 1 false positive (fixed) |

Machine checks confirm the design system *holds*. They say nothing about
whether it *reads*.

## The gap, stated plainly

**I have never seen this design rendered.** The sandbox browser reaches only a
single pre-existing server on port 3000 (a different project); every port I
started returned `chrome-error://chromewebdata/` despite `curl` receiving HTTP
200, and `file://` navigation is blocked by policy.

So: contrast is measured, token discipline is machine-verified, and layout is
**unverified by any human eye**. Judging hierarchy, the teal/orange
distinction, and rail weight from CSS is not the same as seeing them.

## One assumption resolved by research rather than by a human

`03-ideas.md` named the riskiest assumption: *teal/orange reads as price and
is not confusable with green/red.* Rather than hand it back, I researched it —
and the answer is that **the assumption was half wrong**.

`scripts/check-cvd.mjs` simulates four colour-vision deficiencies using the
Machado et al. (2009) matrices, the same model behind Coblis and the
peer-reviewed simulators:

| Pair | protanopia | deuteranopia | tritanopia | achromatopsia |
|---|---|---|---|---|
| `--ok` vs `--no` | ok | ok | ok | weak (19.2) |
| `--ok` vs `--viz-up` | ok | ok | weak (17.5) | **COLLIDE (5.7)** |
| `--no` vs `--viz-down` | weak (18.3) | weak (11.7) | ok | weak (10.7) |
| `--viz-up` vs `--viz-down` | ok | ok | ok | **COLLIDE (2.8)** |

ΔE 2.8 is as close to identical as two colours can be. But this is **not a
palette bug**. Achromatopsia has no colour channel; any two colours in a
similar lightness band collapse regardless of hue. I searched candidate hues
for a passing set and found one — `--viz-up #0f8c86` clears every threshold at
ΔE 44.1 — but it is a dull teal that costs the design more than it buys.

**The correct answer was never a different hue.** WCAG 1.4.1 says colour must
never be the *sole* cue, and that is satisfiable at any contrast level. So
every directional element now carries a redundant glyph: `▲`/`■` on verdicts,
`▲`/`▼` on sides, P&L and price change. Guard rule **R5** fails the build if
any of them loses its glyph.

This is the finding that matters most from the whole pass, and it is not
specific to colour: **when a check reports a number you cannot improve, the
answer is a different mechanism, not a different value.** A linter that hard-
fails on an unfixable threshold teaches the team to ignore linters.

## Feeling-shift check: NOT RUN

No semantic-pair placements were collected. Per the skill's rule - *small shift
+ polite praise = not real yet* - the trustworthiness gain asserted in
`02-problem-statement.md` is currently **zero evidence**.

## The one real finding this pass produced

Not from a user. From the guard's own behaviour:

> A linter that has only ever reported "clean" has not been tested.

My first token guard passed clean on a codebase containing a real semantic bug
(`LONG` painted in approval green) and six off-scale values, because it only
understood one syntax and one file. It only became trustworthy after I
deliberately broke the code five ways and checked each one. **R3b exists
because that test found a false positive on a legitimate `APPROVED` badge.**

This generalises beyond CSS: the repo has a whole class of untested guards -
`docs/*` claim "NOT RUN" for suites that in fact pass, and the token check was
a copy-paste one-liner never executed. The lesson is about verification
discipline, not about colour.

## Iteration decision

| Item | Decision | Rule applied |
|---|---|---|
| P1 `--viz` palette | **ship, unvalidated** | - |
| P2 tier rails | **ship, unvalidated** | - |
| P3 guard R1-R4 | **ship** - fault-injected, self-tested | after-feeling n/a; the guard demonstrably bites |
| Icon + text (#5) | **defer, named** | no time before the fair; not silently dropped |
| Two-column workspace (#22) | **defer, named** | needs a real chart |

### Why shipping unvalidated is defensible here, and where it stops

Shipping is defensible because every change **strictly reduces** false claims:
`LONG` in approval green is a bug in any reading, and the alternative was
leaving it. `.pos` reusing `--no` had the same defect. `--fg-faint` at 3.30:1
was below AA by measurement, not opinion.

It stops being defensible the moment a change is a **judgement of taste** - the
teal/orange choice, the 3px rail, the 34px readout. Those are the parts I could
be wrong about, and no machine check will tell me.

## Before the fair - 20 minutes, human-only

Highest-value checks, in order. Each is a yes/no a human can answer in seconds.

1. **Open** `artifacts/design-sheet.html`. Do the teal and the green read as
   different *kinds* of thing, or just different colours?
2. **Look at the positions table.** Can you tell `LONG` from `APPROVED` at a
   glance from across a room?
3. **Squint at the page.** Can you name the most important panel in one second?
4. **Check the paper strip.** Does `Positions PAPER` read as honest, or as a
   broken feature?
5. ~~Emulate colour-blindness~~ — **now answered by machine.** `check-cvd.mjs`
   says `--viz-up`/`--viz-down` collapse at ΔE 2.8 under achromatopsia, which
   is why every direction carries a `▲`/`▼` glyph. Worth a visual confirmation
   that the glyphs are legible at 11px, but the accessibility question itself
   is answered.

If (1) or (5) fails, the `--viz` family is the wrong answer and icon+text (#5)
becomes urgent rather than deferred.

## Carried into `docs/user-tests.md`

The three outside-developer sessions remain NOT RUN and are the first real
evidence this product has. The design questions above should be added to the
Session 1 rubric - a tester who cannot distinguish a verdict from a position
side has not understood the wedge, whatever the kernel did.
