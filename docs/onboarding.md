# Onboarding — Clone to Working Demo

> Updated 2026-09-27 (D10) to match what actually runs. Five steps from
> `git clone` to watching the on-chain policy approve and deny trades.

## Prerequisites

- **Rust**, **Solana CLI** (tested with 4.2), **Anchor CLI 0.31.1**.
- **Node.js 20+** and **pnpm 9+**. The repo is a pnpm workspace; do not
  substitute npm or yarn.
- **An owner keypair** at `~/.config/solana/id.json`. If you have none:
  `solana-keygen new -o ~/.config/solana/id.json`. The local demo needs
  no SOL; devnet needs ~4 devnet SOL (Step 5).

There are no git submodules. The agent skills this project was built with
are **not** in the repo (one is Proprietary-licensed); the README
quickstart shows how to install them if you want them. The code does not
depend on them.

## Step 1 — Clone and install

```bash
git clone https://github.com/Therealratoshen/trade-on-my-behalf
cd trade-on-my-behalf
pnpm install
```

Installs two workspace packages: `@trade-on-my-behalf/sdk` and
`@trade-on-my-behalf/agent`.

## Step 2 — Build and test the Anchor program

```bash
cd programs/treasury
anchor build
anchor test --provider.cluster localnet
cd ../..
```

Expect **12 passing**: approve below cap, and a deny for each reason
code (vendor, per-trade cap, daily cap, TTL expiry, leverage, drawdown
kill-switch), plus signer checks — a stranger cannot spend, the agent key
can trade and record PnL, the agent key cannot loosen the policy.

**Why.** The program is the only trust anchor. If these fail, stop.

## Step 3 — Test the SDK and agent (offline)

```bash
pnpm --filter @trade-on-my-behalf/sdk build
pnpm --filter @trade-on-my-behalf/sdk test     # 11 passing
pnpm --filter @trade-on-my-behalf/agent test   # 16 passing
```

## Step 4 — Run the demo on a local validator

```bash
pnpm demo
```

Starts a throwaway `solana-test-validator` with the program preloaded,
creates a fresh agent key, and walks nine steps: create policy, approved
trade (paper fill at the live Jupiter price), oversized signal clamped,
leverage deny, per-trade-cap deny, owner tightens the kill-switch,
simulated crash, kill-switch deny, agent key fails to loosen its own
policy. Each step prints `APPROVED`/`DENIED` with the reason code and an
explorer link. ~20 seconds.

To poke at it by hand, see the CLI in
[agent-runtime.md](agent-runtime.md#cli). `tomb watch --agent <key>`
streams decoded AuditEvents live.

## Step 5 — Same demo on devnet

```bash
# get ~4 devnet SOL for your owner key at https://faucet.solana.com
solana address
pnpm devnet:demo
```

Deploys the program to devnet if it is not already there (program rent
is ~1.54 SOL plus a same-size temporary buffer that is refunded), funds
the agent key with 0.05 SOL for fees, and runs the same nine steps. The
receipt links now open on the public devnet explorer.

## Common pitfalls

- **`Blockhash not found` / `AccountNotInitialized` right after creating
  a policy.** Commitment mismatch; the SDK uses `confirmed` for both
  preflight and confirmation. If you call Anchor directly, pass
  `{ commitment: 'confirmed', preflightCommitment: 'confirmed' }` to `.rpc()`.
- **Devnet airdrop 429s.** Use https://faucet.solana.com instead of
  `solana airdrop`.
- **Port 8899 in use.** Another `solana-test-validator` is running;
  `pkill -f solana-test-validator`.

## What "success" looks like

- 12 + 11 + 16 tests passing.
- `pnpm demo` ends with `killSwitchDrawdownPct 5`, `daySpentUsd 90`, and
  the agent's `update_policy` attempt failing with `Unauthorized`.
- On devnet: the program id `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`
  shows up on the devnet explorer with your AuditEvent transactions.
