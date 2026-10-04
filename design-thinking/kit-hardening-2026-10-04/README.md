# Kit-hardening design pass — 2026-10-04

Five stages of the design-thinking process, run on the **design kit** rather than
on a screen, after the pitch was corrected.

**Research mode: assumption (user research) + evidence (competitive), with the
two tiers kept separate on purpose.** `00-challenge-brief.md` states the
distinction. The short version: nobody has evaluated any of this, and the file
that says so is the first thing in `05-test-results.md`.

| Stage | Artifact | Contains |
|---|---|---|
| 0. Frame | [00-challenge-brief.md](00-challenge-brief.md) | scope, the three evidence tiers, the browser constraint |
| 1. Empathize | [01-research-notes.md](01-research-notes.md) | founder quotes, the competitive evidence, 3 empathy maps |
| 2. Define | [02-problem-statement.md](02-problem-statement.md) | 5 Whys, one-sentence POV, 5 HMWs, feeling shift |
| 3. Ideate | [03-ideas.md](03-ideas.md) | 32 ideas, screened, 4 shortlisted, the one primitive chosen |
| 4. Prototype | [04-prototypes.md](04-prototypes.md) | 4 built — **these are Deliverable A** — and the question each answers |
| 5. Test | [05-test-results.md](05-test-results.md) | machine results, the human gap, iteration decisions |

## Why this pass existed

The first pass ([`terading-2026-10-04/`](../terading-2026-10-04/)) was a
UI-semantics pass: it decided what each colour may claim, and built `--viz` plus
guard rules R3b/R5 so verdicts could not be reused. It is preserved unchanged as
the audit record.

It did not anticipate that the **product claim itself** would be corrected.
Verified: `programs/treasury/src/` contains no CPI, no custody, no transfer.
The program holds no keys and cannot bind a venue action. Six false claims were
removed from the pitch.

> **The first pass's design system was built to defend a claim the project no
> longer makes.** `--ok`/`--no` guarded "did the kernel decide this?" — and the
> corrected answer is that the kernel decides *records*, not trades.

## What this pass found

**Root cause:** the kit could express what something *is*, never what it is
*currently doing*. Every value had a colour, a scale and a contrast guarantee.
No element had a lifecycle — so a fresh policy whose kill-switch is genuinely
disarmed (`peak_equity = 0`) looked identical to a healthy one, and a tester
reached the wrong conclusion from correct data. Same defect class as the first
pass's `LONG`-in-approval-green, one level up: **a true fact rendered as a
broader claim.**

Three shipped changes earn their place:

- **A `state` family** — `.state-live` / `-unarmed` / `-expired` / `-unowned` /
  `-none`, built from `--accent`/`--fg`/`--line` and deliberately **not** from
  the decision palette, because "your policy is live" is not a verdict the
  kernel issued. Guard **R6** enforces it.
- **`.claim`, the claim boundary** — states the surviving claim and strikes
  through the removed one, in the same type, above the panels. It is the one
  primitive added this pass, chosen against four alternatives in `03-ideas.md`.
- **Six corrected UI strings**, found by grepping for the language the docs had
  already abandoned.

## The finding worth carrying forward

Not from a user. From fault-injecting the new guard, again:

> **A guard that has only ever reported "clean" hides the bugs that are in the
> code it is not looking at.**

The prior pass stated the first half. This pass found the second: the token
parser was reading `--panel` as the string `teal 9.12:1, orange 6.90:1.` — prose
inside a CSS comment that a `(--x): (value)` regex reads as a custom property.
Every "contrast on `--panel`" figure in the published design sheet was computed
against that string, and `check-cvd.mjs` was printing `NaN:1` for four tokens.
**A judge-facing artifact was publishing wrong numbers, and it looked fine.**

R6's TSX half was broken the same way — a regex cannot span the `}` of a
`${…}` interpolation, so it matched nothing — and was found only by injecting a
fault and watching the guard stay silent.

## Status

**Untested by a human.** Nothing has been seen painted; the sandbox browser
reaches no port. The three kill criteria are written down, and the 25-minute
human-only protocol in `05-test-results.md` starts with them.

Verified, with real exit codes: `pnpm lint` 0 · `pnpm build` 0 · `pnpm -r test`
0 (SDK 16/16, agent 21/21) · both guards 0 · design sheet regenerates
byte-identical.

## Related

- [Design system](../../docs/design-system.md) — the rules this pass enforces
- [Design sheet](../../artifacts/design-sheet.html) — regenerate with `node scripts/render-design-sheet.mjs`
- [Token guard](../../scripts/check-tokens.mjs) — R1–R6
- [Prior pass](../terading-2026-10-04/) — 2026-10-04, UI semantics, preserved
