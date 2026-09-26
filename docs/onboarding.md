# Onboarding — Clone to Devnet Demo

> Frozen for D6. Five steps from `git clone` to a working devnet
> demo. Each step has a one-paragraph *what* and a one-paragraph
> *why*.

This document is what a developer or judge does after cloning the
repo. No lore, no narrative. Five steps, each one a copy-paste-able
shell block.

## Prerequisites

- **Rust toolchain** (`rustup`), Solana CLI 2.x, Anchor CLI 0.31.x.
  The `solana-dev` skill's compatibility matrix is the canonical
  reference. Anchor 0.31.1 is the locked version; the
  `Anchor.toml` and `programs/treasury/Cargo.toml` reflect this.
- **Node.js 20.18+** and **pnpm 9+**. The repo is a pnpm
  workspace; do not substitute npm or yarn.
- **A devnet keyfile**. If you do not have one, run
  `solana-keygen new -o ~/.config/solana/id.json` and then
  `solana config set --keypair ~/.config/solana/id.json --url devnet`
  followed by `solana airdrop 2`.

## Submodules

There are **no git submodules** in this repo. All skills referenced
in `.agents/skills/` are vendored as plain directories so the
checkout is self-contained.

## Step 1 — Clone and install

```bash
git clone https://github.com/<handle>/<repo> trade-on-my-behalf
cd trade-on-my-behalf
pnpm install
```

`pnpm install` wires the four workspace packages
(`@trade-on-my-behalf/sdk`, `@trade-on-my-behalf/agent`,
`@trade-on-my-behalf/policy-engine`, `@trade-on-my-behalf/bridge`)
plus the dashboard app. Expect ~30 s on a fresh laptop.

**Why.** The repo is a pnpm workspace so the four packages share
lockfiles and the SDK can be edited and tested inside the monorepo
without publishing.

## Step 2 — Build the Anchor program

```bash
anchor build
```

The first build takes ~3 min (downloads the Solana BPF toolchain).
The result is `programs/treasury/target/deploy/treasury.so`
(~203 KB) and `programs/treasury/target/idl/treasury.json`. The
latter is what the SDK and dashboard bind to.

**Why.** The Anchor program is the only on-chain artefact. Every
other layer is off-chain and speaks to it through the IDL.

## Step 3 — Run the Anchor tests

```bash
anchor test
```

Tier 1 LiteSVM tests run in-process. You should see:

```text
treasury::tests::litesvm
  t01_create_policy ... ok
  t02_deny_unknown_vendor ... ok
  t03_deny_per_tx_cap ... ok
  t04_deny_daily_cap ... ok
  t05_deny_expired ... ok
  t06_too_many_vendors ... ok
  t07_event_always_emits ... ok
  t08_saturating_add ... ok
  t09_pda_collision ... ok

test result: ok. 9 passed; 0 failed
```

**Why.** Tier 1 is the proof that the on-chain gate is correct. If
any test fails, do not proceed — the rest of the system is built
on top of these invariants. See `docs/testing-plan.md` for the
full Tier 1/2/3 pyramid.

## Step 4 — Deploy to devnet and run the demo

```bash
anchor deploy --provider.cluster devnet
./scripts/devnet-demo.sh
```

The deploy step writes the program to devnet under program ID
`4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`. The demo script
creates a `Policy` PDA, calls `authorize_spend` twice (one
approved, one denied), and prints the resulting `AuditEvent`s.

You should see two events in the terminal — one with `approved:
true, reason_code: 0` and one with `approved: false, reason_code:
2` (per-tx cap).

**Why.** Devnet is the canonical "this works against a real
validator" smoke test. The demo script is what the outside-dev
user tests run on D10-D11.

## Step 5 — Open the dashboard and verify

```bash
pnpm --filter @trade-on-my-behalf/dashboard dev
```

This boots the Next.js 15 dashboard at `http://localhost:3000`.
Connect a wallet (Phantom Connect on devnet), paste the `policy`
PDA pubkey from step 4, and the audit viewer should show the two
`AuditEvent`s from the demo script in chronological order.

**Why.** The dashboard is the human-readable surface for the audit
log. If the dashboard cannot see the events, the indexing layer
(Helius DAS) is misconfigured; check `apps/dashboard/src/lib/audit.ts`.

## What to read next

- `docs/architecture.md` — the system diagram and the data flow.
- `docs/onchain-program.md` — every field of the `Policy` PDA and
  every instruction of the treasury program.
- `docs/sdk-api.md` — the SDK's `withTrader(...)` API and the
  five-line example.
- `docs/venues.md` — the supported perps venues and the gaps.
- `docs/security-model.md` — the threat model.

## Common pitfalls

- **Stale CLI.** If `anchor build` complains about a Solana CLI
  version mismatch, the `solana-dev` skill's compatibility matrix
  tells you which pair to use. Anchor 0.31.1 + Solana CLI 2.1.x is
  the supported combo as of D6.
- **Devnet airdrop flaky.** The `solana airdrop 2` call sometimes
  429s on devnet. Re-run; or use a public faucet like
  `https://faucet.solana.com`.
- **`pnpm install` fails on Apple Silicon.** Make sure you are on
  Node 20.18+ ARM, not Intel under Rosetta.
- **Phantom on devnet.** Phantom defaults to mainnet. Switch the
  network in the wallet's settings before connecting.

## What "success" looks like

You have a working devnet demo with:

- a `Policy` PDA at `[b"policy", agent]` on devnet,
- two `AuditEvent`s visible on the dashboard (one approve, one deny),
- the Anchor program ID matching the README (no upgrade during your
  session),
- the `treasury.so` SHA-256 matching the value in `docs/architecture.md`
  (the founder verifies this on D16).

That's it. You are onboarded.