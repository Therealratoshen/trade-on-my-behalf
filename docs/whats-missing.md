# What's Missing — Current Release Blockers

Updated 2026-10-03. Fresh offline tests, lint and build are recorded in the [release evidence ledger](release-evidence-2026-10-03.md). Program rerun is BLOCKED; the dated read-only devnet observation is not a deployment or transaction receipt.

## Existing foundation

Anchor policy instructions, SDK, agent classifier/evaluator/runtime, CLI, Jupiter paper adapter and wallet/policy/audit viewer with owner-signed edits exist in source. At main baseline `8c6e769df1fe5263f3a682fadfe5f7580e2b0c6b`, SDK 11/11 and agent 17/17 PASS, lint and build exit 0. The 12 baseline validator cases were NOT RUN here because the fresh SBF build is BLOCKED. The owner's historical 40-test report and draft PR's earlier 14-test report are attributed separately; they are not merged-main or public-devnet proof.

## Gaps and priority

| Priority | Missing/correctness item | Evidence / acceptance |
|---|---|---|
| Critical | Policy-bound app-managed venue authority and intent parameters | Current gate has no custody/CPI; prove no direct bypass or altered-intent execution |
| Critical | Verified equity/initial risk state | Current equity and peak supplied; creation peak zero; prove authenticated risk and stale-data behavior |
| High | Agent consent and independently checked existing-policy owner | Baseline registration does not require the agent signature; consent/owner-binding hardening is prepared in draft PR #2, not merged or deployed by this update |
| High | Devnet Treasury deployment and network identity guard | Configured address absent at observed slot; reject wrong genesis/program/mint before signing |
| High | One current verified devnet venue adapter | Jupiter paper only; Drift/Velocity executable presence does not prove market/faucet/fill path |
| High | Replay/idempotency/unknown-outcome recovery | Nonce not deduplicated; reconcile committed signatures after missing logs/crashes |
| High | Exact input/range/overflow validation | Floating-point SDK conversion and max-cap saturation gaps |
| High | Owner/agent/account lookup and private paper isolation | Dashboard assumes wallet as agent; shared positions route exposes demo state/path |
| High | Atomic validated persistence and coherent position snapshots | File races; fallback can duplicate snapshots or reuse wrong entry mark |
| High | Reliable audit reads | meta.err, transient missing data, pagination/backfill and completeness |
| Product | Market chart, trade ticket, fresh quote contract, supported reduction/order lifecycle | Not implemented; cannot claim current viewer is a terminal |
| Evidence | Browser E2E harness and expanded unit/local tests | Plans in unit/E2E docs, not implemented suite |
| Evidence | Reproducible program build, local-validator rerun and mandatory CI | Current build lacks `cargo build-sbf`; no fresh generated IDL; main baseline has no workflow. Separate CI/runtime work remains |
| Evidence | Public signatures and three outside-developer sessions | NOT CAPTURED / NOT RUN |
| Delivery | Actual recordings and final event/link verification | Unknown; no placeholder-as-complete claims |

Daily-collateral semantics, budget/reset visibility and on-chain CI are separately scoped work. This document must not mark them delivered merely because requirements were updated.

The fresh offline pass does not close any custody, authentic-equity, replay, browser, privacy or real-venue gap above. Reported-equity comparisons remain a soft signal; they are not verified drawdown protection.

## Deferred, not quietly promised

Mainnet, multiple venues, arbitrary-token perps, autonomous samplers, Telegram/chat, paid signals, billing and social/copy trading remain outside this release.

Current source of truth: [PRD](../PRD.md), [TRD](../TRD.md), [devnet readiness](devnet-readiness.md), [testing status](testing-plan.md).
