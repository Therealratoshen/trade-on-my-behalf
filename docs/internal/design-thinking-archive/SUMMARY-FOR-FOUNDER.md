# Design Thinking — Consolidated Summary (for the founder)

> One-page read-down of the 5-stage design-thinking pass that
> landed at commit `d5e7ed8`. Source artifacts are linked.
> Generated after the founder asked for a single review.

---

## TL;DR (10 lines)

1. **We did the full 5-stage DT pass** in **assumption mode** (no live
   interviews; only the founder's own chat quotes are evidence).
2. **Two personas** — Persona A is the founder (you); Persona B is
   the prop-trading firm operator (same wedge, different angle).
3. **Six How-Might-We questions** advanced; **three chosen** that
   span the X, T, and X+T dimensions of the wedge.
4. **One idea ships** — the combined TG control plane (Anchor
   `Policy` PDA at signing + 60s TG DM with inline reason-code
   preview + `AuditEvent` on every decision).
5. **Pitch video script** is storyboarded slide-by-slide with the
   feeling-shift arc named per slide.
6. **Test plan** uses 3 outside-dev testers on D11, semantic-pair
   deltas (Trust / Joy / Anticipation), and explicit continue /
   iterate / kill rules.
7. **The riskiest assumption** is that the on-chain gate
   *demonstrably denies* in the demo — pre-staged with a rule
   that will deny in the 5-min window.
8. **The dominant pain emotion across both personas is fear-family**
   (distrust, anxiety); the **mirrored gain is trust-family** (trust,
   anticipation, surprise). The product must deliver the feeling,
   not argue the rule.
9. **Critical pivot**: you said *"I do not plan to sell like a
   trading bot at all."* That re-opens Stage 1. The empathy map
   should pivot from "build and sell a trading bot" to "build
   *myself a tool* and ship it as a public-good open-source
   project." See "Open question for founder" below.
10. 16 days remain (Oct 12 11:59pm PT). All 5 stages captured
    on disk; no source files touched.

---

## The five stage artifacts

| Stage | File | What it contains |
|---|---|---|
| **0 — Frame** | [`00-challenge-brief.md`](00-challenge-brief.md) | Goal, scope (=6 judging criteria), constraints (=16 days, solo, newcomer), success (=top-10 Solana track winner), research mode (=assumption). |
| **1 — Empathize** | [`01-empathy-map.md`](01-empathy-map.md) | Two personas, Says/Thinks/Does/Feels each. Founder quotes cited as evidence; everything else labeled assumption. |
| **2 — Define** | [`02-problem-statement.md`](02-problem-statement.md) | One Point-of-View problem statement per persona (2–4 sentences). 6 HMWs across both personas. Top-3 advanced to Stage 3. |
| **3 — Ideate** | [`03-ideation.md`](03-ideation.md) | 14 raw ideas clustered by HMW; 5 shortlisted across the DFV sweet spot; one shipped with 1-line DFV per criterion; the riskiest assumption named. |
| **4 — Prototype** | [`04-prototype.md`](04-prototype.md) | (a) Pitch video script, 9 slides, feeling-arc per slide. (b) ASCII wireframe of the TG DM "rule preview + 60s auto-skip" interaction. (c) Demo video's "the rules fired" passage. |
| **5 — Test** | [`05-test.md`](05-test.md) | Three outside-dev testers on D11; feeling-shift measurement via 7-point semantic pairs; continue/iterate/kill decision rule; iteration handoff to D12. |

---

## Headline answers to the questions you queued

You asked while the subagent was running:

### "What is the real problem statement?"
Persona A (founder) — Stage 2:

> *The founder needs a perps execution path that takes their
> personally-defined setups *only when they cannot be at the
> screen*, because they recognize good trades in seconds but lose
> hours to waiting and miss more setups than they catch — but
> currently every 24/7 bot they evaluate either oversizes on a bad
> signal, hides the decision off-chain, or asks them to keep
> watching.*

The gap is **not signal quality** — it is **trust in the
constraint envelope**. The pain is that existing bots optimize
for uptime, not for *my rules*.

Persona B (prop firm) — Stage 2:

> *The prop-trading operator needs a per-strategy wallet that
> refuses to act outside pre-declared on-chain rules, because a
> single unmonitored oversize has already wiped out a strategy
> twice and the auditor is asking for a per-trade decision trail —
> but currently the rules live in a spreadsheet that cannot refuse
> a trade and an off-chain risk engine that has gone offline
> twice.*

### "Who is the target market and why do people use it?"

**Two primary personas, one primitive.** Both arrive at the same
wedge ("rules enforced at the signing layer") from different
directions:

- **Persona A — time-poor retail trader** — wants *time* recovered.
  Has the pattern recognition; cannot physically watch.
- **Persona B — prop-trading firm operator** — wants *blast
  radius* contained. Per-strategy wallet with hard caps.

The same Anchor `Policy` PDA serves both. The TG-DM control surface
targets Persona A; the dashboard audit trail targets Persona B. One
kernel, two surfaces.

### "Why do people want to trade? What's the objective? How do they feel?"

This is *Stage 1* content. From the empathy map:

- **Why trade?** to capture setups the founder has already
  recognized in seconds.
- **Why *not* trade now?** because being at the screen 24/7 is
  impossible without losing the job that pays for the wallet.
- **Objective:** *take the trades they already see* — execution,
  not signal discovery.
- **Before-feelings (Plutchik):** Frustration (setups taken late
  → missed), Distrust (any 24/7 bot could oversize), Anxiety
  (what runs while they sleep).
- **After-feelings (mirrored gains):** Joy (setups taken on
  plan), Trust (the runtime *cannot* break rules),
  Anticipation (the next DM = good trade, not a leak).

The wedge is the *after-feeling*. Product feature names are
secondary; "feels trust" is the product.

### "Why is this important?"

Because the after-feeling (Trust, Joy, Anticipation) is currently
un-shippable in the corpus. The dimension map confirms it:
**0 projects** in any combination of Perps + AI agent + on-chain
policy gate + TG chat + end-user product. The corpus has 11 perps
venues, 14 AI agents, 7 TG bots, 2 spend caps — none combined.

### "Be critical during BRD session"

What I'd push back on if I were a real BRD reviewer:

1. **The TG DM control surface assumes the user has TG open.**
   Persona A's "I don't want a dashboard, I want a Telegram
   ping" is assumption-tested — what if 30% of the *actual*
   target market uses Signal or iMessage? Should be tested on D11.
2. **The 60-second TTL is also assumption.** What about trades
   that should *wait* for the user to think? Auto-skip on
   timeout may flip Joy → Anxiety.
3. **The "physically cannot break your rules" promise is strong
   but adds an integration ceiling.** Composability with
   third-party venues is only as good as their willingness to
   call our program. If Jupiter Perps doesn't CPI us, we wrap.
   Plan B (CPI wrapper) must exist before D14.
4. **Performance-fee pricing requires per-fill measurement of
   PnL**, which we don't have a clean primitive for yet. v1
   pitch assumes it works; v2 spec needs to actually implement
   it.
5. **The R6 risk (user-test showstopper)** is non-trivial.
   What's the rollback plan if Tester 1's "I oversize once and
   I'm out forever" feeling remains *after* seeing the gate
   fire? The pitch depends on that feeling shifting, not just
   on the gate existing.

### "What are the pain points or missing studs?"

Already captured in [`docs/research/dimension-map.md`](../docs/research/dimension-map.md),
but the design-thinking pass adds:

- **Pain point we have *no* answer for** — the founder's
  *"I will oversize once and I'm out forever"* (assumption in
  Persona A's Says). The on-chain gate helps *post-hoc* but
  doesn't address the *pre-hoc* fear that "once is enough."
  Mitigation: the kill-switch on drawdown (Stud 6 in the
  earlier list).
- **Pain point we made worse** — if the 60s auto-skip fires on
  a high-conviction setup the founder *does* want to take but
  couldn't reach the phone for, the next DM becomes
  Anxiety-driven, not Joy-driven. Mitigation: the
  inline reason-code preview *reduces* this, but does not
  eliminate it.

### "Tell me similar plans" / "Why are people doing the same stuff?"

Covered in the dimension map — 33 prior projects scored on 5
wedge dimensions. Most cluster on 1 dimension only. The wedge is
empty because the on-chain policy gate is the hard one, and only
`mercantill` (vendor-policy, not perps), `pieverse` (compliance
receipts, not gating) have tried.

### "I do not plan to sell it like a trading bot at all."

**Open question for founder**. This contradicts Stage 1's
hypothesis that the founder is also a vendor to other time-poor
retail traders. If you're not selling, then the product either:

(a) **becomes a personal tool you ship as open-source public
good** — drops the entire performance-fee frame; reframes GTM
to "open-source infra I use myself, others can use too." This
shifts the 6-criteria scoring: Business Plan criterion falls,
but Open-source criterion rises. v2 monetization comes from
consulting, partnerships, or a hosted version.

(b) **becomes a B2B prop-trading firm product** — focuses on
Persona B (the operator) instead of Persona A (the retail
trader). Different wedge: per-strategy wallet hardening, not
consumer UX. Different pricing: SaaS for firms, not fee-on-PnL
for retail.

(c) **becomes a slow-and-deep B2C product launched post-hackathon**
— use the hackathon to win polish/credibility, then build the
consumer business on the side. Performance-fee is fine, just
not your primary activity.

Each is a real product. (a) and (c) preserve the current SPEC;
(b) requires a Stage-2 re-run.

---

## Open question for the founder

**What changes if you do not plan to sell the trading bot?**

If yes (you do plan to ship it as public-good open-source):
- GTM §"Pricing" should pivot from performance-fee to "free to
  use, donations optional."
- The 6-criteria scoring shifts: Functionality and Open-source
  dominate; Business Plan becomes about ecosystem contribution.
- Persona B disappears; the only persona is time-poor retail.
- The demo script in `04-prototype.md` is unaffected — the
  product is the same.

If no (you may sell it):
- GTM §"Pricing" stays as written.
- Pitch script stays as written.
- Run D11 as planned.

This is the founder call. State it; I will re-run Stage 2 if
needed (low cost; high alignment).

---

## Cross-references

- **Why this works on the judges' criteria** → [`SPEC.md`](../SPEC.md)
  §"Tech stack" + `04-prototype.md` Slide 7 — both deliver the
  wedge one-liner.
- **Why this is a real gap** → [`../docs/research/dimension-map.md`](../docs/research/dimension-map.md).
- **Why performance-fee is the v1 price** → [`../GTM.md`](../GTM.md) §"Pricing model (evidence-led)".
- **Why TG DM is the control surface** → [`../docs/control-surface.md`](../docs/control-surface.md).
- **Why the on-chain gate is the kernel** → [`../docs/onchain-program.md`](../docs/onchain-program.md).

---

**Commit:** `d5e7ed8 — D6' Design Thinking: assumption-mode 5-stage pass for Trade On My Behalf`.
**Total artifact:** 900 lines across 7 markdown files; no source code touched.
**Next action:** founder answers the open question above; if "yes I'm not selling" ⇒ re-run Stage 2 (cheap; ~30 min). Otherwise, D7 resume.
