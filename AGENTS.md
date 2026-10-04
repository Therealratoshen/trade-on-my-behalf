# Instructions for coding agents

These instructions help agents work safely and consistently in the Terading source repository. The public project is still named `trade-on-my-behalf`; package names and paths are stable identifiers, not app branding. The user-facing product name is **Terading** — use it in new prose. Note that `README.md`, `CONTRIBUTING.md`, `PRD.md` and the `package.json` descriptions still say "Trade On My Behalf"; that drift is tracked, and docs/ and the dashboard use Terading.

## Prepare before making changes

1. Read [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md), [PRD.md](PRD.md), [TRD.md](TRD.md), and the [documentation index](docs/documentation-index.md). Read [onboarding](docs/onboarding.md) before running commands, and read the current domain-specific docs and tests for the files you will change.
2. Check the current branch, source revision, working tree, default branch, and open pull requests. Preserve existing work; do not overwrite another contributor’s changes or add a change to an unrelated pull request.
3. Treat the current PRD, TRD, and testing/evidence records as the sources of truth. Historical research and dated observations are not current implementation or proof. When project requirements disagree, document the conflict and follow the explicit current release requirements.
4. Identify the affected requirement and test case before editing. Make the smallest change that addresses it, and update current documentation when behavior or a verified claim changes.

## Safety boundaries

- Keep signing, deposits, and any future trading on verified Solana devnet with test assets. Use a local validator for isolated tests. Never silently fall back to mainnet.
- Do not send a wallet signature, program transaction, transfer, or other network write without explicit user approval for that operation. Inspect devnet scripts before running them; a program deployment or wallet action requires the appropriate owner and test funds.
- **Never point `ANCHOR_WALLET` at `~/.config/solana/id.json`** when running the program suite. Use a throwaway keypair in a temp directory. `anchor test` reads `provider.cluster` from `Anchor.toml` to decide where to deploy, so passing `--provider.cluster localnet` matters; never run `anchor deploy` against a public cluster.
- An authorization decision is not a venue order or fill. Distinguish local preflight, on-chain policy results, transaction status, simulated paper positions, and actual venue execution. Never describe paper results as live orders, fills, PnL, or public-devnet proof.
- Do not place private keys, seed phrases, credentials, private RPC URLs, or personal account details in source, test output, documentation, issues, or pull requests. Redact sensitive diagnostics.
- Do not claim a test, build, deployment, user session, or devnet transaction passed unless it was actually run and its result is recorded. Label missing prerequisites and unrun checks explicitly.

## Change and verification workflow

- Use the pinned pnpm version and documented Node, Rust, Solana, and Anchor prerequisites. Check a tool is available before relying on it; do not weaken checks or silently switch toolchains when a prerequisite is missing.
- Run the relevant documented tests after changes. For program/IDL changes, follow the repository’s documented build and SDK IDL synchronization workflow, then validate dependent code.
- Report the tested revision, exact command, environment, and result; separate code checks from local-validator evidence, human testing, and devnet receipts.
- Create a focused branch and pull request from the current default branch. Do not push directly to `main` or merge a pull request unless the user explicitly asks.

## Current verification commands

These are the commands CI runs on every pull request. They are commands, not a claim that they pass — run them and report the actual result.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm -r test                        # SDK + agent unit suites, offline

(cd programs/treasury && pnpm install --frozen-lockfile --ignore-workspace)
(cd programs/treasury && anchor build)
(cd programs/treasury && pnpm exec ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts)

(cd apps/dashboard && pnpm check)   # tsc --noEmit plus the design-token guard
```

The Anchor suite talks to a local validator, not a public cluster. Start one with the program preloaded, point `ANCHOR_PROVIDER_URL` and `ANCHOR_WALLET` at a throwaway wallet, then run the `ts-mocha` line. `anchor test` is not used in CI because `Anchor.toml` sets `provider.cluster = "devnet"`, which would make it attempt a devnet deploy.

## Replit workspace

The mounted Replit workspace is a separate repository from this public GitHub project. Use this repository as the source of truth. Do not clone it inside the mounted workspace; if a temporary checkout is required, keep it outside the workspace and remove it when finished.
