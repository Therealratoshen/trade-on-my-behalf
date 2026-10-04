# Testing Plan — Source Inventory, Required Coverage and Evidence

Updated 2026-10-03. Re-verified 2026-10-04: the three automated suites were re-counted from source (20 / 31 / 37 = 88 `it`/`test` cases) and all three were executed locally — the Anchor suite against a local validator from a cleaned `target/`, the SDK and agent suites offline — and `pnpm demo` ran end-to-end. The CI run for revision `d293398` was inspected and both jobs report success. Counts and PASS statuses below are backed by the executed-run record in [Executed-run record](#executed-run-record). Historical local-demo reports still do not substitute for public devnet receipts or human sessions.

## Authoritative links

[PRD](../PRD.md) → [TRD](../TRD.md) → [unit scenarios](unit-testing.md) → [E2E scenarios](e2e-testing.md) → [human sessions](user-tests.md) → [captured receipts](demo-receipts.md).

## Actual checked-in inventory

| Layer | Existing files | Defined cases | Current run status |
|---|---|---|---|
| Anchor/validator integration | `programs/treasury/tests/treasury.ts` | 20 `it` cases | PASS — 20/20 executed locally 2026-10-04, and green in CI — see [run record](#executed-run-record) |
| SDK offline unit tests | `packages/sdk/tests/derivePolicyPda.test.ts`, `decode.test.ts`, `ensurePolicyOwnership.test.ts`, `registration.test.ts` | 31 `test` cases | PASS — 31/31 executed 2026-10-04 |
| Agent offline tests | `packages/agent/tests/evaluator.test.ts`, `runtime.test.ts`, `policyState.test.ts` | 37 `test` cases | PASS — 37/37 executed 2026-10-04 |
| Local CLI/system demo | `scripts/demo.sh`, `pnpm demo` | Nine-step demonstration, not browser E2E | PASS — ran end-to-end 2026-10-04; see [run record](#executed-run-record) |
| Browser E2E | No checked-in browser test harness/suite | None | NOT IMPLEMENTED |
| Public devnet venue E2E | No implemented real venue adapter | None | BLOCKED |
| Outside-developer sessions | Three planned cases in `user-tests.md` | None recorded | NOT RUN |
| CI execution workflow | `.github/workflows/ci.yml` — committed, `SDK + agent tests` and `Anchor program tests` jobs | Both jobs execute on every push and pull request | PASS — both jobs success on revision `d293398` |

Earlier references to `tests/litesvm.rs`, `tests/surfpool/*.spec.ts`, `pnpm test:surfpool`, nightly integration or already-measured coverage were plans, not implemented evidence. LiteSVM/Mollusk/Surfpool can be evaluated later; they are not the present harness.

**Case counts are read from the test source; PASS statuses are not.** The 88 cases above are counted by reading the test files. The PASS rows are backed by the executed-run record below. The rows marked NOT RUN, NOT IMPLEMENTED, BLOCKED or NOT CAPTURED still have no exit status against the current revision, so per the release rule below none of them is marked PASS or FAIL.

<a id="executed-run-record"></a>
## Executed-run record

Per the release rule, PASS/FAIL require actual execution and artifacts. This is the record behind the PASS rows above.

- **Anchor program tests — PASS, 20/20.** Executed locally on 2026-10-04 from a cleaned `target/`
  (`rm -rf programs/treasury/target && anchor build`), against a local validator with the program
  preloaded and a throwaway wallet in a temp directory, with `Anchor.toml` left at
  `cluster = "devnet"` and the suite invoked as
  `pnpm exec ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts`. Result `20 passing (33s)`. It is
  also green in CI: the `Anchor program tests` job reported `success` on the `main` push for
  revision `d293398`, <https://github.com/Therealratoshen/trade-on-my-behalf/actions/runs/37203451979>.
  The job runs a local validator; it is not a public-cluster result.
- **SDK offline unit tests — PASS, 31/31.** `pnpm --filter @trade-on-my-behalf/sdk test`, 2026-10-04, exit 0, `pass 31 / fail 0`.
- **Agent offline unit tests — PASS, 37/37.** `pnpm --filter @trade-on-my-behalf/agent test`, 2026-10-04, exit 0, `pass 37 / fail 0`.
- **`pnpm demo` — PASS, all nine steps.** Run 2026-10-04 with a throwaway `OWNER_KEY`; each step
  produced its documented outcome. The devnet-write guard added in `01940a2` had been blocking every
  write because `scripts/demo.sh` never passed `--local-validator`; fixed there and re-verified.
- **CI workflow — PASS.** Both jobs (`SDK + agent tests`, `Anchor program tests`) reported `success` on the run cited above.

Still owed, and not claimed here: a browser E2E harness; public devnet receipts; three
outside-developer sessions; any real venue adapter.

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
(cd programs/treasury && anchor build)
(cd programs/treasury && pnpm exec ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts)
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
- Gate merges on reproducible offline/local-validator checks. CI now enforces this: `.github/workflows/ci.yml` runs `SDK + agent tests` and `Anchor program tests` on every push and pull request, and the ruleset requires both to pass before merge.
- Keep opt-in public-devnet checks separate from deterministic merge checks; never put mainnet signing in a test job.
- Store revision/tool versions, named test cases, command, exit status, logs and environment. Do not publish private keys or participant PII.
- No numeric coverage percentage is claimed: no coverage report exists. Passing-test counts are claimed only where an executed-run record above backs them.

## Result vocabulary and release rule

Use **DEFINED**, **PLANNED**, **NOT IMPLEMENTED**, **NOT RUN**, **BLOCKED**, **PASS** or **FAIL**. PASS/FAIL require actual execution and artifacts. Expected outcome belongs in a scenario, not in an observed-result field.

Critical failing/unimplemented execution, identity, precision, privacy or replay tests block a real-trading release. A paper-only release must explicitly retain its simulation limitation.
