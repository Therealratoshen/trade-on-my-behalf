# Testing Plan — Anchor Testing Pyramid

> Frozen for D6. References the `solana-dev` skill (testing section)
> for the LiteSVM / Surfpool / Mollusk toolbox.

The product has three testing surfaces:

1. **Anchor program** — Rust tests against the policy gate.
2. **SDK + agent runtime** — TypeScript tests against the off-chain
   mirror and the venue adapters.
3. **Outside-dev user tests** — three humans run the devnet demo
   script end-to-end on D10-D11.

The shape mirrors the Anchor testing pyramid from the `solana-dev`
skill: **LiteSVM** for fast unit tests in the same process as the
program, **Surfpool** for integration against mainnet-fork state
with cheatcodes (`surfnet_setTime`, `surfnet_setPrice`, etc.), and
**Mollusk** for raw instruction harnesses when compute profiling is
the goal.

## Pyramid

```text
                         ▲
                        /  \
                       / 3. \      outside-dev user tests (D10-D11)
                      /------\     3 testers, devnet demo script
                     /   2.   \    Surfpool integration
                    / (D8-D10)  \   mainnet fork + cheatcodes, full CPI to Jupiter / Drift
                   /--------------\
                  /      1.        \    LiteSVM unit tests
                 /    (D6-D8)       \   policy gate, reason codes, edge cases
                /____________________\
```

## Tier 1 — LiteSVM unit tests

Goal: prove the Anchor program enforces every rule, every time.

File: `programs/treasury/tests/litesvm.rs` (D6-D7).

Test cases:

| ID | Test | Expect |
|---|---|---|
| `t01_create_policy` | Create with 1 vendor, $100 tx cap, $200 day cap, 1_000_000 slot TTL | Policy PDA exists; fields match; bump stored. |
| `t02_deny_unknown_vendor` | Authorize against a vendor not in `policy.vendors` | `REASON_VENDOR_DENIED`, `approved: false`, `day_spent_usdc` unchanged. |
| `t03_deny_per_tx_cap` | Authorize `amount_usdc > per_tx_cap_usdc` | `REASON_PER_TX_CAP`, `approved: false`. |
| `t04_deny_daily_cap` | First approve $60, second approve $150 with $200 cap | First `REASON_OK` + `day_spent_usdc = 60`; second `REASON_DAILY_CAP`, `day_spent_usdc` still 60. |
| `t05_deny_expired` | Authorize at slot `created_at_slot + ttl_slots + 1` | `REASON_EXPIRED`. |
| `t06_too_many_vendors` | `create_policy` with 17 vendors | Anchor error `TooManyVendors` (6000). |
| `t07_event_always_emits` | Approve and deny both produce `AuditEvent` | Two events, distinct nonces, same shape. |
| `t08_saturating_add` | `day_spent_usdc` near u64::MAX | No panic; spend either fits or fails `REASON_DAILY_CAP`. |
| `t09_pda_collision` | Two `create_policy` calls with the same `agent` | Second fails (PDA already initialized). |

LiteSVM boots in-process, no validator required, runs in ~200 ms for
the whole suite. CI runs these on every push.

## Tier 2 — Surfpool integration tests

Goal: prove the off-chain policy evaluator mirrors the chain, the
runtime's authorize-then-CPI flow submits cleanly, and the venue
adapters actually move money on a forked mainnet.

File: `tests/surfpool/*.spec.ts` (D8-D10).

Boot:

```ts
import { createClient } from '@solana/kit';
import { surfpool } from '@solana/surfpool/kit';

const client = await createClient().use(surfpool());
```

Surfpool forks mainnet-beta lazily, so Jupiter Perps and Drift
programs are addressable with real CPIs.

Test cases:

| ID | Test | Cheatcode used | Expect |
|---|---|---|---|
| `s01_full_flow` | Create policy, authorize a $100 spend, submit Jupiter Perps CPI | – | Tx confirms; Jupiter position open; `AuditEvent` indexed. |
| `s02_deny_mirror` | Off-chain evaluator denies; `authorize_spend` not called | – | No transaction; runtime emits `AuditEventView` off-chain. |
| `s03_drift_fallback` | Force Jupiter Perps quote to fail; reroute to Drift | `surfnet_setTime`, `surfnet_setPrice` | Drift tx confirms; AuditEvent vendor pubkey matches Drift config. |
| `s04_daily_cap_on_chain` | Spam 3 spends totaling $250 against a $200 cap | – | First 2 approved; third denied with `REASON_DAILY_CAP`. |
| `s05_kill_switch` | D7 stretch: set `kill_switch: true`, authorize | – | `REASON_DRAWDOWN_KILLSWITCH`. |
| `s06_simulate_before_send` | Force the venue tx to fail simulation | – | Runtime never signs; `AuditEvent` from the chain is `approved:true` but the venue tx is dropped; dashboard shows the mismatch. |
| `s07_v1_tx_format` | Submit a v1 transaction with `authorize_spend` + Jupiter CPI | – | Confirms; sized under 4096 bytes. |
| `s08_pieverse_receipt` | D14 stretch: fill a position; assert the per-fill receipt POSTs to a fake x402b receiver | – | Receipt shape matches docs/audit-and-receipts.md. |

Surfpool tests run against the local cluster the `anchor test` runner
spins up. CI runs these nightly and on every push to `main`.

## Tier 3 — Outside-dev user tests

> **Current status (2026-10-03 WIB): NOT RUN.** The D10–D11 target window passed without recorded outside-dev sessions. `docs/user-tests.md` marks all three cases not run; there are no tester IDs, configured policies, attempted trades, observed outcomes, transaction signatures/slots, latency measurements, or reactions. Previous local-demo results are separate engineering evidence and do not count as these user tests or as devnet receipts.


Goal: prove the devnet demo script works for a human who has never
seen the repo. Three outside devs (friends, not on the team) run it
end-to-end on D10-D11.

Test script: `docs/user-tests.md` (filled by the tester, not us).
Each completed test logs a privacy-safe tester ID (not a name, handle, or wallet address), the exact policy configured, the trades actually attempted, the observed outcome and `AuditEvent`, and available receipt/latency evidence. Append actual results to `docs/user-tests.md` without embellishment. Expected results in that file are assertions, not observations.

## Coverage targets

- Anchor program: 100% line coverage on `instructions/authorize_spend.rs`
  and `instructions/create_policy.rs`. The errors module is covered
  by the `t06_too_many_vendors` test and by property tests that
  enumerate all `REASON_*` codes.
- Off-chain mirror: snapshot tests for every `reasonCode` permutation.
- Runtime: integration test (`s01_full_flow`) is the canonical "the
  whole thing works" check.

## What's deliberately out of scope for tests

- **Fuzz testing.** The `solana-dev` skill lists Trident and
  cargo-fuzz as the tools. We do not have the time budget for a
  fuzz harness before D17. The MVP relies on the explicit test cases
  above; a v2 commit adds Trident.
- **Compute profiling.** Mollusk would tell us the per-instruction
  CU usage. The treasury program is small enough (one ix, ~3k CU)
  that we do not profile until a venue adapter shows up that pushes
  the resource limit.

## CI wiring

GitHub Actions (or equivalent) runs:

1. `cargo test --workspace` for Tier 1 LiteSVM tests on every push.
2. `pnpm install && pnpm test:surfpool` for Tier 2 on every PR.
3. Nightly: re-run Tier 2 against the latest mainnet-beta snapshot
   to catch upstream program changes.

The outside-dev user tests run on D10-D11 only and are not in CI.
They live in `docs/user-tests.md` and are read by judges, not bots.