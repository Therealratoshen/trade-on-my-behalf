# 02 — Problem Statement

## Gather

Everything surfaced by the static review and the evidence in `01`, unedited:

1. The program contains no CPI, no custody, no transfer — it cannot bind a venue action `[EVIDENCE — code]`
2. The pitch claimed it did; six claims removed across three docs `[EVIDENCE — docs]`
3. The design system guarded "did the kernel decide this?" — a question about a claim the product no longer makes
4. "Your policy is LIVE" would render in a colour the eye reads as *approved*, for a fact the kernel never evaluated
5. A fresh policy's kill-switch is disarmed (`peak_equity = 0`) and the UI shows `25% · from peak equity`, which reads as working `[EVIDENCE — code + agent test]`
6. MetaMask Agent Wallet markets the same pitch and enforces via TEE + 2FA `[EVIDENCE — vendor, 2026-10-03]`
7. Hypernova markets "enforced on-chain"; its own docs say *anchored* `[EVIDENCE — vendor]`
8. Every venue offers **delegation**, not constrained delegation `[EVIDENCE — venue docs]`
9. `artifacts/design-sheet.html` — the one artifact a judge opens without running anything — showed tokens only, no components, no legend, no CVD rendering
10. The design sheet restated the CVD matrices by hand, so a judge-facing number could disagree with CI
11. The token parser read `--panel` as the string `teal 9.12:1, orange 6.90:1.` (prose inside a CSS comment), so every "contrast on --panel" figure was computed against garbage and `check-cvd.mjs` printed `NaN:1` for four tokens `[EVIDENCE — found this pass]`
12. `prefers-reduced-motion` covered `transition-duration` but not `animation-duration` or `scroll-behavior`, so the next animation added would silently ignore the setting
13. Six UI strings still said *enforces* / *bound by* after the docs were corrected

## Cluster

| Theme | Items |
|---|---|
| **A true fact rendered as a broader claim** | 1, 2, 3, 4, 5, 13 |
| **A thin differentiator that cannot be seen** | 6, 7, 8, 9 |
| **A judge-facing artifact that could lie** | 9, 10, 11 |
| **A guarantee that lapses on extension** | 12 |

## Root cause — 5 Whys

Item 5 is the one to chase, because it is the smallest instance of the largest
class, and because its fix generalises to items 1–4 and 13.

> **Why** does a fresh policy look like a working one?
> → The UI renders `kill-switch drawdown: 25%` / `from peak equity`, and both
> strings are true.
>
> **Why** does that produce a false belief?
> → "25% from peak equity" describes the rule *in the abstract*. It says nothing
> about whether there **is** a peak yet. The rendering has a slot for "the
> configured value" and no slot for "is this thing currently doing anything" —
> so the reader supplies "it is live" themselves.
>
> **Why** is there no slot for that?
> → Because the design system defines *values* and *colours* but not
> **states**. There was a token for a green number and a class for a red badge.
> Nothing in the kit could express "this exists and is not currently active",
> because that is not a value and not a colour — it is a lifecycle.
>
> **Why** did the kit have no concept of state?
> → The first pass was framed as *UI semantics*: decide what each colour means,
> then enforce it. The frame assumed the product's claim was settled and the
> only question was rendering it faithfully. The claim was **not** settled; it
> was corrected four hours later, and the kit was still built around the old one.
>
> **Why** does that matter?
> → Because the corrected claim is **narrower**, and narrow claims fail
> differently. A broad claim fails when someone tests it. A narrow claim fails
> when nobody can tell it apart from the broad one — so the design has to make
> the narrowness *legible*, or the correction achieves nothing.

**Root cause: the design system could express what something *is*, never what
it is *currently doing*.** Every value on screen had a colour, a scale and a
contrast guarantee. No element had a lifecycle, and therefore no element could
state honestly that it was not currently doing anything.

## Problem statement

> **A judge with ninety seconds and no wallet needs to tell, from the artifact
> alone, that this project's on-chain kernel is a refusal and not a
> delegation — because the market's standard answer is a TEE that asks, a venue
> that obeys, and one competitor whose own documentation uses a weaker word than
> its marketing, so the only available differentiator is a claim narrow enough
> that it can be checked.**

Insight: **a narrow differentiator is not self-advertising.** A broad claim
("my rules are enforced") competes in a field where everyone says it, and
loses. A narrow, specific, checkable claim — *this program refuses, and here is
exactly where it stops* — is not competing with them. It is legible to a judge
precisely because it is smaller, and being the only submission that names its own
limit is itself a signal about whether the founder can be believed.

This is the Say-vs-Do gap: the founder **says** "I'm now honest about what this
is", and the **do** is a surface that still implies enforcement in six places.
The correction was made in prose; the pixels were not consulted.

## How Might We

1. **How might we help the owner-trader see that a setting is configured but not
   yet active, before they discover it by testing, so that** they never conclude
   a working feature is broken?

2. **How might we enable the judge to tell a program that refuses from a TEE that
   asks, in ninety seconds without running anything, so that** they believe the
   founder's limits before he has to defend them?

3. **How might we empower the founder to correct a claim in the docs without the
   surface quietly re-asserting the old one, so that** one honest correction is
   not undone by a component that was never re-read?

4. **How might we help any future contributor add an element to this interface
   without being able to overstate the product, so that** the honesty survives
   being extended under time pressure — four days out, by someone in a hurry?

5. **How might we enable the judge to check our claim against a competitor's
   without trusting either of us, so that** the difference is a fact they can
   observe rather than a claim they must accept?

## Feeling shift (Plutchik)

| Pain | Mirrored gain | Evidence status |
|---|---|---|
| **Distrust** — "I cannot tell which of these products is real" | **Trust** — "this one states its own limit" | `[ASSUMPTION]` — no judge has been asked |
| **Anxiety** — "the rules I set might be decorative" | **Anticipation** — "I know exactly what they do and do not do" | `[ASSUMPTION]` |
| **Surprise** — "the kill-switch did nothing and nothing said why" | **Relief** — "it is not armed yet, and it told me so" | `[ASSUMPTION]` — defect `[EVIDENCE]`, remedy untested |
| (secondary) **Shame** — "I was about to pitch enforcement I cannot show" | **Pride** — "here is the exact edge, and I am not going past it" | `[ASSUMPTION]` |

**Small shift + polite praise = not real yet.** Every gain above is unvalidated.
See `05-test-results.md`, which records that the check was not run.
