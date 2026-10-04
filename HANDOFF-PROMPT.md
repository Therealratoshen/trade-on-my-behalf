# Master Prompt — Close Trade On My Behalf Before the World Fair

Copy the block at the bottom into a fresh agent session. The sections above it are the
verified ground truth that prompt is built on, so a human can audit the agent's work.

Repo: https://github.com/Therealratoshen/trade-on-my-behalf
Local: /Users/filberthenrico/Solana project for world fair
Baseline: `main` @ `8c6e769` (synced with origin, 0 ahead / 0 behind), Sat 2026-10-03

---

## 0. Verified state — do not re-derive, do not "fix" these

All of the following were executed on 2026-10-03 and passed. The docs claim otherwise;
that is a docs bug, not a test bug.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` (repo root) | exit 0 |
| `pnpm -r lint` (tsc --noEmit × sdk, agent, dashboard) | clean |
| `pnpm build` (root, includes `next build`) | exit 0, 4 routes |
| `pnpm -r test` | SDK **11/11**, agent **17/17** |
| `cd programs/treasury && anchor build` | OK, 15 warnings (all Anchor-macro `realloc` deprecations) |
| `anchor test` with `cluster = "localnet"` | **12/12 passing** (~15 s) |
| `pnpm --filter @trade-on-my-behalf/sdk run sync-idl` | reproduces committed `treasury.idl.ts` byte-identical — no IDL drift |
| Secret scan of tracked files | clean. Only `.env.example` tracked; `artifacts/` holds public tx sigs + 127.0.0.1 URLs |

**Total: 40 passing tests.** anchor-cli 0.31.1, pnpm 9.0.0, node ≥20, `packageManager: pnpm@9.0.0`,
lockfileVersion 9.0.

## 1. Confirmed defects (source-verified, not hypothetical)

1. **HIGH — `create_policy` does not require the agent's signature.** `main` has
   `pub agent: UncheckedAccount<'info>` ("CHECK: this is the agent's wallet pubkey. Not
   deserialized"). Any party can pre-create the policy PDA for any agent pubkey and choose
   the vendor whitelist + caps. The SDK then short-circuits: `ensurePolicy` returns
   `{ createdNew: false }` on "policy already exists" (`packages/sdk/src/withTrader.ts:229`)
   with no error. The user believes they set the limits; they inherited an attacker's.
   **Fix already exists** — PR #2 changes the account to `Signer` ("Agent consents to
   registration").
2. **HIGH — no replay/idempotency.** `authorize_spend` accepts any `nonce` and never
   dedupes it. A resent transaction double-counts `day_spent_usdc`.
3. **HIGH — CI has never run and references a nonexistent action.** `gh run list` is empty;
   `main` has no branch protection. The local `.github/workflows/ci.yml` is **untracked** and
   its program job uses `- uses: coral-xyz/anchor/action@v1`, which does not exist. The real
   action is `metadaoproject/setup-anchor@v3.4` (defaults: anchor 0.31.1, node 20.11.0,
   solana-cli 2.2.21 — matches this repo's pins). The same job also runs
   `pnpm install --no-frozen-lockfile` in `programs/treasury`, but `programs/treasury/pnpm-lock.yaml`
   **is** committed, so it should be `--frozen-lockfile`.
4. **MEDIUM — `anchor test` silently targets devnet.** `programs/treasury/Anchor.toml` ships
   `cluster = "devnet"`, so a plain `anchor test` attempts a *devnet deploy* and fails with
   `insufficient funds for spend (1.1267694 SOL)`. Program tests only run if you temporarily
   set `cluster = "localnet"`.
5. **MEDIUM — root Anchor scripts are broken from the repo root.** `pnpm anchor:build` and
   `pnpm anchor:test` panic `Not in workspace` (anchor-cli lib.rs:1367) because `Anchor.toml`
   lives in `programs/treasury`.
6. **MEDIUM — float → microunits.** `micro()` / `toMicro()` use `Math.round(usd * 1e6)`.
   Flagged in `docs/whats-missing.md` as "Exact input/range/overflow validation."
7. **BY DESIGN, not a bug — do not "fix" it:** `implied_current_equity_usdc` is
   runtime-supplied and deliberately a soft signal; only `record_pnl` mutates
   `peak_equity_usdc`, monotonically. Consequence: "verified drawdown protection" is not a
   claim you may make.

## 2. Stale docs — the highest-value 20-minute win

`SUBMISSION.md` ("Current offline/program test rerun: **NOT RUN** in this documentation
update"), `docs/testing-plan.md` (all five rows "NOT RUN" / "Historical report only; NOT
RERUN"), `docs/whats-missing.md` ("none were rerun for this update") and
`docs/demo-receipts.md` are all **false as of 2026-10-03 22:45 +07** — every one of those
suites was rerun and passed. Use the vocabulary `docs/testing-plan.md` mandates
(**DEFINED / PLANNED / NOT IMPLEMENTED / NOT RUN / BLOCKED / PASS / FAIL**), and record
revision + tool versions + command + exit status. PASS claims must cite `8c6e769`.

Do **not** upgrade these, because they are still genuinely true:
- "Treasury devnet deployment: BLOCKED" — confirmed, `solana program show 4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph --url https://api.devnet.solana.com` → `Unable to find the account`
- "Public devnet authorization receipts: NOT CAPTURED"
- "Three outside-developer sessions: NOT RUN"
- README:13 — chart / trade ticket / real devnet adapter / enforced execution authority /
  durable recovery / scoped paper storage are **NOT IMPLEMENTED** (grep of
  `apps/dashboard/**` for chart|ticket|recharts returns zero matches)
- PRD release gate: until P01–P12 are verified, wording stays **"devnet policy demo with
  simulated positions"** — not "devnet perps terminal."

## 3. Blocked on a human — an agent must stop and ask, never guess

| # | Item | Who | Why it cannot be automated |
|---|---|---|---|
| A | Devnet SOL: wallet `FUAQ3An62EAmHyhNZiyNfc197MT9FBXcDNnrqCjEwro1` is at **0 SOL**, deploy needs ~1.13 | Owner | Faucet/airdrop rate limits; spends the owner's key |
| B | Merge PR #2 (MERGEABLE/CLEAN, **0 reviews**) | Owner | You hold `admin`; approval is a human act |
| C | PR #1 is **CONFLICTING** (1 commit, 8 behind) — rebase or close | Owner | Product decision: its "daily spend budget semantics" overlaps PR #2 |
| D | **Venue selection** (Drift legacy `dRifty…` vs Velocity `vELoC1…`, both `executable: true`; Jupiter `PERPHj…` is **not** executable on devnet) | Owner | `docs/devnet-readiness.md` says selection is OPEN and warns against treating the Drift adapter as a drop-in rename |
| E | Pitch framing: lead with policy kernel, or chase the full terminal | Owner | Determines whether chart/ticket/ticket validation get built |
| F | **Three consenting outside developers** for `docs/user-tests.md` | Owner | Cannot be faked; Session 1+2 run on **CLI only and need no devnet** — unblocked today |
| G | Commit identity: 43 + 1 = **44 of 58 commits** are authored `filberthenrico@solanaworldfair.local` / `filbert@worldfair.local` → GitHub contributor API returns only `Therealratoshen 14`. 76% of the work shows as unowned | Owner | Rewrite-58-and-force-push vs fix-forward is a risk call; force-push rewrites SHAs, breaks PRs #1/#2, invalidates every hash cited in docs |
| H | Pitch/demo video links | Owner | "Links and completed recordings NOT VERIFIED" |

## 4. Deferred on purpose — do not raise their priority

Mainnet, multiple venues, arbitrary-token perps, autonomous samplers, Telegram/chat, paid
signals, billing, social/copy trading. `docs/whats-missing.md` lists them as "Deferred, not
quietly promised." Leave that framing intact.

---

## THE PROMPT — copy from here down

```
You are finishing "Trade On My Behalf", a Solana hackathon repo, before the World Fair.

Repo: /Users/filberthenrico/Solana project for world fair
GitHub: https://github.com/Therealratoshen/trade-on-my-behalf
Baseline: main @ 8c6e769, clean tree except one untracked file: .github/workflows/ci.yml

Read first, in this order: HANDOFF-PROMPT.md, PRD.md, SUBMISSION.md,
docs/whats-missing.md, docs/devnet-readiness.md, docs/testing-plan.md, SPEC.md.
HANDOFF-PROMPT.md sections 0–4 are verified ground truth. Trust them over your own
first-pass reading, and trust the code over the prose.

## Standing rules
1. EVIDENCE BEFORE ASSERTIONS. Never report "passing" for anything you did not run in this
   session. Quote the command and its real exit status.
2. NEVER write a claim into SUBMISSION.md, README.md or any docs/ file that a recorded
   artifact does not back. This repo's docs deliberately use NOT RUN / BLOCKED /
   NOT CAPTURED / NOT IMPLEMENTED to stay honest. Downgrading honesty for polish is a
   failure, not a success. Test-status vocabulary is defined in docs/testing-plan.md.
3. STOP AND ASK the owner — do not improvise — for any item in HANDOFF-PROMPT.md §3:
   devnet SOL / spending the owner's wallet key; merging PR #2; resolving PR #1;
   venue selection; pitch framing; recruiting user-test participants; git history
   rewrites or force-push; anything touching ~/.config/solana/id.json.
4. No mainnet. No real money. No deploying to any cluster the owner has not approved.
   No committing key material or participant PII.
5. One focused change per commit, with a message stating what was verified. Commit to main
   only for docs/CI/fixes; anything touching programs/ or packages/ goes on a branch + PR.
6. Re-run the full verification suite before every push. Baseline is 40/40 green;
   any regression is yours to fix, not to explain away.

## Do these in order, smallest blast radius first

STEP 1 — Evidence ledger refresh (docs only, ~20 min, highest value)
  Update SUBMISSION.md, docs/testing-plan.md, docs/whats-missing.md and
  docs/demo-receipts.md so the rerun status is true: SDK 11/11, agent 17/17, program
  12/12 PASS at revision 8c6e769, anchor-cli 0.31.1 / pnpm 9.0.0 / node 20, plus
  `pnpm build` and `pnpm -r lint` clean. Note that program tests require
  cluster = "localnet". Leave every BLOCKED / NOT CAPTURED / NOT RUN line in §2 intact.

STEP 2 — Make CI real (~45 min)
  Fix .github/workflows/ci.yml: replace the nonexistent coral-xyz/anchor/action@v1 with
  metadaoproject/setup-anchor@v3.4, and use --frozen-lockfile for the programs/treasury
  install (its pnpm-lock.yaml is committed). Then commit it, push, and PROVE IT WORKS by
  pasting the Actions run URLs for both jobs. Do not merge anything to get there.

STEP 3 — Unbreak the local test path (~15 min)
  Make `anchor test` runnable without accidentally deploying to devnet, and fix the root
  `anchor:build` / `anchor:test` scripts so they cd into programs/treasury instead of
  panicking "Not in workspace". Keep the committed provider cluster devnet for deploy
  workflows — separate the test cluster from the deploy cluster rather than silently
  flipping the file. Restore any Anchor.toml edits before committing; `git status` must be
  clean apart from intended changes.

STEP 4 — Close the policy-consent hole (branch + PR, ~1–2 h)
  Merge PR #2 is the owner's call — ask, and meanwhile rebase its branch onto current main
  and re-run the 12 program tests to prove the `agent: Signer` change is green. Add a test
  that a policy cannot be pre-created by a third party for a victim agent key, and that
  ensurePolicy's createdNew:false path cannot silently inherit an attacker's caps.
  Also ask the owner whether PR #1 should be rebased or closed.

STEP 5 — Replay/idempotency guard (branch + PR, ~2–3 h)
  Dedupe `nonce` per policy on-chain so a resent authorize_spend cannot double-count
  day_spent_usdc. Account space is fixed at Policy::space(16) and there is no close path —
  so any stored-replay design must fit existing space or be a documented, sized change.
  Prove it with a program test that replays a signature and shows the budget unchanged.

STEP 6 — Owner-dependent, only after the owner answers §3
  Airdrop devnet SOL and deploy Treasury to devnet, then capture real public-devnet
  authorization receipts (approve AND deny) and replace the NOT CAPTURED rows with links.
  Then run scripts/devnet-demo.sh end to end.

STEP 7 — Only if the owner picks the venue
  Implement and prove ONE verified devnet venue adapter per docs/devnet-readiness.md's
  8-step acceptance sequence, including binding the venue action to the checked intent
  (P06) — not merely authorize-then-order orchestration.

## Always report
- what you ran, with real exit codes
- what you changed, per file
- what remains NOT RUN / BLOCKED, and who unblocks it
- any place where you were tempted to overstate a claim, and what you did instead
```
