#!/usr/bin/env bash
# devnet-demo.sh - one-shot judges can run.
#
# Status: D9 placeholder. The D9 deliverable (SDK + Jupiter Perps adapter
# + webapp) has not shipped yet, so this script cannot run end-to-end.
# It is wired up to FAIL LOUD on every pre-condition rather than silently
# masking the gap. See PM-LOG §5 R17 + docs/whats-missing.md.
#
# Once D9 ships, replace the placeholders below with the real demo path.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "════════════════════════════════════════════════════════════════"
echo " Trade On My Behalf — devnet demo (D9 placeholder)"
echo "════════════════════════════════════════════════════════════════"
echo
echo "[1/5] Configuring devnet RPC + checking keypair"
if ! command -v solana >/dev/null 2>&1; then
  echo "  ✗ solana CLI not on PATH. Install from https://docs.solanalabs.com/cli/install" >&2
  exit 1
fi
solana config set --url devnet
if [ ! -f "$HOME/.config/solana/id.json" ]; then
  echo "  ✗ No devnet keypair at ~/.config/solana/id.json." >&2
  echo "    Run: solana-keygen new -o ~/.config/solana/id.json" >&2
  echo "    Then: solana airdrop 2" >&2
  echo "    See PM-LOG §5 R3 / §6 U1." >&2
  exit 1
fi
solana airdrop 2 || true

echo
echo "[2/5] Building Anchor program"
if ! command -v anchor >/dev/null 2>&1; then
  echo "  ✗ anchor CLI not on PATH. Install with: cargo install --git https://github.com/coral-xyz/anchor avm --locked --force" >&2
  exit 1
fi
anchor build

echo
echo "[3/5] Deploying to devnet"
if ! anchor deploy --provider.cluster devnet 2>&1 | tee /tmp/anchor-deploy.log; then
  echo "  ✗ anchor deploy failed. See /tmp/anchor-deploy.log" >&2
  exit 1
fi

echo
echo "[4/5] Booting agent runtime + opening webapp"
if ! pnpm --filter @trade-on-my-behalf/sdk build 2>/dev/null; then
  echo "  ✗ SDK build missing. D9 deliverable has not shipped yet." >&2
  echo "    packages/sdk/src/ is empty (PM-LOG §5 R17)." >&2
  echo "    See docs/sdk-api.md for the planned API surface." >&2
  exit 1
fi
pnpm --filter @trade-on-my-behalf/agent dev &
AGENT_PID=$!
trap 'kill $AGENT_PID 2>/dev/null || true' EXIT
echo "  • Agent runtime PID: $AGENT_PID"

if ! pnpm --filter @trade-on-my-behalf/dashboard dev >/tmp/dashboard.log 2>&1 &
then
  echo "  ✗ Webapp failed to boot. apps/dashboard/ is empty (PM-LOG §5 R17)." >&2
  echo "    See docs/control-surface.md for the planned webapp design." >&2
  exit 1
fi
echo "  • Webapp dev server: http://localhost:3000"

echo
echo "[5/5] Running demo flow (push an over-leveraged intent, expect a red row)"
echo "    See docs/demo-receipts.md for the captured Solscan-verifiable receipts."
echo "    Until D9 ships, this script intentionally fails above instead of faking a green light."
echo
echo "════════════════════════════════════════════════════════════════"
echo " ✗ Demo path incomplete. See docs/whats-missing.md + PM-LOG §5 R17."
echo "════════════════════════════════════════════════════════════════"
exit 1