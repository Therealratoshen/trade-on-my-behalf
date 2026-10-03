# Architecture — Implemented System and Required Devnet Terminal

Updated 2026-10-03. [PRD](../PRD.md) defines scope; [TRD](../TRD.md) defines contracts.

## Implemented path

```text
CLI signal → classifier/clamp → local preflight
                              → Treasury authorize_spend transaction
                              → decoded policy AuditEvent
                                  denied: stop
                                  approved: separate Jupiter PAPER fill

Next.js dashboard → wallet/policy/audit RPC reads
                  → browser owner-signed update_policy
                  → server /api/positions → shared demo paper file
```

Authorization and paper execution are not atomic. Treasury does not custody funds or CPI any venue. The SDK is a policy wrapper, not a Jupiter transaction builder. The current dashboard uses RPC polling; no implemented Helius DAS audit-indexing, live venue fill ingestion, automatic venue fallback or strategy samplers are evidenced.

## Target path — not implemented

```text
Devnet/identity verifier → wallet + owner/agent/account selection
Market-data service → timestamped chart / reference data
Trade ticket → validated preview + refreshed executable estimate
Intent journal → verified policy-bound app-account execution
               → chain/order/fill reconciliation
Account-scoped positions + orders + risk state + receipt viewer
```

A compatible custody/wrapper must bind policy parameters to venue accounts/action and prevent direct agent bypass. Request/keeper execution requires a separate asynchronous lifecycle; submitting the request is not the fill.

## On-chain versus off-chain responsibilities

| On-chain current | Off-chain current | Required additions |
|---|---|---|
| Policy ownership, stored caps/slots, authorization decisions, supplied-equity comparison | Signals, clamp/preview, spot-price reference, paper ledger, dashboard reads | Devnet identity checks, real adapter, verified risk, enforced authority binding, durable journal, chart/ticket, scoped storage and audit recovery |

The current four instructions are `create_policy`, `authorize_spend`, `update_policy`, `record_pnl`. `record_pnl` permits owner or agent and does not verify venue PnL.

Use [readiness](devnet-readiness.md), [security](security-model.md) and [testing](testing-plan.md) before describing the target as shipped.
