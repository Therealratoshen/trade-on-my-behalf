# Pitch script — 8 slides

> Founder voice. ≤40 words per slide. Total ~2 min 30 sec.
> Recorded D13 (2026-10-04). Unlisted YouTube.
>
> **v1 control surface = webapp, not Telegram.** See
> `docs/control-surface.md` for the full design.

---

**Slide 1 — "Trade On My Behalf."**

> Software that watches the market for me, executes trades I would have
> taken, and physically cannot break the rules I set. Built on Solana.
> Built for the Crypto World's Fair Hackathon 2026.

(34 words)

---

**Slide 2 — "I have a setup. I want it to run."**

> I'm a retail trader. Crypto since 2021. I held SOL through both
> cycles. I have a setup — RSI dip below 30 + 1h trend up, long
> with 3x. I can't sit in front of charts because I run a non-crypto
> job. The setup's gone before I get there.

(46 words)

---

**Slide 3 — "I tried two AI bots last year."**

> Both oversize'd. They traded things I never would. I lost $340
> total before I stopped. The bots ran on servers I didn't control,
> with API keys I gave them. Mental caps didn't work either —
> willpower isn't a rule. AI can't replace my research. What I
> needed was discipline.

(43 words)

---

**Slide 4 — "The kernel enforces. The skill decides. The runtime samples."**

> Three layers. The skill is my setup — RSI dip, trend, my rules.
> The runtime samples the market and feeds it to the skill. The
> kernel enforces my algorithm — max leverage, daily loss cap,
> drawdown kill. If a trade would break a rule, the kernel refuses.
> No approve button. The rule fires anyway.

(50 words — trim "RSI dip, trend, my rules" if pressed)

---

**Slide 5 — "The rules are code. Not willpower."**

> Anchor `treasury` policy program. Per-trade size cap. Per-day loss
> cap. Leverage cap. Drawdown kill-switch. Every decision — approve
> or deny — emits an `AuditEvent` on-chain. The webapp shows every
> decision, with the rule inputs and the slot number.

(43 words)

---

**Slide 6 — "The rule fired while I slept."**

> Demo: a trade proposed at 5x leverage. My cap is 1x. The on-chain
> gate denied it. `AuditEvent { approved: false, reason_code: 6,
> slot: 312_450_922 }` lands in the webapp's audit log. I never
> tapped anything. The rule, not my willpower, made the call.

(46 words)

---

**Slide 7 — "Same kernel, three buyers."**

> The retail trader I'm building for. The prop-firm operator who
> wants per-strategy wallets (Propr / HyroTrader / Solana Funded /
> DojiFunded already ship the firm-level version — we ship the per-
> trader version). The influencer-signal follower with a per-follower
> cap. One Anchor program, three personas.

(46 words)

---

**Slide 8 — "I built this because I needed it."**

> If you trade and can't watch charts, the wedge is yours. If you're
> a prop firm tired of spreadsheets, the kernel is yours. Submit by
> Oct 12. Demo at `scripts/devnet-demo.sh`. Pitch by Filbert.

(38 words)

---

## Read-through notes

- **Slide 4** is the new centerpiece. The line *"No approve button.
  The rule fires anyway"* is the sharpest version of the wedge.
  Don't soften it.
- **Slide 6** references the **webapp**, not Telegram. The demo
  flow: CLI pushes an over-leveraged intent → kernel denies →
  AuditEvent emits → webapp lights up with the red row.
- **Slide 7** keeps Propr / HyroTrader / Solana Funded /
  DojiFunded. Don't drop these — they're proof the prop-firm
  wedge is real, and judges verify names.
- **Slide 8** is the close. Short. Concrete. Submit date.

## What this script is NOT

- No framework names (no "feeling arc", no "Plutchik", no "HMW").
- No Telegram (cut to v3).
- No "validation against external sources" sidebar.
- No persona labels (no "Persona A / B / C" headers).

If a slide starts feeling like workshop output, rewrite it from
the founder's chat quotes.
