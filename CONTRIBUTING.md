# Contributing to Terading

Updated 2026-10-03. Start with [PRD](PRD.md), [TRD](TRD.md) and the [documentation index](docs/documentation-index.md).

## Scope and safety

All app signing/deposits/trades target verified Solana devnet using test assets. Local validators are allowed for isolated tests. No mainnet execution, silent venue fallback, uploaded private keys or simulated fills presented as real.

Do not describe current authorization as venue custody enforcement. Preserve distinction among local preflight, committed policy decision, transaction status and venue fill.

## Build and test

Use Node 20+ and the repository's pinned package manager. Run documented existing commands in [testing-plan.md](docs/testing-plan.md). Program tests currently use `programs/treasury/tests/treasury.ts` under Anchor/local validator; no claimed LiteSVM/Surfpool/browser suite or CI should be assumed.

After program changes, rebuild and run SDK `sync-idl`, rebuild dependent packages and verify IDL/program identity. Do not commit private keys or generated key material.

## Change expectations

- Map a change to PRD/TRD requirements and relevant [unit](docs/unit-testing.md)/[E2E](docs/e2e-testing.md) cases.
- Preserve budget usage/reset/creation semantics on policy edits unless an explicitly approved migration changes them.
- Validate exact integer money, market/account ownership and network identity before signatures.
- Make retries idempotent and reconcile uncertain submissions before new orders.
- Keep storage account-scoped and receipts free of secrets, PII and local paths.
- Update current documentation and record actual test commands/results; do not convert planned cases into passes.

## Reporting a failure

Include requirement/case ID, source revision, local/devnet environment, expected versus observed behavior, redacted logs and transaction signature when applicable. Never include a private key or secret RPC URL.

## Documentation policy

PRD/TRD and current reference sections supersede historical research/pitch schedules. Archives retain their dated contents with historical labels. [Testing plan](docs/testing-plan.md) is the test-status authority; CI improvements remain separate implementation work.

MIT license.
