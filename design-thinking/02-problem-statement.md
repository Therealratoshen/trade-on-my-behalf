# 02 — Problem Statements + How-Might-We

> Stage 2 of the design-thinking pass.
> For each persona, a 2–4-sentence Point-of-View problem statement,
> then 6–10 How-Might-We questions, each tied to (a) a wedge
> dimension from `docs/research/dimension-map.md` and (b) a
> feeling-shift pair (Plutchik pain → mirrored gain).
> Then: top 3 HMWs to advance into Stage 3.
> Research mode: **assumption** (declared in `00-challenge-brief.md`).

---

## Persona A — The Founder (primary)

### Point-of-View problem statement

> The founder needs a perps execution path that takes their
> personally-defined setups *only when they cannot be at the screen*,
> because they recognize good trades in seconds but lose hours to
> waiting and miss more setups than they catch, but currently every
> 24/7 bot they evaluate either oversizes on a bad signal, hides the
> decision off-chain, or asks them to keep watching.

(2–4 sentences. Need = "execute my setups without me." Insight =
the gap is not signal quality but *trust in the constraint
envelope.* Pain = existing bots optimize for uptime, not for *my
rules.*)

### How-Might-We questions

Each HMW has the full skill format: action + user + need + outcome
(after-feeling). Each is tied to one wedge dimension and one
Plutchik feeling-shift pair.

1. **HMW-A1 (P — Perps)** — *How might we **enable** the founder
   to **route trades through Jupiter Perps / Drift under rules they
   themselves authored in plain English** so that they can **feel
   trust (mirroring fear) that no rogue signal can oversize**?*
2. **HMW-A2 (A — AI agent runtime)** — *How might we **help** the
   founder to **delegate the watching-and-pulling-trigger step to
   a runtime** so that they can **feel anticipation (mirroring
   anxiety) that the next DM is a good trade, not a leak**?*
3. **HMW-A3 (X — On-chain policy gate)** — *How might we **empower**
   the founder to **lock rules at the wallet's signing layer** so
   that they can **feel trust (mirroring distrust) that even a
   compromised dependency cannot break their rules**?*
4. **HMW-A4 (T — TG control surface)** — *How might we **enable**
   the founder to **approve-or-skip a trade from a 60-second phone
   notification** so that they can **feel joy (mirroring
   frustration) at taking setups without being at the screen**?*
5. **HMW-A5 (T — TG control surface)** — *How might we **help** the
   founder to **see a `RiskFlag` DM for every denied trade** so
   that they can **feel anticipation (mirroring distrust) that the
   rules are demonstrably firing**?*
6. **HMW-A6 (X — On-chain policy gate)** — *How might we **enable**
   the founder to **export every on-chain decision (approved or
   denied) with the rule inputs at decision time** so that they
   can **feel joy (mirroring disgust) at one-click audit**?*

---

## Persona B — Prop-Trading Firm Operator (adjacent)

### Point-of-View problem statement

> The prop-trading operator needs a per-strategy wallet that refuses
> to act outside pre-declared on-chain rules, because a single
> unmonitored oversize has already wiped out a strategy twice and
> the auditor is asking for a per-trade decision trail, but
> currently the rules live in a spreadsheet that cannot refuse a
> trade and an off-chain risk engine that has gone offline twice.

(Need = "contain blast radius per strategy, auditable." Insight =
the gap is not signal quality but *enforcement + audit trail* in
the same primitive. Pain = spreadsheet is human; off-chain
engine is unreliable.)

### How-Might-We questions

1. **HMW-B1 (X — On-chain policy gate)** — *How might we **enable**
   the operator to **declare per-strategy caps as a single on-chain
   PDA** so that they can **feel trust (mirroring distrust) that
   the wallet itself enforces the cap**?*
2. **HMW-B2 (X — On-chain policy gate)** — *How might we **help**
   the operator to **flip a kill-switch on a wallet that has
   tripped its drawdown** so that they can **feel anticipation
   (mirroring anxiety) that no new position opens after damage
   starts**?*
3. **HMW-B3 (P — Perps)** — *How might we **enable** the operator
   to **whitelist per-strategy venues** so that they can **feel
   trust (mirroring fear) that a junior cannot route a strategy
   to an off-permitted venue**?*
4. **HMW-B4 (A — AI agent runtime)** — *How might we **help** the
   operator to **assign a different runtime / signal source per
   strategy** so that they can **feel joy (mirroring frustration)
   at running multiple books under one auditable roof**?*
5. **HMW-B5 (X — On-chain policy gate)** — *How might we **empower**
   the operator to **export every on-chain decision (approved or
   denied) with rule inputs and the slot number** so that they
   can **feel joy (mirroring disgust) at one-click auditor
   evidence**?*

---

## Top 3 HMWs to advance (Stage 3 input)

Selection criteria (from the skill):

- each HMW must target a *different* wedge dimension OR a different
  after-feeling, so ideation doesn't converge on one axis;
- each HMW must have an explicit **so that** (an after-feeling);
- the trio must collectively cover the wedge (P + A + X + T + M)
  with at least one HMW on **X** (the hard-to-copy dim) and at
  least one on **T** (the UX dim).

Selected:

| # | HMW | Dim | After-feeling (Plutchik gain) |
|---|---|---|---|
| **1** | **HMW-A3** — empower the founder to lock rules at the wallet's signing layer | **X** (on-chain policy) | **Trust** (mirrors Distrust) |
| **2** | **HMW-A4** — enable the founder to approve-or-skip from a 60-second TG DM | **T** (TG control) | **Joy** (mirrors Frustration) |
| **3** | **HMW-A5** — help the founder see a `RiskFlag` DM for every denied trade | **T** + **X** (demo of the gate firing) | **Anticipation** (mirrors Distrust) |

Why these three:

- **HMW-A3** is the *wedge-defining* HMW. It is what no other
  project in the dimension map does. Without it, we are just
  another perps bot with a Telegram face.
- **HMW-A4** is the *UX-defining* HMW. It is what the founder
  *feels* when the product lands. Without it, the on-chain gate
  is invisible.
- **HMW-A5** is the *demonstration-defining* HMW. It is what the
  pitch video's *"the rules just fired"* scene shows. Without it,
  the on-chain gate is theoretical.

The other HMWs (A1, A2, A6, B1–B5) are deferred to v2 ideation —
they are real, but they are not on the critical path for D17.

> Research-mode reminder: Persona-A quotes in this artifact are
> evidence (chat history); Persona-B is fully assumption; the
> HMW ranking is decisive per the skill's operating rule #6.