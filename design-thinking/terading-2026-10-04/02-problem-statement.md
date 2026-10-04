# 02 — Problem Statement

## Gather → cluster → root

Every problem surfaced in the static review of the 2026-10-04 pass, unedited:

1. P&L used `--ok`/`--no`, the kernel approval/denial colours
2. A `LONG` position rendered with the `yes` badge — same green as `APPROVED`
3. `--fg-faint` at 3.30:1, below AA for 11px text
4. 24 inline styles bypassing the spacing scale; 6 off-scale
5. Token discipline enforced by a copy-paste one-liner nobody ran since Sep 30
6. Five panels stacked with identical visual weight
7. No chart, no trade ticket — the product's headline surface absent
8. `LONG`/`PAPER` and an approval badge competing for the same pixel
9. `anchor test` defaults to devnet, so program tests don't run without editing
10. 44 of 58 commits uncredited to any GitHub account

**Themes**

| Theme | Items |
|---|---|
| **A colour claimed something that hadn't happened** | 1, 2, 8 |
| **Rules existed only in prose** | 5 |
| **No hierarchy — everything equal** | 6 |
| **The headline surface doesn't exist** | 7 |
| **Discipline leaked at the edges** | 3, 4 |

## Root cause (5 Whys)

The `LONG`-in-approval-green bug (item 2) is the one worth chasing, because it
is the class of bug the other four themes are symptoms of.

> **Why** is `LONG` green? → It reuses the `yes` badge class.
> **Why** did it reuse it? → `yes` was the only "good-looking" badge available.
> **Why** was it the only one? → The design system defined *what verdict colours
> mean* but never *which things are verdicts*.
> **Why** was that never written down? → The doc said "green = approved, red =
> denied" — a rule about colours, not about meanings.
> **Why** does that distinction matter? → Because the reader's first question
> about any coloured pixel on this screen is "did the kernel decide that?"

**Root cause: the design system specified colour semantics but not *subject*
semantics.** It constrained how to paint a verdict, never established the set
of things that are allowed to be one.

## Problem statement

> **A crypto-native retail trader reading the control surface needs to know, at
> a glance and without ambiguity, which actions the on-chain kernel actually
> decided — because the entire value of the product is that a decision is real,
> and every colour on the screen currently makes a claim about what happened
> rather than naming it.**

Insight: the trust wedge is not a feature, it is a *reading*. If the reader
cannot tell an approval from a position side, the kernel's authority reads as
decoration, no matter how well the program enforces it.

## How Might We

1. **How might we enable the owner-trader to distinguish a kernel decision from
   any other fact on screen so that** they never read an approval that did not
   happen?
2. **How might we help the prop-desk operator scan a screen where verdicts,
   exposure and configuration sit together so that** an audit takes seconds
   rather than a careful read?
3. **How might we empower the founder to add a UI element without risking a
   false claim so that** the design system survives being extended under time
   pressure?
4. **How might we enable a judge with no wallet and ninety seconds to see that
   the enforcement is real and honest so that** they believe the kernel before
   the demo starts?

## Feeling shift (Plutchik)

| Pain | Gain | Evidence status |
|---|---|---|
| **Distrust** — "the green on this screen might be lying" | **Trust** — "a colour here means exactly one thing" | **assumption** — no user has seen it |
| **Anxiety** — "which of these five panels matters?" | **Anticipation** — "I know where to look" | **assumption** |
| (secondary) **Disgust** at ad-hoc values | **Joy** at a system that refuses drift | evidenced only in my own guard runs |

**Small shift + polite praise = not real yet.** Every gain above is
unvalidated. See `05-test-results.md`.
