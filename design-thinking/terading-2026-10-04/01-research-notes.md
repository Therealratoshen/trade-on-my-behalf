# 01 — Research Notes & Empathy Maps

## Research mode: assumption + static review evidence

Declared in `00-challenge-brief.md`. No interview, observation or immersion
was performed for this pass. The only *direct* evidence in this repository is
the founder's own words, quoted below. Everything else is labelled assumption.

## The one piece of real evidence

From the founder's chat history, 2026-09-26 — carried forward unchanged from
`docs/internal/design-thinking-archive/01-empathy-map.md`:

> "i do not have time to do trading if the action or trend or so called the
> movement can be predictable and i should trade it but i do not have time to
> review and keep on viewing it at all"

> "what i really want to have is the perpetual agent to trade for me"

That second sentence is why this pass exists. The founder wants to *stop
watching*. A control surface that requires watching has failed its own user.

---

## Empathy map — Persona A: the owner-trader (primary)

*Partly evidence (the two quotes above), otherwise assumption.*

### Says
- *(evidence)* the two quotes above
- *(assumption)* "If the bot oversizes once, I'm out forever."
- *(assumption)* "Which one can't break my rules?"

### Thinks
- *(assumption)* "Every other perps bot says 'AI agent.' They all sound the
  same. Which one physically can't break my rules?"
- *(assumption)* "Right now I don't trust any of them."

### Does
- *(evidence)* owns the problem; wrote the SPEC and the Anchor program
- *(assumption)* checks a trading app for 30 seconds at a time, repeatedly

### Feels

| Pain (now) | Mirrored gain (desired) |
|---|---|
| **Distrust** of every unattended bot | **Trust** in a runtime that cannot break the rules |
| **Anxiety** about an oversize while asleep | **Anticipation** that the next event is good news |
| **Frustration** at a surface needing constant watching | **Joy** at being able to look away |

**Design consequence for this pass:** a surface meant to be glanced at must
never require reading prose to be understood. That is the whole argument for
the tier rails and the mode strip — the reader should get "kernel decided,
positions are paper" in one second, not one paragraph.

---

## Empathy map — Persona B: the prop-desk operator (adjacent)

*All assumption. Never interviewed.*

### Says
- *(assumption)* "I don't want an AI to trade. I want the junior to trade, and
  the rules to live somewhere I can audit."
- *(assumption)* "Show me every decision on-chain. Approved or denied."

### Thinks
- *(assumption)* "Compliance will ask for this in 12 months anyway."
- *(assumption)* "Off-chain rule engines are a soft target. Give me something
  signed."

### Does
- *(assumption)* reconciles a spreadsheet manually at end of day; misses
  intraday breaches
- *(assumption)* audited once; the auditor asked for a per-decision trail with
  the rule inputs at the time

### Feels

| Pain (now) | Mirrored gain (desired) |
|---|---|
| **Distrust** of off-chain engines (vendor outage, junior error) | **Trust** in a gate that cannot be bypassed |
| **Anxiety** about weekends and after-hours | **Anticipation** that the kill-switch fires before damage |
| **Disgust** at manual reconciliation | **Joy** at a one-click audit trail |

**Design consequence for this pass:** this persona reads verdicts and P&L in
the same view. It is exactly the reader the `LONG`-in-approval-green bug
served worst — the one who would have read an approval where none happened.
That is the empirical weight behind `02-problem-statement.md`.

---

## Empathy map — Persona C: the judge (assumption, four days out)

### Says
- *(assumption)* "Show me in 90 seconds that it's real."

### Thinks
- *(assumption)* "Every submission says it's real. What makes this one true?"

### Does
- *(assumption)* opens the repo, runs the demo if it is fast, reads the README
  if it is not

### Feels

| Pain (now) | Mirrored gain (desired) |
|---|---|
| **Distrust** — "another wrapper" | **Trust** — "this thing refuses, visibly" |
| (secondary) **Surprise** if a rule denies on camera | **Joy** that the demo was not a video |

**Design consequence for this pass:** the honest PAPER label is a feature, not
a limitation, for this persona. A demo that hid its paper fills would be worth
less, not more. This is why `ModeStrip` ships even though it adds a permanent
scarcity caveat to the interface.

---

## Synthesis

All three personas converge on one requirement, from different directions: the
reader must be able to tell, instantly, **what actually happened**. Persona A
needs it to look away. Persona B needs it to audit. Persona C needs it to
believe.

That convergence is the evidence base for the problem statement in `02`. It is
still assumption about their behaviour — the *requirement* is well-supported,
the *response* is not yet validated by any of them.
