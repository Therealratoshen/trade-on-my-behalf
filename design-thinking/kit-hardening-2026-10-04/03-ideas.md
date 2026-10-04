# 03 — Ideas

Count target: 30. **Solo, four days out** — the skill's 50+ assumes a group
session, and pretending otherwise would be dishonest, so 32 is the honest
number and it is stated rather than padded. No self-editing during generation;
screening follows separately.

## Full list

**Make the account's state legible (HMW1)**
1. `.state-*` chip vocabulary: live / unarmed / expired / unowned / none
2. Per-field armed/not-armed sub-line (kill-switch only)
3. A single "policy is armed as of slot N" footer line
4. An `armed` boolean field on the policy panel header
5. Warn the tester in the CLI when a kill-switch cannot fire
6. A timeline strip showing the policy's life: created → first pnl → now
7. An inline "why is this 0" affordance on `peak_equity`
8. Grey out the kill-switch field while unarmed
9. A live "what would arm this" hint under the field
10. An `UNARMED` state only — no separate `live`, to avoid over-claiming the
    opposite direction

**Make the corrected claim visible (HMW2)**
11. A `.claim` boundary block: the true claim, the removed claim struck through
12. A comparison table: Terading vs TEE vs venue-delegation, on the artifact
13. A "what would have to be true for the gate to bind" list
14. A one-line footer: "recorded, not enforced"
15. Show the program source's own absence: "no CPI, no custody, no transfer"
16. A `README` badge for the verified claim
17. An inline receipt showing a denial, next to the claim
18. A judge-mode landing panel that leads with the limit

**Enforce it (HMW3, HMW4)**
19. Guard rule R6: state and claim families may not use decision colours
20. Extend the token parser to strip CSS comments (fixes `--panel`)
21. Extract the CVD matrices into a shared module so CI and the sheet agree
22. A copy lint: fail the build on `enforce|bound|custod` in `.tsx` prose
23. Runtime assertions on rendered classes (Storybook/test infra)
24. A `pnpm design:sheet` script that regenerates and diffs the artifact
25. A PR checklist question: "what does this string claim?"

**Make the artifact carry the argument (HMW5)**
26. Component gallery in the design sheet — real markup, not hexes
27. A rendered CVD section using the same matrices as CI
28. A meaning legend: what each colour family may claim
29. Provenance line: commit + dirty flag on the artifact
30. A competition table in the design sheet, cited
31. An "empty state" pattern set for every panel
32. A receipt-link style with a consistent "open in explorer" treatment

## Screening

Three questions: outcome fit (does it produce the HMW's after-feeling),
cheap-in-cheap-out (can it be prototyped at low fidelity this week), and the
riskiest assumption (what single belief must be true, and how do we test only
that).

| # | Idea | Outcome fit | Cheap | Riskiest assumption | Verdict |
|---|---|---|---|---|---|
| 1 | `.state-*` chip vocabulary | ✅ HMW1 | ✅ 2h | a reader can tell unarmed from live *without* reading the note | **SHORTLIST** |
| 2 | Per-field armed sub-line | ✅ HMW1 | ✅ 30m | the field is where a tester looks | **SHORTLIST** (merged with 1) |
| 6 | Policy-life timeline | ✅ HMW1 | ❌ 4h+ | a timeline is legible on a dark 2-col layout | deferred |
| 7 | "why is this 0" on `peak_equity` | ✅ HMW1 | ✅ 15m | testers hover | rejected — hover is invisible on a projector |
| 8 | Grey out while unarmed | ❌ | ✅ | — | rejected — "disabled" reads as "broken", the exact bug |
| 10 | `UNARMED` only, no `live` | ❌ | ✅ | — | rejected — over-corrects; a tester must be able to say "it's live" |
| 11 | `.claim` boundary | ✅ HMW2 | ✅ 1h | a limit stated up front raises rather than lowers credibility | **SHORTLIST** |
| 12 | Terading vs TEE vs venue table | ✅ HMW2/HMW5 | ✅ 1h | the comparison is accurate and stays accurate | **SHORTLIST** — but see below |
| 13 | "what would make the gate bind" | ✅ HMW2 | ✅ 45m | admitting the gap costs nothing | deferred — overlaps 11 |
| 14 | Footer one-liner | ⚠️ | ✅ 10m | a footer is read | rejected — read *after* belief is formed, wrong order |
| 15 | "no CPI, no custody, no transfer" | ✅ HMW2 | ✅ 20m | a judge parses implementation detail | **SHORTLIST** (folded into 11) |
| 19 | Guard rule R6 | ✅ HMW3/HMW4 | ✅ 1h | the rule has no false positives | **SHORTLIST** |
| 20 | Strip CSS comments before parsing | ✅ HMW3 | ✅ 15m | none — it is a bug fix | **SHORTLIST** |
| 21 | Shared CVD module | ✅ HMW5 | ✅ 45m | none — it is a refactor | **SHORTLIST** |
| 22 | Copy lint for `enforce|bound` | ✅ HMW3 | ⚠️ 1h | no false positives on "enforceable" in a comment | deferred — R6 + review covers it; regex on prose is fragile |
| 23 | Runtime class assertions | ✅ HMW4 | ❌ needs infra | vitest is available | ❌ too costly |
| 24 | `pnpm design:sheet` diff check | ✅ HMW4 | ✅ 30m | a stale artifact is a real risk | **SHORTLIST** (partial — generator prints provenance instead) |
| 26 | Component gallery | ✅ HMW5 | ✅ 2h | a judge reads a gallery rather than a table | **SHORTLIST** |
| 27 | Rendered CVD section | ✅ HMW5 | ✅ 1h | seeing a collapse is more persuasive than a number | **SHORTLIST** |
| 28 | Colour-family legend | ✅ HMW5 | ✅ 45m | plain language beats a table of ratios | **SHORTLIST** |
| 29 | Provenance line | ✅ HMW5 | ✅ 20m | a judge cares that it is generated | **SHORTLIST** |
| 30 | Competition table in the sheet | ✅ HMW5 | ✅ 1h | **it stays true** | **DEFERRED — see note** |
| 31 | Empty-state set | ✅ HMW2 | ✅ 1h | already largely present | rejected — exists |
| 32 | Receipt-link style | ⚠️ | ✅ 30m | consistency is the value | deferred — cosmetic, no evidence burden |

### On idea 30, the competition table — deliberately not shipped

This is the most tempting idea in the list and the one I am most confident
about rejecting, so the reasoning is recorded rather than the decision.

It answers HMW5 perfectly and it is cheap. It was dropped for one reason: **a
comparison table in our own artifact, naming two competitors and characterising
what they enforce, is a factual claim about other people's products that we
would be re-verifying by hand, forever, in a document nobody re-reads.**

The alternative carries the same information with none of that exposure: state
*our* limit precisely, and let a judge who cares about the competitor check the
competitor. The evidence that a TEE is not a program is checkable in five
seconds by anyone; our claim that Hypernova's docs say "anchored" is checkable
only by reading their docs, and goes stale silently.

**This is the repo's own thesis applied to the artifact that makes the repo's
case.** Shipping a comparison table would have been the one part of this pass
that overclaims. The information lives in `01-research-notes.md`, where it is
dated and attributed, instead of on the judge-facing surface where it would be
undated and unattributed.

## Shortlist — 4, distinct approaches

Distinct means the ideas do not share a risky assumption, so that if one fails
the others still stand.

| # | Idea | Approach | Answers | Riskiest assumption |
|---|---|---|---|---|
| 1+2+15 | `.state-*` + armed sub-line + explicit absence | **new concept** — give the kit a lifecycle vocabulary it did not have | HMW1, HMW3 | a tester reads the note |
| 11 | `.claim` boundary | **stated limit** — say the true thing and the removed thing adjacently | HMW2, HMW3 | a limit up front does not read as weakness |
| 19+20+21 | R6, parser fix, shared CVD module | **enforcement** — make the honest treatment survive the next hurried commit | HMW3, HMW4 | the guard has no false positives |
| 26+27+28+29 | Gallery, rendered CVD, legend, provenance | **judge-facing artifact** — the deliverable a judge opens without running anything | HMW5, HMW2 | a judge reads it at all |

**Merged:** 2 and 15 into 1 (same risky assumption: the reader looks at the
field). 13 into 11. 24 partly into 29 — the generator prints its own commit and
a dirty flag rather than adding a CI diff step, which gets the honesty without a
new script.

**Not merged, deliberately:** 12 and 30 (competition comparison) share the
risky assumption "we will keep re-verifying claims about other people's
products", and both were dropped for it.

## The one primitive actually added

The brief asked for **one** addition, chosen against the alternatives. The
shortlist contains many things; only one is a new *component*:

**`.claim` — the claim boundary** (`components/ClaimBoundary.tsx`).

The candidates that lost, and why:

| Candidate | Why it lost |
|---|---|
| **Stat tile** | Real gap — there is no `.stat` primitive, and the panels are dense. But it optimises *scanning a number*, and no number here is hard to scan. It does not carry any claim. |
| **Reason-code reference** | A genuine gap: codes 0–7 are spread across the SDK and the program, and a tester hitting `REASON_DRAWDOWN_KILLSWITCH` has no in-product explanation. But the audit log already renders the code name, and a reference table is documentation, not design. It belongs in `docs/`, and the brief forbids touching those files. |
| **Empty-state pattern** | Largely exists — `Empty` is already a component and every panel uses it. |
| **Receipt link style** | Cosmetic. Consistency is nice; it carries no claim. |
| **`.state-*` chip** | **This is the other real candidate, and it is a close second.** It won on the HMW1 defect, which is a live bug a tester will hit. But note: it is an *extension* of an existing concept (badges) to a new subject (accounts), whereas `.claim` introduces a subject that has no representation at all. |

The tie-break, stated plainly: **`.state-*` fixes a defect; `.claim` creates a
capacity.** The unarmed kill-switch is a bug with a known cause and a known fix,
and it is fixed. The problem statement in `02` is that the kit has no way to
say "here is the edge of what I do" — and that gap is not a bug, it is a missing
concept. A stat tile or a receipt style would have added a *shape*; `.claim`
adds the ability to *state a limit in the visual language at all*.

And the two are complementary rather than competing: `.claim` says the product's
limit, `.state-*` says one specific limit in one specific field, and
`ClaimBoundary` is where the reasoning is written down. The armed sub-line in
idea 2 exists because `.claim` alone is too abstract at the moment of use — the
tester needs the truth *at the field*, not only at the top of the page.

## Riskiest assumption, stated

**That stating a limit in the first artifact a judge opens increases credibility
rather than decreasing it.** Everything else in the shortlist is verifiable by
reading code and running guards. This one needs a human who has not been
briefed, and I do not have one.

`05-test-results.md` records that it is untested.
