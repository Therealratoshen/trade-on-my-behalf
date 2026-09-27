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
| **`apps/dashboard/`** — Next.js webapp | ❌ empty | Design in `docs/control-surface.md`. `tomb watch` is the interim live audit feed. |

---

## Tier 2 — Demo path integrity (D10)

| Item | State | Notes |
|---|---|---|
| Devnet keypair funded (R3) | ❌ | Keypair exists, 0 SOL. Needs ~4 SOL from https://faucet.solana.com (program rent ~1.54 SOL + same-size deploy buffer, refunded). |
| Program deployed to devnet | ❌ | Depends on R3; `pnpm devnet:demo` deploys automatically. |
| Vendor pubkeys resolved (Jupiter Perps program id) | ✅ mainnet · devnet resolves at boot | PM-LOG §5 R18 — Jupiter Perps mainnet `PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu`; Drift v2 `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH`. Zeta discontinued May 2025 (pivoted to Bullet), removed from v1. See `docs/venues.md` §"Vendor pubkey mapping". |
| Surfpool integration test (`s01_full_flow`) | ❌ | `docs/testing-plan.md` Tier 2 |
| Helius API key | ❌ | PM-LOG §6 U2 |
| Jupiter API key | ❌ | PM-LOG §6 U3 |

---

## Tier 3 — User-test prep (D11)

| Item | State | Notes |
|---|---|---|
| 3 outside-dev testers lined up | ❌ | PM-LOG §5 R19 — DM 5–10 Solana devs now |
| Devnet demo script runnable end-to-end | ✅ local · ⏳ devnet | Blocked only by devnet SOL |
| Three Solscan-verifiable receipts (Approve / Leverage deny / Drawdown deny) | ⏳ | `pnpm devnet:demo` produces all three once funded; paste links into `docs/demo-receipts.md` |

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

Last updated: 2026-09-27 23:00 WIB (D10).