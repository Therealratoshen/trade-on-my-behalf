# Terading design pass — 2026-10-04

Five stages of the design-thinking process, run on the control surface after the
palette and terminal primitives were rebuilt.

**Research mode: assumption + static review evidence.** No user has evaluated
this design. `05-test-results.md` says so at the top, on purpose.

| Stage | Artifact | Contains |
|---|---|---|
| 0. Frame | [00-challenge-brief.md](00-challenge-brief.md) | scope, personas, the browser constraint |
| 1. Empathize | [01-research-notes.md](01-research-notes.md) | 3 empathy maps; the founder's quotes are the only evidence |
| 2. Define | [02-problem-statement.md](02-problem-statement.md) | 5 Whys, one-sentence POV, 4 HMWs, feeling shift |
| 3. Ideate | [03-ideas.md](03-ideas.md) | 30 ideas, screened, 5 shortlisted |
| 4. Prototype | [04-prototypes.md](04-prototypes.md) | 3 built, each with the question it answers |
| 5. Test | [05-test-results.md](05-test-results.md) | machine results, the human gap, iteration decision |

## What the pass actually found

The root cause behind a cluster of design defects: **the design system
specified colour semantics but not subject semantics.** It constrained how to
paint a verdict, never established which things are allowed to be one.

Concretely — a `LONG` position was rendering in `--ok`, the same green as
`APPROVED`, one screen away from the audit log. Fixed, and guard rule R3b now
fails the build if a verdict class is reused for a non-verdict meaning.

## Second finding: about guards, not colour

The first token guard I wrote reported "clean" on a codebase containing a real
semantic bug and six off-scale values, because it only understood one syntax
and one file. It only became trustworthy after I injected five faults and
checked each. One of those tests found a false positive on a legitimate
`APPROVED` badge, which is why R3b is scoped the way it is.

The same failure mode runs through this repository: several `docs/` files claim
suites are "NOT RUN" that in fact pass. Documentation drift and guard drift are
the same disease.

## Status

Untested by a human. The five checks in `05-test-results.md` that matter most
take 20 minutes and require only opening
[design-sheet.html](../../artifacts/design-sheet.html).

## Related

- [Design system](../../docs/design-system.md) — the rules this pass enforces
- [Token guard](../../scripts/check-tokens.mjs) — R1-R4
- [Prior pass](../five-stages.md) — 2026-09-26, framework-driven, archived
