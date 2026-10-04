# 04 — Prototypes

**The prototypes for this pass are Deliverable A.** They are not sketches
described in this file — they are built, running code in the repository. This
file states what each one is and, more importantly, **which question it
answers**, so the test plan in `05` can ask the right thing of each.

Fidelity was chosen by question, per the skill. Three of the four are *digital
screen* questions, so they were built as real components rather than wireframes
— at this stage of a hackathon a wireframe for a CSS class would be a strange
economy. The fourth is a process question, and its prototype is the guard
itself.

---

## P1 — `.state-*` chip vocabulary

**Question:** can a reader tell a *live* policy from one whose drawdown switch
is not yet armed, without being told in prose?

**Built:** `apps/dashboard/components/PolicyState.tsx` and the `.state-*` block
in `globals.css`. Five states — `live`, `unarmed`, `expired`, `unowned`,
`none` — plus `KillSwitchNote`, which states which of "disabled / configured
but not armed / armed" applies at the kill-switch field itself.

**The design decision that matters:** the chip is **not green when live**. The
first instinct was accent-coloured, which was rejected on the grounds that
accent reads as *interactive* and the reader wants *authoritative*. It uses a
solid `--state-line` rail; `unarmed` is **dashed**; the inactive states are
**dotted**. That is the whole treatment: weight and dash, no hue. It survives
greyscale, a bad projector, and achromatopsia.

**Where it shows:** in the `ModeStrip` next to the cluster, so the reader gets
"devnet · UNARMED" without scrolling, and again in panel 2 with the
explanation.

**Answerable by:** opening the app with a fresh policy. *Nobody has.*

**Kill criterion:** if a tester reads `UNARMED` and still says "the kill-switch
is broken", the vocabulary has failed and the fix is a *word*, not a style.

---

## P2 — `.claim` boundary block

**Question:** does stating the product's limit in the first artifact a judge
opens increase credibility, or read as an excuse?

**Built:** `apps/dashboard/components/ClaimBoundary.tsx`, placed above the
panels, rendered in the design sheet as gallery entry 2.10.

It states the surviving claim, strikes through the removed one, and then names
the absence in the same weight: *recorded, not enforced; the program holds no
keys; anyone with a key can trade without asking it and would leave no row.*

**Design decisions worth recording:**

- The false claim is **struck through, not omitted.** The correction is the
  informative part; a silently-removed line teaches the reader nothing about
  what to watch for.
- It sits **above** the panels, not in the footer. A footer disclaimer is read
  after the reader has formed a belief, which is the wrong order.
- It wears **no decision colour.** The kernel never evaluated the product's
  honesty, so there is no verdict to paint.
- It is `aria-label="What this is, and what it is not"`, so a screen-reader user
  gets the correction even though a strike-through is a visual device.

**Answerable by:** showing it to anyone. *Nobody has.*

**Kill criterion:** if a reader's first summary of the product is "it's not
enforced" *rather than* "it told me it isn't enforced", the placement is wrong —
the limit is dominating instead of enabling trust. That is a copy problem, not a
component problem.

---

## P3 — the judge-facing artifact

**Question:** can a judge with ninety seconds and no runtime tell what the
product is, and what it is not, from one file?

**Built:** `scripts/render-design-sheet.mjs` → `artifacts/design-sheet.html`,
now six sections: colour-family legend, component gallery, measured contrast,
scales, the corrected claim, and the rendered CVD simulation.

Three properties make it evidence rather than marketing:

1. **Nothing is hand-written.** Every hex, ratio and simulated value is read
   from `:root` at generation time.
2. **The CVD section is the same measurement CI runs.** The matrices and maths
   live in `scripts/lib/cvd.mjs`; `check-cvd.mjs` and the generator are both
   consumers. Before the split, the sheet restated them by hand — a
   judge-facing number could silently disagree with the build.
3. **It prints its own provenance** — the commit, and a `dirty` flag when the
   working tree has moved since.

**Answerable by:** opening the file. *Nobody has.*

**Kill criterion:** if a judge cannot name what the product is after reading
section 1 and section 5, the artifact is not doing its job and the fix is
information architecture, not more content.

---

## P4 — the guards

**Question:** is a source-grep guard trustworthy, or does it lie?

This question was answered in the first pass and the answer was "it lies unless
you break it on purpose". The same test was repeated for the new rules, because
that is the whole method.

| Injected fault | Result |
|---|---|
| `.state-live` given `color: var(--ok)` | ✅ R6 fired, correct line number |
| `.claim .claim-line` given `border-color: var(--no)` | ✅ R6 fired, correct line number |
| `` className={`state state-${state} yes`} `` | ✅ R6 fired at `PolicyState.tsx:103` |
| guard run over all existing components unchanged | ✅ clean — no false positives |
| `readTokens` before the fix | ⚠️ **`--panel` resolved to `"teal 9.12:1, orange 6.90:1."`** and `check-cvd.mjs` printed `NaN:1` for four tokens |
| `readTokens` after the fix | ✅ `--panel #101319`, all ratios real |

**The fifth row is the finding worth carrying forward.** P4 was scoped as "does
R6 work", and it surfaced a defect three files away that had been quietly
publishing wrong numbers in the judge-facing artifact. The prior pass's stated
lesson — *a guard that has only ever reported "clean" has not been tested* —
generalised one level further than expected: **a guard that has only ever
reported "clean" hides the bugs that are in the code it is not looking at.**

The first attempt at R6's TSX half also matched nothing, because a single regex
cannot span the `}` of a `${…}` interpolation. It was found only by injecting a
fault and watching the guard stay silent. Both faults are the same fault: a rule
that has never been seen to fail is not known to be able to fail.

---

## Not prototyped, deliberately

- **The competition comparison table** (idea 30) — rejected in `03` because it
  makes dated claims about other people's products in an artifact nobody
  re-reads. The information lives in `01-research-notes.md`, dated and
  attributed, instead of on the judge-facing surface.
- **A copy lint for `enforce|bound|custod` in `.tsx`** (idea 22) — the right
  instinct, the wrong mechanism. Prose does not tokenise reliably enough for a
  regex to be trustworthy, and R6 plus a documented substitution table covers
  the cases that matter. Recorded as a deferral, not dropped.
- **A stat tile** — a real gap in the kit, rejected as *this* pass's one
  addition because it carries no claim. Named in `03` with the reasoning, and it
  remains the strongest candidate for a third pass.
- **A reason-code reference** — a real gap too, but it is documentation and
  belongs in `docs/`, which this pass is scoped out of.
