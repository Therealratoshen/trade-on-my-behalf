# Testing Plan — Source Inventory, Required Coverage and Evidence

Updated 2026-10-03. **No code tests were executed in this documentation update.** Test-source counts below are not pass counts. Historical local-demo reports do not substitute for current automated runs, public devnet receipts or human sessions.

## Authoritative links

[PRD](../PRD.md) → [TRD](../TRD.md) → [unit scenarios](unit-testing.md) → [E2E scenarios](e2e-testing.md) → [human sessions](user-tests.md) → [captured receipts](demo-receipts.md).

## Actual checked-in inventory

| Layer | Existing files | Defined cases | Current run status |
|---|---|---|---|
| Anchor/validator integration | `programs/treasury/tests/treasury.ts` | 12 `it` cases | NOT RUN in this update |
| SDK offline unit tests | `packages/sdk/tests/derivePolicyPda.test.ts`, `decode.test.ts` | 11 `test` cases | NOT RUN in this update |
| Agent offline tests | `packages/agent/tests/evaluator.test.ts`, `runtime.test.ts` | 17 `test` cases | NOT RUN in this update |
| Local CLI/system demo | `scripts/demo.sh`, `pnpm demo` | Nine-step demonstration, not browser E2E | Historical report only; NOT RERUN |
| Browser E2E | No checked-in browser test harness/suite | None | NOT IMPLEMENTED |
| Public devnet venue E2E | No implemented real venue adapter | None | BLOCKED |
| Outside-developer sessions | Three planned cases in `user-tests.md` | None recorded | NOT RUN |
| CI execution workflow | No `.github/workflows` test workflow in reviewed source | None | NOT IMPLEMENTED; separate CI work remains |

Earlier references to `tests/litesvm.rs`, `tests/surfpool/*.spec.ts`, `pnpm test:surfpool`, nightly integration or already-measured coverage were plans, not implemented evidence. LiteSVM/Mollusk/Surfpool can be evaluated later; they are not the present harness.

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
pnpm install
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
