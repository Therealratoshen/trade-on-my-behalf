# 01 — Empathy Maps

> Stage 1 of the design-thinking pass.
> Two personas: (a) the founder (primary; the user whose pain
> birthed the product), (b) the prop-trading firm operator (adjacent;
> same wedge, different user).
> Feeling model: Plutchik's 8 primaries (joy, trust, fear, surprise,
> sadness, disgust, anger, anticipation). Each Feels row names the
> primary pain emotion and its **mirrored gain** (the desired
> opposite after-feeling).
> Research mode: **assumption** (declared in `00-challenge-brief.md`).
> Founder quotes are evidence; everything else is assumption.

---

## Persona A — "The Founder" (primary)

> Solo retail trader. Crypto-native since 2021. Has held SOL through
> two cycles. Recognizes setups (RSI dip, trend break, news-driven
> move) in seconds. Cannot sit in front of charts because they are
> running a non-crypto job. Found this product's pain by living it.
>
> *Background assumption.* Not interviewed (D17 deadline; no live
> interviews possible before then). Quotes below are from the
> founder's own chat history and are the only direct evidence we
> have.

### Says

- *(evidence, chat history 2026-09-26)*
  > "i do not have time to do trading if the action or trend or so
  > called the movement can be predictable and i should trade it but
  > i do not have time to review and keep on viewing it at all"
- *(evidence, chat history 2026-09-26)*
  > "what i really want to have is the perpetual agent to trade for
  > me"
- *(assumption)* "Set a stop, walk away. That's the whole game."
- *(assumption)* "If the bot oversizes once, I'm out forever."
- *(assumption)* "I don't want a dashboard. I want a Telegram ping."

### Thinks

- *(assumption)* "The setup is *right there* — I can see it. I just
  can't be there when it fires."
- *(assumption)* "If I let a 24/7 bot run it, what stops a bad signal
  from blowing the account?"
- *(assumption)* "Every other perps bot says 'AI agent.' They all
  sound the same. Which one *can't* break my rules?"
- *(assumption)* "If I had a system I trusted, I'd let it size for
  me. Right now I don't trust any of them."

### Does

- *(evidence)* Wrote the SPEC, the wedge verdict, the dimension map,
  and the treasury program. *Owns the problem.* (PM-LOG D1–D6.)
- *(assumption)* Pulls up charts on phone 5–10× per day for ~30
  seconds at a time, sees setup, runs out of time before executing.
- *(assumption)* Subscribed to 2–3 paid Telegram signal channels in
  the past 12 months. (assumption, untested.) Has copy-traded one of
  them manually, lost money, stopped.
- *(assumption)* Currently holds positions on Jupiter Perps and
  Drift manually with hard mental caps ("max $200, walk away if
  down 15%"). Caps not enforced by code — by willpower.
- *(assumption)* Wakes up to missed setups *more often* than to bad
  fills.

### Feels

| Pain (now) | Mirrored gain (desired after-state) |
|---|---|
| **Frustration** at setups visible but unreachable | **Joy** at setups taken on time, on plan |
| **Distrust** of every other 24/7 bot ("what stops a bad signal?") | **Trust** in a runtime that physically cannot break rules |
| **Anxiety** about an unattended bot oversizing while they sleep | **Anticipation** that the next DM = a *good* trade, never a leak |
| **(secondary) Sadness** at missed moves | **Surprise** at wins they didn't have to be there for |

> Pain-row anchor is Plutchik **distrust** (the cognitively-loaded
> sibling of fear). Mirrored gain is **trust** — the spec
> line *"I trade for you, and I cannot break your rules"* is the
> single sentence that delivers that shift.

---

## Persona B — "The Prop-Trading Firm Operator" (adjacent)

> Runs a 3–8-person desk on Solana. Has wallet-per-strategy
> bookkeeping on a spreadsheet. Two strategies already blew their
> cap last quarter because a junior left a strategy running over the
> weekend with no kill-switch. Looking for an auditable, on-chain
> way to express "this wallet may not exceed this cap on this venue
> in this slot window."
>
> *All quotes / behaviors below are assumption.* No interview
> conducted.

### Says

- *(assumption)* "I don't want an AI to trade. I want the *junior* to
  trade, and the *rules* to live somewhere I can audit."
- *(assumption)* "If a wallet is down 18% from peak, it should not
  be able to open a new position — full stop. Not 'a warning.' A
  refusal."
- *(assumption)* "Show me every decision on-chain. Approved or
  denied. With the rule inputs at the time."

### Thinks

- *(assumption)* "Compliance is going to ask for this in 12 months
  anyway."
- *(assumption)* "Off-chain rule engines are a soft target. Give me
  something signed."
- *(assumption)* "If the policy lives in the wallet's PDA, I can
  hand the same wallet to a junior and not worry."

### Does

- *(assumption)* Currently uses a Google Sheet + manual checks at
  end-of-day. Misses intraday breaches.
- *(assumption)* Tries a vendor's "risk engine" once; the vendor
  goes offline twice in a quarter; the desk goes back to the
  spreadsheet.
- *(assumption)* Audited once in 2025; the auditor asked for a
  per-trade decision trail with inputs; the desk produced a CSV
  hand-built by the founder. Painful.

### Feels

| Pain (now) | Mirrored gain (desired after-state) |
|---|---|
| **Distrust** of off-chain risk engines (vendor outage, junior error) | **Trust** in an on-chain policy that cannot be bypassed |
| **Anxiety** about weekends / after-hours | **Anticipation** that the kill-switch will fire before damage |
| **Disgust** at manual spreadsheet reconciliation | **Joy** at exporting an on-chain audit trail in 1 click |
| **(secondary) Anger** at a junior strategy that overshot | **Surprise** that a denied trade shows up *before* it would have hurt |

> Pain-row anchor is Plutchik **anxiety** (the chronic risk flavor
> of fear). Mirrored gain is **trust**, the same axis as Persona A,
> but earned differently: Persona A earns it via a single moving
> auto-skip; Persona B earns it via a kill-switch that actually
> fires.

---

## Synthesis

- **Both personas arrive at the same wedge** ("rules enforced at the
  signing layer") from different directions: Persona A wants *time*
  recovered; Persona B wants *blast radius* contained. The product
  serves both with the same primitive — the Anchor `treasury`
  `Policy` PDA — and surfaces them through two different
  primary control surfaces (TG DM vs dashboard audit).
- **The dominant pain emotion across personas is fear-family**
  (distrust, anxiety) with secondary frustration-family
  (frustration, disgust). The **mirrored gain is trust-family**
  (trust, anticipation), achieved through *demonstrable*
  constraints the user can feel happening — TG auto-skip, dashboard
  deny banner, on-chain `AuditEvent` for every decision.
- **The empathy-map rule from the skill holds**: we read pains from
  expressed feelings, not stated problems. The persona's words are
  about time and rules; their *feelings* are about trust and
  oversight. The product must deliver the feelings.

> Research-mode reminder: founder quotes are evidence; everything
> else above is assumption, queued for the Stage 5 tester pass on
> D10–D11.