# Design system

> The visual language for **Trade On My Behalf**. Two surfaces ship today:
> `apps/dashboard` (the control surface) and `artifacts/demo-receipts.html`
> (the static receipts page a judge reads without running anything). They
> are the same product and they share one palette.
>
> Source of truth: `apps/dashboard/app/globals.css` → `:root`.
> Living document — update it in the same commit as any visual change.

---

## The principle

**The chain is the authority, so the UI is quiet.** Colour carries one
meaning and one meaning only: *this is a decision the kernel made.* Nothing
is decorative. If it is not telling you what the program decided, it is
grey.

That is why the palette is small, why there is no gradient, and why there is
no colour that isn't `--ok`, `--no`, or `--warn`.

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
| `--fg-faint` | `#5b6373` | footer, disabled |
| `--fg-on-accent` | `#06070a` | text on a filled accent button |

### Semantic — the only colours that carry meaning

| Token | Value | Means |
|---|---|---|
| `--ok` | `#3ddc97` | the kernel **approved** |
| `--no` | `#ff5c72` | the kernel **denied** |
| `--warn` | `#ffc857` | the runtime **clamped** something |
| `--accent` | `#6f8bff` | interactive, links, focus |
| `--receipt` | `#c98ff0` | an explorer link (receipts page only) |
| `--pnl` | `#89ddff` | a P&L number (receipts page only) |

Badge tints sit on a low-alpha wash of their parent, one step brighter:

| Token | Value | On |
|---|---|---|
| `--ok-fg` | `#a6f0cf` | `rgba(61,220,151,0.07)` |
| `--no-fg` | `#ffb3be` | `rgba(255,92,114,0.08)` |

`--receipt` and `--pnl` exist only in the receipts page. They are not in
`globals.css` because the dashboard has no equivalent surface.

### The rule

> No colour outside `:root`. If a rule needs a new value, add a token.

This is enforced by a one-liner you can re-run at any time:

```bash
node -e "
const fs=require('fs');
const css=fs.readFileSync('apps/dashboard/app/globals.css','utf8');
const known=new Set([...css.match(/:root\s*\{([^}]*)\}/)[1].matchAll(/#[0-9a-fA-F]{3,8}/g)].map(m=>m[0].toLowerCase()));
const used=new Set([...css.matchAll(/#[0-9a-fA-F]{3,8}/g)].map(m=>m[0].toLowerCase()));
const drift=[...used].filter(c=>!known.has(c));
console.log(drift.length?'DRIFT: '+drift.join(' '):'clean — every colour is a token');
"
```

It currently reports `clean — every colour is a token` (21 tokens, 21
distinct values). It found 9 orphans before the first consolidation.

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

The only saturated element in the app. Two variants:

| State | Text | Background |
|---|---|---|
| approved | `--ok` on `--ok-fg` | `rgba(61,220,151,0.07)` |
| denied | `--no` on `--no-fg` | `rgba(255,92,114,0.08)` |

Never invert these. A red badge is a *denial*, not a danger.

### Empty states

Every panel that can be empty **must** say what to do next, and must name the
command. "No decisions recorded yet" is a dead end; "run `pnpm demo`" is an
instruction. Copy for all three is in `components/ui.tsx`.

### The connect state is not a failure

Before a wallet connects, panels 2 and 5 say *"Connect a wallet to read this
policy"* — they do not render as broken, and they do not imply the policy is
missing. It exists; the page just cannot see it yet.

---

## What the design deliberately does not have

| Not present | Why |
|---|---|
| An approve / deny button | The kernel decides. A button would imply the user can override it, which would be a lie about the product. |
| P&L charts | Not the wedge. A chart implies a product about analytics; the wedge is about enforcement. |
| Gradients, glass, shadows | A dark, flat surface keeps attention on the verdict colour. Depth would compete with it. |
| Loading spinners on chain reads | Reads are 2-second polls. A spinner flashes and lies about latency. Show the previous value and the poll interval instead. |
| Colour as brand | There is no brand colour. The colour means a verdict. |

---

## Change log

| Date | Change |
|---|---|
| 2026-09-30 | First pass. Folded 9 ad-hoc hexes into `:root` as named tokens; added the 4px spacing scale and the 6-size type scale; aligned the receipts page palette to the dashboard's. |
