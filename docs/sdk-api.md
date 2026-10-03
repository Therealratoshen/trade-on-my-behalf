# SDK API — Actual Policy Wrapper

Updated 2026-10-03. Package: `@trade-on-my-behalf/sdk`; Anchor 0.31 and web3.js 1.x.

## Handle identity

`withTrader({ connection, wallet: Keypair, policy: agentPublicKey, commitment? })`.

`policy` means the **agent key used to derive the PDA**, not the owner wallet or PDA address. The browser has a separate wallet-adapter helper for policy editing; do not pass a user's private key to a web frontend.

## Methods

| Method | Current behavior |
|---|---|
| `ensurePolicy(input)` | Owner creates policy; returns no-op for existing PDA; does not verify existing fields equal requested rules |
| `fetchPolicy()` | Decoded policy or null; null account and RPC failure are distinct |
| `authorizeSpend(input)` | Owner/agent authorization; returns signature and decoded AuditEvent; no venue instruction |
| `recordPnl(input)` | Owner/agent submits reported equity watermark |
| `updatePolicy(input)` | Owner-only provided-field changes |
| `subscribeAudit` / `unsubscribeAudit` | Program-event listener scoped to policy |
| `replaceVendors(input)` | Unsupported by current program; throws |

## Required caller cautions

- `initialPeakEquityUsd` is advertised in input types but not forwarded to creation; peak starts zero.
- `micro(number)` rounds floating-point USD and lacks complete finite/range/safe-integer validation; hardening is required before broad use.
- Leverage 100 means 1x; drawdown 25 means 25%, not 25 bps.
- Auto-nonce increases per process but is not on-chain replay protection.
- Authorization reads transaction logs once. A missing log/transaction throws even after a possible committed spend. Preserve the signature and reconcile; do not blindly authorize again.
- A successful transaction can carry a denied policy event. Verify program-origin committed logs and verdict; never equate approval with fill.
- Existing policy admin updates do not renew TTL or reset budget usage.

## Build and IDL

```bash
(cd programs/treasury && anchor build)
pnpm --filter @trade-on-my-behalf/sdk run sync-idl
pnpm --filter @trade-on-my-behalf/sdk build
pnpm --filter @trade-on-my-behalf/sdk test
```

Run `sync-idl` from the repository root. Deployed program, generated IDL and SDK copy must match; source IDL equality alone does not prove deployment.

Defined offline tests: 11 cases across `derivePolicyPda.test.ts` and `decode.test.ts`, not rerun in this update. [TRD](../TRD.md), [unit plan](unit-testing.md) and [testing status](testing-plan.md) are authoritative.
