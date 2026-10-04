# Onboarding — Local Policy/Paper Demo and Devnet Preconditions

Updated 2026-10-03. No deployment or test pass is implied by these commands.

## Prerequisites

Normal repository checkout, Node 20+, pinned pnpm, compatible Rust/Solana/Anchor toolchains. Use a throwaway test wallet and test SOL only. Keep private-key files local; do not paste them into chat, docs, issue reports or browser bundles.

The `ts-mocha` line above runs the Anchor suite against a **local** validator you start yourself
with the program preloaded; see [local-validator-validation](local-validator-validation.md). It is
used instead of `anchor test` because `Anchor.toml` commits `provider.cluster = "devnet"` and
`anchor test` reads that field to decide where to deploy. Point `ANCHOR_PROVIDER_URL` and
`ANCHOR_WALLET` at a throwaway keypair in a temp directory — never at `~/.config/solana/id.json`.
`pnpm demo` defaults `OWNER_KEY` to that same path, so override it with a throwaway key; local mode
needs no real SOL.

For every command with its actual output, see the [user manual](user-manual.md).

For work from the separate Replit workspace, use the GitHub connection as source of truth; do not clone this external repository inside the mounted workspace. A temporary checkout outside it must be removed after use.

## Local path

```bash
pnpm install
pnpm --filter @trade-on-my-behalf/sdk build
pnpm --filter @trade-on-my-behalf/agent build
pnpm --filter @trade-on-my-behalf/sdk test
pnpm --filter @trade-on-my-behalf/agent test
(cd programs/treasury && anchor build)
(cd programs/treasury && pnpm exec ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts)
pnpm demo
pnpm --filter @trade-on-my-behalf/dashboard dev
```

Dashboard RPC/cluster and agent policy must match the local demo. Connected owner and agent can be different keys; current dashboard lookup does not yet solve that automatically. Current paper positions are a shared demo projection, not wallet-owned venue assets.

## Devnet path — gated

Read [devnet-readiness.md](devnet-readiness.md) before `pnpm devnet:demo`. The script requires deploy tools, intended program key/ID and sufficient test SOL; inspect its behavior before running. A prior deployment must match the current build/IDL, not merely exist.

The devnet demo produces real policy transactions **when deployment succeeds**, followed by simulated positions. Jupiter program presence is not needed for paper fills and is not proof of real trading. Real devnet orders require the separate venue/authority gates in [TRD](../TRD.md).

## What success means

Local demo success: matching local policy state and confirmed decision logs, plus labelled paper fills. Devnet policy success: genuine confirmed devnet signatures and state. Real venue success: actual order/fill/close and reconciled account state. These are three different outcomes.

Missing toolchain, empty faucet, unavailable RPC, absent program, missing market or unknown transaction status must be reported explicitly; never fall back to mainnet or mark a paper result real.
