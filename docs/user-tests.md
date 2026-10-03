# User Tests — Three Planned Outside-Developer Sessions

Updated 2026-10-03. **All three sessions: NOT RUN.** No actual participants, configured policies, attempted trades, observed results, signatures/slots, latency measurements or reactions are recorded. Inputs below are planned fixtures, not observations.

The previous target date passed without recorded sessions. Historical local-validator demos do not substitute for these human tests. [Testing plan](testing-plan.md), [PRD](../PRD.md) and [devnet readiness](devnet-readiness.md) are authoritative.

## Preconditions

Three consenting developers not on the project; privacy-safe IDs assigned when sessions occur. Matching program/IDL, explicit disposable owner/agent keys, a new isolated policy/paper ledger per session, and visible policy-versus-paper labels.

Sessions 1–2 may run through the CLI on an isolated local validator; public-devnet deployment is not a prerequisite for those local policy/paper sessions. Identify their environment explicitly and never describe local signatures as public-devnet receipts. A session deliberately using public devnet additionally requires verified Treasury deployment, approved test-SOL funding and explicit owner permission. The supplied-equity comparison in Session 3 still does not prove authenticated venue equity.

The owner must supply consenting participants before sessions can occur. This documentation update did not recruit anyone or generate outcomes. Completed pitch/demo recordings and accessible links also remain separate owner-supplied release evidence.

Current trading input is the CLI; browser ticket/chart are not implemented. Use raw authorization/`--raw` where testing an over-limit input: default clamping would turn an over-limit request into a different permitted request.

For these policy-demo sessions Jupiter is a whitelisted **vendor label** and fills remain simulated. Testing a vendor denial does not submit to that denied venue. Any real-devnet venue tests require the additional gates in [E2E plan](e2e-testing.md).

## Session 1 — Leverage and trade-size boundaries

Planned policy: per-trade collateral cap **50**, per-window collateral budget **150**, max requested leverage **300 = 3x**, drawdown **disabled**, adequate TTL. This corrects the earlier impossible “approve 150 against daily budget 60” fixture.

| Planned action | Expected result, not observed |
|---|---|
| Collateral 40, SOL-PERP long, 3x | Code 0 approved; spent 40; subsequent paper fill if venue step succeeds |
| Raw collateral 40, 5x | Code 6 denied; spent remains 40; no paper fill |
| Raw collateral 60, 3x | Code 2 denied; spent remains 40; no paper fill |

Capture the actual configured PDA fields and submitted input, not just CLI flags. Test equal leverage cap explicitly.

## Session 2 — Vendor identity denial

Planned isolated policy: only Jupiter vendor label whitelisted, per-trade 50, per-window 150, 3x, drawdown disabled.

| Planned action | Expected result, not observed |
|---|---|
| Signed authorization for unlisted legacy Drift vendor label, collateral 20, 2x | Code 1 denied; no added spend; no venue instruction or fill |
| Whitelisted label, collateral 20, 2x | Code 0 approved authorization; any position remains a separately labelled paper simulation |

This proves membership checking of supplied labels, **not** atomic venue destination enforcement. Direct bypass/substitution belongs to U15/U16/E17 and cannot pass with today's architecture.

## Session 3 — Supplied-equity drawdown comparison

Planned isolated policy: per-trade 50, per-window 150, 3x, drawdown **25%**. Explicitly call `record_pnl` with reported peak **1,000** and verify stored peak; creation starts zero and SDK `initialPeakEquityUsd` is not applied.

| Planned action | Expected result, not observed |
|---|---|
| Collateral 10, 2x, supplied current equity 750 | Threshold equality allowed: code 0 |
| Collateral 10, 2x, supplied current equity 749 | Code 7 denied; no additional spend or venue attempt |
| Inspect zero-peak/new policy before initialization | Drawdown is unarmed; UI must not imply protection |

These are controlled input-comparison tests, not proof of authenticated market losses or a tamper-proof kill-switch. Record that the equity source is supplied/mock/paper.

## Actual outcome register

| Session | Tester ID | Actual policy/actions/outcome | Signatures / slots | Audit latency | Reaction | Status |
|---|---|---|---|---|---|---|
| 1 | NOT ASSIGNED | NOT OBSERVED | NOT CAPTURED | NOT MEASURED | NOT COLLECTED | NOT RUN |
| 2 | NOT ASSIGNED | NOT OBSERVED | NOT CAPTURED | NOT MEASURED | NOT COLLECTED | NOT RUN |
| 3 | NOT ASSIGNED | NOT OBSERVED | NOT CAPTURED | NOT MEASURED | NOT COLLECTED | NOT RUN |

## Recording and decision rule

When a session actually occurs, append source revision/environment/genesis, actual typed inputs and stored policy, exact observed event/reason, resulting usage/position state, signatures/slots, timing method and participant reaction. Report discrepancies as FAIL/BLOCKED with the observed cause; do not edit expectations to hide failures.

Use tester aliases only; no names, handles, private keys or participant wallet addresses in this document. A public signature may be recorded only with consent. Separate confirmation latency from audit visibility latency.

Do not claim “three tests passed” until all three actual records exist and can be checked. Do not claim a real venue E2E pass from these paper-policy cases.
