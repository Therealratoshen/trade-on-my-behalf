# 01 — Research Notes & Empathy Maps

Research mode: **assumption** for user research, with the carve-out declared in
`00-challenge-brief.md`. No interview, no observation, no immersion was
performed for this pass. Everything below is labelled by evidence tier.

---

## 1. The one piece of direct testimony

`[TESTIMONY]` From the founder's own words, in `design-thinking/README.md`,
carried forward unchanged from the 2026-09-26 archive:

> "i do not have time to do trading if the action or trend or so called the
> movement can be predictable and i should trade it but i do not have time to
> review and keep on viewing it at all"

> "what i really want to have is the perpetual agent to trade for me"

**Why this matters more after the correction than before it.** The first pass
read these as a request for an autonomous runtime. They are not. Read against
the verified fact that the program cannot bind a venue, the second quote
becomes a request for something the product **does not currently do** — the
agent trades for you *and* your rules hold. The gap between that sentence and
`programs/treasury/src/` is the whole remaining project.

**Caveat I have to state:** this is one person, unprompted, describing a past
state. It is not validated, not representative, and not a research finding. It
is the only thing in this repository that is not my own inference.

---

## 2. The evidence carve-out: what the competition actually claims

`[EVIDENCE]` Verified 2026-10-03 from primary sources.

This is the one body of research in this pass, and it is the reason the second
pass exists at all. I went looking for the *specific* claim this project makes
and asked: who else says it, and do they mean it?

| Product | Markets as | Actually enforces via | Source |
|---|---|---|---|
| **MetaMask Agent Wallet** | "automates trades while staying inside your rules" — Hyperliquid perps + Solana | **TEE + 2FA**. A trusted-execution enclave, not a program. | vendor docs |
| **Hypernova** | "enforced on-chain" | Its own docs say **anchored**. The marketing copy and the documentation disagree. | vendor docs |
| **Every venue** (Jupiter Perps, Drift, and the field) | user-set limits | **Delegation.** A key you hand over, with a scope the venue honours. | venue docs |

The pattern across all three is the finding, and it is not about any one
competitor:

> **Everyone in this market offers delegation. Nobody offers constrained
> delegation. Two offer something adjacent and describe it with the word
> "enforced" while their own documentation uses a weaker one.**

That is a real gap, verified, and it is narrower than the pitch the repo used to
carry. But note what it does *not* say: it does not say Terading has closed the
gap. A program that records an authorisation and refuses to move money is still
not a boundary — a caller who never asks the program is unaffected. The honest
reading of that table is:

- the *differentiator* is real but thin — a program that refuses, versus a TEE
  that asks, versus a venue that obeys;
- a **thin differentiator only works if a judge can see it**, because "thin"
  means it will not survive being described in a sentence;
- and therefore **the design's job is no longer to look trustworthy. It is to
  make a narrow, specific, checkable claim visible in ninety seconds.**

That last line is the root of this pass. It is why the artifact that had to
change is the judge-facing one.

---

## Empathy map — Persona A: the owner-trader (primary)

*Partly `[TESTIMONY]` (the two quotes), otherwise `[ASSUMPTION]`.*

### Says
- `[TESTIMONY]` the two quotes above
- `[ASSUMPTION]` "which one can't break my rules?"
- `[ASSUMPTION]` "show me the one time it said no."

### Thinks
- `[ASSUMPTION]` "every perps bot says 'AI agent'. they all sound the same.
  which one *physically* can't break my rules?"
- `[ASSUMPTION]` — and after the correction — "so is this one of those, or is it
  actually different? I read the docs and I still can't tell."
- `[ASSUMPTION]` "if the honest answer is 'it only records', then at least tell
  me that before I connect a wallet."

### Does
- `[TESTIMONY]` owns the problem; wrote the program and the pitch
- `[ASSUMPTION]` checks a trading app in short bursts, repeatedly, and only
  after something surprising happens

### Feels

| Pain (now) | Mirrored gain (desired) | Tier |
|---|---|---|
| **Distrust** — "I cannot tell which of these is real" | **Trust** — "this one tells me its own limit" | `[ASSUMPTION]` |
| **Anxiety** — "the rules I set might be decorative" | **Anticipation** — "I know exactly what they do" | `[ASSUMPTION]` |
| **Frustration** — "reading a pitch takes longer than testing it" | **Joy** at a thing that shows its own edge | `[ASSUMPTION]` |

**Design consequence:** a product whose real differentiator is narrow must
state the narrowness *proactively*. A reader who discovers the limit by
catching the founder out has learned the founder overclaims — which is exactly
the reputation the correction was meant to avoid.

---

## Empathy map — Persona B: the judge (added this pass)

*`[ASSUMPTION]` for behaviour. The competitive claims in the table above are
`[EVIDENCE]`.*

### Says
- `[ASSUMPTION]` "how is this different from MetaMask Agent Wallet?"
- `[ASSUMPTION]` "prove it refuses."
- `[ASSUMPTION]` "is it on chain?"

### Thinks
- `[ASSUMPTION]` "every submission at this fair claims it is real. I have heard
  forty of these. which one would still be true if I read the source?"
- `[ASSUMPTION]` — the decisive one — **"this one just told me what it can't
  do. nobody else did that."**
- `[ASSUMPTION]` "the competitor says 'enforced'. this one says 'anchored'.
  which of them read their own docs?"

### Does
- `[ASSUMPTION]` opens the repo, skims, has maybe ninety seconds, may never run
  anything, and definitely will not read the design system doc

### Feels

| Pain (now) | Mirrored gain (desired) | Tier |
|---|---|---|
| **Distrust** — "another wrapper" | **Trust** — "this thing refuses, and tells me the size of the refusal" | `[ASSUMPTION]` |
| (secondary) **Surprise** at a visible, specific limit | **Admiration** that it costs nothing to admit | `[ASSUMPTION]` |
| **Suspicion** — "the narrow claim might be an excuse" | **Confidence** that a stated limit is checkable | `[ASSUMPTION]` |

**Design consequence:** for this persona the honesty is not a tax on the pitch,
it is the pitch. `evidence #2` says two competitors use the word "enforced"
and mean something weaker. A submission that names the weaker thing about
*itself*, unprompted, in the first artifact a judge opens, is making a claim no
one else in the field is making. That is a differentiator that costs no
engineering and cannot be copied by adding a feature.

`[ASSUMPTION]` — I have no evidence any judge reasons this way. It is a
hypothesis about a persona I have never met, and it is the load-bearing
assumption of this entire pass.

---

## Empathy map — Persona C: the outside tester (D11, Tester 3)

*All `[ASSUMPTION]`.*

### Says
- `[ASSUMPTION]` "the kill-switch didn't fire."
- `[ASSUMPTION]` "is that a bug?"

### Thinks
- `[ASSUMPTION]` "I set a 25% drawdown, I pushed it past 25%, and nothing
  happened, so it does not work."

### Does
- `[ASSUMPTION]` creates a policy from the CLI, then immediately tries to trip
  the kill-switch without reading the program source

### Feels

| Pain (now) | Mirrored gain (desired) | Tier |
|---|---|---|
| **Frustration** — "it says configured but does nothing" | **Relief** — "oh, it is not armed yet" | `[ASSUMPTION]` |
| **Distrust** — "the demo overstated again" | **Trust** — "the UI told me the truth before I found out" | `[ASSUMPTION]` |

### The specific defect, and why it is a design defect not a code defect

`[EVIDENCE — code]` A policy is created with `peak_equity_usdc = 0`
(`state/mod.rs`: `peak_equity_usdc: u64, // 0 = uninitialized; used for
drawdown calc`). The drawdown check compares current equity against peak
equity. With no peak recorded there is nothing to draw down **from**, so the
kill-switch cannot fire until the first `record_pnl` writes one.

`[EVIDENCE — tests]` `packages/agent` has a test named *"kill-switch is
disarmed until a peak is recorded"*. The behaviour is correct and intended.

`[ASSUMPTION — the defect]` The UI renders a fresh policy as an ordinary field
grid. `kill-switch drawdown: 25%` with the sub-line `from peak equity` reads
as a working switch. A tester reaches the wrong conclusion, correctly, from
correct data.

**This is the same class of defect the first pass found.** That pass found
"LONG painted in approval green" — a correct fact rendered in a way that
supported a false claim. This is a correct property (peak is 0) rendered in a
way that supports a false claim (the switch is live). The first pass fixed the
instance and wrote R3b. This pass fixes the class: it adds the *missing
concept*, not just a corrected instance. That is the difference between a patch
and a system, and it is why a second pass was warranted rather than a patch.

---

## Synthesis

Three personas, three different readings of the same gap:

- **Owner-trader:** the limit must be stated before I find it, not after.
- **Judge:** stating my own limit is the only claim the field is not making.
- **Tester:** a true fact rendered in the wrong shape still produces a false
  belief.

All three converge on one requirement:

> **The surface must make claims at the same resolution the truth is
> available.**

Not more optimistic, not more hedged — the *same resolution*. A true fact
rendered as a broader claim is a lie; that is the finding of both passes, and
it is now the finding of the product as well as the design system.
