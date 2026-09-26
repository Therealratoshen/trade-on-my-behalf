#!/usr/bin/env bash
# scripts/research/perps-deepsafe.sh
#
# Stage-2 perps-agent Deep Dive against Colosseum Copilot. Uses
# single-call retries with exponential backoff to survive the
# auth-flap window observed on Sep 26 (intermittent 401 on
# /status and /search/projects from Cloudflare edge).
#
# Usage:  bash scripts/research/perps-deepsafe.sh
#
set -e
API="${COLOSSEUM_COPILOT_API_BASE:-https://copilot.colosseum.com/api/v1}"
PAT="${COLOSSEUM_COPILOT_PAT:?set COLOSSEUM_COPILOT_PAT first}"

LOG_DIR="/tmp/copilot-perp-deepsafe"
mkdir -p "$LOG_DIR"
echo "logs: $LOG_DIR"

call_with_retry() {
  local label="$1"; shift
  local body="$1"
  local out_file="$LOG_DIR/$label.json"
  for try in 1 2 3 4 5; do
    echo "--- $label attempt $try ---"
    local resp
    resp=$(curl -sS -X POST "$API/search/projects" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
      -d "$body")
    if echo "$resp" | grep -q '"error"'; then
      echo "  error: $resp"
      local backoff=$((try * 10))
      echo "  sleeping ${backoff}s..."
      sleep "$backoff"
      continue
    fi
    echo "$resp" > "$out_file"
    echo "  saved -> $out_file ($(wc -c < "$out_file") bytes)"
    return 0
  done
  echo "  ERROR: $label failed 5x; saving last error"
  echo "$resp" > "$out_file.err"
  return 1
}

echo "============== /status =============="
curl -sS "$API/status" -H "Authorization: Bearer $PAT" | tee "$LOG_DIR/status.json"
echo
sleep 2

echo "============== Q1: winners + accelerator on perps =============="
call_with_retry "q1-winners-perps" \
  '{"query":"perpetual futures agent trading bot AI signal leverage on-chain","limit":15,"filters":{"winnersOnly":true},"diversify":false}'

echo
echo "============== Q2: cluster v1-c9 (Solana DEX and Trading) =============="
curl -sS "$API/clusters/v1-c9" -H "Authorization: Bearer $PAT" > "$LOG_DIR/q2-cluster.json"
echo "  saved -> $LOG_DIR/q2-cluster.json"

echo
echo "============== Q3: full corpus on perps =============="
call_with_retry "q3-all-perps" \
  '{"query":"perpetual futures","limit":15,"filters":{},"diversify":false}'

echo
echo "============== Q4: archive (LMSR / perps / signal designs) =============="
call_with_retry_archive() {
  local body="$1"; local out="$LOG_DIR/q4-archives.json"
  curl -sS -X POST "$API/search/archives" \
    -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" \
    -d "$body" > "$out"
  echo "  saved -> $out"
}
call_with_retry_archive '{"query":"perpetual futures design LMSR AMM agentic trading leverage risk","limit":6}'

echo
echo "Done. Inspect $LOG_DIR/*.json"
