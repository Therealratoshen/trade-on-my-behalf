# Demo Receipts — Evidence Register

Updated 2026-10-03. **Public-devnet policy receipts: NOT CAPTURED. Real venue fill/close receipts: NOT IMPLEMENTED / NOT CAPTURED.**

## Evidence boundaries

PM-LOG historically reports a 2026-09-29 local-validator nine-step demonstration. Existing demo transcript/HTML/PNG assets are historical local engineering evidence; they were not rerun or authenticated as public-devnet venue execution in this documentation update.

Three outside-developer sessions are [NOT RUN](user-tests.md). Read-only devnet account checks in [readiness](devnet-readiness.md) are observations, not transaction receipts.

## Planned receipt register

| Case | Expected observation, not an actual result | Signature / slot | Status |
|---|---|---|---|
| Compliant authorization | Committed `approved: true`, code 0 and correct collateral-budget increment | NOT CAPTURED | NOT RUN |
| Leverage denial | Committed `approved: false`, code 6; no same-window budget increment or venue attempt | NOT CAPTURED | NOT RUN |
| Drawdown comparison denial | Code 7 when supplied equity below threshold; explicitly not independent venue-equity proof | NOT CAPTURED | NOT RUN |
| Real venue order/fill | Actual supported devnet order/fill and reconciled position | NOT CAPTURED | BLOCKED |
| Reduce/close | Actual devnet venue signature and residual position/account state | NOT CAPTURED | BLOCKED |

## Capture procedure

Record source revision, environment/genesis, program/venue/account role, actual configured policy, attempted action, submitted signature, commitment, `meta.err`, slot, decoded event and resulting policy/position state. Distinguish requested and filled size; preserve uncertainty until reconciled.

For devnet signatures use `https://explorer.solana.com/tx/<actual-signature>?cluster=devnet`. Local-validator transactions are not indexed by the public devnet explorer. `paper:` IDs are not blockchain signatures.

Measure audit latency from explicit timestamps and report method. Never substitute expected values, placeholders, local receipts or fabricated tester reactions for observation.

## What these receipts cannot prove alone

A policy authorization does not prove a venue fill, custody binding, replay resistance, authenticated risk or guaranteed loss ceiling. `approved:false` can be in a successful Solana transaction. Logs from a rolled-back transaction do not prove a committed debit.

Do not label a receipt “PASS” without executing its case and verifying the account/transaction state. Follow [audit contract](audit-and-receipts.md), [E2E plan](e2e-testing.md) and [submission ledger](../SUBMISSION.md).
