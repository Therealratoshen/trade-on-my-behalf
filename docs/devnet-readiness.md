# Devnet Readiness and Venue Feasibility

Updated 2026-10-03. Read-only observations, not a deployment or trade execution.

## Observed public devnet state

RPC: `https://api.devnet.solana.com`; `getMultipleAccounts`, confirmed context slot **506874810**.

| Address | Observation | Meaning |
|---|---|---|
| Treasury `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph` | Account `null` | No program at the configured address at this observation |
| Jupiter `PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu` | System-owned, `executable: false` | Not a usable Jupiter Perps program on this cluster |
| Legacy Drift `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH` | `executable: true` | Program exists; market/faucet/liquidity/SDK viability unverified |
| Velocity `vELoC1audYbSYVRXn1vPaV8Axoa9oU6BYmNGZZBDZ1P` | `executable: true` | Program exists; complete devnet trading path unverified |

This is a dated observation, not a permanent network fact. Re-check before deployment/signing.

## Current official SDK change

The old [Drift setup URL](https://docs.drift.trade/developers/drift-sdk/setup) redirected to [Velocity SDK setup](https://docs.velocity.exchange/developers/velocity-sdk/setup). GitHub's old `drift-labs/protocol-v2` repository resolved to archived `velocity-exchange/protocol-v2`.

Current setup documents `@velocity-exchange/sdk`, an `env: "devnet"` option, the Velocity program above and devnet dUSDT quote mint `GqmEqYsy8EyvofDpmtFxK8zhYrgWgNokAtYoduQdL7v6`. The documented faucet example requires an environment-specific faucet program ID; it is not an already-verified working faucet.

**Selection remains OPEN.** Do not rename a Drift adapter or assume a drop-in migration. Verify current source/package ownership, program/IDL compatibility, quote mint, initialized markets, oracle freshness, faucet or permitted test funding, actual order/fill/close and delegate/CPI authority model first.

## What can run on-chain

| Capability | Feasibility / condition |
|---|---|
| Policy PDA, signer checks, collateral budget and decision logs | Current program can provide these once correctly deployed |
| Real perp orders and positions | Requires an implemented adapter and a functioning compatible devnet venue |
| Unbypassable app-managed execution | Requires wrapper/custody authority and venue compatibility; absent today |
| Verified drawdown/exposure | Requires authenticated venue state and fresh validated oracles; runtime-supplied equity is insufficient |
| Chart, strategy evaluation, notifications and UI | Off-chain components; source-labelled data, not on-chain chart rendering |
| Atomic request submission | Possible only for the venue's supported instruction model; request confirmation is not keeper fill confirmation |

## Deployment and acceptance sequence

1. Build/test program and synchronize IDL; verify intended program ID and upgrade authority.
2. Fund a throwaway devnet deployer with test SOL; never upload key material or use real collateral.
3. Deploy Treasury and verify executable program identity plus policy initialization/read/update.
4. Select one verified devnet venue; initialize its exact account/quote-mint/market and fund test collateral.
5. Implement and prove the authority/policy binding, not merely authorize-then-order orchestration.
6. Capture actual authorization, order, fill and close signatures and resulting account state.
7. Run adversarial replay/substitution/denial, uncertainty and wallet-isolation cases.
8. Complete the three human sessions; only then update real-execution/submission claims.

If any step blocks, retain the truthful **policy-on-devnet + paper positions** mode. No live orders, deployments or devnet-fill tests were performed in this review.
