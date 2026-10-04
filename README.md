# Terading

> A Solana devnet-first perps terminal in development, with an existing on-chain policy demo and **simulated** Jupiter positions.

The product name is **Terading**. The GitHub repository slug and the `@trade-on-my-behalf/*` package names still carry the original working name, *Trade On My Behalf*; those are stable identifiers, not current branding.

## What exists today

An Anchor policy program, TypeScript SDK, classifier/evaluator/runtime, `tomb` CLI and Next.js wallet/policy/audit viewer with owner-signed policy edits. The Jupiter adapter is **paper only**: it uses a spot reference-price feed and a simplified fee/PnL model; no order reaches Jupiter.

The program checks caller-supplied authorization fields. It does **not** custody funds or bind a separate venue action. Current drawdown compares runtime-supplied equity, not verified venue equity. Do not interpret a policy approval as a fill or an unbypassable wallet-wide trading guarantee.

## Current scope and blockers

The requested product is one devnet perpetual-trading workspace: wallet connection, default SOL-PERP chart, trade ticket, risk visibility, account-scoped positions and receipts. Chart/ticket, real devnet adapter, enforced execution authority, durable recovery and scoped paper storage are **not implemented**.

The configured Treasury address was absent in the 2026-10-03 devnet observation. The Jupiter address was not executable there. Legacy Drift/current Velocity programs existed, but a usable market/faucet/order/close path was not verified. [Devnet readiness](docs/devnet-readiness.md) records the exact boundary.

All product signing/deposits/trades must remain devnet with test assets; local validators are permitted for tests. The current code still needs an end-to-end network guard.

## Read the current requirements

- [PRD.md](PRD.md): product scope, roles, requirements and release gates.
- [TRD.md](TRD.md): exact current contracts, gaps and target architecture.
- [Documentation index](docs/documentation-index.md): current versus historical documents.
- [Architecture](docs/architecture.md) and [security model](docs/security-model.md).
- [Testing plan](docs/testing-plan.md), [unit cases](docs/unit-testing.md), [E2E cases](docs/e2e-testing.md).
- [User sessions](docs/user-tests.md) and [receipts](docs/demo-receipts.md): NOT RUN / NOT CAPTURED until evidence exists.

## Run existing checks

See [onboarding](docs/onboarding.md) for prerequisites. These are commands, not newly verified pass claims:

```bash
pnpm install
pnpm --filter @trade-on-my-behalf/sdk build
pnpm --filter @trade-on-my-behalf/agent build
pnpm --filter @trade-on-my-behalf/sdk test
pnpm --filter @trade-on-my-behalf/agent test
(cd programs/treasury && anchor build)
(cd programs/treasury && pnpm exec ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts)
pnpm --filter @trade-on-my-behalf/dashboard dev
pnpm demo
```

The Anchor suite talks to a **local** validator, not a public cluster. `Anchor.toml` commits
`provider.cluster = "devnet"`, and `anchor test` reads that field to decide where to deploy — so
run the test script directly against a `solana-test-validator` with the program preloaded, and
point `ANCHOR_PROVIDER_URL`/`ANCHOR_WALLET` at a **throwaway** keypair. Never point
`ANCHOR_WALLET` at `~/.config/solana/id.json`, and never run `anchor deploy` against a public
cluster.

`pnpm demo` uses a local validator for policy transactions and paper positions, and takes no real SOL — pass a throwaway `OWNER_KEY`. `pnpm devnet:demo` needs deploy tooling/test SOL and still produces paper positions, not Jupiter devnet orders.

CI is checked in: `.github/workflows/ci.yml` runs `SDK + agent tests` and `Anchor program tests` on every push and pull request to `main`, and the ruleset requires both to pass before merge. Both jobs reported `success` on revision `d293398`: <https://github.com/Therealratoshen/trade-on-my-behalf/actions/runs/37203451979>. A browser E2E suite is still not implemented.

Source defines **20 Anchor/validator, 31 SDK and 37 agent** test cases (88 total). The SDK and agent suites were re-run locally and the Anchor suite re-run against a local validator on 2026-10-04, all passing; see the executed-run record in [testing-plan](docs/testing-plan.md) for commands, results and the cited CI run. The historical demo assets are not proof of public-devnet execution or completed human tests.

For a task-by-task walkthrough with real output, see the [user manual](docs/user-manual.md) and [user journey](docs/user-journey.md).

## Budget semantics

The daily cap is an **approved-collateral budget** in a lazy 216,000-slot interval, not a guaranteed daily maximum loss. Fees/funding/notional/old positions are not independently capped. Approved authorization can consume budget even if the later venue step fails. Owner policy edits preserve counters and creation/reset slots.

## Repository

`programs/treasury` — policy program and validator tests  
`packages/sdk` — policy SDK  
`packages/agent` — runtime, CLI and paper venue  
`apps/dashboard` — viewer and policy editor  
`scripts/demo.sh` — local/devnet policy + paper demonstration  
`docs` — current references, testing plans and labelled historical research

## License

MIT. Submission claims must follow [SUBMISSION.md](SUBMISSION.md), not aspirational implementation descriptions.
