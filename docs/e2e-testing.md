# End-to-End Testing Specification

Updated 2026-10-03. **Browser suite not implemented; scenarios below NOT RUN. Real devnet execution is BLOCKED pending deployment and venue verification.** A local CLI paper demo is not browser E2E.

## Environments

1. **Browser fixture/local:** an isolated test wallet adapter, controlled RPC responses and per-user paper fixtures. Any test-only hooks must be excluded from normal builds; never ship a universal test-signing route.
2. **Local validator:** compiled Treasury with matching SDK IDL; deterministic pricing; genuine policy transactions plus clearly simulated positions.
3. **Public devnet:** funded throwaway test wallet, verified Treasury deployment, verified venue account/market/oracle/quote mint/faucet and supported order path. Use only test assets.

Do not install a production wallet private key in the browser harness. Mock a wallet interface for deterministic browser checks; use consenting human wallets for actual extension/signature UX. Never mutate mainnet to make a test pass.

## Scenario matrix

Status for every scenario in this table: **PLANNED / NOT RUN**. Requirement mappings are to [PRD](../PRD.md).

| ID | Scope / requirements | Steps | Expected observable result |
|---|---|---|---|
| E01 | Browser / P01 P02 | Open disconnected app, connect test wallet, inspect environment | Calm disconnected state; visible devnet/mode/account; no signature before intent |
| E02 | Browser+RPC / P01 | Configure mismatched RPC genesis, missing Treasury or non-executable venue | Action blocked before wallet prompt; environment error, not policy denial |
| E03 | Browser / P02 P10 | Owner A/agent B; switch to wallet C while reads/preview pending | Correct PDA for B; C non-owner; stale A response ignored; no A ledger/preview retained |
| E04 | Browser / P02 P05 | No policy, RPC error, unreadable/expired policy, peak zero | Distinct absence/error/expiry/unarmed states; no permissive fabricated policy |
| E05 | Browser / P03 | SOL-PERP chart; switch supported market/timeframe; slow/out-of-order data | Source/time shown; supported perps only; stale market response cannot replace current selection |
| E06 | Browser / P03 P04 | Chart outage or stale quote; attempt confirm | Reference versus executable estimate distinct; confirm disabled without required fresh data |
| E07 | Browser / P04 | Invalid size/leverage/precision then valid preview | Inline validation; notional/quote asset/cost assumptions shown; no signature for invalid input |
| E08 | Local validator / P05 P07 | Preview then authorize a compliant paper intent | Verified policy APPROVED receipt and separate SIMULATED fill; no live-venue claim |
| E09 | Local validator / P05 P06 | Raw vendor/leverage/size/TTL denial | Confirmed denied AuditEvent with reason; no paper position; not labelled failed transport |
| E10 | Local validator / P07 | Spend to cap, fail subsequent venue step, edit caps, advance reset slots | Approval budget remains consumed in current runtime; edits preserve usage; exact reset explained |
| E11 | Browser / P02 P09 | Reject/close wallet prompt, then edit/retry draft | Nothing submitted when rejection proven; draft preserved; no claimed kernel/venue rejection |
| E12 | Local+browser / P09 | Drop RPC response after broadcast; refresh/restart/double-click | Signature/status retained; unknown reconciled; target one intent/debit/fill, never blind duplicate |
| E13 | Browser+local / P09 | Audit history temporarily unavailable, rolled-back logs, late confirmation | Incomplete/stale feed explicit; retry; failed logs not indexed as committed approvals |
| E14 | Browser/server / P10 | Two independent sessions, wallets and paper ledgers | No cross-user positions/cash; no server paths/private keys in responses or logs |
| E15 | Devnet / P01 P06 | Verify program/mint/accounts, fund test collateral, initialize venue account | Exact devnet signatures and account state captured; faucet success not assumed |
| E16 | Devnet / P06 P08 | Submit one bounded market order and inspect venue/user state | Confirmed order and actual filled quantity/position reconciled; policy approval alone insufficient |
| E17 | Devnet / P06 | Attempt direct executor bypass, modified intent, duplicate intent and deny+venue sequence | App-managed account cannot bypass policy; zero unintended fill; current design cannot claim pass |
| E18 | Devnet / P08 P09 | Pending/unfilled/partial order; cancel/reduce/close; RPC interruption | Lifecycle reflects real venue; no fabricated full fill; residual exposure and outcome reconciled |
| E19 | Devnet / P12 | Lower authenticated account equity / stale oracle and try new exposure | Required verified-risk path denies unsafe new risk; safe supported reduction remains available |
| E20 | Browser / P11 | Keyboard-only, narrow viewport, long signature/reason, screen-reader table alternative | Focus/labels readable; no clipped critical controls; textual states not color-only |
| E21 | Human/devnet / P01 P05 P09 P10 | Three outside developers follow `user-tests.md` without coaching | Actual attempts, outcomes, signatures/slots, audit latency and privacy-safe reactions recorded |

## State assertions

Assert independent policy / chain / venue states, not a single green success message. Examples:

- `Policy denied` + `Chain confirmed` + `Venue not attempted`.
- `Policy approved` + `Authorization confirmed` + `Paper simulation failed` + `Budget consumed`.
- `Policy estimate only` + `Signature rejected` + `Nothing submitted`.
- `Submission unknown` + `Reconciliation required` rather than `Safe to retry`.

## Evidence and cleanup

Each run records revision, case ID, fixture/cluster/genesis, account role labels, timestamps, actual steps, expected versus observed, assertion failures, screenshot/trace when useful, and actual signatures for submitted devnet transactions. Confirm `meta.err` and resulting account/position state.

Use privacy-safe tester IDs; never record keys or participant names/handles. Dispose of test fixtures and revoke test delegates. Do not copy test collateral/receipts across clusters. A deployment or faucet failure blocks relevant devnet cases rather than falling back to mainnet or paper-as-real.

## Execution and exit criteria

There is no runnable browser E2E command yet. Implement/configure the harness before adding one. All release-critical applicable cases must have recorded PASS evidence; currently unimplemented chart/ticket/real execution cases cannot pass. Human-session evidence and actual venue fill/close receipts are separate mandatory gates for the real-devnet product.
