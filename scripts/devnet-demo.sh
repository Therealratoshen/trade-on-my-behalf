#!/usr/bin/env bash
# Devnet run of the demo. Needs ~4 devnet SOL in ~/.config/solana/id.json.
# For a no-SOL run on a local validator: bash scripts/demo.sh local
exec bash "$(dirname "${BASH_SOURCE[0]}")/demo.sh" devnet
