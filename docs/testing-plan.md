# Testing Plan — Source Inventory, Required Coverage and Evidence

Updated 2026-10-03. **Fresh main-baseline rerun: SDK 11/11 and agent 17/17 PASS; lint and build exit 0. Program rerun and fresh IDL regeneration: BLOCKED by missing SBF build tooling.** Exact revision, tool versions, commands, exits and committed logs are in the [release evidence ledger](release-evidence-2026-10-03.md). Defined cases are not additional passes. Owner-reported baseline results and earlier draft-PR results are separate evidence sets, not public-devnet or human-session proof.

## Authoritative links

[PRD](../PRD.md) → [TRD](../TRD.md) → [unit scenarios](unit-testing.md) → [E2E scenarios](e2e-testing.md) → [human sessions](user-tests.md) → [captured receipts](demo-receipts.md).

## Actual checked-in inventory

| Layer | Existing files | Defined cases | Current run status |
|---|---|---|---|
| Anchor/validator integration | `programs/treasury/tests/treasury.ts` | 12 `it` cases on tested main baseline | BLOCKED / NOT RUN: fresh SBF binary unavailable |
| SDK offline unit tests | `packages/sdk/tests/derivePolicyPda.test.ts`, `decode.test.ts` | 11 `test` cases | PASS: 11/11 at `8c6e769df1fe5263f3a682fadfe5f7580e2b0c6b` |
| Agent offline tests | `packages/agent/tests/evaluator.test.ts`, `runtime.test.ts` | 17 `test` cases | PASS: 17/17 at the same main baseline |
| Local CLI/system demo | `scripts/demo.sh`, `pnpm demo` | Nine-step demonstration, not browser E2E | NOT RUN: historical report only; fresh program build blocked |
| Browser E2E | No checked-in browser test harness/suite | None | NOT IMPLEMENTED |
| Public devnet venue E2E | No implemented real venue adapter | None | BLOCKED |
| Outside-developer sessions | Three planned cases in `user-tests.md` | None recorded | NOT RUN |
| CI execution workflow | No `.github/workflows` test workflow in reviewed source | None | NOT IMPLEMENTED; separate CI work remains |

Earlier references to `tests/litesvm.rs`, `tests/surfpool/*.spec.ts`, `pnpm test:surfpool`, nightly integration or already-measured coverage were plans, not implemented evidence. LiteSVM/Mollusk/Surfpool can be evaluated later; they are not the present harness.

## Executed versus reported results

The current executed total is **28 offline tests**, not 40 program-plus-unit tests and not the draft PR's 14 program tests added to this baseline. `pnpm -r test` only reaches the root pnpm workspace's SDK and agent test scripts; it does not execute the nested Anchor suite.

The owner supplied a separate 40-test baseline report on 2026-10-03. Draft PR #2 has a separate earlier 14-case local-validator report. See the [ledger](release-evidence-2026-10-03.md) for attribution, pinned source/report links, missing execution metadata, and this update's actual blockers. Neither report upgrades the current public-devnet, venue or human-session status.

## Pyramid and isolation

1. Deterministic unit tests for precision, evaluation, classification, parsing and persistence.
2. Local-validator program/SDK/runtime integration with controlled slot boundaries and deterministic prices.
3. Browser E2E with an isolated test wallet adapter and fixture RPC/venue data.
4. Public **devnet** integration for deployed program identity, test collateral, actual orders/fills/close and recovery.
5. Three consenting outside-developer sessions with actual recorded evidence.

Mock/paper success does not pass the real-venue layer. Public devnet outages are an environment blocker, not a pass. Local validator checks are labelled local.

## Existing commands, not results

Run only in a normal checkout of this repository with Node 20+, pinned pnpm, Anchor/Solana/Rust toolchains installed:

```bash
pnpm install --frozen-lockfile
pnpm --filter @trade-on-my-behalf/sdk build
pnpm --filter @trade-on-my-behalf/agent build
pnpm --filter @trade-on-my-behalf/sdk test
pnpm --filter @trade-on-my-behalf/agent test
(cd programs/treasury && anchor build && anchor test --provider.cluster localnet)
pnpm --filter @trade-on-my-behalf/dashboard build
pnpm demo
```

After a program/IDL change:

```bash
(cd programs/treasury && anchor build)
pnpm --filter @trade-on-my-behalf/sdk run sync-idl
```

Rebuild dependent packages before their tests. `pnpm devnet:demo` deploys/uses Treasury and produces **paper** venue fills; review its deploy/key/toolchain requirements first. It is not a devnet venue-order test. No browser-test command is documented as runnable until that harness exists.

The provider in the tested source defaults to devnet. Never run plain `anchor test` for an offline check: select localnet explicitly and supply an explicitly generated disposable wallet instead of the owner's default key. Root `anchor:build` / `anchor:test` currently do not select the nested program workspace; their repair and CI enforcement remain separate work. This update did not change deployment settings or run any public write.

## Coverage and CI requirements — proposed

- Every critical requirement must map to positive, negative, boundary and recovery cases.
- Compare evaluator versus program at exact integer/slot boundaries; line coverage alone cannot prove policy-to-venue enforcement.
- Gate merges on reproducible offline/local-validator checks after CI is implemented.
- Keep opt-in public-devnet checks separate from deterministic merge checks; never put mainnet signing in a test job.
- Store revision/tool versions, named test cases, command, exit status, logs and environment. Do not publish private keys or participant PII.
- No numeric coverage percentage or passing-test count is claimed until a real report exists.

## Result vocabulary and release rule

Use **DEFINED**, **PLANNED**, **NOT IMPLEMENTED**, **NOT RUN**, **BLOCKED**, **PASS** or **FAIL**. PASS/FAIL require actual execution and artifacts. Expected outcome belongs in a scenario, not in an observed-result field.

Critical failing/unimplemented execution, identity, precision, privacy or replay tests block a real-trading release. A paper-only release must explicitly retain its simulation limitation.
