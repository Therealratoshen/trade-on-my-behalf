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
| Anchor `treasury` program compiles | ✅ | `programs/treasury/target/deploy/treasury.so` (209 KB) |
| 4 instructions: `create_policy`, `authorize_spend`, `update_policy`, `record_pnl` | ✅ | `programs/treasury/programs/treasury/src/lib.rs` |
| 8 reason codes (0..7 + reserved 5) | ✅ | `programs/treasury/programs/treasury/src/state/mod.rs` |
| Vendor whitelist (max 16) | ✅ | `instructions/create_policy.rs` + `state/mod.rs::Policy::space(16)` |
| Per-tx / per-day cap | ✅ | `state/mod.rs` + `instructions/authorize_spend.rs` |
| TTL | ✅ | `authorize_spend.rs` line 71 |
| Leverage cap (`max_leverage_bps`) | ✅ | D7 — `instructions/authorize_spend.rs` line 73 |
| Drawdown kill-switch (`record_pnl` + drawdown check) | ✅ | D8 — `instructions/record_pnl.rs` + `authorize_spend.rs` line 31 |
| 6/6 LiteSVM tests passing | ✅ | D8.5 — commit `d35ce2e` |

---

## Tier 1 — Load-bearing for D9 (NOT DONE — the wedge gate)

| Item | State | Blocker for | Notes |
|---|---|---|---|
| **`packages/sdk/src/`** — `withTrader(wallet, rules)` SDK | ❌ empty | D9 | `packages/sdk/src/.gitkeep` only. API surface drafted in `docs/sdk-api.md`. |
| **`packages/agent/src/`** — trader runtime | ❌ empty | D9 | `packages/agent/src/.gitkeep` only. Runtime flow drafted in `docs/agent-runtime.md`. |
| **`packages/policy-engine/src/`** — off-chain rule evaluator | ❌ empty | D9 | `packages/policy-engine/src/.gitkeep` only. |
| **`packages/venues/jupiter-perps.ts`** — primary venue adapter | ❌ | D9 | `packages/agent/src/venue/jupiter-perps.ts` does not exist. The devnet demo cannot push a real trade without it. |
| **`apps/dashboard/`** — Next.js 15 webapp (5 panels) | ❌ empty | D9 | `apps/dashboard/{app,components,lib}/.gitkeep` only. Design drafted in `docs/control-surface.md`. |
| **`scripts/devnet-demo.sh`** actually runs | ❌ fails loud | D9 | Script rewritten to fail loudly with diagnostic per-step until D9 ships. |

---

## Tier 2 — Demo path integrity (D10)

| Item | State | Notes |
|---|---|---|
| Devnet keypair generated + SOL airdropped (R3) | ❌ | PM-LOG §5 R3 — **certain blocker** |
| Program deployed to devnet | ❌ | Depends on R3 |
| Vendor pubkeys resolved (Jupiter Perps program id) | ❌ | PM-LOG §5 R18 — `docs/venues.md` §"Vendor pubkey mapping" lists TBD |
| Surfpool integration test (`s01_full_flow`) | ❌ | `docs/testing-plan.md` Tier 2 |
| Helius API key | ❌ | PM-LOG §6 U2 |
| Jupiter API key | ❌ | PM-LOG §6 U3 |

---

## Tier 3 — User-test prep (D11)

| Item | State | Notes |
|---|---|---|
| 3 outside-dev testers lined up | ❌ | PM-LOG §5 R19 — DM 5–10 Solana devs now |
| Devnet demo script runnable end-to-end | ❌ | Blocked by Tier 1 |
| Three Solscan-verifiable receipts (Approve / Leverage deny / Drawdown deny) | ❌ | `docs/demo-receipts.md` placeholders |

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

Last updated: 2026-09-27 15:36 WIB (D8.5+).