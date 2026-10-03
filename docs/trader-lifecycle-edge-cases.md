# Trader Lifecycle and Edge Cases — Current Contract and Target

Updated 2026-10-03. [PRD](../PRD.md) and [TRD](../TRD.md) are authoritative. Each target below is **required, not claimed implemented**.

| Stage | Edge case | Required behavior | Test mapping |
|---|---|---|---|
| Environment | Devnet-looking URL is mainnet; missing/mismatched program | Verify genesis/identity and block before signatures | U28, E02 |
| Connect | Disconnected, auto-connect rejection, wallet change during fetch | Distinct calm states; clear/re-key data and ignore stale responses | U13, E01/E03 |
| Account | Owner and agent differ; wrong subaccount; non-owner viewer | Explicit account selection, verified owner/agent; read-only administration where appropriate | U13/U25, E03 |
| Policy | Missing/unreadable/expired, peak zero, unlimited fields | No permissive invented policy; explicit expiry/unarmed/unlimited state | U08/U10/U12, E04 |
| Edit | Tighten below used budget; loosen/disable; TTL update | Owner only; preserve counters/reset/peak/creation; no silent renewal | U09, E10 |
| Market | Unsupported token, stale/out-of-order chart, quote source mismatch | Supported perps only; reference versus executable estimate; block stale required data | U21/U22, E05/E06 |
| Draft | Unsafe numbers/precision, wrong quote mint, fees exceed available balance | Exact integer validation and transparent costs before signature | U01/U02, E07 |
| Preflight | Policy changes or cap used by another request after preview | Refresh; chain controls final outcome; estimate never authoritative | U04/U07, E08/E09 |
| Authorization | Multiple failing rules, exact equality, window/TTL boundary | Preserve ordered reasons and exact integer/slot semantics | U04–U10, E09/E10 |
| Execution | Deny then venue instruction, parameter substitution, direct delegate bypass | Bound authority and intent prevent action; app-managed-account scope explicit | U15–U17, E17 |
| Recovery | Crash after debit, missing RPC reply, double-click, fresh duplicate signature | Persist/reconcile original outcome; target one consumed intent | U14/U18, E12 |
| Orders | Submitted but no fill, partial, expired, rejected, cancelled | Model real lifecycle; request confirmation not filled | E16/E18 |
| Positions | Shared paper file, wrong owner, two same-market entries, fallback duplicates | Account isolation and one coherent provenance-labelled snapshot | U23–U25, E14 |
| Risk | Reported equity inflated, peak inflated/omitted, stale oracle | Disclose current soft check; target authenticated risk fail-closed for new exposure | U10–U12/U26, E19 |
| Close | Drawdown active, partial reduction, stale data, residual exposure | Only supported verified risk-reduction; no disguised opening/refund assumption | U27, E18/E19 |
| Audit | Transient absent tx, failed log, bounded scan, restart | Retry/backfill/check meta.err; completeness and freshness explicit | U19/U20, E13 |
| Evidence | Mock/paper demo labelled live; expected result written as pass | Separate planned, executed, observed and verified evidence | E21, testing-plan |

## Important current limitations

Authorization consumes approved collateral even if the separate paper venue fails. Closing does not replenish the policy budget. Lazy slot intervals are not exact daily loss limits. No program-level replay protection, custody binding, verified venue equity, chart/ticket, real adapter or browser E2E suite exists.

Emergency revocation/pause, vendor rotation, owner-key hardening and policy renewal require an explicit design/migration; do not imply the current four-instruction program already supports them. Public on-chain policy/audit data is different from private user-scoped paper state.

Detailed expected assertions and execution evidence belong in [unit-testing.md](unit-testing.md), [e2e-testing.md](e2e-testing.md) and [testing-plan.md](testing-plan.md).
