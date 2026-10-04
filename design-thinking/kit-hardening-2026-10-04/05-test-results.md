# 05 — Test Results

## STATUS: NO HUMAN HAS EVALUATED THIS DESIGN

Read that before anything else in this file.

The research mode declared in `00-challenge-brief.md` is **assumption** for
user research. No interview, observation or immersion was performed. No judge,
no outside tester, and no founder-as-user has looked at the `.state-*` chip, the
`.claim` block, or the six-section design sheet.

**The sandbox browser reaches no port.** Every port started here returned
`chrome-error://chromewebdata/` even where `curl` received HTTP 200, and
`file://` navigation is blocked by policy. **Nothing in this pass has been seen
painted.** Not the chip, not the claim block, not the CVD section, not the
gallery.

Machine checks confirm the design system *holds*. They say nothing about whether
it *reads*. Every feeling-shift claim in `02-problem-statement.md` is
therefore unvalidated, and this file records that absence rather than implying
otherwise.

This is the same constraint recorded in the first pass. It is restated because
restating it is the point.

---

## What was actually tested

Machine checks, with real exit codes, run from the repository root:

| Check | Command | Result |
|---|---|---|
| Typecheck ×3 + guards R1–R6 + CVD | `pnpm lint` | **exit 0** |
| Build | `pnpm build` | **exit 0** — 4 routes, `/` 20 kB / 254 kB first load |
| Tests | `pnpm -r test` | **exit 0** — SDK **16/16**, agent **21/21** |
| Token guard alone | `node scripts/check-tokens.mjs` | **exit 0** — 29 colour tokens, R4 ratios all AA |
| CVD check alone | `node scripts/check-cvd.mjs` | **exit 0** — 1.4.11 all pass, 2 ΔE collisions advisory |
| Design sheet | `node scripts/render-design-sheet.mjs` | **exit 0** — 10 gallery entries, 5 critical pairs |
| Guard fault injection | 4 injected faults | **4 caught, 0 false positives** |
| Sheet determinism | regenerate + `diff` | **byte-identical** |

**These numbers are real and they are the only results in this file.** They are
listed in full in the run report, not summarised favourably.

The `pnpm lint` result is worth a note on process: it was **red on arrival**,
because a concurrent agent was mid-edit in `packages/agent` and
`packages/sdk`. It was not my failure and not my file, so I verified my own
surface separately (`tsc` on the dashboard, both guards, byte-diff on the
sheet) while waiting, and re-ran the full command at the end, when it passed.
Recording the intermediate state matters: a report that showed only the final
green would hide that the baseline was not green.

---

## One assumption resolved by research rather than by a human

`03-ideas.md` named the riskiest assumption as *stating a limit increases
credibility*. That one is **not resolved** — it needs a person.

What was resolved, by reading code instead of asking a user: the `unarmed`
state. The pass did not assume a fresh policy's kill-switch is disarmed; it was
confirmed in two places — `state/mod.rs` documents `peak_equity_usdc` as
`0 = uninitialized`, and `packages/agent` has a passing test named *"kill-switch
is disarmed until a peak is recorded"*. So the defect in `01` is real, the
distinction is intentional in the program, and only the UI was missing it.

That is the same move the first pass made with the CVD finding, and it is worth
naming as a pattern: **when a question cannot be answered by a human, look for
the answer in the code or the primary sources before calling it an open
assumption.** Two of this pass's load-bearing facts were settled that way, and
one — the riskiest assumption — was not, and is named as open.

---

## The one real finding this pass produced

Not from a user. From the guard's own behaviour, again.

> **A guard that has only ever reported "clean" hides the bugs that are in the
> code it is not looking at.**

The previous pass stated the first half of that. This pass found the second
half. P4 was scoped narrowly — "does R6 catch a decision colour in the state
family?" — and in the course of building it, `readTokens` was rewritten to
strip CSS comments before extraction, and in doing so exposed that:

- `--panel` had been resolving to the string `"teal 9.12:1, orange 6.90:1."`
  — prose inside a `/* … */` comment that a `(--x): (value)` regex reads as a
  custom property;
- every "contrast on `--panel`" figure in the published design sheet was
  computed against that string;
- `check-cvd.mjs` was printing `NaN:1` for four of the five semantic tokens.

**A judge-facing artifact had been publishing wrong numbers, and CI had been
printing `NaN`, and both looked fine** — `NaN:1` is not visually alarming in a
terminal and a wrong ratio in an HTML table is just a number. The guard never
caught it because the guard was never asked about token *parsing*, only about
token *usage*.

The R6 TSX half was broken in the same way, and for the same reason: a single
regex cannot span the `}` of a `${…}` interpolation, so it matched nothing. It
was only found by injecting a fault and watching the guard stay silent.

Generalises past CSS, and past this repository: **the tests you write are
themselves only as good as the faults you thought to inject.** A rule that has
never been seen to fail is not known to be capable of failing.

---

## Feeling-shift check: NOT RUN

No semantic-pair placements were collected. No before/after. No behavioural
signs.

Per the skill's rule — *small shift + polite praise = not real yet* — the
trustworthiness gains asserted in `02-problem-statement.md` are currently at
**zero evidence**, and I am not going to dress a `tsc` exit code as a feeling.

| Pain → gain | Predicted | Observed |
|---|---|---|
| Distrust → Trust | `[ASSUMPTION]` | **no data** |
| Anxiety → Anticipation | `[ASSUMPTION]` | **no data** |
| Surprise → Relief | `[ASSUMPTION]` | **no data** |
| Shame → Pride | `[ASSUMPTION]` | **no data** |

---

## Iteration decision

Per the skill's rules: after-feeling + behaviour → patch and refine ·
after-feeling + stumbles → patch the flow and retest · no after-feeling → kill
· a new need contradicting the POV → back to Define.

**The honest complication:** the rules branch on an after-feeling, and there is
no after-feeling. So the decisions below cannot be made by the rule the skill
specifies. I am applying a substitute — *does the change strictly reduce false
claims?* — and labelling it as a substitute rather than pretending it is the
real thing.

| Item | Decision | Basis |
|---|---|---|
| P1 `.state-*` + armed sub-line | **ship, unvalidated** | fixes a defect whose cause is confirmed in code; the alternative is a tester concluding a working switch is broken |
| P2 `.claim` boundary | **ship, unvalidated** | its own kill criterion is untested; the risk is prominence, not falsehood |
| P3 six-section design sheet | **ship, unvalidated** | replaces a tokens-only sheet; the CVD section's numbers are machine-verified against CI |
| P4 R6 + parser fix + shared CVD module | **ship** — fault-injected, self-tested | the guard demonstrably bites, and it found a real bug |
| Competition table (idea 30) | **kill** | would make undated factual claims about competitors in an artifact nobody re-reads |
| Copy lint (idea 22) | **defer, named** | right instinct, untrustworthy mechanism for prose |
| Stat tile | **defer, named** | real gap; carries no claim; named in `03` |
| Reason-code reference | **defer, named** | real gap; belongs in `docs/`, out of scope here |

### Why shipping unvalidated is defensible here — and exactly where it stops

Defensible because every shipped change **strictly reduces false claims**:
`UNARMED` replaces an implied "the switch is live"; `.claim` replaces six
overclaiming strings; the R6 parser fix replaces wrong contrast numbers with
right ones. In each case the previous behaviour was a bug under any reading.

It stops being defensible the moment a change is a **judgement of taste or
persuasion**: that `.claim` belongs above the panels rather than in a footer,
that a dashed border means "not yet" to a stranger, that stating a limit first
reads as confidence rather than apology, that a judge opens a design sheet at
all. None of those is checkable by any command in this repository, and no
machine check will ever tell me I have them wrong.

---

## What remains unvalidated — the full list

1. **Every visual judgement.** Layout, hierarchy, chip legibility, whether the
   rail and dash vocabulary reads at all. Unseen.
2. **The kill-switch message.** Whether a tester reads `UNARMED` correctly. The
   single most likely failure of this pass, and it is a testable question
   nobody has been asked.
3. **The claim block's tone.** Whether it builds or spends credibility. The
   load-bearing assumption of the whole pass, untested.
4. **Whether the design sheet is read.** Every improvement to it is conditional
   on a judge opening it.
5. **The CVD section's persuasive value.** Whether *seeing* a collapse is more
   convincing than *reading* `ΔE 2.8`. I believe it is; I have no evidence.
6. **All four personas.** Owner-trader, judge, D11 tester — none consulted.
7. **The competitive framing itself.** Verified from primary sources on
   2026-10-03, but vendor documentation changes, and "TEE + 2FA" is a snapshot,
   not a durable fact.

---

## Before the fair — 25 minutes, human-only

Each is a yes/no a person can answer in under a minute, in priority order.

1. **Open `artifacts/design-sheet.html` cold.** After sections 1 and 5, can you
   say in one sentence what this product is *and* what it is not? If you cannot,
   the artifact is not carrying the argument. *(P3's kill criterion.)*
2. **Open the app with a fresh policy.** Read the chip aloud. Does `UNARMED`
   make you think "not armed yet" or "broken"? *(P1's kill criterion.)*
3. **Read `.claim` and then summarise the product.** Is your first sentence
   "it is not enforced" or "it told me it is not enforced"? If the first,
   the block is too prominent. *(P2's kill criterion.)*
4. **Check the CVD section.** In the achromatopsia column, `--ok` and
   `--viz-up` render as two near-identical greys. Does the ▲/■ redundancy read
   as obviously necessary once you can see it?
5. **Squint at the page.** Can you name the most important panel in one second?

The first three are the three kill criteria, in order. If (1) passes and (2)
fails, the fix is a word in `PolicyState.tsx`, not a redesign. If (1) and (2)
both fail, the problem is the framing in `02-problem-statement.md` and this
pass goes back to Define rather than getting patched.

---

## Carried forward

- `docs/design-system.md` records the `state` family, R6, `.claim`, the copy
  substitution table, and the `--panel` parser defect.
- The `--panel` bug means **the design sheet published before this pass had
  wrong contrast figures.** Anything citing them should be re-checked.
- The competition evidence in `01` is dated 2026-10-03 and is a snapshot.
- The stat tile and reason-code reference are the two named deferrals, and the
  stat tile is the strongest candidate for a third pass.
- [Tester's rubric](docs/user-tests.md) should add: *"can you tell whether the
  kill-switch is armed?"* — a tester who cannot has not understood the account
  they are testing, whatever the kernel did.
