# Design thinking — five stages

> **Honest disclosure first.** I never saw the Apple Design Thinking
> Batch 3 board. I cannot read live Miro canvases through fetch,
> API, or screenshot. This document applies the publicly-known Stanford
> d.school / Apple Design Thinking framework to the **project's real
> state** — founder chat quotes, named competitors, the actual Anchor
> program, the cut list. Nothing here is from the Miro board; if
> you read something on that board that contradicts what's below, the
> board wins. Edit this file with the delta.
>
> Saved D8.5 + (2026-09-26 23:30 WIB) after you said "do it as good
> as you can" with the board still unreadable.

---

## 1. Empathize — who actually has this pain

### Founder persona (me)

I'm a retail trader. Crypto since 2021. Held SOL through both
cycles. I see setups in seconds — RSI dipping, trend breaking,
news-driven move. I can't sit in front of charts because I run a
non-crypto job. The setup is gone before I get there.

Two real quotes from my chat history:

> "i do not have time to do trading if the action or trend or so
> called the movement can be predictable and i should trade it but
> i do not have time to review and keep on viewing it at all"

> "what i really want to have is the perpetual agent to trade for
> me"

What I tried before, that didn't work:

- Two TG signal bots in 2025. Both oversize'd. I lost $340 total
  before I stopped. The bots ran on servers I didn't control.
- Copy-trading one paid signal channel manually for a month. Got
  faked out. The signals called 5x leverage on a $50 position I
  should never have been in. Stopped.
- Mental caps on my own positions. Hard to enforce at 11pm when
  I see a setup and want to size up. Willpower is not a rule.

### Prop-firm operator persona

3-8 person desk. Wallet-per-strategy on a spreadsheet. Two
strategies blew their cap last quarter because a junior left a
strategy running over the weekend with no kill-switch.

**Validated against real firms (web search, Sep 2026):**

- **Propr.xyz** — Hyperliquid, 80% split, payouts + drawdown
  rulebook on-chain.
- **HyroTrader** — *"first crypto prop firm whose payouts can be
  independently confirmed on the blockchain"* (Solana, Fireblocks
  custody).
- **Solana Funded** — DEX aggregator-based, on-chain payouts.
- **DojiFunded** — GMX + Ostium, smart-contract risk enforcement.

All four pin the **firm's** rulebook on-chain. None of them give
each **trader** a programmable wallet with hard caps. That's the
wedge for this persona.

### Influencer-signal follower persona

Retail trader following 2-4 paid TG channels. Burned by a "5x
leverage" signal that over-rode the mental cap they thought they
were keeping. Wants copy-trading with hard caps — *"follow this
trader up to $500/day, kill if drawdown > 20%."*

Existing copy-trading bots either give the influencer total custody
or no cap at all. The wedge: clamp the influencer's intent to a
per-follower cap, daily-loss cap, and drawdown kill-switch — on
the *follower's* wallet.

---

## 2. Define — the problem in one sentence

> *The retail trader I am needs software that watches the market
> for me, executes trades I would have taken, and physically cannot
> break the rules I set. The rules live at the wallet's signing
> layer, not in a vendor's server. If a trade would break a rule,
> the Anchor program refuses to sign — regardless of what the
> signal source, the runtime, or a compromised dependency tried to
> do.*

The wedge in one line: **"I trade for you, and I cannot break
your rules."**

The same kernel serves three personas from one primitive — the
Anchor `Policy` PDA:

| Persona | What they get |
|---|---|
| Founder (me) | Personal time recovered. Rules enforced without willpower. |
| Prop-firm operator | Per-strategy wallet with hard caps, distinct from Propr's firm-level rulebook. |
| Influencer-signal follower | Per-follower cap on the influencer's intent. |

---

## 3. Ideate — what we're shipping

### What's already built (D1-D8)

- Anchor `treasury` program at 209KB. Compiles. 6/6 LiteSVM tests
  passing.
- 4 instructions: `create_policy`, `authorize_spend`,
  `update_policy`, `record_pnl`.
- On-chain enforcement today: vendor whitelist, per-tx cap,
  per-day cap, TTL, leverage cap, drawdown kill-switch (via
  monotonic `peak_equity_usdc` watermark + runtime-reported
  `implied_current_equity_usdc`).
- `AuditEvent` emitted on every decision (approve or deny).

### What's shipping D9-D17

The kernel + one venue (Jupiter Perps) + the webapp + one CLI demo.
That's it.

### What's cut from v1 (real decisions, not "stretch")

| Cut | Why |
|---|---|
| Drift adapter | v2 — one venue is enough for the demo |
| Zeta adapter | v2 — never was v1 |
| Telegram bot | **v3, never** — superseded by webapp |
| Webapp | **v1** — *primary control surface* (was "dashboard v2") |
| Phantom Connect | **v1** — back in for webapp wallet auth |
| ~~AgentBazaar MCP~~ | dropped v1, moved to v3 "specialist skill marketplace" (defer; no demand yet) — see `docs/skills-and-algorithms.md` |
| LTC bridge | already cut D3' |

Why this cut list: 13 days, solo founder. The kernel + one venue +
the webapp + one CLI demo is the minimum credible v1.

### Two risks tied for first place

1. **The on-chain gate must demonstrably deny in the demo.** If
   the "rules just fired" scene is mocked or hand-waved, judges
   down-score Technical + Novelty both. Mitigation: the demo
   pre-stages a rule that *will* deny (e.g. `maxLeverage: 1`,
   trade proposed at 5x), so the `AuditEvent` lands in the webapp's
   audit log in real time.

2. **The webapp must show audit events within ~2 s of a runtime
   push.** If the SWR refresh is too slow or the indexer drops
   events, the demo loses its punch. Mitigation: D11 testers
   verify the "rule fires" demo shows the red row in the webapp
   without manual refresh. If the latency is too high, tune the
   SWR interval or switch from polling to a websocket.

---

## 4. Prototype — what judges will see

### The demo (≤3 min)

A rule that demonstrably denies. The runtime pushes an intent that
would breach `maxLeverage: 1`. The kernel denies it. The on-chain
`AuditEvent` emits. The webapp's audit-log panel lights up with the
red row: `approved: false, reason_code: 12, slot: <real slot>`.
Within two seconds. Without the founder touching anything.

That's the wedge. The rule fired whether the founder was watching
or not. The webapp just shows the receipts.

### The pitch (8 slides, ≤40 words each)

Full script at `design-thinking/pitch-script.md`. Slide titles:

1. "Trade On My Behalf."
2. "I'm the user."
3. "I tried two TG bots last year."
4. "The kernel decides. The webapp shows you what it decided."
5. "The rules are code. Not willpower."
6. "The rule fired while I slept."
7. "Same kernel, three buyers."
8. "I built this because I needed it."

Slide 7 name-drops Propr / HyroTrader / Solana Funded /
DojiFunded — they're proof the prop-firm wedge is real, and
judges verify these names.

The control surface (slide 4, slide 6) is **webapp**, not Telegram.
See `docs/control-surface.md` for the full webapp design.

---

## 5. Test — what we're measuring on D11

Three outside-dev testers. Each runs a 5-line rubric (`docs/user-tests.md`):

| Field | Value |
|---|---|
| Tester | (name + background, 1 line) |
| Rule | `maxLeverage`: __ bps · `maxPositionUsd`: $__ · `maxDailyLossUsd`: $__ · `killSwitchDrawdownPct`: __% |
| Trade | side: long/short · market: __ · sizeUsd: $__ · lev: __x |
| Outcome | approved / denied / timeout · reason code: __ |
| Observed | slot: __ · tx sig: __ · `approved`: __ · `reason_code`: __ |
| Reaction | (1 sentence — what surprised them) |

### The three things that MUST happen

If any of these doesn't happen, the kernel isn't enforcing and
the demo isn't ready:

1. **Tester 1's over-leveraged trade MUST deny.** Reason code
   expected: 6 (REASON_LEVERAGE_CAP). If approved, that's a bug.
2. **Tester 2's off-whitelist venue trade MUST deny.** Reason code
   expected: 1 (REASON_VENDOR_DENIED).
3. **Tester 3's repeated losses MUST trip the kill-switch**, and
   the next trade MUST deny. Reason code expected: 7
   (REASON_DRAWDOWN_KILLSWITCH).

### Behavioral signals (not measured, just observed)

- Would the tester re-open the dashboard within 24h unprompted?
- Would they tell a friend about it in 24h?
- Did they abandon a workaround (e.g. close a manual position
  they had open)?

A "deny fires in the demo" + "tester visibly relieved" is the
crystallizing moment. A "deny fires" + "tester shrugs" is not.

---

## Date stamp + audit trail

Generated 2026-09-26 23:30 WIB.

Prior design-thinking pass (the framework-style files) archived at
`docs/internal/design-thinking-archive/` for audit. The original
founder-voice README is at `design-thinking/README.md`. This file
is the consolidated 5-stage work for D11 onward.

The Miro board ("[Apple] Design Thinking Batch 3 - 2") was never
readable to me. The honest disclosure at the top of this file
is the audit trail for that gap.

If you read the board and find a delta, edit this file with the
delta. The board wins.

— Filbert
