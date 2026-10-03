# Submission — Evidence-Gated Draft

Updated 2026-10-03. **Not a claim of submission, completed videos, human tests or real venue execution.**

## Project

Trade On My Behalf — a Solana devnet-first perps terminal in development. Existing code demonstrates on-chain authorization decisions followed by clearly simulated Jupiter positions.

Repository: https://github.com/Therealratoshen/trade-on-my-behalf

## What may be claimed

- Source contains an Anchor policy kernel, SDK, runtime/CLI and wallet/policy/audit viewer with owner-signed edits.
- Jupiter fills are paper simulations using a spot reference price and simplified fee/PnL model.
- Stored authorization checks include vendor label, collateral caps, TTL, requested leverage and a comparison against supplied equity.
- The agent cannot use owner-only policy updates. This does not prove that arbitrary venue transactions are policy-bound.

Do **not** claim live Jupiter orders, working devnet venue trading, immutable wallet-wide limits, verified drawdown, completed outside-user tests, deployed Treasury at the configured devnet address or current passing tests without the corresponding evidence.

## Evidence ledger

| Evidence | Status | Source |
|---|---|---|
| Current offline/program test rerun | NOT RUN in this documentation update | [testing plan](docs/testing-plan.md) |
| Historical local-validator policy/paper demo | Reported historically; not rerun or public-devnet proof | [demo receipts](docs/demo-receipts.md) |
| Treasury devnet deployment | BLOCKED: configured address absent at dated RPC observation | [readiness](docs/devnet-readiness.md) |
| Public devnet authorization receipts | NOT CAPTURED | [demo receipts](docs/demo-receipts.md) |
| Real venue order/fill/close receipts | NOT IMPLEMENTED / NOT CAPTURED | [venues](docs/venues.md) |
| Three outside-developer sessions | NOT RUN | [user tests](docs/user-tests.md) |
| Pitch/demo videos | Links and completed recordings NOT VERIFIED | Replace only with actual accessible recordings |
| Final submission / external link check | NOT VERIFIED | Record actual confirmation/check results |

## Safe demo wording

“The policy program records approval or denial of authorization inputs. Our current executor then simulates the position. A real devnet venue adapter and custody-bound execution are still required.”

A successful authorization transaction is not a fill. A supplied-equity drawdown denial demonstrates the comparison, not an independently verified economic loss limit. A future real-venue demo must show actual account state and order/fill/close signatures.

## Submission checklist

- Confirm event/track/deadline and eligibility against current official event rules.
- Provide working pitch/demo links, not placeholders labelled recorded.
- Confirm repository access and documentation links.
- Supply accurate prior-work disclosure from the project's actual history; preserve the original historical records in SPEC/PM-LOG.
- Keep team/contact/location fields accurate and supplied by the founder; do not infer or fabricate them.
- Update evidence ledger only from actual runs/receipts, then perform an outside-person link check.

Current product/technical scope: [PRD](PRD.md), [TRD](TRD.md). Historical marketing language is not proof of implementation.
