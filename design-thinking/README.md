# Why I'm building this

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
taken, and physically cannot break the rules I set. The rules live at
the wallet's signing layer, not in a vendor's server. If a trade would
break a rule, the Anchor program refuses to sign — regardless of what
the signal source, the runtime, or a compromised dependency tried to
do.

That's the wedge in one sentence: **I trade for you, and I cannot
break your rules.**

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

A rule that demonstrably denies. The runtime pushes an intent that
would breach `maxLeverage: 1`. The kernel denies it. The `AuditEvent`
emits on-chain. The webapp's audit-log panel lights up with the red
row: `approved: false, reason_code: 12, slot: <real slot number>`.
Within two seconds. Without me touching anything.

That's the wedge. The rule fires whether I'm watching or not. The
webapp just shows the receipts.

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
push. If the SWR refresh interval is too slow or the indexer drops
events, the demo loses its punch. Test on D11 that the
"rule fires" demo actually shows the red row in the webapp
without manual refresh.

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

Trust. The on-chain gate is real. The rules are enforced. The wedge
line is true.

Not "this is another AI agent." Not "another webapp." The wedge is
the kernel, not the surface, and the kernel is *for* specialists
who already have a setup — see `docs/skills-and-algorithms.md`.

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
