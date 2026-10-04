# Local-validator validation

Regression evidence for the Anchor program suite, re-run on this branch. This is not a professional security audit, and it is not devnet evidence.

The suite now runs in CI on every pull request (`.github/workflows/ci.yml`, the `program` job). This file records what a local run actually produced, and what it does not establish.

## Result

**20 passing, 0 failing.** The compiled Treasury SBF binary was loaded into a disposable local validator at the existing program address `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`. The 20 cases are the ones currently in `programs/treasury/tests/treasury.ts`:

- Policy creation and a spend below cap; over-cap denial still emitting a denied audit.
- Vendor whitelist, daily cap, TTL expiry and leverage-cap denials by reason code.
- Owner `update_policy` on `max_leverage_bps`; `update_policy` refused to a non-owner signer.
- `authorize_spend` refused to a key that is neither agent nor owner; the agent key may authorize and record PnL on its own policy but may not loosen the policy.
- Drawdown kill-switch tripping on the caller-reported equity model.
- Request well-formedness: `InvalidLeverage` below 1x, `InvalidAmount` on `amount_usdc == 0` (no audit, no budget burned), and `leverage_bps` above the u16 range staying uncapped when `max_leverage_bps == 0`.
- PDA squatting: `create_policy` refused when the agent does not sign; a legacy client that strips the agent signer has the failure recorded by the ledger and leaves no policy account; a third party's failed squat does not block the real owner; the agent signature is still required when owner and attacker collude.

## Environment and procedure

Measured on this machine, 2026-10-04:

- Solana CLI 4.2.0; `cargo-build-sbf` 4.1.0 with platform-tools v1.54, building rustc 1.89.0.
- Anchor JS 0.31.1; Mocha 9.2.2, ts-mocha 10.1.0, Chai 4.5.0, TypeScript 5.7.
- `anchor build` completed from a clean `target/` and produced `target/idl/treasury.json`, `target/types/treasury.ts` and `target/deploy/treasury.so`. The generated IDL address matches the program ID.
- A freshly generated disposable keypair in a temporary directory was the only signer. It received local faucet SOL only. `~/.config/solana/id.json` was not referenced.
- All RPC traffic went to `http://127.0.0.1:8899`. No public cluster was contacted.

`anchor test` is deliberately **not** used. `Anchor.toml` commits `provider.cluster = "devnet"`, and `anchor test` would act on that by attempting a devnet deploy. Start a local validator with the program preloaded, point `ANCHOR_PROVIDER_URL` and `ANCHOR_WALLET` at a throwaway wallet, then run the test script directly from `programs/treasury` (the suite resolves `../target/types/treasury`, and `anchor.workspace` reads `./Anchor.toml`):

```sh
solana-test-validator --reset --quiet --ledger "$TMPDIR/ledger" \
  --bpf-program 4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph target/deploy/treasury.so &

ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET="$TMPDIR/wallet.json" \
pnpm exec ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
```

One environmental note, since it costs a full rebuild to diagnose: a stale `target/` directory can make the suite crash part-way with `Access violation` and look like a code defect. `rm -rf target && anchor build` is the fix; it is an artifact of the cached build, not a program bug.

## What this does not establish

- No mainnet merge, public-network deployment, upgrade-authority verification, or actual venue trading was performed. There is no devnet receipt here.
- The suite covers the **program** only. It does not exercise the SDK, the agent runtime, or the dashboard, and it does not prove the program is deployed anywhere.
- The drawdown and equity cases assert against the *caller-reported* equity model. The program trusts the reported figure; it does not read venue equity. That limitation is tracked in [security-model.md](security-model.md), and passing these tests is not evidence against it.
- A policy denial is a successful transaction, not a failure. Tests that assert on reason codes are asserting on the `AuditEvent` in the logs, not on transaction status.
- These results do not certify custody, authentic equity, single-use intents, or atomic venue execution. Re-test against the intended runtime and feature set before any explicitly approved devnet upgrade.
