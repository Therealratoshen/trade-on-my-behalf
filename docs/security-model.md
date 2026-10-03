# Security Model — Actual Gate and Required Execution Boundary

Updated 2026-10-03. Static source review plus the dated read-only checks in [devnet readiness](devnet-readiness.md); no penetration test, deployment or live trade was performed.

## Accurate current claim

**The Treasury program checks and records an authorization request against stored policy fields. The current runtime respects that decision before a simulated fill. It does not prove that all venue transactions obey those fields.**

Do not use “physically cannot break your rules,” “wallet signing-layer enforcement,” or “every trade is unbypassable” for this implementation. [TRD](../TRD.md) states the authority binding required for that stronger claim.

## Threat and limitation ledger

| Risk | Source-backed current behavior | Required mitigation / acceptance |
|---|---|---|
| Compromised agent/executor | Cannot update owner policy, but authorization is separate from venue action | Wrapper/custody authority; direct bypass and parameter substitution tests fail |
| Vendor/size/market substitution | Gate accepts vendor label and reported amount/leverage; no venue/account/side/market binding | Bind exact intent and validated venue accounts; enforce controlled authority |
| Denial followed by venue instruction | Policy denial returns `Ok`; unrelated later instruction could run | Wrapper must skip/reject venue action on denial; transaction success is not approval |
| Stolen owner key | Owner can loosen caps, disable drawdown and update TTL | Explicit owner compromise limitation; evaluate timelock/multisig/revocation; not implemented |
| Fabricated equity | Overreported current equity bypasses drawdown; supplied peak can be inflated | Verify venue state/oracles; fail closed for new risk on unavailable data |
| Uninitialized risk | Peak is zero at creation; advertised SDK initial peak is not applied | Explicit unarmed state and verified initialization before claiming drawdown safety |
| Replay / crash / ambiguous RPC | Nonce only logged; SDK can throw after authorization committed | Durable intent journal and consumed-intent state; reconcile before fresh signature |
| Budget misunderstanding | Approved collateral counted, even if subsequent venue step fails | Clear budget semantics; do not promise a daily loss ceiling or automatic refund |
| Arithmetic overflow | Saturating addition may approve overflow at max cap | Checked arithmetic and adversarial maximum-value tests |
| Paper data leakage/lost writes | Shared unauthenticated demo state; non-atomic file writes and async races | Account isolation, no filesystem disclosure, validated atomic transactional storage |
| Wrong cluster/program | Frontend allows mainnet and arbitrary RPC; no complete devnet gate | Verify genesis/program/mint/market before signature, reject mismatch |
| False receipt completeness | Missing transactions cached empty; bounded scans; failed logs unchecked | Retry/backfill/check meta.err; show verified completeness and provenance |
| False venue fidelity | Paper omits liquidation/funding and uses spot reference with simplified fees | Explicit simulation limits; live risk/fees from selected venue, not paper formulas |

## Custody and scope of any future guarantee

A wrapper or PDA is useful only when the venue account authority actually requires it. An executor key with independent venue trading permission can still bypass a preflight or memo. Verify the venue's delegation/CPI/account-ownership model.

The guarantee can cover **app-managed custody/positions**, never every transaction in the owner's external wallet. Venue program upgrades, oracle risk, chain/RPC availability and owner's administrative authority remain explicit trust boundaries.

## Outcome integrity

Store and display policy decision, chain submission/commitment and venue lifecycle independently. Failed transactions may include logs but do not commit their state; do not index them as successful debits. A denied successful authorization adds no spend within the window; a reset may occur before denial. A current approved authorization remains counted when the subsequent paper venue throws.

## Verification priorities

[Unit cases U01–U28](unit-testing.md) and [E2E cases E01–E21](e2e-testing.md) include bypass, precision, replay, equity trust, concurrency, privacy and recovery. Missing tests or missing execution mechanisms are blockers, not successful security proof.

Never publish private keys, secret RPC credentials, participant PII or raw local paths. The historical local demo and three planned human sessions are different forms of evidence; neither is a verified real-devnet venue test today.
