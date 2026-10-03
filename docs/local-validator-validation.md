# Local-validator validation

Validated 2026-10-03 against the draft consent/accounting branch. This is regression evidence, not a professional security audit.

## Result

**14 passing, 0 failing.** The actual Treasury SBF binary was loaded into a disposable local ledger at the existing program address.

- Successful signed registration and below-cap spending.
- Unsigned-agent rejection even when a legacy client removes the signer metadata.
- Failed registration actually submitted to the ledger with preflight disabled: transaction recorded with Anchor `AccountNotSigner` / custom error 3010; the partially initialized policy account does not exist afterward.
- Exact u64-maximum approval charges the complete amount. The following unit is denied with the daily-cap reason and leaves the counter unchanged.
- Per-transaction and daily caps, vendor whitelist, expiry and leverage boundaries.
- Owner rule updates; rejection of unauthorized callers and agent rule updates.
- Agent authorization and peak-equity recording.
- Drawdown denial using the existing reported-equity model.

## Environment and procedure

- SBF builder: Agave 4.3.0, platform-tools v1.57, architecture v0; existing Cargo.lock preserved with `--locked`.
- Validator: Agave 2.1.21. The current validator requires io_uring, unavailable in this sandbox; the older compatible validator successfully executes the v0 binary.
- Anchor JS 0.31.1; Mocha 12.0.3; Chai 6.3.0; Node 24 with tsx.
- A freshly generated disposable wallet received only local faucet tokens.
- All RPC requests for transactions used `http://127.0.0.1:9410`. No public cluster was used.

Build command, from the Treasury workspace:

```sh
cargo-build-sbf --tools-version v1.57 --arch v0 --jobs 2 \
  --manifest-path programs/treasury/Cargo.toml \
  --sbf-out-dir target/deploy -- --locked
```

Start a temporary validator with `--bind-address 127.0.0.1 --rpc-port 9410`, a new temporary ledger and `--bpf-program 4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph target/deploy/treasury.so`. Provide unused faucet/gossip/dynamic ports. Materialize `target/idl/treasury.json` from the committed SDK IDL, generate a disposable wallet, and fund it from this local faucet.

Run the suite with installed Mocha/tsx dependencies:

```sh
ANCHOR_PROVIDER_URL=http://127.0.0.1:9410 \
ANCHOR_WALLET=/path/to/disposable-wallet.json \
node --import tsx /path/to/mocha/bin/mocha.js \
  --timeout 120000 tests/treasury.ts
```

Registration tests explicitly supply the System Program rather than relying on optional IDL account-resolution metadata.

## What this does not establish

No main-branch merge, public-network deployment, upgrade-authority verification or actual venue trading was performed. Test processes and disposable ledger/wallet are removed after the run.

Automatic GitHub Actions remains blocked by workflow-file permissions. These results do not certify a newer runtime's active feature set, custody, authentic equity, single-use intents or atomic venue execution. Re-test against the intended runtime and feature set before any explicitly approved devnet upgrade.