# Terading

> A Solana devnet-first perps terminal in development, with an existing on-chain policy demo and **simulated** Jupiter positions.

The product name is **Terading**. The GitHub repository slug and the `@trade-on-my-behalf/*` package names still carry the original working name, *Trade On My Behalf*; those are stable identifiers, not current branding.

## What exists today

An Anchor policy program, TypeScript SDK, classifier/evaluator/runtime, `tomb` CLI and Next.js wallet/policy/audit viewer with owner-signed policy edits. The Jupiter adapter is **paper only**: it uses a spot reference-price feed and a simplified fee/PnL model; no order reaches Jupiter.

The program checks caller-supplied authorization fields. It does **not** custody funds. Current drawdown compares runtime-supplied equity, not verified venue equity. Do not interpret a policy approval as a fill or an unbypassable wallet-wide trading guarantee.

### Execution binding: off-chain, and what that means

The runtime mints a `SpendPermit` from each approved `AuditEvent` and the venue adapter
requires it. `Venue.openPosition` recomputes the binding itself and refuses to fill on a
missing, forged, mismatched or replayed permit — a $50 permit cannot open a $500 position,
and a spent `nonce` cannot be reused. See `packages/agent/src/venue/permit.ts`.

**The binding is enforced in this repository's own code, not on chain.** The treasury program
never sees a permit: `authorize_spend` still does not consume the nonce, and its `AuditEvent`
does not echo `market` or `side`. A separate process that skips this runtime can still trade.
The claim this supports is **"the runtime will not execute what it did not approve"** — not
"on-chain, an unapproved execution is impossible". The on-chain follow-up is recorded in
[security model](docs/security-model.md).

### Chart and ticket: what exists, and the boundary

Both are implemented and rendered by `MarketWorkspace`:

- `components/MarketChart.tsx` — a SOL-PERP **quote view** driven by the live spot reference series. It is a price chart, not a venue position view; it shows no open interest, funding or liquidation levels.
- `components/TradeTicket.tsx` — a **draft and preview** surface, labelled `preview only`. It computes notional, fee and the effective cap/leverage limits, disables its control with a stated reason when the policy or quote is missing, and deliberately has **no approve or submit affordance**. It cannot decide anything and cannot override the kernel.

**Neither submits an order.** No path in the dashboard builds or sends a trade transaction; the policy verdict arrives only as an on-chain `AuditEvent` in the audit panel. The order lifecycle (reduction, close, cancel) and a real venue adapter remain unimplemented.

## Current scope and blockers

The requested product is one devnet perpetual-trading workspace: wallet connection, default SOL-PERP chart, trade ticket, risk visibility, account-scoped positions and receipts. A default SOL-PERP chart and a trade ticket now exist as read/preview surfaces — see below. A real devnet adapter, enforced on-chain execution authority, durable recovery and scoped paper storage are **not implemented**.

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

Source defines **20 Anchor/validator, 31 SDK and 62 agent** test cases (113 total). The three suites were re-run locally on 2026-10-04 — the Anchor suite against a local validator with a throwaway wallet from a cleaned `target/`, the SDK and agent suites offline — all passing; see the executed-run record in [testing-plan](docs/testing-plan.md) for commands, results and the cited CI run. The historical demo assets are not proof of public-devnet execution or completed human tests.

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
