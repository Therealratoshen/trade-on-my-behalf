# BRD Review — 2026-09-26 17:15 PT (three-lens)

> Verbatim capture of a three-lens code review done by the user on
> D6/D7 boundary. Persisted so the open issues can be tracked and
> the security claim stays honest.

## Lens 1 — judge

### What's strong (don't lose this)

1. The wedge is real and defensible. None of `infty.trade`,
   `armor-wallet`, `mercantill`, `solmind`, `pot-bot` has all
   three of (on-chain rules + perps venue + Telegram UX).
2. Anchor program is small, focused, reviewable. Gate, not
   custodian. No reentrancy; `saturating_add` everywhere;
   vendor whitelist cap; audit event per branch.
3. Defense-in-depth: off-chain evaluator + on-chain canonical
   trail.
4. Cut discipline: LTC bridge dropped, payment rail dropped,
   fallback wedge named.

### What I'd push back on (judge lens)

1. **Headline promise overstated — drawdown kill-switch isn't
   on-chain yet.** `REASON_DRAWDOWN_KILLSWITCH = 7` defined;
   nothing emits it. `peak_equity_usdc` is a field but no
   instruction writes or reads it.
2. **Funding flow has a hole.** No `create_treasury_vault`
   instruction, no agent keypair bootstrap, no funding flow
   in the code. Runtime sketch says `await generatedSigner()`
   and airdrops 1 SOL — that isn't a USDC-funded perps trader.
3. **Vendor whitelist semantics fuzzier than they sound.**
   `policy.vendors: Vec<Pubkey>` resolved to top-level venue
   program id, which approves *any* CPI. Per-market enforcement
   is the real safe shape.
4. **Telegram 60-second timeout contradicts the persona.** The
   busiest persona is the least able to use this surface.

## Lens 2 — business owner

### What I'd push back on (business-owner lens)

5. D7–D17 is tight; one slip kills the demo. Six working days
   of code + integration before any demo exists. No buffer for
   a D8 or D9 slip. Cut **Telegram to D14; ship the demo
   without the bot**. Telegram is positioning, not load-bearing
   for "I trade for you and cannot break your rules."
6. Real demand is unvalidated. One person isn't a market. No
   waitlist, no interviews, no "I told my friend the idea."
   Even 5 Twitter DMs "I'd use this" moves the needle more
   than another doc page.

## Lens 3 — investor

### Pros

Real founder-pain problem; technically sharp team-of-one;
well-scoped MVP; the on-chain enforcement story is novel and
actually defensible (203KB program, easy to audit); wedge is
empty per the cluster analysis.

### Cons

Solo founder, 13 days to demo, dependency stack is fragile
(Helius, Jupiter, Phantom, Surfpool, Telegram — five things
that can break), monetization is "v2 maybe," no community, no
demand validation, the on-chain promise is partially unbacked
(drawdown off-chain).

### Verdict

*"Promising hackathon bet; would not lead a round on this. If
demo +50 organic users + one venue other than Jupiter Perps
live, revisit."*

## Top-3 revision priorities, ranked

1. **Decide drawdown: ship on-chain (D7-D8) or honest-down
   the pitch.** Today it's neither. *Sub-priority a (chosen):
   ship on-chain on D8, keep the wedge line.*
2. **Fix `SUBMISSION.md` + repo URL placeholders +
   `scripts/devnet-demo.sh` package name now.** 10-minute
   fixes; prevent D17 embarrassment. *Sub-priority b (chosen):
   fixed at the same commit as this review.*
3. **Cut Telegram to D14; ship devnet demo without bot.**
   Telegram is a great pitch slide, not a great demo
   dependency. *Sub-priority c (chosen):* Telegram scope cut
   to D12+ in README §Status and PM-LOG §2.

## Questions for the founder, before I push back further

1. Drawdown on-chain or off-chain, officially? *(closed: D8 ships
   on-chain; subagent dispatched in parallel)*
2. Have you actually run `pnpm install` on a fresh clone?
   *(open — note: no pnpm-lock.yaml exists yet)*
3. Do you have a Helius API key + devnet SOL ready? *(open —
   R3 in PM-LOG §5 + U1-U3 in §6 are still pending the founder)*
4. Are the 3 outside-dev testers lined up? *(open — PM-LOG U4;
   not yet)*
5. What's the absolute minimum you'd accept submitting?
   *(open; lowest-cut line is: kernel compiles + on-chain
   drawdown + 1 TG DM demo + 1 pitch video + live repo link)*

## Action items (the ones closed in this revision)

- [x] SUBMISSION.md project name fixed ("Trade On My Behalf",
      not "Agent Treasury")
- [x] SUBMISSION.md repo URL placeholder neutralised (intentional
      blank until D15)
- [x] SUBMISSION.md LTC-bridge sentence removed
- [x] SUBMISSION.md "Security claim" section added (honest
      read of on-chain vs runtime-enforced)
- [x] scripts/devnet-demo.sh package name fixed (with
      pre-rename fallback + "demo script not yet implemented"
      grace message)
- [x] README.md §Status block synced to D6/D7 reality
- [x] README.md §Layout block synced to D6 package rename
      (bridge/, agent/, etc.)
- [ ] D8 on-chain drawdown (subagent `c24460e8-...` running now)

## Action items (still open)

- [ ] `pnpm install` on a fresh clone (D7.5)
- [ ] Devnet keypair + SOL airdrop (R3)
- [ ] Helius + Jupiter + AgentBazaar API keys (U2/U3/U5)
- [ ] Repo public URL (D15)
- [ ] Demand evidence: 5 DMs (post BRD action 6)
- [ ] Outside-dev testers lined up for D11
- [ ] Per-market vendor resolution doc + test (BRD action 3)
- [ ] Funding-flow doc (BRD action 2)
- [ ] TG configurable TTL + auto-approve-below-threshold
      (BRD action 4)

---
Captured 2026-09-26 17:15 PT by the user (three-lens review).
Persisted at docs/brd-reviews/2026-09-26-threelens.md.
