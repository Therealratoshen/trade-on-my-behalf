# Release evidence — 2026-10-03

## Source and execution boundary

Fresh checks used the external repository's main baseline
[`8c6e769df1fe5263f3a682fadfe5f7580e2b0c6b`](https://github.com/Therealratoshen/trade-on-my-behalf/tree/8c6e769df1fe5263f3a682fadfe5f7580e2b0c6b).
A temporary source archive was extracted outside the mounted Replit app. This is a docs-only update; program, SDK, agent and dashboard source, lockfiles and deployment settings were not changed.

The build/lint/offline-test sequence ran from **2026-10-03 16:13:30 to 16:14:06 UTC** (23:13:30–23:14:06 Asia/Jakarta). See [session metadata](evidence/2026-10-03-main/session.log), [tool versions](evidence/2026-10-03-main/toolchain.log) and [machine-readable results](evidence/2026-10-03-main/results.json).

Observed tools: Node **24.13.0**, pnpm **9.0.0**, Anchor CLI **0.31.1**, host Cargo/rustc **1.88.0**. The available Solana CLI is **1.17.28**, not the Agave validators in the earlier draft-PR report. Its tool installation does not provide `cargo build-sbf`. No current runtime feature-set compatibility is certified.

No owner key was read, no wallet was funded, no public transaction was submitted, and no program was deployed or upgraded. No human session, recording or event submission occurred.

## Commands executed in this update

The working directory was the isolated repository root unless stated otherwise. `CI=true NEXT_TELEMETRY_DISABLED=1` was set for the build/lint/offline-test sequence; dependent packages were built before lint and tests.

| Command | Exit | Result | Artifact |
|---|---:|---|---|
| `CI=true pnpm install --frozen-lockfile` | 1 | FAIL at environment setup: automatic pnpm switching could not find its CLI; not a code-test failure | [initial install log](evidence/2026-10-03-main/install-initial.log) |
| `CI=true PNPM_WORKERS=1 pnpm install --frozen-lockfile --config.manage-package-manager-versions=false --config.package-manager-strict-version=false` | 0 | PASS: frozen dependency restoration; lockfiles unchanged | [install log](evidence/2026-10-03-main/install.log) |
| `pnpm build` | 0 | PASS: SDK, agent and Next.js production build; not a browser interaction test | [build log](evidence/2026-10-03-main/build.log) |
| `pnpm -r lint` | 0 | PASS: TypeScript checks for SDK, agent and dashboard | [lint log](evidence/2026-10-03-main/lint.log) |
| `pnpm -r test` | 0 | PASS: SDK **11/11**, agent **17/17**; no failures, skips or cancellations | [named test log](evidence/2026-10-03-main/tests.log) |
| `anchor build -- --locked` from the Treasury workspace | 101 | BLOCKED: Cargo reports `no such command: build-sbf` | [build blocker](evidence/2026-10-03-main/anchor-build.log) |
| `pnpm --filter @trade-on-my-behalf/sdk run sync-idl` | 1 | BLOCKED: generated `target/idl/treasury.json` absent after the blocked program build; committed SDK IDL unchanged | [IDL blocker](evidence/2026-10-03-main/idl-sync.log) |

The local-validator suite was **NOT RUN / BLOCKED**, with no test exit code: a fresh SBF binary was unavailable. `pnpm demo` was NOT RUN for the same prerequisite reason; `pnpm devnet:demo` was NOT RUN because public deployment/funding was not authorized. Missing tools are not failed contract assertions.

**The current executed total is 28 offline tests, not 40.** The root pnpm test command does not execute the nested Anchor suite. No coverage percentage, public-devnet execution, browser behavior or hard loss ceiling is established by these logs.

Anchor build used the explicitly selected installed host Rust toolchain and available Anchor/Solana binaries. The committed provider remains devnet. Future offline tests must explicitly select localnet and an explicitly generated disposable wallet; never silently fall through to the owner's default key. Fixing root Anchor commands, installing a compatible builder/validator and making CI mandatory remain separate work.

## Owner-reported baseline

The owner supplied the master prompt “Close Trade On My Behalf Before the World Fair” on 2026-10-03. It reports the following at main `8c6e769`: frozen pnpm install, lint and build exit 0; SDK 11/11, agent 17/17, program 12/12; byte-identical IDL regeneration; and a clean tracked-file secret check. Reported tools were Anchor CLI 0.31.1, pnpm 9.0.0 and Node 20 or newer.

These are **attributed historical reports**, not commands executed by this agent in this update. The attachment did not include raw output for the program run, IDL regeneration or secret check. This update independently reran the 28 offline tests, lint and build but could not rerun the program/IDL steps. It does not promote the reported **40** to a fresh whole-suite PASS. The owner's “clean secret scan” is not a new scan claim.

## Draft PR evidence

[Draft PR #2](https://github.com/Therealratoshen/trade-on-my-behalf/pull/2) was open and draft when checked. Its observed report/source head was
[`08b08401bc35ed4a6fdd4c030829829eab7be0b2`](https://github.com/Therealratoshen/trade-on-my-behalf/tree/08b08401bc35ed4a6fdd4c030829829eab7be0b2).

The [pinned earlier local-validator report](https://github.com/Therealratoshen/trade-on-my-behalf/blob/08b08401bc35ed4a6fdd4c030829829eab7be0b2/docs/local-validator-validation.md) records **14 passing, 0 failing** on the consent/accounting branch. It describes ledger-recorded unsigned-agent rejection with rollback, exact-u64 maximum charging and the next-unit denial, plus the policy cases.

That report records an Agave 4.3.0/platform-tools v1.57 v0 build and an Agave 2.1.21 validator, Anchor JS 0.31.1, Mocha 12.0.3, Chai 6.3.0 and Node 24. It explicitly separates newer-runtime restrictions from its compatible older-validator run.

**This update did not re-execute those 14 tests.** The pinned hash identifies the document/source snapshot available at review, not an invented exact execution hash: the original report does not state the full source SHA used at execution. Its passing assertions must remain attributed to that earlier report. The draft hardening is not merged-main or deployed-program behavior. Do not sum the 14 draft-branch cases with the 28 main-baseline cases.

## Release and owner evidence gates

| Gate | Current evidence status | What remains needed |
|---|---|---|
| Public-devnet Treasury deployment | BLOCKED: dated readiness observation found the configured address absent; no new deployment here | Explicit owner approval of target, authority, build and funding; verified deployed identity |
| Public-devnet authorization signatures | NOT CAPTURED | Approved public test execution and verified receipts/state |
| Real venue order/fill/close | NOT IMPLEMENTED / NOT CAPTURED | Owner-selected supported devnet venue; complete execution/authority acceptance evidence |
| Three outside-developer sessions | NOT RUN | Three consenting developers; environment-labelled, privacy-safe observed records |
| Browser E2E | NOT IMPLEMENTED / NOT RUN | A real harness and verified wallet/policy interaction checks |
| Pitch/demo recordings | NOT VERIFIED | Owner-supplied completed recordings and accessible links |
| Event eligibility, deadline and final submission | NOT VERIFIED | Current official rules, owner-supplied submission details and actual confirmation |
| CI and intended newer runtime | Separate work remains | Verified Actions results and intended-runtime feature/build/test evidence |

Until PRD P01–P12 are verified, public wording stays **devnet policy demo with simulated positions**. Policy authorization is not a venue fill. Runtime-supplied equity is a soft signal, not independently verified drawdown protection. Keep deferred mainnet, multi-venue, billing, chat/signals and social trading outside this release.