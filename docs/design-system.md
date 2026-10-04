# Design system

> **Updated 2026-10-04 (second pass — kit hardening):** a **fifth family,
> `state`**, was added. The first pass decided what each *colour* could claim;
> it never asked what the policy *account* is doing, so a fresh policy and a
> healthy one looked identical even though a new policy's drawdown switch is
> **disarmed** (`peak_equity = 0`) until the first `record_pnl`. `state` is
> built from `--accent`/`--fg`/`--line` and never wears a decision colour,
> because "your policy is live" is not a verdict the kernel issued. Guard rule
> **R6** enforces that. Also added: the `.claim` claim boundary, six corrected
> UI strings, and a design sheet that is now a judge-facing deliverable.
>
> **Updated 2026-10-03 (Terading pass):** the token layer now has four
> explicitly separated families — surface, ink, decision, viz — plus radius and
> an extended type scale. The terminal primitives (market chart, trade ticket,
> mode strip) are **built**. `scripts/check-tokens.mjs` enforces the rules in CI
> via `pnpm lint`. Chart and ticket remain **preview/draft** surfaces: they
> cannot submit a venue order. [PRD](../PRD.md) and [E2E plan](e2e-testing.md)
> still define the remaining release scope.

> The visual language for **Terading**. Two surfaces ship today:
> `apps/dashboard` (the control surface) and `artifacts/demo-receipts.html`
> (the static receipts page a judge reads without running anything). They
> are the same product and they share one palette.
>
> Source of truth: `apps/dashboard/app/globals.css` → `:root`.
> Living document — update it in the same commit as any visual change.

---

## The principle

**State and provenance must be explicit.** Reserve green for a verified on-chain approval, red for a policy denial and amber for runtime clamping. Existing interaction accent tokens may indicate links/focus, never approval, profit or a filled order. Local preflight is an estimate, not a kernel verdict.

Use the existing dark surfaces, typography and spacing for a focused trading-terminal identity. Wallet connection, selected market, long/short controls, bullish candles and transaction confirmation do not inherit policy-decision colors. Always include textual state labels.

Show separate policy/network and position/execution modes: today's Jupiter positions are PAPER, even if a policy transaction is on devnet.

---

## Colour

### Surfaces — darkest to lightest

| Token | Value | Use |
|---|---|---|
| `--bg` | `#08090c` | page |
| `--bg-inset` | `#0c0f14` | code blocks, table zebra, wells |
| `--panel` | `#101319` | cards, step blocks |
| `--panel-2` | `#161a22` | nested cards, table header |
| `--panel-hover` | `#14171f` | table row hover |
| `--badge-bg` | `#1b1f28` | muted pill |

### Lines

| Token | Value | Use |
|---|---|---|
| `--line` | `#232833` | default border |
| `--line-soft` | `#1a1e27` | inner dividers |
| `--line-strong` | `#1b202a` | focused / selected |
| `--line-focus` | `#3a4356` | keyboard focus ring |

### Text

| Token | Value | Use |
|---|---|---|
| `--fg` | `#e6e9ef` | body |
| `--fg-dim` | `#8b93a4` | secondary, meta |
| `--fg-faint` | `#767e90` | footer, disabled, labels (4.89:1 — AA at 11px) |
| `--fg-on-accent` | `#06070a` | text on a filled accent button |

### Semantic — the only colours that carry a verdict

| Token | Value | Means |
|---|---|---|
| `--ok` | `#3ddc97` | the kernel **approved** |
| `--no` | `#ff5c72` | the kernel **denied** |
| `--warn` | `#ffc857` | the runtime **clamped** something, or PAPER mode |
| `--accent` | `#6f8bff` | interactive, links, focus |
| `--receipt` | `#c98ff0` | an explorer link (receipts page only) |
| `--pnl` | `#89ddff` | a P&L number (receipts page only) |

Washes and borders are alpha tokens rather than new hexes, so a badge cannot
drift away from its parent colour: `--ok-wash` / `--ok-line`, `--no-wash` /
`--no-line`, `--warn-wash` / `--warn-line`.

`--receipt` and `--pnl` exist only in the receipts page. They are not in
`globals.css` because the dashboard has no equivalent surface.

### Viz — price movement only, never a verdict

| Token | Value | Contrast on `--panel` | Means |
|---|---|---|---|
| `--viz-up` | `#3fc9bd` | 9.12:1 | price rose / positive P&L |
| `--viz-down` | `#e8834f` | 6.90:1 | price fell / negative P&L |
| `--viz-up-wash` | 13% `--viz-up` | — | direction badge fill |
| `--viz-down-wash` | 13% `--viz-down` | — | direction badge fill |
| `--viz-grid` | `#1a1e27` | — | chart gridlines |
| `--viz-axis` | `#5b6373` | — | price axis labels (non-text-critical) |
| `--viz-crosshair` | `#3a4356` | — | hover guide |

**Why teal and orange instead of green and red.** A green candle means "price
rose". Borrowing `--ok` for it would put an approval green on screen where a
judge is looking at market data, and this design system's whole premise is
that a colour may only claim what actually happened. The teal/orange pair
stays visually distinct from `--ok` / `--no` / `--warn` while living inside
the same dark palette.

### State — the account's lifecycle, and why it is not a fifth colour

| Token | Value | Means |
|---|---|---|
| `--state-line` | `#3a4356` | the "live" marker rail (same as `--line-focus`) |
| `--state-wash` | 10% `--accent` | the live chip's surface |

**This family is built from `--accent`, `--fg` and `--line`, deliberately not
from the decision palette.** "Your policy is live" is not a verdict the kernel
issued: the program never approved or denied anything by holding an account, so
painting that state green would put an approval colour on a fact no approval
produced. That is R3b's defect one level up, and guard rule **R6** fails the
build if it happens.

State is therefore expressed with **weight, dash and a glyph**:

| Class | Border | Glyph | Means |
|---|---|---|---|
| `.state-live` | solid `--state-line` | `●` | open, unexpired, you are the owner |
| `.state-unarmed` | **dashed** `--line-focus` | `◌` | live, but a drawdown switch cannot fire yet |
| `.state-expired` | dotted | `○` | `created_at_slot + ttl_slots` has passed |
| `.state-unowned` | dotted | `○` | account exists, connected wallet is not the owner |
| `.state-none` | dotted | `·` | no account at the derived PDA |

**Why `unarmed` is a first-class state and not a warning.** A policy is created
with `peak_equity_usdc = 0`, and the drawdown check compares equity against peak
equity, so a fresh policy's kill-switch is genuinely **disarmed** until the
first `record_pnl` writes a peak. Rendering that as healthy-green tells a tester
the switch works when it is not armed; rendering it as a warning tells them
something is broken. Neither is true. It is a distinct, neutral, named state,
and `KillSwitchNote` spells out which of the two is in effect on the
kill-switch field itself.

### Colour-vision deficiency — the rule that forced the glyphs

`scripts/check-cvd.mjs` simulates four deficiencies with the Machado et al.
(2009) matrices and measures ΔE between every pair that must stay distinct.
`pnpm lint` runs it. Measured result at these token values:

| Pair | protanopia | deuteranopia | tritanopia | achromatopsia |
|---|---|---|---|---|
| `--ok` vs `--no` | ok | ok | ok | **weak** (19.2) |
| `--ok` vs `--viz-up` | ok | ok | **weak** (17.5) | **COLLIDE** (5.7) |
| `--no` vs `--viz-down` | **weak** (18.3) | **weak** (11.7) | ok | **weak** (10.7) |
| `--viz-up` vs `--viz-down` | ok | ok | ok | **COLLIDE** (2.8) |

`--viz-up` and `--viz-down` sit **ΔE 2.8** apart under achromatopsia — as
close to identical as two colours can get. This is not a fixable palette bug:
achromatopsia has no colour channel at all, so any two colours in a similar
lightness band collapse. A search over candidate hues found a passing set
(`--viz-up #0f8c86`) but it is a dull teal that would cost the design more
than it buys.

**So the rule is WCAG 1.4.1: colour must never be the only cue.** Every
direction now carries a redundant glyph:

| Element | Colour | Redundant cue |
|---|---|---|
| Verdict badge | `--ok` / `--no` | `▲` approved · `■` denied + the word |
| Position side | neutral | `▲` long · `▼` short + the word |
| P&L cell | `--viz-up` / `--viz-down` | `▲` / `▼` plus the signed number |
| Price readout | `--viz-up` / `--viz-down` | `▲` / `▼` plus the sign |
| Chart-alt table | `--viz-up` / `--viz-down` | `▲` / `▼` plus the sign |

Guard rule **R5** fails the build if any of these loses its glyph.

### Exit policy, and why it is split

`check-cvd.mjs` treats the two findings differently on purpose:

- **Blocking** — WCAG 1.4.11 non-text contrast. A fixable defect with a hard
  3:1 threshold.
- **Advisory** — a ΔE collision. A property of the palette, not a bug. Failing
  CI on it would train the team to ignore the check, because no reasonable hue
  change fixes it. WCAG 1.4.1 compliance is enforced by R5 instead.

### The rule

> No colour outside `:root`. If a rule needs a new value, add a token.
> And: `--ok` / `--no` / `--warn` are verdicts. Market data uses `--viz-*`.

Both rules are enforced in CI by `scripts/check-tokens.mjs`, which `pnpm lint`
runs:

| Rule | Checks |
|---|---|
| **R1** | no hex in any `.tsx`/`.ts`/`.css` not declared in `:root` |
| **R2** | no off-scale raw px in components — catches CSS `padding: 6px` *and* React `style={{ margin: 7 }}` |
| **R3** | price / P&L / chart / long-short rules may not reference `--ok`/`--no`/`--warn` |
| **R3b** | `.yes` / `.no` may not be reused for a non-verdict meaning (e.g. a position side) |
| **R4** | `--fg`, `--fg-dim`, `--fg-faint` meet WCAG AA on `--bg` |
| **R5** | no element carries meaning by colour alone — a sign, glyph or word is required (WCAG 1.4.1) |
| **R6** | the `state` and `claim` families may not reference `--ok`/`--no`/`--warn`, and a `state-*` class may not share a `className` with `.yes`/`.no`/`.reason` — policy state is the state of an account, not a verdict the kernel made |

```bash
pnpm tokens          # guard only
pnpm a11y:color      # CVD simulation, non-text contrast
pnpm lint            # typecheck every package, then both checks
```

**A guard that has only ever reported "clean" is decoration, not a guard.** R6
was fault-injected before it was trusted — three deliberate violations, all
caught, with no false positives against the existing components. The first
version of the TSX half of R6 matched nothing, because a single regex cannot
span the `}` of a `${…}` interpolation; it was found by injecting a fault and
watching the guard stay silent. Record the injected faults next to the rule the
next time one is added.

The guard has no dependencies on purpose: a linter that can fail to install
is not a linter.

### Contrast fixes made 2026-10-03

| Token | Was | Now | Why |
|---|---|---|---|
| `--fg-faint` | `#5b6373` (3.30:1) | `#767e90` (**4.89:1**) | was AA-large-only at 11px; now AA text |

---

## Spacing

4px base. Eight steps, used consistently:

```
--s1  4px    --s5  20px
--s2  8px    --s6  24px
--s3 12px    --s7  32px
--s4 16px    --s8  40px
```

| Context | Step |
|---|---|
| icon ↔ label | `--s1` |
| chip / pill padding | `--s2` |
| inside a card | `--s3` |
| card padding | `--s4` |
| between cards | `--s5` |
| page gutter | `--s6` |
| page top | `--s7` |
| above the footer | `--s8` |

---

## Type

One scale, six sizes. No arbitrary values.

| Token | Size | Use |
|---|---|---|
| `--t-xs` | 10px | legalese, superscript |
| `--t-sm` | 11px | panel eyebrows, step titles |
| `--t-base` | 13px | **default** — tables, code, receipts |
| `--t-md` | 14px | body copy |
| `--t-lg` | 16px | section headings |
| `--t-xl` | 20px | page title |

Two families only:

- `--sans` — prose, labels, headings
- `--mono` — anything a reader might copy: reason codes, signatures, pubkeys, amounts

**Rule:** if a value could be copy-pasted into a search box, it is `--mono`.
A pubkey in a proportional font is a bug.

---

## Components

Five panels, all the same skeleton:

```
┌─ N  PANEL TITLE ────────────────────── meta · right ─┐
│                                                     │
│   body — table, form, or list                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- **Eyebrow** (`--t-sm`, `--fg-dim`): the numbered panel title
- **Meta** (right-aligned, `--t-sm`, `--fg-faint`): cluster, counts, poll interval
- **Body** (`--panel` on `--bg`, `--line-soft` border, 10px radius)

### Verdict badge

Policy decision colors are reserved for verdict badges; interaction accents are not verdicts. Two variants:

| State | Text | Background |
|---|---|---|
| approved | `--ok` on `--ok-fg` | `var(--ok-wash)` |
| denied | `--no` on `--no-fg` | `var(--no-wash)` |

Never invert these. A red badge is a *denial*, not a danger.

**A verdict class is a verdict, whatever it is applied to.** `.yes` and `.no`
mean the kernel approved or denied. They must not be reused for a position
side, a P&L sign, a market direction or any decorative state — the guard
enforces this (rule 3b). This is not theoretical: `LONG` previously rendered
with `.yes`, painting a long position in the exact green as `APPROVED` in the
audit log directly above it. Two different meanings, one colour, on one screen.

Position sides use `.side-long` / `.side-short` — neutral, deliberately
unremarkable. A side is intent the user expressed, not a result.

### Information hierarchy

Five panels in one column gives every fact the same weight, so the page reads
as a flat list and the reader has to work out what matters. Three tiers:

| Tier | Rail | Panels | Rationale |
|---|---|---|---|
| **verdict** | `--accent` | Audit log | the kernel's answers. The only tier allowed a decision colour. |
| **exposure** | `--line` | Positions | money at risk right now. Present, but quieter than the answers. |
| **reference** | transparent | Policy, Edit policy | configuration and provenance. Recedes until needed. |

Implemented as a 3px left rail rather than a heavier border or a shadow —
weight without decoration, which is what the no-gradients rule is for.

### Empty states

Every panel that can be empty **must** say what to do next, and must name the
command. "No decisions recorded yet" is a dead end; "run `pnpm demo`" is an
instruction. Copy for all three is in `components/ui.tsx`.

### The connect state is not a failure

Before a wallet connects, panels 2 and 5 say *"Connect a wallet to read this
policy"* — they do not render as broken, and they do not imply the policy is
missing. Do not claim a policy exists until the correct agent PDA is successfully fetched.

### The claim boundary

The single most load-bearing component, and the newest primitive in the system.

The program's source was read and it contains no `invoke`, no `invoke_signed`
and no transfer; it holds no keys and custodies nothing. It therefore **cannot
bind a venue action**. Six claims to the contrary were removed from the pitch
after that was established. Removing them from the prose was necessary and not
sufficient, because the *surface* still implied enforcement in four separate
places — a green "live" policy, "the rules fire whether or not you are looking",
"nothing to enforce until you create one", and "enforced by the Anchor program".

`.claim` states the surviving claim and the removed one **in the same type, on
adjacent lines**, so they are read together and neither can be quoted alone. The
false line is struck through rather than omitted, because the correction is the
informative part.

It is placed above the panels, not in the footer: a footer disclaimer is read
after the reader has already believed the claim, which is the wrong order.

It wears **no decision colour**. The kernel never evaluated the product's
honesty, so there is no verdict to paint.

### Honesty rules for UI copy

Six phrases were overclaiming relative to the corrected claim. The rule they
imply, for future copy:

> If a sentence would be false if the reader asked "does this actually stop a
> trade?", it does not ship. "Decides" means the kernel reached a verdict about
> a request. "Enforces" means nothing can bypass it — and nothing here can be
> bypassed *by the program*, only by a caller who never asks it.

Current substitutions:

| Was | Now |
|---|---|
| "The kernel decides every trade" | "records every trade decision against the rules it holds" |
| "the rules it is bound by" | "the rules it holds" |
| "the kernel has nothing to enforce" | "the kernel has no caps to check anything against" |
| "enforced by the Anchor program" | "recorded by the program" |
| "your rules fire whether or not this tab is open" | "your rules are checked and written to the log" |
| "become enforceable by the kernel" | "become the caps the kernel checks against" |

---

## What the design deliberately does not have

| Not present | Why |
|---|---|
| An approve / deny button | The kernel decides. A button would imply the user can override it, which would be a lie about the product. |
| Any green "live"/"active"/"healthy" badge for the policy | The program never approved anything by holding an account. A green state chip is a verdict colour on a non-verdict, which is what guard R6 exists to stop. |
| A kill-switch reading that does not distinguish armed from unarmed | A fresh policy is disarmed. A tester who cannot tell the difference concludes the switch is broken; a tester told it is broken when it merely is not yet armed draws the wrong conclusion the other way. |
| P&L analytics dashboard | Deferred. A selected-market price chart is now required; it is not verified PnL or an executable quote. |
| Gradients, glass, shadows | A dark, flat surface keeps attention on the verdict colour. Depth would compete with it. |
| Unlabelled stale chain reads | Show initial loading separately; retained values need their last-success time and explicit stale/error state. A poll interval is not a latency measurement. |
| Decision colour as decoration | Trading branding uses neutral hierarchy/type and the existing interaction accent; never imply approval, denial or clamping decoratively. |

---

## Terminal components — built (preview-only)

`MarketWorkspace` renders above the five panels: reference price on the left,
trade ticket on the right, in a `.ticket-grid`.

**What "built" means here, precisely.** The components exist, are rendered, and
are wired to live data. They are still **preview surfaces**: the ticket models a
request against the policy the chain holds, and nothing on the page calls
`authorizeSpend` or opens a venue position. The authoritative answer arrives as
an `AuditEvent` in the audit log, never synthesised locally.

### The price surface draws only real prices

There is no candles/ohlc endpoint anywhere in this codebase. The only price
source is `JupiterPriceFeed`, which returns **one current price**. So:

- Every point on the line is a price Jupiter actually returned, at a moment the
  browser actually fetched it. Nothing is interpolated, simulated, seeded,
  smoothed or back-filled.
- Fewer than two observations means **no line** and an explicit "one
  observation so far". The chart does not draw a flat line to fill space.
- A failed feed keeps the last good price but marks it `stale` with its age. It
  is never replaced with a placeholder.
- The provenance strip always says `spot price · not a fill` and
  `N obs this session`, because this is *what this tab saw while it was open* —
  not a market history.

This is a deliberate limitation, not a missing feature. A chart drawn from
invented history in a project whose entire pitch is honesty would be the single
worst thing in the repo. Closing it properly needs a real history endpoint; see
the deferral list below.

Chart movement uses `--viz-*` only, with `▲`/`▼` glyphs alongside every
direction, and the full series repeats in `.chart-alt` as a real table so the
data is readable without sight of the drawing.

### Still proposed, not built

Adjacent policy/risk view, account-scoped positions/orders, and a real price
history. Keyboard focus, visible labels, exact units, responsive critical
controls, wallet-switch cleanup and distinct denial/transport/venue states
remain acceptance requirements in [E2E cases](e2e-testing.md). A submit or
wallet-signature control is not an override of the kernel.

---

## The design sheet is a deliverable, not a debug output

`artifacts/design-sheet.html` is regenerated by
`node scripts/render-design-sheet.mjs` and is what a judge opens. It carries
six sections: the colour-family legend, the component gallery, the measured
contrast table, the scales, the corrected claim, and the colour-vision
simulation.

Two properties make it usable as evidence rather than decoration:

1. **Nothing in it is hand-written.** Every hex, ratio, simulated value and
   contrast figure is read out of `:root` at generation time, so it cannot
   drift from the code it describes.
2. **The CVD section is the same measurement CI runs.** `scripts/lib/cvd.mjs`
   holds the Machado matrices and the maths; `check-cvd.mjs` and
   `render-design-sheet.mjs` are both consumers. Before the split, the sheet
   restated the matrices by hand, which meant a judge-facing number could
   silently disagree with the build.

The sheet also prints its own provenance: the exact commit, and whether the
working tree had moved since. A sheet generated from an uncommitted `:root` must
say so, or it reads as a statement about a commit that does not contain the
tokens it shows.

**A bug this refactor surfaced:** the token parser was reading `--panel` as
`"teal 9.12:1, orange 6.90:1."` — prose inside a CSS comment that parsed as a
custom property. Every "contrast on --panel" figure in the old sheet was
computed against that string, and `check-cvd.mjs` was reporting `NaN:1` for
four tokens. Comments are now stripped before extraction. The numbers changed
to the values documented above, which is the real answer.

## Accessibility commitments

| Commitment | Where |
|---|---|
| Focus ring on every focusable element, never removed without a replacement | `:focus-visible`, incl. `input`/`select`/`button`/`a`/`[tabindex]` |
| `prefers-reduced-motion` covers `transition`, `animation`, `animation-iteration-count` **and** `scroll-behavior` | one block, so a later animation cannot ignore it |
| The spinner is not hidden under reduced motion — a static partial ring still reads as "working" | hiding it would trade a motion preference for a state-ambiguity bug |
| Every meaning carried by colour also carries a glyph, a sign or a word | guard R5 |
| The chart's numbers exist as a real `<table>` with a `<caption>` | `.chart-alt` |

## Change log

| Date | Change |
|---|---|
| 2026-10-04 (2nd pass) | Added the `state` family (`.state-live` / `-unarmed` / `-expired` / `-unowned` / `-none`) with `derivePolicyState`, so a fresh policy's unarmed drawdown switch is distinguishable from a healthy one; added the `.claim` claim-boundary primitive; corrected six overclaiming strings in UI copy; guard rule **R6**; extracted `scripts/lib/cvd.mjs` so the design sheet and `check-cvd.mjs` share one CVD measurement; fixed the `:root` comment-parsing bug that made `--panel` resolve to prose; completed `prefers-reduced-motion` and broadened the focus ring. |
| 2026-10-04 | Terminal components built and wired: `/api/quote` spot route, `MarketChart` (real observations only), `TradeTicket` (policy-capped, preview-only), `MarketWorkspace`. Added `scripts/check-cvd.mjs` and guard rules R3b/R5. |
| 2026-10-03 | Documentation-only scope revision for chart/ticket terminal, truthful modes, state provenance and accessibility. Implementation still pending. |
| 2026-09-30 | First pass. Folded 9 ad-hoc hexes into `:root` as named tokens; added the 4px spacing scale and the 6-size type scale; aligned the receipts page palette to the dashboard's. |
