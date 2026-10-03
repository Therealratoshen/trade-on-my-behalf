# Agent Runtime — Current Policy-to-Paper Flow

Updated 2026-10-03. Package: `@trade-on-my-behalf/agent`.

## Implemented sequence

Load policy → classify/drop or clamp signal → report higher paper equity through `record_pnl` → local diagnostic evaluation → `authorize_spend` for each valid intent, denials included → on confirmed approval attempt a separate paper open.

Chain verdict overrides preflight; mismatch is flagged. A paper error is recorded as `venueError` after authorization and does not refund the approved-collateral budget. Close currently closes paper positions then synchronizes a higher supplied peak; it is not an on-chain reduce-only venue path.

## Modules and constraints

Classifier, evaluator, runtime, CLI, paper venue/store and spot-price/static feeds exist. RSI/funding/news samplers, LLM strategy runner, Helius webhooks/indexer, real venue router, Drift/Velocity adapter, browser trade API, durable journal and rate limiter do not.

Current markets: SOL-PERP, ETH-PERP, BTC-PERP in the paper model. Unknown markets/invalid side or basic size/leverage inputs are dropped; remaining precision/schema validation must satisfy [TRD](../TRD.md).

## Money and fidelity

Collateral is the authorization amount. Notional = collateral × requested leverage. Paper equity uses cash plus paper collateral/unrealized PnL. Loss is artificially floored at collateral and can later recover because liquidation is not simulated. A simplified notional fee is charged.

This is not a guarantee that live daily losses stay below the collateral budget. Fees, funding, earlier-day positions and venue liabilities are not governed by that counter.

## Persistence and retry

CLI default paper file is agent-key-specific. Dashboard instead searches shared demo files. Current FileStore lacks schema validation, atomic writes and concurrent transaction protection. Read-before-await open/close operations can lose updates.

No durable cross-process intent dedupe/recovery exists. If authorization status is unknown, reconcile the original signature and policy/position state before retrying; a newly signed transaction can debit again.

## CLI and tests

Commands: `init-policy`, `update-policy`, `status`, `trade`, `positions`, `close`, `watch`, `resolve-venue`. Use `pnpm --filter @trade-on-my-behalf/agent tomb ...` and explicit local/devnet RPC; no mainnet operations.

```bash
pnpm --filter @trade-on-my-behalf/agent build
pnpm --filter @trade-on-my-behalf/agent test
```

17 offline cases are defined across evaluator/runtime tests; no pass count is claimed by this update. [Unit plan](unit-testing.md) adds replay, concurrency, ledger and price-freshness cases.
