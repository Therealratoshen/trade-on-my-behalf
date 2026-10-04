# Why I'm building this

## Current product direction — 2026-10-03

Preserve the founder's original problem and quotes below as qualitative context. Current scope is the [devnet perps terminal](../PRD.md): wallet, selected market chart, trade preview, risk policy and truthful position/receipt states. The existing implementation is a policy viewer/editor with paper positions; chart/ticket and real devnet venue execution are not built.

[Three outside-developer sessions](../docs/user-tests.md) are NOT RUN; reactions and latency are not collected. Earlier judge/demo/recording expectations below are planning history, not observations. Use the [current pitch script](pitch-script.md) and [submission evidence ledger](../SUBMISSION.md).

---

## Retained historical draft/log — superseded where inconsistent

> Founder voice. Not a framework. Not a workshop output. Just why I'm
> doing this and what I'm shipping.

---

## The founder

Retail trader. Crypto since 2021. Held SOL through both cycles. I
recognize setups in seconds — RSI dipping, trend breaking, news-driven
move. I cannot sit in front of charts because I run a non-crypto job.
The setup is gone before I get there, or worse, I miss the window and
end up chasing.

## My two real quotes

> "i do not have time to do trading if the action or trend or so called
> the movement can be predictable and i should trade it but i do not
> have time to review and keep on viewing it at all"

> "what i really want to have is the perpetual agent to trade for me"

## What I tried before, that didn't work

- Two Telegram signal bots in 2025. Both oversize'd. I lost $340 total
  before I stopped. The bots ran on servers I didn't control, with keys
  I gave them.
- Copy-trading one paid signal channel manually for a month. Got faked
  out. The signals called 5x leverage on a $50 position I should never
  have been in. Stopped.
- Mental caps on my own positions. Hard to enforce at 11pm when I see
  a setup and want to size up. Willpower is not a rule.

## What I want

Software that watches the market for me, executes trades I would have
taken, and physically cannot break the rules I set.

> **Correction (2026-10-04).** This paragraph originally said the rules
> live "at the wallet's signing layer," and that the Anchor program
> "refuses to sign — regardless of what the signal source, the
> runtime, or a compromised dependency tried to do." **That is not
> what I built, and I'm not claiming it.** The program holds no keys,
> custodies nothing, and signs nothing. I checked the source: there is
> no `invoke`, no `invoke_signed`, no transfer anywhere in it. It
> cannot touch my money because it never has a way to.
>
> What is true, and what I will actually defend: the caps live on
> chain and only I can change them, so nobody — not the signal, not a
> vendor, not a dependency — can quietly raise my limits without me
> approving it. And every call, approved or denied, leaves a receipt
> with a real slot number that neither side can edit afterwards.
>
> The honest version of my one-liner: **"I trade for you, and every
> decision — including the ones that stop me — is a public record I
> cannot edit."** The version I wanted to say, "and I cannot break
> your rules," is a promise about *enforcement*. Enforcement is the
> thing I have not built yet. An authorisation I record is not a
> boundary I enforce.

That's the wedge, as far as it is honestly true today. **What this is
not:** a boundary between my rules and a determined caller. Anyone
holding a key can still trade at a venue without ever asking the
program. The gate is a leash I can see, not one that holds. Closing
that gap is the whole point of the next build — see
[architecture](../docs/architecture.md#what-the-gate-does-and-does-not-do).

## Who else this is for

**Prop-firm operators.** Per-strategy wallet with hard caps. Not the
firm-level rulebooks that Propr / HyroTrader / Solana Funded /
DojiFunded already ship — they pin the *firm's* rules in a contract.
We let each *trader* pin their own rules in their own wallet.

**Influencer-signal followers.** Per-follower cap on the influencer's
intent. The follower sets $500/day and 15% drawdown kill. The
influencer's signal gets clamped before it ever moves the follower's
money.

## What this is not

- Not a competitor to Jupiter Perps, Drift, Infty.trade, Phoenix, or
  any of the 323 projects in the v1-c9 cluster. We route through them.
- Not a custodian. The Anchor program is a gate, not a wallet that
  holds funds.
- Not an AI signal generator (yet). v1 routes human/strategy signals
  through the agent. LLM signals are v2.

## What judges will see in the demo

A rule that demonstrably denies. I run a command that pushes an intent
that would breach `max_leverage_bps: 100` (1x) with `--raw`, at 5x.
The kernel denies it. The `AuditEvent` emits on-chain. The webapp's
audit-log panel lights up with the red row: `approved: false,
reason_code: 6, slot: <real slot number>`. That is a poll every 2 s,
not a push.

> **Correction (2026-10-04), three things.** The original text here
> said this happened "Without me touching anything" and called it "the
> wedge." I want to be precise, because this is the exact place I
> oversold myself:
>
> 1. **I do touch it.** There is no scheduler and no sampler in the
>    code. Nothing runs unless I type a command. That was the plan —
>    the sampler is real work I have not done. The receipt is real; the
>    autonomy is not.
> 2. **The reason code is 6, not 12.** `reason_code: 12` never existed.
>    Codes run 0–7 (`REASON_LEVERAGE_CAP` = 6 is the red row for a
>    leverage denial). I had written a number I had not checked.
> 3. **"That is the wedge" was the wrong sentence.** What this
>    demonstrates is that a *correct, current, on-chain policy* makes
>    a breach visible and unfalsifiable. It does not demonstrate that a
>    breach is *impossible* — the same rogue process that pushed the
>    denied trade could have gone straight to the venue, and the program
>    would not have known or stopped it. The gate is not on the path of
>    the money. It is next to it, taking notes.
>
> What I actually think is the wedge: I own the caps, the caps live on
> chain, and nobody can quietly move them. Everything past that is
> work in progress, and I would rather show a judge a smaller true
> thing than a bigger one I have to walk back.

## Three outside-dev testers, D11

- **Tester 1 — Solana-native dev.** First time seeing the code. Has
  run a Jupiter Perps position manually. Configures a 3x leverage cap
  and a $60 daily loss cap. Tests both the approve path and a
  deliberately-over-leveraged trade that must deny.
- **Tester 2 — Cross-venue trader.** Has used Drift before. Configures
  two venues. Trades one on each. Watches for a venue-whitelist denial.
- **Tester 3 — Kill-switch stress.** Repeated small losses to trip
  drawdown. Tests the `/kill` flow when the kill-switch fires.

Their fills get appended to `docs/user-tests.md` verbatim — no editing,
real names where they're willing.

## One risk I'm watching

The webapp UX must show audit events within ~2 s of a runtime
push. The audit panel polls RPC every 2 s (`AUDIT_POLL_MS = 2_000` in
`apps/dashboard/components/Dashboard.tsx`); there is no push channel,
no websocket and no Helius DAS audit indexer behind it. If the poll is
too slow the demo loses its punch. Test on D11 that the "rule fires"
demo actually shows the red row in the webapp without a manual
refresh. If the latency is too high, lowering the poll interval is the
only current lever.

## What I'm cutting from v1

Cut list. Each item is a real decision, not a "stretch":

- Drift adapter (v2)
- Zeta adapter (v2)
- **Telegram bot (v3, never)** — superseded by webapp
- Webapp IS the v1 control surface (was "dashboard v2")
- Phantom Connect (v1 — back in for webapp wallet auth)
- ~~AgentBazaar MCP~~ — dropped v1, moved to v3 "specialist skill marketplace" (defer; no demand yet)
- LTC bridge (already cut at D3')

The kernel + one venue (Jupiter Perps) + the webapp + one CLI
demo. That's the v1.

## What I want judges to feel

Trust. The on-chain policy is real and only I can change it. Every
decision, including the denials, is a receipt I cannot edit. The
kernel is the wedge, not the surface, and the kernel is *for*
specialists who already have a setup — see
`docs/skills-and-algorithms.md`.

What I will not claim, because I have not built it: that the rules stop
me. They are checked and recorded, not enforced. The gap is not a
detail — it is the next build, and the corrections above are how I
want to talk about it.

---

## Date stamp + audit trail

This README is the single source of truth for the design rationale as
of D8.5+ (2026-09-27 14:51 WIB). Pivot to **webapp-first control
surface** captured at the same commit — Telegram bot cut to v3,
Phantom Connect back in for v1.

The prior assumption-mode pass (`docs/internal/design-thinking-archive/`)
is preserved as the audit trail of how the thinking evolved. None of
those files are public; they were framework-driven and read like
workshop output. This file replaces them with founder voice.

If D11 testers surface something that contradicts what's here, the
tester finding wins and this file gets a `D11 delta` section appended.

— Filbert
