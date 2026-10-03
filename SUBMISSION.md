# Submission — Evidence-Gated Draft

Updated 2026-10-03. **Not a claim of submission, completed videos, human tests or real venue execution.**

## Project

Trade On My Behalf — a **devnet policy demo with simulated positions**. A perps terminal remains target scope, not a verified release. Existing code demonstrates on-chain authorization decisions followed by clearly simulated Jupiter positions.

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
| Current main-branch offline rerun | PASS: SDK 11/11, agent 17/17; 28 tests, 0 failures | [revision, commands and committed logs](docs/release-evidence-2026-10-03.md) |
| Current main-branch lint and build | PASS: both commands exit 0 | [revision, commands and committed logs](docs/release-evidence-2026-10-03.md) |
| Current main-branch program rerun / fresh IDL regeneration | BLOCKED: available toolchain lacks `cargo build-sbf`; no fresh program/IDL output | [observed errors and boundaries](docs/release-evidence-2026-10-03.md) |
| Owner-reported baseline suite | Historical report: 11 SDK + 17 agent + 12 program tests at `8c6e769`; not a fresh 40-test pass claim | [separate owner report](docs/release-evidence-2026-10-03.md#owner-reported-baseline) |
| Draft consent/accounting PR | Prior report: 14 local-validator tests; NOT RUN again here, not merged/deployed main | [separate draft-PR evidence](docs/release-evidence-2026-10-03.md#draft-pr-evidence) |
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

Owner-supplied evidence still needed: three consenting outside developers and their privacy-safe observed session records; completed, accessible pitch/demo recordings; event/track/deadline and actual submission confirmation. Public funding/deployment and PR disposition remain separate explicit owner decisions. No participant identities, wallet keys, funding, public transactions, recordings or submission were produced by this documentation work.

Current product/technical scope: [PRD](PRD.md), [TRD](TRD.md). Historical marketing language is not proof of implementation.
