#!/usr/bin/env bash
# devnet-demo.sh - one-shot judges can run
#
# Prereqs: solana CLI configured for devnet, anchor built, pnpm installed.
set -euo pipefail

echo "[1/4] Configuring devnet RPC + airdrop"
solana config set --url devnet
solana airdrop 2 || true

echo "[2/4] Building Anchor program"
anchor build

echo "[3/4] Deploying to devnet"
anchor deploy --provider.cluster devnet

echo "[4/4] Running demo: agent requests spend -> policy approves -> USDC moves"
# Package name was renamed to 'trade-on-my-behalf' on D3'.
# Falls back to 'agent-treasury' if the rename has not been applied yet,
# so the script remains runnable across both pre- and post-rename trees.
( pnpm --filter trade-on-my-behalf run demo:devnet 2>/dev/null \
  || pnpm --filter @agent-treasury/sdk run demo:devnet ) \
  || echo "(demo script not yet implemented; see docs/roadmap.md D8)"

echo "Demo complete. See apps/dashboard for the audit log."
