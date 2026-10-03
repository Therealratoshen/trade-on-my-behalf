#!/usr/bin/env bash
# demo.sh [local|devnet] — the full Trade On My Behalf story in one run.
#
#   local   (default) starts a throwaway solana-test-validator with the program
#           preloaded. Needs no SOL. Safe to run any time.
#   devnet  deploys the program to devnet if it is not there yet, then runs the
#           same story. Needs ~4 devnet SOL in ~/.config/solana/id.json
#           (https://faucet.solana.com).
#
# Trades are paper fills at live Jupiter prices; every approve/deny decision is
# a real on-chain authorize_spend transaction with a receipt link.

set -euo pipefail

CLUSTER="${1:-local}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROGRAM_DIR="$REPO_ROOT/programs/treasury"
PROGRAM_ID="4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph"
SO="$PROGRAM_DIR/target/deploy/treasury.so"
DEMO_DIR="$REPO_ROOT/.demo"
OWNER_KEY="${OWNER_KEY:-$HOME/.config/solana/id.json}"
AGENT_KEY="$DEMO_DIR/agent-$CLUSTER.json"
PAPER="$DEMO_DIR/paper-$CLUSTER.json"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
fail() { printf '  ✗ %s\n' "$*" >&2; exit 1; }

for bin in solana solana-keygen pnpm; do
  command -v "$bin" >/dev/null 2>&1 || fail "$bin not on PATH (see docs/onboarding.md)"
done
[ -f "$OWNER_KEY" ] || fail "no owner keypair at $OWNER_KEY. Run: solana-keygen new -o $OWNER_KEY"

case "$CLUSTER" in
  local)  URL="http://127.0.0.1:8899" ;;
  devnet) URL="https://api.devnet.solana.com" ;;
  *)      fail "usage: $0 [local|devnet]" ;;
esac
export RPC_URL="$URL"

say "Build"
if [ ! -f "$SO" ] || [ "${REBUILD:-0}" = "1" ]; then
  command -v anchor >/dev/null 2>&1 || fail "anchor CLI not on PATH and $SO missing"
  (cd "$PROGRAM_DIR" && anchor build)
fi
(cd "$REPO_ROOT" && pnpm install --silent && pnpm --filter @trade-on-my-behalf/sdk build >/dev/null)
echo "  program + SDK built"

mkdir -p "$DEMO_DIR"

if [ "$CLUSTER" = "local" ]; then
  say "Start local validator with the program preloaded"
  LEDGER="$(mktemp -d)"
  solana-test-validator --reset --quiet --ledger "$LEDGER" \
    --bpf-program "$PROGRAM_ID" "$SO" >"$DEMO_DIR/validator.log" 2>&1 &
  VALIDATOR_PID=$!
  trap 'kill $VALIDATOR_PID 2>/dev/null || true; rm -rf "$LEDGER"' EXIT
  for _ in $(seq 1 60); do solana cluster-version --url "$URL" >/dev/null 2>&1 && break; sleep 1; done
  solana airdrop 10 "$(solana-keygen pubkey "$OWNER_KEY")" --url "$URL" >/dev/null
  echo "  validator up at $URL"
else
  say "Deploy to devnet (skipped if already deployed)"
  if solana program show "$PROGRAM_ID" --url "$URL" >/dev/null 2>&1 && [ "${REDEPLOY:-0}" != "1" ]; then
    echo "  program already deployed: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
  else
    BAL=$(solana balance "$(solana-keygen pubkey "$OWNER_KEY")" --url "$URL" | awk '{print $1}')
    awk -v b="$BAL" 'BEGIN { exit !(b >= 3.5) }' || fail "owner has $BAL SOL; deploy needs ~3.5. Get devnet SOL at https://faucet.solana.com"
    solana program deploy "$SO" --program-id "$PROGRAM_DIR/target/deploy/treasury-keypair.json" \
      --keypair "$OWNER_KEY" --url "$URL"
  fi
fi

say "Fresh agent key (the hot key the runtime holds; owner key stays with the user)"
solana-keygen new --no-bip39-passphrase --silent --force -o "$AGENT_KEY" >/dev/null
AGENT_PUB=$(solana-keygen pubkey "$AGENT_KEY")
if [ "$CLUSTER" = "local" ]; then
  solana airdrop 1 "$AGENT_PUB" --url "$URL" >/dev/null
else
  solana transfer "$AGENT_PUB" 0.05 --allow-unfunded-recipient --keypair "$OWNER_KEY" --url "$URL" >/dev/null
fi
rm -f "$PAPER"
echo "  agent $AGENT_PUB (funded for tx fees only)"

tomb() {
  local validator_flags=()
  if [ "$CLUSTER" = "local" ]; then validator_flags=(--local-validator); fi
  (cd "$REPO_ROOT/packages/agent" && pnpm -s tomb "$@" \
    --expected-owner "$(solana-keygen pubkey "$OWNER_KEY")" "${validator_flags[@]}")
}
agent() { tomb "$@" --agent "$AGENT_KEY" --paper-state "$PAPER" || true; }

say "1. Owner sets the rules on-chain: \$50/trade, \$150/day, max 5x, 25% drawdown kill-switch"
tomb init-policy --owner "$OWNER_KEY" --agent "$AGENT_KEY" --per-tx 50 --per-day 150 --max-leverage 5 --kill-pct 25

say "2. In-policy trade: long SOL, \$40 at 3x  → expect APPROVED + paper fill"
agent trade --market SOL-PERP --side long --collateral 40 --leverage 3 --rationale "demo: in policy"

say "3. Oversized signal (\$500 at 20x), well-behaved agent clamps it → expect APPROVED at \$50 / 5x"
agent trade --market ETH-PERP --side short --collateral 500 --leverage 20 --rationale "demo: clamped"

say "4. Misbehaving agent sends 20x unclamped → expect DENIED REASON_LEVERAGE_CAP"
agent trade --market SOL-PERP --side long --collateral 30 --leverage 20 --raw

say "5. Misbehaving agent sends \$80 unclamped → expect DENIED REASON_PER_TX_CAP"
agent trade --market SOL-PERP --side long --collateral 80 --leverage 2 --raw

say "6. Owner tightens the kill-switch to 5%"
tomb update-policy --owner "$OWNER_KEY" --agent "$AGENT_KEY" --kill-pct 5

say "7. Market crash (simulated prices): both open positions lose their collateral"
agent positions --price SOL-PERP=1,ETH-PERP=1000000

say "8. Next trade after the crash → expect DENIED REASON_DRAWDOWN_KILLSWITCH"
agent trade --market SOL-PERP --side long --collateral 10 --leverage 2 --price SOL-PERP=1,ETH-PERP=1000000

say "9. Compromised agent key tries to loosen its own policy → expect Unauthorized"
tomb update-policy --owner "$AGENT_KEY" --agent "$AGENT_KEY" --kill-pct 100 || true

say "Final on-chain policy"
agent status

printf '\nDone. Every "receipt" link above is an on-chain transaction on %s.\n' "$CLUSTER"
