# BRD — Trade On My Behalf

Authored 2026-10-04. Business requirements for a product that is **still being built**.

**Read this before any other document in this repository.** This BRD is a *business* document. It is not evidence that anything ships, trades, earns, or has been tested. Where a number was unavailable at authoring time, this document says `NOT AVAILABLE` and names what would be needed to obtain it. It does not estimate around the gap.

Authority order, unchanged from the repo's existing rule (`docs/documentation-index.md` §"Maintenance rule"):

1. [SUBMISSION.md](SUBMISSION.md) — what may and may not be claimed. Nothing in this BRD overrides it.
2. [PRD.md](PRD.md) — product scope, P01–P12, release gate.
3. [TRD.md](TRD.md) — technical contracts and known gaps.
4. This BRD — business framing, market context, commercial hypothesis.

Where this document disagrees with `SUBMISSION.md`, `SUBMISSION.md` wins and this document is wrong.

---

## 1. Executive summary

**Trade On My Behalf** is an on-chain *policy kernel* for perpetual futures trading, plus a wallet-connected web control surface over it.

In plain terms: a trader writes down rules — which venue, how much collateral per trade, how much per day, how much leverage, a drawdown that stops new trades, an expiry. Those rules live in an Anchor program at a PDA on Solana, not in someone's server. An automated executor proposes trades. The kernel either approves or denies each one, and writes an `AuditEvent` either way. The web app shows the policy, the audit trail, and positions.

**What it is today, precisely:**

- An Anchor program with four instructions (`create_policy`, `authorize_spend`, `update_policy`, `record_pnl`) at `programs/treasury/programs/treasury/src/instructions/`.
- A TypeScript SDK, an agent runtime, a `tomb` CLI, and a Next.js 15 / React 19 viewer + rule editor.
- A **paper** venue adapter (`packages/agent/src/venue/jupiter-perps.ts`) that returns `simulated: true` and models a simplified 6-bps notional fee. It sends no venue instruction.

**What it is not today:** a trading terminal. There is no chart, no trade ticket, no real venue order, no custody binding, and no verified equity. Per [PRD.md](PRD.md) §"Current implementation versus target" and `docs/whats-missing.md`, those are all `Not implemented`.

**The business question this document actually answers:** the honest answer is that this is not yet a business. It is a pre-revenue, pre-validation open-source project with one founder, four days to a hackathon fair, and no observed customer. Section 5 states the market position. Section 6 states that there is no revenue model in effect and gives options as explicitly-labelled hypotheses. Section 9 says the first milestone is the fair itself.

The single most important sentence in this document: **the wedge is a product claim about integrity, and integrity claims are only as good as the evidence attached to them.** This repository's whole approach — `NOT RUN`, `BLOCKED`, `NOT CAPTURED`, `NOT IMPLEMENTED` — is correct and should not be softened for any pitch.

---

## 2. Problem and target users

### 2.1 The primary user is the founder

This is not a persona exercise. Per `design-thinking/README.md` §"The founder" and §"My two real quotes", the primary user is the founder, quoted directly:

> "i do not have time to do trading if the action or trend or so called the movement can be predictable and i should trade it but i do not have time to review and keep on viewing it at all"

> "what i really want to have is the perpetual agent to trade for me"

And the failure history is specific and dated to 2025 (`design-thinking/README.md` §"What I tried before, that didn't work"):

- Two Telegram signal bots. Both oversize'd. **$340 lost** before stopping. Ran on servers the founder did not control, with keys the founder had handed them.
- One month of manually copy-trading a paid signal channel. Faked out. Signals called 5x leverage on a $50 position the founder "should never have been in."
- Mental caps on personal positions: "Hard to enforce at 11pm when I see a setup and want to size up. Willpower is not a rule."

That last line is the actual product requirement, and it is a *mechanical* one. The founder is not asking for better judgement or better signals. The founder is asking for a rule that holds at 11pm against the founder's own judgement. That is why the wedge is an on-chain gate rather than a better bot.

**Honest consequence for this BRD:** a founder who built a tool for himself is a user, not a market. `docs/brd-reviews/2026-09-26-threelens.md` §"Lens 2" put it correctly: *"One person isn't a market. No waitlist, no interviews, no 'I told my friend the idea.'"* That criticism has **not** been resolved — see §9 and §10.

### 2.2 Two adjacent segments — neither validated

From `design-thinking/README.md` §"Who else this is for", both framed as the founder's own reasoning rather than research:

**Prop-firm operators.** Want a wallet-per-strategy with hard per-strategy caps. The founder's own distinction (`design-thinking/README.md`:60-62) is that Propr, HyroTrader, Solana Funded and DojiFunded "already ship" firm-level rulebooks "in a contract" — the claim being that those firms pin the *firm's* rules, leaving the individual trader's rules unpinned. `design-thinking/five-stages.md`:65-71 gives the dated specifics for the four named firms (web search, Sep 2026).

> ⚠️ **I could not re-verify any of the four competitors from this repository.** Web search is not available to me in this session. The `five-stages.md` observations are dated Sep 2026 and are **archived founder research, not current fact**. Treat the "firm-level vs trader-level" distinction as a **hypothesis to test**, not a validated competitive finding. See §10 Q2.

**Influencer-signal followers.** Want the influencer's signal clamped to a per-follower cap on the *follower's own* wallet. Same mechanism, different user. Also unvalidated.

### 2.3 What is NOT evidence of demand

- **Zero** completed outside-user sessions. `docs/user-tests.md`: all three sessions `NOT RUN`, no participants assigned, no latency measured, no reactions collected.
- **Zero** waitlist, interviews, DMs, or survey responses anywhere in this repository.
- The prop-desk operator persona in `design-thinking/terading-2026-10-04/00-challenge-brief.md`:9 is explicitly labelled "assumption — never interviewed."
- The judge persona in the same file is labelled "assumption".

**Demand status: NOT AVAILABLE.** Nothing in this repository measures it. To obtain it: recruit the three consented outside developers already specified in `docs/user-tests.md`, and record their actual outcomes. That is the cheapest available measurement and it is still not a market.

---

## 3. Product scope — what ships vs. what a real venue product needs

The gap between these two columns is the whole business risk. Being blunt about it:

| Capability | **What this repo ships** | **What a venue product needs** | Gap |
|---|---|---|---|
| Policy storage | `Policy` PDA, 4 instructions | Same | — |
| Decision logic | Vendor whitelist, per-trade cap, per-window cap, TTL, leverage cap, drawdown comparison | Same, plus authenticated inputs | **Inputs are caller-supplied** |
| Decision evidence | `AuditEvent` on every branch | Same | — |
| Execution | Paper fill after separate authorize call | Venue action *bound* to the checked intent | **No binding exists** |
| Custody | None | App-controlled account whose authority is constrained by policy | **Not implemented** |
| Risk state | Runtime-supplied equity | Authenticated venue state + fresh validated oracles | **Not implemented** |
| Market data | Spot reference price for modelling | Executable venue oracle/quote with freshness guarantees | **Not equivalent** |
| Front end | Wallet + policy + audit viewer | Chart, ticket, positions, receipts | **Not implemented** |
| Recovery | Single log read, no dedupe | Durable intent journal, reconciliation, unknown-outcome handling | **Not implemented** |

### 3.1 The three things that are genuinely built

1. **The kernel.** It is small, reviewable, and it does what the docs say it does. `programs/treasury/programs/treasury/src/instructions/authorize_spend.rs` evaluates drawdown, vendor, per-trade cap, daily cap, expiry and leverage, and emits an `AuditEvent` on **every** branch including denials. Reason codes are defined in `programs/treasury/programs/treasury/src/state/mod.rs`:43-49.
2. **The permission model.** `update_policy` requires `ctx.accounts.owner.key() == p.owner` (`programs/treasury/programs/treasury/src/instructions/update_policy.rs`:28-30). An agent key can authorize spend and record PnL but cannot loosen the policy — both are covered by tests in `programs/treasury/tests/treasury.ts` ("agent key cannot loosen the policy via update_policy").
3. **The honest labelling discipline.** Paper fills say `simulated: true`. The release gate in [PRD.md](PRD.md) §"Release gates" refuses the "devnet perps terminal" label while execution is paper. This is a genuine asset, not just caution — see §5.3.

### 3.2 The three things that are not

1. **No enforced execution (PRD P06).** Authorization and venue action are two separate operations. The gate approves a *caller-supplied vendor pubkey*, not a venue CPI. `TRD.md` §T05: *"Merely appending a venue instruction after today's success-returning denial does not enforce the policy."* This is the single largest gap between what the product is called and what it does.
2. **No verified risk (PRD P12).** `implied_current_equity_usdc` is supplied by the runtime. Only `record_pnl` mutates `peak_equity_usdc`, and it does so monotonically from a caller-supplied value (`programs/treasury/programs/treasury/src/instructions/record_pnl.rs`:38-39). Overreporting equity bypasses drawdown; an inflated peak can deny service. A monotonic watermark is storage, not economic truth.
3. **No deployment.** The configured Treasury `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph` was **absent** on devnet at the dated observation in `docs/devnet-readiness.md` (context slot 506874810). Venue selection is **OPEN**.

### 3.3 Business consequence

Until P01–P12 verify, the product may only be described as a **"devnet policy demo with simulated positions"** — the exact wording mandated by [PRD.md](PRD.md) §"Release gates". A paper demo cannot pass the real-venue gate. Anything that requires a real user to get economic value — retention, willingness to pay, a performance fee — is downstream of a gate this project has not passed.

---

## 4. Market context

**This section deliberately contains no market size, no TAM, no growth rate, and no user-count projection.** See §4.4.

### 4.1 Competitive structure, honestly

The genuinely researched competitive work in this repo is `docs/oss-precedent.md` — four Colosseum Copilot corpus queries on 2026-09-26, 57 unique projects, one MIT-verified repo per bucket where possible. Its synthesis is the defensible claim:

- No project in the corpus combines all three of (wallet-level policy + perps venue + control surface). The triple intersection is empty **in that corpus, on that date**.
- The nearest policy-axis prior art is `smart-wallet` (PDAs with customizable spending limits) — unlicensed, no perps integration.
- The nearest all-bucket MIT candidate is `fridonai` — personal-AI crypto framework, MIT, no policy primitives, no perps integration.
- MIT/Apache density is thin: 2 verified MIT, 1 GPL-3 across 57 projects.

`docs/copilot-verdict.md` (D2, pre-pivot) gives the crowding figure for the adjacent cluster: **v1-c14 "Solana AI Agent Infrastructure" = 325 projects**. That is the density the *pre-pivot* idea collided with. It is a dated corpus observation, not a market measurement.

> ⚠️ `docs/oss-precedent.md` is a **2026-09-26** search of a **hackathon-project corpus**, not a survey of the actual market. A gap in a hackathon corpus is weak evidence about commercial competition. Corridors, risk engines, treasury managers and spend-control products may well exist outside the corpus. The "the intersection is empty" claim is defensible **only** as "empty in 57 hackathon projects as of 2026-09-26."

### 4.2 Positioning

The wedge, per `design-thinking/README.md` and `GTM.md` §"Wedge":

> "I trade for you, and I cannot break your rules."

Honest reading of what backs that sentence **today**, from `SUBMISSION.md` §"What may be claimed" and §"Security claim":

- ✅ **Backed:** the agent cannot use owner-only policy updates. The kernel records approve/deny with a reason code on-chain.
- ❌ **Not backed:** that rules are enforced at the signing layer such that no rogue signal or compromised dependency can bypass them. The kernel approves a *decision*; it does not bind a *venue action*. `docs/brd-reviews/2026-09-26-audit.md` §"Scenario 4" called this out in Sept 2026 and it has not changed.
- ❌ **Not backed:** that the limits are wallet-wide and immutable. A stolen owner key can raise the caps via `update_policy` — there is no timelock. `docs/brd-reviews/2026-09-26-audit.md` §"Scenario 1".
- ❌ **Not backed:** that drawdown protection is verified. See §3.2 item 2.

`docs/brd-reviews/2026-09-26-audit.md` §"Scenario 1" recommended the headline be softened to "within the as-stored caps". The wedge line survives that softening. Use it.

**Position against the named prop-firm competitors:** unverified. See §2.2. If a judge asks "how is this different from Propr?", the honest answer is the *hypothesis* in `design-thinking/README.md`:60-62 — firm-level rulebook vs. per-trader programmable wallet — and the answer must be delivered as a hypothesis.

### 4.3 Where the defensibility genuinely is

Not in the code. The kernel is ~200 KB of Anchor and any competent team can write a similar one. Two things are harder to copy:

1. **The audit trail that is true under adversarial conditions.** Anyone can emit an event. Emitting an event that survives inspection — that says "approved" only when the program actually approved, and that reconciles with what the venue did — is a discipline, and this repo is further along on it than most.
2. **The honesty posture itself.** A product that tells you what it cannot do is differentiating in a category full of products that over-promise. This is a real commercial asset in trust-sensitive fintech, not just a compliance posture.

### 4.4 Market size, TAM, demand: NOT AVAILABLE

| Metric | Status | Basis / what is needed |
|---|---|---|
| TAM / SAM / SOM | **NOT AVAILABLE** | No basis in this repository. Obtaining it requires a sourced third-party market study for on-chain trading automation or prop-trading tooling, with a named publisher and date. **This BRD does not invent one.** |
| Solana perps user count | **NOT AVAILABLE** | Would require a dated, sourced figure from a venue or analytics provider. The repo contains no such figure. |
| Number of prop-firm operators on-chain | **NOT AVAILABLE** | The four named firms are examples, not a census. A census requires enumerating and verifying each operator's product and chain. |
| Willingness to pay | **NOT AVAILABLE** | Zero price tests, zero paid users, zero interviews. The only revenue-adjacent evidence is *other people's* pricing decisions in a hackathon corpus (`GTM.md` §"Pricing model"), which says nothing about this product's customers. |
| Demand from the target personas | **NOT AVAILABLE** | See §2.3. Three sessions `NOT RUN`; nothing else measured. |
| Competitive share | **NOT AVAILABLE** | Requires the corpus limitation in §4.1 to be addressed with a market-wide survey. |
| Conversion / retention / churn | **NOT AVAILABLE** | Requires a product that has passed PRD P01–P12. It has not. |
| Revenue to date | **$0. No payment has been requested, accepted, or received. Any other figure is false.** |  |
| Cost to date | **NOT AVAILABLE** | Founder time is real and unmeasured. No infrastructure, RPC, or vendor spend is recorded in this repository. |

**Why no TAM estimate is given:** this repository's entire value proposition is that it does not make claims its evidence cannot support. A fabricated market size in the business document would discredit the one part of this project that is defensible, and would be trivially exposed by a judge who asks for the citation. The absence is the honest deliverable.

---

## 5. Differentiation and defensibility

### 5.1 The wedge

On-chain policy enforcement at a PDA. A rule the program evaluates and refuses, rather than a rule a bot promises to respect.

### 5.2 How durable is it, honestly? Not very, alone.

**Erosion paths, in order of speed:**

1. **A venue adds a native policy/spend-limit primitive.** Jupiter, Drift/Velocity or a wallet (Phantom, Backpack) ships spending limits or per-market caps on-chain. *This is the fast one.* The kernel's entire value is "on-chain enforcement" — it is the same category as a feature the venues and wallets own, and they have distribution we do not.
2. **A smart-contract wallet ships programmable policies.** The `smart-wallet` prior art in `docs/oss-precedent.md` already exists. Squads, Squads Grid and similar multisig/account-abstraction stacks are the natural home for a policy primitive, and they are better resourced than a solo founder. `docs/copilot-verdict.md` names `mercantill` in this space already.
3. **A copy-trading platform adds per-follower caps.** Composable/Binance-style copy trading and on-chain signal platforms can add a clamp. The "influencer-signal follower" segment is precisely where an incumbent already has the distribution.
4. **The market decides off-chain risk is fine.** The entire value of an on-chain gate is that you distrust the operator. If users accept a risk engine with an audit trail — a normal fintech posture — the on-chain kernel is a cost, not a feature. `docs/brd-reviews/2026-09-26-audit.md` §"Scenario 4" and the `GTM.md` fallback wedge both acknowledge this.

**What does not erode:** the *integrity posture* (§4.3 item 2), and the multi-persona claim that one primitive serves the founder, a prop desk and a signal follower without changing the product. That is a positioning claim, and positioning is more durable than code.

### 5.3 Assessment

The wedge is **real but unmoated, and it is currently a claim rather than a capability.** The honest sequence is:

1. Prove the enforcement (PRD P06) — then the wedge is a capability.
2. Until then, the wedge is a *direction*, and the pitch should say so.

`GTM.md` §"Wedge" already makes a stronger claim than the evidence supports ("the rules are enforced at the wallet's signing layer so they cannot be bypassed"). `GTM.md` §"Current positioning" partially retracts this. This BRD sides with the retraction, because the retraction is what [SUBMISSION.md](SUBMISSION.md) requires.

---

## 6. Revenue model

### 6.1 Current state: there is none, and there should not be one yet

**Revenue to date: $0.** No price is published, no billing exists, no payment has been requested or accepted.

`docs/whats-missing.md` §"Deferred, not quietly promised" explicitly lists **billing, paid signals, and social/copy trading** as outside this release. This BRD respects that. Everything below is **post-release hypothesis** and must not appear in pitch or submission material as a business model.

### 6.2 Why monetization must wait regardless of preference

A performance fee requires realized PnL. Realized PnL requires a real venue. There is no real venue. A subscription requires a product someone would pay for weekly; the product currently is a policy viewer with paper positions. **The gating constraint is not "which pricing model" — it is that PRD P01–P12 must pass first.** Framing revenue as a pricing decision before that is a category error.

### 6.3 Options, as explicitly-labelled hypotheses

Retained from `GTM.md` §"Pricing model" for continuity. `GTM.md` is the record of the reasoning; this section does not upgrade any of it to evidence.

| Option | Shape | Honest assessment |
|---|---|---|
| **Performance fee (5% of realized PnL)** | User never pays out of pocket; we take a cut of profit | Best incentive alignment. **Currently unbuildable** — no venue, no realized PnL, and computing attributable PnL across a policy/agent/venue boundary is unsolved. Also imposes a fiduciary-ish standard on the exact component that is least tested. |
| **Subscription** | Per-user or per-wallet, monthly | Predictable revenue; **structurally misaligned** — the user is not trading half the time, so the meter runs without value delivered. Also requires billing infrastructure that is explicitly out of scope. |
| **Per-policy one-time** | Charged to publish a policy to a registry | Easy to explain, trivial to implement, and **only works if a registry has enough users to be worth publishing into.** Zero users today. |
| **OSS kernel + hosted proprietary service** | The `GTM.md` "path (c)" split: MIT kernel/SDK/agent, proprietary hosted alerting/reporting | The most coherent with this repo's actual state. The kernel genuinely wants to be open; the product-shaped part does not. **This is a licensing decision, not a revenue model** — it produces revenue only if the hosted tier is later built and someone buys it. |
| **No monetization** | Free, forever | Entirely defensible at this stage. The founder's own recorded view (`docs/internal/design-thinking-archive/SUMMARY-FOR-FOUNDER.md`:182-188) was *"I do not plan to sell it like a trading bot at all"*, which the archive itself flags as **contradicting** the commercial framing in `GTM.md`. **This contradiction is still unresolved** — see §10 Q3. |

**Recommendation:** do not choose. Do not publish a price. Resolve §10 Q3 first. The honest 2026 position is `path (c)` licensing with no pricing decision, because pricing requires customers and there are none.

---

## 7. Go-to-market

This section **adds to** [GTM.md](GTM.md); it does not replace it. `GTM.md` holds the positioning history, the licensing split, the pitch-deck rules and the "why now". Read it alongside this.

### 7.1 The only GTM activity currently authorized

Per `GTM.md` §"Current positioning" and [SUBMISSION.md](SUBMISSION.md), the sole currently-permitted motion is: **show source-backed policy decisions and clearly simulated positions to a technical audience at a hackathon fair.** Not a launch, not a funnel, not a waitlist.

### 7.2 The one-day funnel (the fair)

`design-thinking/terading-2026-10-04/00-challenge-brief.md`:19 defines the judge persona: **90 seconds, no wallet, decides whether the kernel is real.**

That is the entire target audience for the next four days. It implies:

- **The demo must be a denial.** Per `design-thinking/README.md` §"What judges will see in the demo": push an intent that breaches the leverage cap, watch the kernel deny it, watch the `AuditEvent` land, watch the audit panel show the red row. A denial is the only moment that proves the kernel is not a UI.
- **No wallet required.** Anyone who must connect a wallet and fund an account to see the wedge has dropped off. This is why Sessions 1 and 2 in `docs/user-tests.md` are specified to run on the CLI and need no devnet.
- **Correctness beats spectacle.** A colour must never claim what did not happen (`design-thinking/terading-2026-10-04/00-challenge-brief.md`:4). An honest policy demo that visibly distinguishes approved / denied / not-attempted outperforms a beautiful chart of simulated money.

### 7.3 What is missing from GTM.md, added here

1. **The honest pre-fair release label.** Say "devnet policy demo with simulated positions". Per [PRD.md](PRD.md) §"Release gates" this is mandatory, and `GTM.md` does not currently state it as a single quotable line.
2. **The fair is the milestone, not the launch.** GTM treats the fair as a deadline. For the business, the fair is the first and only scheduled measurement opportunity. Success is a usable signal, not a revenue event. See §9.
3. **The one demand test that is unblocked today.** `docs/user-tests.md` Sessions 1 and 2 run on the CLI and require no devnet funding. The three-lens review's action #6 ("5 DMs would move the needle more than another doc page") is still open and still the cheapest available demand evidence.
4. **The post-fair sequence is not a launch plan.** It is: (a) fix what the fair exposes, (b) pass PRD P01–P12, (c) then talk to users. Publishing a landing page before (b) manufactures demand for a product that cannot deliver.

### 7.4 What GTM.md says that this BRD does not endorse

`GTM.md` §"Wedge" states the rules "cannot be bypassed by a rogue signal, a compromised dependency, or a buggy runtime." Per §5.2 and [SUBMISSION.md](SUBMISSION.md), that is not true today — there is no binding between the decision and the venue action. `GTM.md` §"Current positioning" is the correct reading; the historical wedge text is retained history. **Do not quote the historical wedge text verbatim to a judge.**

---

## 8. Risks and mitigations

| # | Risk | Category | Severity | Evidence | Mitigation |
|---|---|---|---|---|---|
| R1 | **The demo fails live in front of judges** | Technical | Critical | Treasury address absent on devnet at the 2026-10-03 observation; no public devnet receipts (`docs/devnet-readiness.md`, `docs/demo-receipts.md`) | Have a **local-validator** demo path that needs no network (`scripts/demo.sh` exists). Rehearse the offline path. A working local demo beats a beautiful devnet demo that cannot connect. |
| R2 | **Venue selection blocks real execution entirely** | Technical | Critical | Selection is **OPEN**; Jupiter's program was non-executable on devnet at observation; Drift→Velocity migration is a rename trap (`docs/devnet-readiness.md`, `docs/venues.md`) | Decide the venue **or decide explicitly to ship paper**. Time-box the decision to before the fair; do not let it consume the demo window. |
| R3 | **The pitch over-claims and a judge breaks it** | Reputational | Critical | `docs/brd-reviews/2026-09-26-audit.md` §"Scenario 1/4" found 2 of 4 breach scenarios over-promised; `SUBMISSION.md` §"What may be claimed" lists seven forbidden claims | Use the safe demo wording in `SUBMISSION.md` verbatim. Have someone who has read `docs/security-model.md` review the pitch. A withdrawn claim costs more than a narrow one. |
| R4 | **Key person: single founder, four days** | Key-person | Critical | `design-thinking/terading-2026-10-04/00-challenge-brief.md`:47; the three-lens review §"Lens 3" | Cut scope, not honesty. `docs/roadmap.md` already authorizes narrowing to a policy demo with paper positions. Prefer a smaller true thing. |
| R5 | **A venue or wallet ships spend limits natively** | Market | High | §5.2 erosion path 1 | Speed to evidence, not features. The audit trail and honesty posture (§4.3) survive a native-feature world better than a feature list does. |
| R6 | **Users never arrive** | Market | High | Zero demand evidence, §2.3 | Run the three sessions. Publish the kernel. Accept that "no one used it" is a valid and survivable outcome for a hackathon project. |
| R7 | **Someone trades real money against the current product** | Regulatory / safety | High | The product's name and pitch could be read as an invitation to trade; there is no KYC, no disclaimer, no suitability language anywhere in this repo | The product is devnet-only and says so everywhere. **Any move toward mainnet or real deposits requires legal review, not a product decision.** Do not let a demo invitation imply otherwise. |
| R8 | **A policy can be pre-created by a third party for a victim agent key** | Technical / security | Critical | `create_policy` declares `pub agent: UncheckedAccount<'info>` with the comment "this is the agent's wallet pubkey. Not deserialized" (`programs/treasury/programs/treasury/src/instructions/create_policy.rs`:15) — the agent never consents. `ensurePolicy` then short-circuits: `if (await fetchPolicy()) return { signature: '', createdNew: false }` (`packages/sdk/src/withTrader.ts`:230) with no error, so a caller can silently inherit an attacker's vendor whitelist and caps. **No test covers this path.** | **This is a real, currently-open hole in the flagship feature.** Require the agent's signature (`UncheckedAccount` → `Signer`). Until fixed, do not claim the policy is the user's own. Recorded as a `PRD.md` P10 acceptance gap. **Must be disclosed in the pitch if not fixed before the fair** — a policy kernel that lets an attacker pre-set your caps undermines the entire wedge. |
| R9 | **No replay protection; `authorize_spend` accepts any `nonce`** | Technical / security | High | No dedupe in `authorize_spend.rs`; a re-sent transaction double-counts `day_spent_usdc` | Fix on a branch before any funds are at risk. For a devnet demo, state the limitation. |
| R10 | **Documentation is stale relative to the code** | Process | Medium | `SUBMISSION.md`, `docs/testing-plan.md`, `docs/whats-missing.md` and `docs/demo-receipts.md` all record suites as `NOT RUN` that a 2026-10-03 session reported as passing; `docs/brd-reviews/2026-09-26-audit.md` says the kernel has 6 tests and empty `packages/` — both long since false (see §11) | **Under-claiming is the safe direction of error.** A doc that says `NOT RUN` when tests pass is embarrassing; a doc that says `PASS` when they fail is a lie. Refresh the evidence ledger with real revision + exit-status records. |
| R11 | **The pitch/README/GTM headline implies enforced execution** | Reputational | Medium | §5.2, R3 | Adopt the audit's suggested phrasing "within the as-stored caps" in every headline. |

---

## 9. Milestones and success criteria

### 9.1 Milestone 0 — the fair (the next four days). This is the first milestone.

There is no milestone before it. The fair is the only fixed, dated, external measurement event this project has.

**Success criteria for Milestone 0 — all qualitative, because no quantitative demand baseline exists:**

- A judge with no wallet sees a kernel **deny** a rule breach, with a real `AuditEvent`, inside 90 seconds (`design-thinking/terading-2026-10-04/00-challenge-brief.md`:19).
- The demonstration is labelled honestly as policy + simulated positions, matching [PRD.md](PRD.md) §"Release gates".
- No claim in the pitch is falsified by a judge who reads the repo.
- Three outside-developer sessions either happen or are honestly still `NOT RUN`.

**Explicitly not a Milestone 0 success criterion:** users, revenue, market share, ranking, or prize winnings. Those are unknowable and unmeasured at this stage.

### 9.2 Milestone 1 — evidence, not features

- Treasury deployed to devnet, program identity verified, and public approve **and** deny receipts captured. (`docs/devnet-readiness.md` §"Deployment and acceptance sequence" steps 1-3.)
- Evidence ledger refreshed with real revision, tool versions, commands and exit statuses — distinguishing what was rerun from what merely exists.
- The three outside-developer sessions executed and recorded per `docs/user-tests.md` §"Recording and decision rule".

**Gate:** if Milestone 1 is not met, the honest state remains "policy demo with simulated positions" and no further milestone may be claimed.

### 9.3 Milestone 2 — the real-venue gate

The 8-step sequence in `docs/devnet-readiness.md` §"Deployment and acceptance sequence", in order, with real captured order/fill/close signatures.

**Gate:** PRD P01–P12 verified. Until then the release wording stays "devnet policy demo with simulated positions". This gate is non-negotiable and is the one this BRD most emphatically endorses.

### 9.4 Milestone 3 — commercial exploration (only after Milestone 2)

- At least one paying user, or at least one credible LOI, or an explicit decision to remain open-source with no revenue.
- A documented, dated demand finding — replacing every `NOT AVAILABLE` in §4.4 that is obtainable.

**Gate:** no pricing decision, landing-page funnel or monetization claim before this milestone. `docs/whats-missing.md` already lists billing, paid signals and social/copy trading as out of scope; this extends that deferral explicitly to pricing.

### 9.5 Milestone 4 — defensibility

- Venue multi-swap demonstrated on one account without a hidden router swap (`docs/venues.md`: "A venue change needs an explicit migration/new agent-policy plan, not a hidden router swap").
- Verified, authenticated risk state (TRD §T06) so that drawdown is a real limit rather than a runtime-supplied comparison.
- A durability argument that survives one venue shipping native spend limits (§5.2, R5).

---

## 10. Open questions

Real questions. None of these can be answered from this repository.

### Q1 — **Which venue, and is it a decision we can make in four days?** (Blocking)

`docs/devnet-readiness.md` §"Real devnet selection — OPEN" leaves three candidates (Jupiter, legacy Drift, current Velocity) and explicitly warns that the Drift→Velocity move is a rename trap requiring SDK/IDL/market/faucet/authority re-verification. `docs/venues.md` says select **one deeply**.

**The framing this BRD asks the founder to actually answer:** is the fair demo paper-with-an-honest-label, or real-devnet-venue? These are different products with different risks. Attempting the second and failing produces a worse outcome than planning the first. **My recommendation: decide the paper label now, and pursue the venue only as an upside if time remains.** A demo that works beats a demo that is real.

### Q2 — **Is the prop-firm distinction real, or is it a story we tell ourselves?**

The entire B2B case rests on `design-thinking/README.md`:60-62 — that Propr, HyroTrader, Solana Funded and DojiFunded pin the *firm's* rules on-chain, leaving the individual trader's rules unpinned. **I could not verify any of the four in this session** (web search unavailable). If a firm already offers per-trader programmable wallets, the B2B wedge collapses into "we do it per-trader", which is a much weaker story.

**To resolve:** verify each firm's current product, and check whether any prop-firm or trading-custody product already ships a *per-trader* policy primitive. If yes, drop the B2B segment rather than reframe it.

### Q3 — **Is this a business or an open-source project?** (Contradictory evidence on disk)

`GTM.md` §"Pricing model" builds a performance-fee business case. `docs/internal/design-thinking-archive/SUMMARY-FOR-FOUNDER.md`:182-188 quotes the founder saying *"I do not plan to sell it like a trading bot at all"* and flags that this **contradicts** the commercial framing. The 2026-09-26 audit §"6. DISPOSITIONS" notes the contradiction "surfaces if a judge reads both files."

**This contradiction has been on disk since 2026-09-26 and is still unresolved.** Everything in §6 is conditional on the answer. An honest answer here is a legitimate outcome and would simplify the entire document.

### Q4 — **Who is the user in 4 days, and what happens to the other two segments?**

§2.3 establishes that all three segments are unvalidated and the three-lens review's demand critique was never answered. Do we spend the fair on (a) a judge demo, (b) the three user sessions, or (c) both? (c) is the right answer but it is the one that does not fit in four days alongside a demo.)

### Q5 — **Should the pre-created-policy defect (R8) be disclosed in the pitch if it is not fixed?**

An on-chain policy kernel that does not require the agent's consent to policy creation has a hole in its central claim. Options: (a) fix before the fair, (b) disclose honestly, (c) narrow the claim. **What is not acceptable is (d) shipping it and not mentioning it**, because the product's entire value is that its claims are true. My recommendation: fix it, and if there is no time, disclose it — a demonstrated honesty about a real defect is a *stronger* pitch than an unexamined claim.

### Q6 — **What is the actual submission deadline, and is a 2026-10-12 date from a planning document still current?**

`PM-LOG.md`:32 records Oct 12, 2026 11:59pm PT. `SUBMISSION.md`:41 itself instructs: *"Confirm event/track/deadline and eligibility against current official event rules."* That confirmation has not been done. `docs/gtm-and-submission.md`:15 repeats it. **The date driving every plan in this repo is unverified.**

### Q7 — **Do we want to keep the "one mission, many personas" story?**

§2 names three segments; none is validated; the founder is the only real user. Either commit to the founder and drop the others from the pitch, or fund real discovery. Carrying three unvalidated personas into a pitch reads as unfocused to a technical judge and is the same weakness the three-lens review flagged as "no demand validation".

---

## 11. Stale evidence discovered while writing this BRD

Recorded here so the next person does not re-derive it. Per the repo's own rule — **trust code over docs** — these were verified by reading source, not by running anything. **No build or test was executed in authoring this BRD.**

| Document claim | Verified source state | Where |
|---|---|---|
| `docs/brd-reviews/2026-09-26-audit.md`: "6 LiteSVM tests", "the actual test file has no `t04` test", "TTL has NO TEST" | `programs/treasury/tests/treasury.ts` contains **12** `it` cases, including "denies once the daily cap is used up (REASON_DAILY_CAP=3)" and "denies after the policy TTL elapses (REASON_EXPIRED=4)" | Verified 2026-10-04 |
| `docs/brd-reviews/2026-09-26-audit.md`: "`packages/{sdk,agent,policy-engine,bridge}/src/` and `apps/dashboard/*` are **all empty**… D9 has nothing to ship"; "single biggest unstated risk" | **False.** 55 `.ts`/`.tsx` files exist under `packages/` and `apps/`. `packages/agent/src/venue/jupiter-perps.ts` is a working paper adapter. The audit's own D8.5+ banner says the packages were filled in later, but the risk register was never updated. | Verified 2026-10-04 |
| `docs/brd-reviews/2026-09-26-audit.md` §"New R-RISK": "the demo script calls `pnpm run demo:devnet` which does not exist — `packages/sdk/src/` is empty" | `scripts/devnet-demo.sh` and `scripts/demo.sh` both exist; `packages/sdk/src/` is populated | Verified 2026-10-04 |
| `docs/brd-reviews/2026-09-26-threelens.md` §Q2: "**no pnpm-lock.yaml exists yet**" | **False.** `pnpm-lock.yaml` is committed at the repo root. | Verified 2026-10-04 |
| `docs/brd-reviews/2026-09-26-audit.md` §"(c) Docs that contradict code": reason-code naming drift `REASON_LEVERAGE_EXCEEDED` / `REASON_DRAWDOWN_TRIPPED` vs code `_CAP` / `_KILLSWITCH` across "6+ docs" | **Mostly resolved.** The code defines `REASON_LEVERAGE_CAP = 6` and `REASON_DRAWDOWN_KILLSWITCH = 7` (`state/mod.rs`:48-49) and the tests assert those exact values. The stale names now appear only in `PM-LOG.md` and inside the audit itself (historical). `docs/onchain-program.md` contains no `REASON_` constants at all. | Verified 2026-10-04 |
| `docs/testing-plan.md`: "No `.github/workflows` test workflow in reviewed source" | `.github/workflows/ci.yml` **exists** on disk with `pnpm`/node/anchor pins. | Verified 2026-10-04 (presence only) |
| `TRD.md` §T10: "CI wiring is desired, not currently checked in" | Consistent with the above — the file is present but untracked. Present ≠ checked in. Both statements can be true. | Verified 2026-10-04 |
| `README.md`:48 and `SUBMISSION.md`:22 record all suites as `NOT RUN`; `design-thinking/five-stages.md`:118-120 claims "6/6 LiteSVM tests passing" | **Unresolved by this BRD and deliberately left alone.** I did not run anything, so I cannot confirm either direction. Both a stale-"NOT RUN" and an unsupported-"passing" claim need a real run with a recorded exit status to settle. | Not verified here |
| `PRD.md` P03/P04 read "Chart and ticket: **Not implemented**" / P03 "Not implemented", P04 "Not implemented" | `MarketChart.tsx` (349 lines), `TradeTicket.tsx` (218 lines), `MarketWorkspace.tsx`, `ModeStrip.tsx` and `app/api/quote/route.ts` **exist on disk** — but are **untracked** (`git status` shows `??`), i.e. concurrent work-in-progress, not committed source | Verified 2026-10-04 |

**Pattern:** the two 2026-09-26 BRD reviews describe a project state ~8 days out of date, and their own D8.5+ banners say so. **They should be read as history, not as current risk registers.** This BRD supersedes them as a business document; it does not supersede [SUBMISSION.md](SUBMISSION.md) or [PRD.md](PRD.md).

---

## 12. What this BRD deliberately does not contain

- A market size, TAM, growth rate, or user projection. See §4.4.
- A revenue figure, forecast, or unit-economics model. See §6.1.
- Any claim that the product trades, earns, protects, or enforces today. See §3.2, §5.2.
- A competitor feature matrix. §4.1 explains why one could not be honestly built.
- A restatement of the technical contracts. That is [TRD.md](TRD.md)'s job, and duplicating it here would create a second source that drifts.

**A BRD that pads its gaps is worse than no BRD in this repository.** The absence of a number is the deliverable, and every one of them is named above with what would be needed to fill it.
