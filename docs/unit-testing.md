# Unit and Program Testing Specification

Updated 2026-10-03. This is an executable-test backlog and source inventory, **not a newly implemented or passing suite**. See [testing status](testing-plan.md) for commands and evidence.

## Existing coverage

- SDK: PDA/IDL identity, reason-code stability, little-endian policy decoding, event parsing including denial in a successful transaction.
- Agent: rule evaluation, cap equality, drawdown ordering/disarmed state, slot reset, clamping, raw denial, chain/preflight mismatch, unknown market, paper PnL and basic leverage validation.
- Anchor validator integration: creation, approved/denied authorization, vendor/daily/TTL/leverage rules, owner update and signer restrictions, agent record-PnL and drawdown denial.

Existing test bodies use mocks or a local validator. They do not prove compatible public-devnet venue execution, custody enforcement, liquidation or browser behavior.

## Required scenario matrix

All additional rows below are **PLANNED; NOT RUN**. Some overlap existing cases but require the stronger boundary assertions shown. Requirement IDs refer to [PRD](../PRD.md) and [TRD](../TRD.md).

| ID | Layer / requirement | Fixture and action | Required assertion |
|---|---|---|---|
| U01 | Precision / P04 T03 | NaN, infinities, negative, zero, fractional micro-unit, exponent/unsafe number, u64 bounds | Reject malformed/out-of-range money before signing; exact accepted integer round trip |
| U02 | Units / P04 T03 | 100 and 500 leverage units; 25 drawdown percent; quote-mint decimals | 1x/5x and 25% interpreted correctly; no bps/percent or USDC/dUSDT confusion |
| U03 | Vendor / P06 T04 | Known/unknown/duplicate vendor; 16/17 entries | Membership behaves exactly; 17 rejected; supplied vendor label never proves venue binding |
| U04 | Caps / P07 T03 | Cap−1, cap, cap+1 micro-unit for trade and cumulative window | Equality allowed; one above denied; no spend increment for same-window denial |
| U05 | Overflow / P07 T03 | Spent near u64 maximum; maximum cap; addition would overflow | Reject overflow rather than saturating approval; current source gap recorded |
| U06 | Reset / P07 T03 | Reset slot + 215,999, +216,000, +216,001; approved and denied attempts | Exact lazy reset semantics, including reset before denial; not midnight/24h-loss semantics |
| U07 | Concurrency / P07 T03 | Two authorizations of 80 against budget 100 | Mutable policy serialization approves at most one; stale local preflight cannot grant two debits |
| U08 | TTL / P07 T03 | Creation + TTL−1, TTL, TTL+1; TTL zero | Current strict-`>` boundary reproduced; explicit zero-TTL behavior; no silent renewal |
| U09 | Updates / P02 P07 | Tighten/loosen each field, no-op update, non-owner attempt | Owner only; spend/reset/peak/creation unchanged; lower cap may already be exhausted |
| U10 | Drawdown / P12 T06 | Peak 1,000; 25%; equity 750/749.999999; peak zero; pct zero/100 | Boundary follows exact floor math; disabled/unarmed states labelled |
| U11 | Equity trust / P12 T06 | Fabricate high current equity, inflate peak, omit initialization | Characterize current bypass/DoS; required verified-risk path rejects fabricated state |
| U12 | SDK initialization / P12 T03 | Supply `initialPeakEquityUsd` during ensurePolicy | Current peak remains zero; do not assert it was applied; target API must explicitly support or reject |
| U13 | Signers/PDA / P02 T02 | Owner A, agent B, stranger C; wrong policy PDA/accounts | Owner/agent allowed only for intended methods; C and wrong-PDA combinations rejected |
| U14 | Replay / P06 P09 T05 T07 | Same intent in a fresh signed transaction; reused nonce across restarts | Characterize current repeated debit; target consumes one intent once |
| U15 | Atomic denial / P06 T05 | Denied authorization followed by attempted venue instruction | Target produces zero venue action/debit; current `Ok` denial cannot guard an appended instruction |
| U16 | Bound parameters / P06 T05 | Substitute vendor/account/market/side/amount/size/expiry after preview | Target verifies intent hash and authority; substitutions fail |
| U17 | CPI failure / P06 P09 T05 | Venue CPI throws; inspect policy and event logs | Controlled atomic target rolls back debit; failed transaction logs are not committed receipts |
| U18 | Outcome uncertainty / P09 T07 | Committed signature but getTransaction returns null/error; process crash | Preserve signature; status unknown; reconcile instead of fresh duplicate authorization |
| U19 | Event parsing / P05 P09 T04 T09 | Approved/denied events, admin event, meta.err, truncated logs, wrong program | No approval inferred from tx success; failed/wrong-origin logs excluded from committed decision feed |
| U20 | Audit recovery / P09 T09 | Transient absent tx, paginated history, restart/checkpoint | Retry absent reads, no permanent empty cache, completeness explicit |
| U21 | Classifier / P03 P04 | Unknown market/side; sub-1x/fractional leverage; clamp versus raw | Invalid signals drop explicitly; original and clamped values remain visible |
| U22 | Prices / P03 P04 T08 | Zero/NaN/infinity, stale timestamp, bad confidence, timeout, out-of-order candles | Freshness and finite-value checks; no executable quote inferred from spot data |
| U23 | Paper ledger / P10 T09 | Concurrent opens/closes with delayed price await; corrupt JSON; interrupted write | Per-account serialization, schema validation and atomic write; no lost update |
| U24 | Position snapshot / P08 P10 T09 | Same-market positions with different entries; list succeeds then equity fails | One coherent snapshot, no duplicates, no another-position entry used as mark |
| U25 | Account isolation / P02 P10 | Two users/agents/clusters plus unauthorized route access | No cross-ledger reads/mutations; no server statePath in response |
| U26 | Position fidelity / P08 P12 | Fee, adverse move, liquidation threshold, funding, account liability | Current paper limits disclosed; real venue risk checks do not use simplified paper PnL |
| U27 | Reduction / P08 T06 | Close, partial reduce, cancel, stale risk and kill-switch state | Only demonstrably risk-reducing action allowed; cannot reopen/increase via close path |
| U28 | Network / P01 T01 | Mainnet genesis behind devnet-looking URL; missing/non-executable program; wrong mint | Abort before signatures/venue request; no fallback |

## Harness design

Use deterministic clocks, integer fixtures and isolated temporary stores for unit tests. Validator tests must control slot boundaries rather than depend on a fragile sleep. Seed separate owner/agent keys and reset ledger state per case.

Property/differential tests should generate finite safe amounts and adversarial boundaries, comparing evaluator versus on-chain reason and state changes. Seed randomness and retain minimized failing cases. Do not infer full security from passing local evaluator tests.

## Recording a run

Record source revision, tool versions, environment/genesis, command, scenario IDs, observed outputs, exit status and logs. Missing harness or missing venue is NOT IMPLEMENTED/BLOCKED, not skipped-as-pass. No runs or coverage percentages are added by this documentation revision.
