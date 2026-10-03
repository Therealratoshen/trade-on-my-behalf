# TRD — Technical Requirements

Updated 2026-10-03. This document separates **implemented contracts** from **required changes**. Updating it does not deploy a program, implement an adapter or run tests.

## Existing stack and boundaries

- Anchor Treasury program under `programs/treasury`; four instructions.
- TypeScript SDK on Anchor 0.31 / `@solana/web3.js` 1.x.
- Agent classifier/evaluator/runtime and `tomb` CLI.
- Jupiter paper venue with file/memory storage and Jupiter **spot reference-price API**.
- Next.js 15 / React 19 dashboard with wallet-adapter and SWR; browser helper signs policy edits.
- No implemented Drift/Velocity adapter, browser trade endpoint, candlestick service, durable order journal or browser E2E harness.

## T01 — Network and deployment identity (required, not implemented)

Pin signing and account operations to verified Solana devnet. Validate genesis identity, configured Treasury/venue IDs, executable flag, account ownership, supported program/IDL version, expected quote mint and market availability. Repeat validation when RPC/configuration changes; endpoint text containing `devnet` is insufficient. Fail closed on inability to verify. Never choose mainnet as an availability fallback.

The configured Treasury ID is `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`. Read-only observation found no account on devnet; see [readiness](docs/devnet-readiness.md). Program existence alone does not establish compatible venue accounts, test collateral, functioning oracles or fills.

## T02 — Identity and ownership

Policy PDA seeds are `["policy", agent]`, not necessarily the connected owner's public key. Persist explicit owner/agent/trading-account selection; verify policy owner and agent on every fetch. Browser wallets do not export private keys. SDK `withTrader` currently accepts a server/CLI `Keypair`; do not directly expose it to the browser.

Paper data must be keyed by environment + user/session + agent/account and access controlled. The current `/api/positions` route resolves a shared demo file, lacks wallet ownership binding and returns a filesystem path. It is not a multi-user positions backend.

## T03 — Policy state and exact arithmetic

Current state: owner, agent, up to 16 fixed vendors, per-trade/per-window collateral caps, spent counter, TTL/creation/reset slots, maximum requested leverage, peak equity, drawdown percent and bump.

- Quote precision: current policy integers are six-decimal micro-units; preserve integer precision across transport. A future venue's quote mint/decimals must be explicit; devnet dUSDT must not be labelled real USDC.
- Current leverage units: `100 = 1x`, `500 = 5x`; these are leverage × 100, not a funding-rate percentage. Policy configuration accepts 0 (unlimited) or 100–10,000. Direct authorization does not validate the lower bound.
- Kill-switch percent is integer 0–100, not basis points; 0 disables it.
- New monetary input must reject non-finite, negative, out-of-range, unsafe-number and overprecision values; use integer strings/BN rather than floating point for money.
- Replace saturation with checked arithmetic at overflow boundaries. With cap `u64::MAX`, saturating sums can approve an overflowing cumulative amount.
- Current TTL denies only when `slot - created_at_slot > ttl_slots`; exact equality remains valid.
- Reset runs before rule evaluation after 216,000 slots, including on a denied attempt. Denials add no budget within the current window.
- Updates must preserve spend/reset/peak/creation slots. Existing SDK `initialPeakEquityUsd` input is not forwarded to creation; initial peak remains zero.

## T04 — Policy decision versus transaction success

Current authorization checks, in order: drawdown if armed, vendor, per-trade cap, daily cap, expiry, requested leverage cap. It returns success on a policy denial and emits `approved: false`. Unauthorized signer is a transaction error.

Reason codes: 0 approved; 1 vendor denied; 2 per-trade cap; 3 daily cap; 4 expired; 5 reserved; 6 leverage; 7 drawdown.

Only committed transactions with valid program-origin events count as durable decisions. A success return is not approval; a policy approval is not an order fill. Logs from a failed/rolled-back transaction are diagnostic, not a committed debit.

## T05 — Bound venue execution (required)

Current Treasury authorization has no custody accounts, venue accounts or CPI. Runtime authorization and paper fill are separate operations. A vendor pubkey is a caller-supplied label, not proof of the subsequent destination, market, side, size or leverage.

Required target:

1. Define the exact app-controlled venue account and authority. A free-standing executor/delegate that can trade directly would bypass the gate.
2. A compatible on-chain wrapper/custody authority validates the intended venue executable ID, accounts, market, side, collateral, size, limits, expiry and policy revision.
3. Denial must prevent the venue CPI/action. Merely appending a venue instruction after today's success-returning denial does **not** enforce the policy.
4. Bind an intent ID/hash to all checked parameters; use on-chain consumed-intent state plus a durable off-chain journal.
5. Specify atomic failure semantics: if a controlled same-transaction CPI fails, state/debit rolls back. Asynchronous request/keeper venues require a separately specified request/reservation/fill settlement model.
6. Preserve denial evidence without treating logs from aborted transactions as committed authorizations.

This guarantee covers only the app-managed custody/account, not unrelated assets or transactions controlled directly by the owner's wallet. A memo alone is not enforcement unless the venue/account authority requires and validates it.

## T06 — Verifiable risk state

Current equity is supplied by owner/agent runtime, and `record_pnl` accepts a caller-supplied peak. Overreporting current equity can bypass drawdown; an inflated peak can cause denial of service; omitting initialization leaves it unarmed. Monotonic storage does not verify its economic truth.

Before claiming an enforced drawdown limit, derive equity/exposure from authenticated supported venue state and validated fresh oracles with bounded confidence/age. Include funding, fees, liabilities and relevant subaccounts. Requested leverage alone is not aggregate account leverage. On missing/stale risk data, block new risk and explain the state; allow only independently verified risk-reducing actions.

## T07 — Intent, transaction and order lifecycle

Required durable record: environment, account, intent ID/hash, policy revision, market/side, exact sizes/quote mint, reference/estimate source and time, authorization signature/verdict, execution signature/order IDs, filled quantity, fees, status, retry/reconciliation metadata and timestamps. No private keys, signed secret URLs or filesystem paths.

Separate dimensions:

- Policy: unevaluated / local estimate / approved / denied / unavailable.
- Chain: awaiting signature / submitted / confirmed / finalized / failed / expired / unknown.
- Venue: not attempted / pending / unfilled / partial / filled / rejected / cancelled / unknown.

Current nonce is only logged and generated per process, not deduplicated. Current SDK performs one transaction-log read and can throw after a committed authorization; never blindly resubmit. Reconcile signature, policy usage and venue state before constructing a new intent. Re-broadcasting the same signed transaction is different from creating a freshly signed duplicate.

## T08 — Market data, chart and execution estimates

Required contracts include supported market, timeframe, OHLC/reference series, source, timestamps, units, sequence/deduplication and freshness thresholds. Reference data is distinct from executable estimate/oracle/mark. Show modeled and unmodeled costs. Refresh before confirmation and enforce explicit slippage/price bounds in the supported venue path.

Current price feed checks positive numeric price but not finite value, confidence or observation age. Paper fee is a simplified 6-bps notional model, not a verified live fee quote. Liquidation, funding, borrow fees and venue margin behavior are not modeled.

## T09 — Storage, audit and recovery

Replace unvalidated non-atomic file writes before multi-user/concurrent usage. Reads before awaited price fetches can cause lost updates; require per-account serialization/transactions and atomic persistence.

Audit reads must check `meta.err`, validate program identity, retry transient missing transactions, paginate/backfill with a checkpoint and show completeness/staleness. Current bounded scan and cached empty results are not a complete index.

The positions route can append live positions before an equity-fetch failure and then append fallback positions. Required behavior: construct one coherent snapshot, no duplicates, no entry-price fallback presented as fresh/zero PnL. Multiple positions in one market must not reuse another position's entry as their mark.

## T10 — Verification and release

[Testing plan](docs/testing-plan.md) owns run evidence. [Unit plan](docs/unit-testing.md) and [E2E plan](docs/e2e-testing.md) map scenarios to requirements. CI wiring is desired, not currently checked in. No Surfpool or `test:surfpool` script exists. Mainnet-fork tests, if later isolated locally, would not prove public devnet execution.
