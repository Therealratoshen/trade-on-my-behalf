# Venues — Paper Implementation and Open Devnet Selection

Updated 2026-10-03. [Devnet readiness](devnet-readiness.md) records dated RPC/official-documentation observations.

## Implemented adapter

Only `JupiterPerpsPaperVenue` exists. It returns `simulated: true` and `paper:` identifiers, uses a Jupiter **spot reference-price feed**, and models a simplified 6-bps notional opening/closing fee. It sends no Jupiter instruction. Liquidation, funding, borrow fees, live keeper fulfillment and venue margin are not modeled.

Its vendor label is the mainnet Jupiter program ID; policy whitelisting that label on devnet does not make a venue deployed or executable there. The dated devnet check found that account non-executable.

## Real devnet selection — OPEN

| Candidate | Verified observation | Still required |
|---|---|---|
| Jupiter | Existing adapter paper only; configured ID non-executable on devnet | No supported implemented devnet execution path |
| Legacy Drift | Legacy program executable on devnet; old repository now resolves to archived Velocity repo | Current supported SDK, market/oracle/faucet/liquidity and authority/CPI verification |
| Current Velocity | Program executable; current setup documents devnet and dUSDT | Exact SDK/IDL/deployment validation, faucet configuration, real initialize/deposit/order/fill/close evidence |

No automatic fallback is implemented or permitted. Select one venue deeply after verifying [TRD T01/T05/T06](../TRD.md), rather than routing to a different program when a quote fails.

## Existing contract versus needed contract

Current `Venue` exposes `openPosition`, `closePosition`, `listPositions`, `equityUsd`, `programId`, `mode` and name `jupiter-perps`. `Fill` has one signature, position ID, price, fee and simulation flag. `openPosition` additionally **requires a `SpendPermit`** minted from an approved `authorize_spend` and verifies it before filling — vendor, collateral, leverage, market and side must all match, and the nonce is single-use. That binding is off-chain and enforced by this repository's code, not by the program.

Real execution additionally needs explicit environment/account/mint/market, order ID/status, requested and filled quantities, remaining quantity, expiry, execution estimates, exact fees, cancellation/reduction support and reconciliation. Order request accepted is not equivalent to filled.

Vendor whitelist is fixed after policy creation, max 16; `update_policy` cannot replace it. A venue change needs an explicit migration/new agent-policy plan, not a hidden router swap. Any existing custody, positions and budget history must be handled deliberately.

## Pricing and risk

Do not describe Jupiter spot API data as the same exact executable perps oracle/quote. Current official [Jupiter Perps documentation](https://docs.jup.ag/user-docs/trade/perps) describes venue-specific oracles and a request/keeper execution model. Paper behavior is not fidelity proof.

Current SDK setup for Velocity uses environment-specific quote assets; devnet dUSDT is a placeholder test token, not USDC or a real-dollar balance. Quote conversion/decimals and policy budget units must be specified before an adapter is accepted.

No live venue order or public-devnet fill/close was performed in this review.
