# What's Missing — Internal Gap Tracker

> **Internal doc.** Not for judges. Tracks every gap between
> v1-as-spec'd and v1-as-shipped, with the mitigation already in
> [PM-LOG.md §5](../PM-LOG.md). Update at every commit.
>
> Created D8.5+ (2026-09-27 15:36 WIB). Living document.

This file is the single source of truth for *"what is not yet built."*
If a gap is on this list, it is not built. If a gap is not on this
list, the spec assumes it ships.

---

## Tier 0 — Kernel (DONE)

| Item | State | Evidence |
|---|---|---|
| Anchor `treasury` program compiles | ✅ | `programs/treasury/target/deploy/treasury.so` (217 KB) |
| 4 instructions: `create_policy`, `authorize_spend`, `update_policy`, `record_pnl` | ✅ | `programs/treasury/programs/treasury/src/lib.rs` |
| 8 reason codes (0..7 + reserved 5) | ✅ | `programs/treasury/programs/treasury/src/state/mod.rs` |
| Vendor whitelist (max 16) | ✅ | `instructions/create_policy.rs` + `state/mod.rs::Policy::space(16)` |
| Per-tx / per-day cap | ✅ | `state/mod.rs` + `instructions/authorize_spend.rs`. Daily window resets every 216 000 slots since D10 (was never resetting). |
| Signer check: `authorize_spend` / `record_pnl` require agent or owner | ✅ | D10 — was open to any signer. See `docs/security-model.md` §"Fixed on D10" |
| TTL | ✅ | `authorize_spend.rs` line 71 |
| Leverage cap (`max_leverage_bps`) | ✅ | D7 — `instructions/authorize_spend.rs` line 73 |
| Drawdown kill-switch (`record_pnl` + drawdown check) | ✅ | D8 — `instructions/record_pnl.rs` + `authorize_spend.rs` line 31 |
| 12/12 localnet tests passing (every reason code incl. TTL, signer checks, agent-vs-owner) | ✅ | D10 — `programs/treasury/tests/treasury.ts` |

---

## Tier 1 — Load-bearing for D9/D10 (DONE except dashboard)

| Item | State | Notes |
|---|---|---|
| **`packages/sdk`** — `withTrader` SDK | ✅ D9, fixed D10 | Decodes real AuditEvents (was reporting every call as approved), LE policy decode, `Wallet` wrapper. 11/11 offline tests. `docs/sdk-api.md` rewritten to match. |
| **`packages/agent`** — runtime + evaluator + classifier + `tomb` CLI | ✅ D10 | 16/16 offline tests. Off-chain evaluator lives in `packages/agent/src/evaluator.ts` (the empty `packages/policy-engine` was removed). |
| **Jupiter Perps adapter** | ✅ **paper mode** D10 | `packages/agent/src/venue/jupiter-perps.ts`. Fills simulated at the live Jupiter price with the 6 bps fee; the on-chain gate is real. **Live mode not built** (Jupiter Perps is mainnet-only). |
| **`scripts/demo.sh`** runs end-to-end | ✅ local · ⏳ devnet | `pnpm demo` runs the 9-step story on a local validator in ~20 s. `pnpm devnet:demo` needs ~4 devnet SOL (U1). |
| **`apps/dashboard/`** — Next.js 15 webapp | ✅ D10 | 5 panels per `docs/control-surface.md`: connect, view policy, view audit log, view positions, edit policy. Read-mostly; no approve/deny button by design. Builds clean, serves 200, positions API reads the live paper state. |

---

## Tier 2 — Demo path integrity (D10)

| Item | State | Notes |
|---|---|---|
| Devnet keypair funded (R3) | ⬜ optional | Keypair exists, 0 SOL. **Not required for the demo** — `pnpm demo` uses a local validator (decision 20). Only needed for Solscan-public receipts. Cheapest route: faucet a throwaway keypair, transfer 4 SOL across. |
| Program deployed to devnet | ⬜ optional | `pnpm devnet:demo` deploys automatically once funded. |
| Vendor pubkeys resolved (Jupiter Perps program id) | ✅ mainnet · devnet resolves at boot | PM-LOG §5 R18 — Jupiter Perps mainnet `PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu` (verified executable); Drift v2 `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH`. Zeta discontinued May 2025 (pivoted to Bullet), removed from v1. See `docs/venues.md` §"Vendor pubkey mapping". |
| Surfpool integration test (`s01_full_flow`) | ❌ | `docs/testing-plan.md` Tier 2. **Cut** — the local-validator demo covers the same path with a real validator. |
| Helius API key | ⬜ optional | PM-LOG §6 U2. The demo falls back to direct RPC; Helius only speeds up audit-log indexing. |
| Jupiter API key | ⬜ optional | PM-LOG §6 U3. The paper venue reads the public price endpoint; a key is only needed for live order placement (out of v1 scope). |

---

## Tier 3 — User-test prep (D11)

**Current acceptance status (2026-10-03 WIB): NOT RUN.** The three outside-dev tests have no session evidence. The planned cases are not results; the local demo is a separate engineering check.


| Item | State | Notes |
|---|---|---|
| Three outside-dev test sessions completed | NOT RUN | `docs/user-tests.md` marks all three cases not run as of 2026-10-03 WIB. No privacy-safe tester IDs, configured policies, attempted trades, outcomes, slots/signatures, latency, or reactions are recorded. PM-LOG §5 R19 says testers were not lined up. Recruit three testers and record actual evidence before claiming acceptance. |
| Devnet demo script runnable end-to-end | ⏳ devnet; local run previously recorded | PM-LOG decision 20 records 9/9 local-validator steps on 2026-09-29; this task did not rerun that demo. No devnet user session or receipt is recorded. The current workspace has no `anchor`, `solana`, `rustc`, or `cargo` executable. |
| Three Solscan-verifiable receipts (Approve / Leverage deny / Drawdown deny) | NOT CAPTURED | `docs/demo-receipts.md` and `docs/user-tests.md` contain templates only: no verified signatures or slots are recorded. Local-validator events are not public Solscan receipts. |

---

## Tier 4 — Production (D12-D17)

| Item | State | Notes |
|---|---|---|
| Pitch video (2–3 min) | ❌ | Target D13; script in `design-thinking/pitch-script.md` |
| Demo video (≤ 3 min) | ❌ | Target D14 |
| Weekly 1-min update #1 | ❌ | Target D11/D12 per SPEC §"Iteration cadence" |
| Repo URL on colosseum.com/worldsfair | ❌ | Target D15 |
| Pitch + demo URLs on submission form | ❌ | Target D13-D14 |
| Team location on submission form | ❌ | Target D15 |
| Outside-person link check | ❌ | Target D16 per `docs/gtm-and-submission.md` §10 |
| Submission | ❌ | Target D16 EOD (D17 is buffer) per SPEC §"Iteration cadence" |

---

## Tier 5 — D10+ hardening queue (PM-LOG §5 R14–R16, NOT v1)

| Item | State | Notes |
|---|---|---|
| **Tighten-timelock on `update_policy`** | ❌ | R14 — defends against stolen `owner` key loosening every cap. Honest v2 framing if time runs out. |
| **CPI-wrapper or PDA-bound memo** | ❌ | R15 — Anchor program becomes the *authoritative* enforcer of "follow-through" instead of trusting the SDK. Honest v2 framing if time runs out. |
| **Document "what kills an open position"** | ❌ | R16 — venue liquidation only; the on-chain gate has no concept of an open position. Add to `docs/security-model.md` §"Scenario 2" + `docs/agent-runtime.md`. |
| **Per-market vendor resolution** | ❌ | BRD action #3 — `policy.vendors` is program-id level today, not market level. Defer to v2. |
| **Tighten reason-code drift prevention** | ✅ | Commit `9d284ae` swept public docs; Rust is the canonical source. |

---

## Tier 6 — Already cut / deferred (NOT v1)

| Item | State | Notes |
|---|---|---|
| Telegram bot | v3, never | D8.5+ pivot |
| Discord / Slack bot | v3, never | |
| Mobile app | v3, never | |
| Specialist skill marketplace | v3 (if demand emerges) | `docs/skills-and-algorithms.md` |
| LLM signal generation | v3+ | v1 is for specialists with their own setup |
| Zeta adapter | v2 (stretch only) | `docs/venues.md` |
| LTC bridge | DROPPED D3' | |
| LTC ↔ USDC swap | DROPPED D3' | |
| AgentBazaar MCP | DROPPED D8.5+ | |
| Web2 non-x402 fallback | DROPPED D3' | |

---

## How to use this doc

- **Every morning:** read Tier 1 + Tier 2. Anything there is your
  work for the day.
- **Every commit:** if a gap moved from ❌ to ✅, update this file
  in the same commit.
- **Every D-N review:** check that no Tier 1 / Tier 2 item has
  silently dropped to Tier 5 (the deferred trap).
- **Friday of each week:** re-rank Tier 1 + Tier 2 against the
  upcoming week. Cut anything that's not on the critical path.

If this doc and the rest of the repo disagree, this doc wins
for "what is built" — the code wins for "what is true."

---

Last updated: 2026-10-03 WIB. Existing implementation-status rows above remain the 2026-09-27 snapshot and need code re-verification.

    ## Product-management review — recommended gap section (2026-10-03)

    **Review basis:** [SPEC.md](../SPEC.md), [README.md](../README.md), [user-tests.md](user-tests.md), [agent-runtime.md](agent-runtime.md), and the Anchor authorization/runtime flow. This is a product review, not a test run.

    **PM recommendation:** Treat the current milestone as a paper-trading demo. Do not describe v1 as live, unattended trading or claim that venue execution is unbypassably enforced. Track demo acceptance separately from live-trading readiness. The implementation-status rows above are the 2026-09-27 snapshot; verify them against the current branch before treating them as current.

    Priority meanings: **P0** = resolve before claiming demo acceptance; **P1** = required before a live-money release; **P2** = clarity or operational hardening that should be scheduled before broader use.

    ### Demo acceptance gates

    | Priority | Gap | Recommendation and acceptance criteria |
    |---|---|---|
    | P0 | Leverage acceptance case contradicts its configured policy. Test 1 in user-tests.md sets a 100 bps (1x) cap but expects a 300 bps (3x) trade to approve. | Correct the rule or expected outcome. Given a 100 bps cap, a trade at or below 100 bps approves and a trade above 100 bps is denied with the leverage reason code. Keep the test inputs, expected result, and policy units consistent. |
    | P0 | User-test evidence is not complete in the committed document. Tester, signature, slot, latency, and reaction fields remain placeholders; the gap tracker also reports testers were not lined up. | Run the three planned tests and record actual outcomes and evidence, or mark them not run. Do not treat sample rows as completed validation. For devnet claims, include real transaction links; for local-only tests, label the cluster clearly. |
    | P0 | The PRD calls the daily limit a loss limit, but the program counts approved spend/collateral and does not calculate net daily PnL. | Decide the v1 contract. If the behavior is a spend budget, use spend terminology consistently in SPEC.md, UI, SDK, tests, and docs. If it must be a loss limit, define the PnL source/window and implement tests showing losses—not trade size—consume the limit. |
    | P0 | Project status is inconsistent: README marks the dashboard unbuilt, while the gap tracker and later commit describe it as shipped; the roadmap milestones also need reconciliation. | Make README, this tracker, roadmap, and user-test status agree with the branch. Each completed item should link to code or test evidence; incomplete work should remain visibly open. |
    | P1 | An approval consumes the on-chain daily counter before the venue call. If the venue call fails, the runtime records an error but does not reverse or reconcile that counter. | Decide whether approved-but-unfilled intents intentionally consume budget. Add a forced venue-failure test. The result must be visible to the user and the documented counter behavior must match the implementation. |

    ### Live-trading readiness — explicitly outside the paper-demo gate

    | Priority | Gap | Recommendation and acceptance criteria |
    |---|---|---|
    | P1 | Policy approval is not atomically bound to a venue order. The program records a decision; the runtime performs the separate venue action. | Before live funds, define an on-chain execution design that binds approval to venue, market, amount, leverage, and a non-replayable intent. Test that an unapproved or altered order cannot execute. If that cannot be delivered, narrow the security claim and state the remaining trusted components explicitly. |
    | P1 | Drawdown uses current equity supplied by the runtime, and the kill-switch denies new authorizations rather than closing existing positions. | Specify the trusted equity source, stale-data behavior, and whether “kill” means stop new entries or close positions. Fail closed when required risk data is unavailable. Test threshold crossing and document what happens to every open position. |
    | P1 | Live execution and unattended signal monitoring are not implemented; the current Jupiter adapter is paper mode and samplers are planned. | Keep these out of demo acceptance. For a live product, define the supported signal contract, always-on runtime/restart behavior, live venue adapter, order confirmation/reconciliation, and a user-visible pause/disable path. Acceptance requires end-to-end tests against the intended deployment environment, not only a local paper fill. |
    | P1 | Owner policy updates can loosen caps; this is already identified as a hardening risk. | Decide whether a delay, multisig, or another recovery/control mechanism is required before live use. Keep the current limitation visible until the mitigation is implemented and tested. |
    | P2 | The target audience spans individual traders, prop teams, and signal followers, while the first release and test plan focus on one demo path. | Select one launch persona and validate its workflow first. Keep other audiences as later opportunities unless their requirements change the policy model or control surface. |

    ### PRD recommendations

    1. Add a current version, status, owner, last-reviewed date, and short changelog to SPEC.md. Label historical/pivoted sections and identify one current v1 scope section as authoritative.
    2. Give each v1 requirement a testable acceptance criterion and link it to an implementation/test. Define measurable targets for decision correctness, audit visibility latency, and recovery from failed transactions before claiming them as success metrics.
    3. Keep non-goals explicit: live execution, Drift, automated samplers, and broader team/copy-trading workflows should not silently enter demo scope.
    4. Re-rank this section at each milestone. Only move an item to DONE when code and evidence satisfy its stated acceptance criteria; update the README and roadmap in the same change.

    ### Recommended sequence

    1. Fix the leverage test and decide spend-cap versus loss-cap semantics.
    2. Complete or explicitly defer the outside-user tests; reconcile README, tracker, and roadmap status.
    3. Test and document approved-but-unfilled behavior in the paper demo.
    4. Only after the demo gate is honest and repeatable, scope the separate live-readiness work: execution binding, trustworthy risk inputs, position shutdown behavior, and the live runtime.
    
