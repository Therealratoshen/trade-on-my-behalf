# What's Missing — Current Release Blockers

Updated 2026-10-03. Static findings plus read-only devnet observation, not a fresh test pass.

## Existing foundation

Anchor policy instructions, SDK, agent classifier/evaluator/runtime, CLI, Jupiter paper adapter and wallet/policy/audit viewer with owner-signed edits exist in source. The suite defines **20 validator, 31 SDK and 62 agent** cases, and all three run green: CI job `SDK + agent tests` and job `Anchor program tests` both reported `success` on revision `993b421` (<https://github.com/Therealratoshen/trade-on-my-behalf/actions/runs/37205967172>). The same suites were re-run locally on 2026-10-04 against a local validator with a throwaway wallet; see the executed-run record in [testing-plan](testing-plan.md).

## Gaps and priority

| Priority | Missing/correctness item | Evidence / acceptance |
|---|---|---|
| Critical | Policy-bound app-managed venue authority and intent parameters | Current gate has no custody/CPI; prove no direct bypass or altered-intent execution |
| Critical | Verified equity/initial risk state | Current equity and peak supplied; creation peak zero; prove authenticated risk and stale-data behavior |
| High | Devnet Treasury deployment and network identity guard | Configured address absent at observed slot; reject wrong genesis/program/mint before signing |
| High | One current verified devnet venue adapter | Jupiter paper only; Drift/Velocity executable presence does not prove market/faucet/fill path |
| High | Replay/idempotency/unknown-outcome recovery | Nonce not deduplicated; reconcile committed signatures after missing logs/crashes |
| High | Exact input/range/overflow validation | Floating-point SDK conversion and max-cap saturation gaps |
| High | Owner/agent/account lookup and private paper isolation | Dashboard assumes wallet as agent; shared positions route exposes demo state/path |
| High | Atomic validated persistence and coherent position snapshots | File races; fallback can duplicate snapshots or reuse wrong entry mark |
| High | Reliable audit reads | meta.err, transient missing data, pagination/backfill and completeness |
| Product | Market chart, trade ticket, fresh quote contract, supported reduction/order lifecycle | Chart and ticket exist as a live quote view and a `preview only` surface; neither submits an order and the order lifecycle is still missing |
| Evidence | Browser E2E harness and expanded unit/local tests | Plans in unit/E2E docs, not implemented suite |
| Evidence | Public signatures and three outside-developer sessions | NOT CAPTURED / NOT RUN |
| Delivery | Actual recordings and final event/link verification | Unknown; no placeholder-as-complete claims |

Daily-collateral semantics, budget/reset visibility and on-chain CI are separately scoped work. This document must not mark them delivered merely because requirements were updated.

## Deferred, not quietly promised

Mainnet, multiple venues, arbitrary-token perps, autonomous samplers, Telegram/chat, paid signals, billing and social/copy trading remain outside this release.

Current source of truth: [PRD](../PRD.md), [TRD](../TRD.md), [devnet readiness](devnet-readiness.md), [testing status](testing-plan.md).
