# Design thinking — five stages

## Current design checkpoint — 2026-10-03

This is a design process, not completed user research. The founder's source statements remain context; no new external empathy interviews or usability sessions were conducted.

The current problem definition and target are in [PRD](../PRD.md). Proposed prototype: one SOL-PERP terminal with explicit wallet/agent/account, source-labelled chart, preview, policy verdict, order lifecycle and scoped positions. **Update 2026-10-04:** a price chart (`MarketChart.tsx`, spot-only — one observation per fetch, no invented OHLC history) and a trade ticket (`TradeTicket.tsx`) now exist in the dashboard, so "chart/ticket missing" is no longer accurate. Still not built: real venue execution — the fill is paper. Static UX review found shared paper data, separate-owner/agent lookup, stale-data and uncertain-transaction states that must be resolved.

Use [control-surface requirements](../docs/control-surface.md), [design system](../docs/design-system.md) and [E2E cases](../docs/e2e-testing.md). Three human sessions are NOT RUN; previous five-stage plans below are historical drafts, not validated outcomes.

---

## Retained historical draft/log — superseded where inconsistent

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

- 3-8 person desk. Wallet-per-strategy on a spreadsheet. Two
  strategies blew their cap last quarter because a junior left a
  strategy running over the weekend with no kill-switch. *(Founder
  scenario, not a measured finding — no operator has been
  interviewed.)*

**Competitors named in a web search, Sep 2026 — not re-verified
since, and not corroborated anywhere in `docs/research/`:**

- **Propr.xyz** — Hyperliquid, 80% split, payouts + drawdown
  rulebook on-chain.
- **HyroTrader** — *"first crypto prop firm whose payouts can be
  independently confirmed on the blockchain"* (Solana, Fireblocks
  custody).
- **Solana Funded** — DEX aggregator-based, on-chain payouts.
- **DojiFunded** — GMX + Ostium, smart-contract risk enforcement.

All four reportedly pin the **firm's** rulebook on-chain. On
that reading none of them gives each **trader** a programmable
policy PDA of their own — which is the wedge for this persona.
The specific product details above are from a single Sep 2026
search and are not sourced in this repo; re-check them before
saying any of the four out loud to a judge.

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
>
> **Corrected (2026-10-04).** The paragraph above is what the pitch
> used to say, and it is the strongest sentence in this file, which
> is exactly why it is the one that had to go. I checked the source
> before writing this: `programs/treasury/programs/treasury/src/` has
> no `invoke`, no `invoke_signed`, no `system_program::transfer`. The
> program holds no keys, custodies nothing, and signs nothing — so it
> does not "refuse to sign", it never signs. `authorize_spend` runs
> the check ladder, emits an `AuditEvent` and returns `Ok(())`; the
> paper fill happens afterwards, off-chain, in a different process.
> The gate is next to the money, taking notes — it is not on the path
> of the money.
>
> Two halves of that sentence were true and one was false. **These
> survive and I will defend them out loud:** the caps live on chain
> and only the owner can change them, so nobody — not the signal
> source, not the runtime, not a compromised dependency — can quietly
> widen my limits without my approving it; and every authorisation,
> approved or denied, leaves an `AuditEvent` with a committed slot
> that neither side can edit afterwards. **This half was false:** that
> a breach is *impossible*. It is not. The same rogue process that
> pushed the denied trade could have gone straight to the venue, and
> the program would neither have known nor stopped it. A denial is
> recorded, not prevented.
>
> The honest one-liner, and the one to say out loud: **"I trade for
> you, and every decision — including the ones that stop me — is a
> public record I cannot edit."** "I cannot break your rules" is a
> promise about *enforcement*, and enforcement is the next build, not
> this one. An authorisation I record is not a boundary I enforce. See
> [architecture](../docs/architecture.md#what-the-gate-does-and-does-not-do).

The wedge in one line: **"I trade for you, and every decision —
including the ones that stop me — is a public record I cannot edit."**
*(Superseded 2026-10-04: "I trade for you, and I cannot break your
rules." That version is stronger, and the original is not true against
the code. The replacement is the one that survives a judge who opens
the program.)*

The same kernel serves three personas from one primitive — the
Anchor `Policy` PDA. Read "cap" below as *a cap the owner holds and
every decision against is recorded against* — the honest reading of
the corrected wedge above, not a boundary the kernel enforces:

| Persona | What they get |
|---|---|
| Founder (me) | Personal time recovered. Rules checked and logged without willpower. |
| Prop-firm operator | Per-strategy on-chain policy with owner-set caps, distinct from Propr's firm-level rulebook. |
| Influencer-signal follower | Per-follower cap recorded against the influencer's intent. |

---

## 3. Ideate — what we're shipping

### What's already built (D1-D8)

- Anchor `treasury` program. Compiles. Size measured off the built
  `treasury.so` on 2026-10-04: 224,392 bytes (~219KB); the "209KB"
  this line used to carry was a 2026-09-26 measurement, stale since
  the D9 argument validation was added. The program test file has 20
  cases; 31 SDK and 37 agent unit tests alongside it, 88 total.
  (Counts re-verified 2026-10-04: the devnet genesis-hash guard added
  `packages/sdk/tests/registration.test.ts` 15 cases, and the slot-vs-
  wall-clock fix added `packages/agent/tests/policyState.test.ts` 16.)
  The SDK and agent suites are pure offline unit tests
  (`node --test`) and need no validator. The program suite does:
  `tests/treasury.ts` calls `anchor.AnchorProvider.env()` and reads
  `anchor.workspace`, so it needs a real cluster. The committed
  `programs/treasury/Anchor.toml` says `cluster = "devnet"`, so run
  it as `anchor test --provider.cluster localnet` from
  `programs/treasury/` — plain `anchor test` attempts a devnet
  deploy. There is no LiteSVM or Surfpool harness in the repo, so
  there is no in-process alternative to that. `.github/workflows/ci.yml`
  does run all three suites (a `solana-test-validator` with the program
  preloaded for the program tests), so the number is enforced on
  every push. The last *local* run is a historical report, not a
  current green.
- 4 instructions: `create_policy`, `authorize_spend`,
  `update_policy`, `record_pnl`.
- On-chain *checks* today: vendor whitelist, per-tx cap,
  per-day cap, TTL, leverage cap, drawdown kill-switch (via
  monotonic `peak_equity_usdc` watermark + runtime-reported
  `implied_current_equity_usdc`). These produce a recorded
  verdict, not a blocked trade — see §2. "Checks", not
  "enforcement": the program makes no CPI to the venue.
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

1. **The on-chain decision must demonstrably deny in the demo.**
   If the "rules just fired" scene is mocked or hand-waved, judges
   down-score Technical + Novelty both. Mitigation: the demo
   pre-stages a rule that *will* deny (`max_leverage_bps: 100`,
   trade proposed at 5x via `--raw`), so the `AuditEvent` lands in
   the webapp's audit log. Say "the kernel returned a denial",
   not "the trade was blocked" — see §2.

2. **The webapp must show audit events within ~2 s.** The panel
   polls RPC every 2 s (`AUDIT_POLL_MS = 2_000` in
   `components/Dashboard.tsx`); there is no push channel, no
   websocket and no Helius DAS audit indexer behind it. If the
   poll is too slow the demo loses its punch. Mitigation: D11
   testers verify the "rule fires" demo shows the red row in the
   webapp without a manual refresh. If the latency is too high,
   lowering the poll interval is the only current lever.

---

## 4. Prototype — what judges will see

### The demo (≤3 min)

A rule that demonstrably denies. The runtime pushes an intent that
would breach `max_leverage_bps: 100` (1x) with `--raw`, at 5x. The
kernel denies it. The on-chain `AuditEvent` emits. The webapp's
audit-log panel lights up with the red row: `approved: false,
reason_code: 6, slot: <real slot>`. Within two seconds — the panel
polls RPC on a 2 s interval, so that is a poll, not a push.

I am at the keyboard for this, and I want to be exact about why.
There is no scheduler and no sampler in the code. Nothing runs
unless I type a command. The receipt is real; the autonomy is not.
Slide 6's old title, "the rule fired while I slept", is not a claim
the current code can support, so I dropped it.

What this actually demonstrates is narrower than "it trades while I
sleep": a correct, current policy nobody can quietly move, and a
denial that leaves a receipt. The gate is not on the path of the
money — the program does not CPI the venue, and the same rogue
process that pushed the denied trade could have gone straight to the
venue. The gate is next to the money, taking notes.

**Why the red row is 6 and not just "a deny".** `authorize_spend`
runs a fixed ladder and the first check to fire wins: drawdown
kill-switch (7) → vendor not whitelisted (1) → per-tx cap (2) →
per-day cap (3) → TTL (4) → leverage cap (6). `REASON_LEVERAGE_CAP`
is 6 (`state/mod.rs`), so the leverage story reports 6 *only* when
the vendor is whitelisted and the size is inside the per-tx and
per-day caps. If a judge re-runs the demo and sees 2, the demo was
mis-staged, not the program.

### The pitch (8 slides, ≤40 words each)

Full script at `design-thinking/pitch-script.md`. Slide titles:

1. "Trade On My Behalf."
2. "I'm the user."
3. "I tried two TG bots last year."
4. "The kernel decides. The webapp shows you what it decided."
5. "The rules are code. Not willpower."
6. "The rule fired, and left a receipt."
7. "Same kernel, three buyers."
8. "I built this because I needed it."

Slide 7 name-drops Propr / HyroTrader / Solana Funded /
DojiFunded. **Caveat before using it:** those four come from one
Sep 2026 web search recorded in §1, with no URL or artifact kept
anywhere in this repo, and `docs/research/` does not mention
them. The file says "judges verify these names" — which means
check them before the pitch, not during it. If a name does not
resolve, drop it; the slide works with two competitors or none.

**These 8 titles are a proposal, not a published deck.** They
appear in no other file in the repo, and
`design-thinking/pitch-script.md` — the script §4 points to as
"full script" — is a different, 2:30 timed draft built around
five prose sections, not these slides. The titles are not yet
synchronised with it.

Slide 5, "The rules are code. Not willpower.", is true as
written — the caps *are* code on chain — but do not let it drift
into "the code stops me." It is the same overclaim as §2 in
shorter form: what is on chain is the rule and the record of
every decision, and a decision is not a veto.

The control surface (slide 4, slide 6) is **webapp**, not Telegram.
See `docs/control-surface.md` for the full webapp design.

---

## 5. Test — what we're measuring on D11

Three outside-dev testers. Each runs a 5-line rubric
(`docs/user-tests.md`). **The rubric below is a sketch; the
authoritative fixtures are in `docs/user-tests.md`, and the three
sessions are still NOT RUN.** Three corrections to this table:

- The field names are wrong. The policy is
  `max_leverage_bps`, `per_tx_cap_usdc`, `per_day_cap_usdc`,
  `kill_switch_drawdown_pct` (`state/mod.rs`) — there is no
  `maxPositionUsd` or `maxDailyLossUsd` field. The caps are
  denominated in **USDC microunits** of *collateral*, not USD
  notional.
- "approved / denied / **timeout**" — the program has no timeout
  reason code. `REASON_*` runs 0–7 and nothing in the ladder is
  a timeout. Drop that option; a run that produces no audit event
  is a failure to record, not a third verdict.
- The drawdown session is a *supplied-equity* comparison, not
  repeated realised losses: the runtime passes
  `implied_current_equity_usdc` and the threshold is compared
  against `peak_equity_usdc`, which only `record_pnl` mutates.
  A new policy starts at peak 0, so the kill-switch is **unarmed**
  until `record_pnl` sets a peak. A tester who does not do that
  will see code 0 and wrongly conclude the switch is broken.

| Field | Value |
|---|---|
| Tester | (name + background, 1 line) |
| Policy | `max_leverage_bps`: __ · `per_tx_cap_usdc`: __ · `per_day_cap_usdc`: __ · `kill_switch_drawdown_pct`: __ |
| Trade | side: long/short · market: __ · collateralUsd: $__ · lev: __x · `--raw` Y/N |
| Outcome | approved (0) / denied (1–7) · reason code: __ |
| Observed | slot: __ · tx sig: __ · `approved`: __ · `reason_code`: __ |
| Reaction | (1 sentence — what surprised them) |

Note `--raw`: without it the runtime *clamps* a request down to
the caps (`runtime.ts`, `clamp` defaults true), so an
over-limit order silently becomes a permitted one. Session 1 in
`docs/user-tests.md` only produces a code-6 deny on `--raw`.

### The three things that MUST happen

If any of these doesn't happen, the kernel is not *deciding* as
specified and the demo isn't ready. (A correct deny is still a
recorded verdict, not a prevented trade — see §2.)

1. **Tester 1's over-leveraged trade MUST deny.** Reason code
   expected: 6 (REASON_LEVERAGE_CAP). If approved, that's a bug.
2. **Tester 2's off-whitelist venue trade MUST deny.** Reason code
   expected: 1 (REASON_VENDOR_DENIED).
3. **Tester 3's kill-switch MUST trip** (code 7,
   REASON_DRAWDOWN_KILLSWITCH) — but only after `record_pnl` has
   set a non-zero peak, and the comparison is against
   runtime-supplied equity, not a venue-verified balance.

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
