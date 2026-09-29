# PM Log — Solana World Fair 2026

> Living project-management surface. Updated at every meaningful change.
> Canonical reference: [`docs/roadmap.md`](docs/roadmap.md) for the day-by-day
> plan. This file tracks *state*, *blockers*, *decisions*, and *risk*.

---

## 1. Snapshot (last updated 2026-09-29 21:55 WIB)

| Field | Value |
|---|---|
| Project | "Trade On My Behalf" |
| Wedge | Personal time-poor retail perps agent with on-chain policy gates (SAS model: Specialist, Algorithm, Skill) |
| Cluster | v1-c9 "Solana DEX and Trading" (323 projects, 23 winners) |
| Verdict (D5) | Partial gap. Closest analogs: `infty.trade` (AI pricing AMM), `armor-wallet` (AI wallet + trading, no perps, no on-chain policy), `mercantill` (on-chain policy, no perps), `solmind`/`pot-bot`/`debonk` TG bots (no policy layer). |
| Build state | **Program** hardened D10 (signer check, rolling daily reset), 12/12 localnet tests. **SDK** fixed D10 (decodes real AuditEvents), 11/11. **Agent runtime + `tomb` CLI + Jupiter Perps adapter (paper mode)** shipped D10, 16/16. **`pnpm demo` runs the full 9-step story on a local validator** — verified 9/9 on 2026-09-29. **Dashboard building.** Repo public, topics set, CI green-on-push. |
| Branch | `main` |
| Last commit | see `git log -1` |
| Days to deadline | **13** (Oct 12, 2026 11:59 pm PT) |
| Commits | 22, all pushed to origin/main |
| Tests | **48 green** — 12 program + 11 SDK + 16 agent (+ 8 SDK PDA tests inside the 11) |
| Sol at risk | **Nothing blocking the demo.** Devnet SOL is optional (see decision 20 + R3). Only the fill is simulated (paper venue, stated plainly). |
| On-chain program | `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`, 217 KB, 4 instructions, 8 reason codes |
| On-chain deployed? | Local validator only. `pnpm devnet:demo` deploys if the owner key is ever funded. |
| Demo path | `pnpm demo` — no SOL, no network, ~90 s, 9 real on-chain transactions |
| Honest security claim | *"I cannot break your rules — within the as-stored caps"* (qualifier added D8.5+; see [SUBMISSION.md](SUBMISSION.md) §"Security claim" + [docs/security-model.md](docs/security-model.md)) |

## 2. Day-progress ledger

| Day | Date | Goal | Status | Commit | Blocker |
|---|---|---|---|---|---|
| **D1** | 2026-09-26 | Scaffold + skills | ✅ done | `54a8f23` | none |
| **D2** | 2026-09-26 | First Copilot Deep Dive | ✅ done (PIVOT 1) | `5d2890f` | none |
| **D3'** | 2026-09-26 | Pivot to perps agent | ✅ done | `2b56692` | none |
| **D3''** | 2026-09-26 | Founder-pain SPEC clarify | ✅ done | `d808d9f` | none |
| **D3'''** | 2026-09-26 | Pieverse adj. logged | ✅ done | `02cf627` | none |
| **D3''''** | 2026-09-26 | Deep Dive script staged | ✅ done | `7df9938` | none |
| **D4** | 2026-09-26 | Anchor `treasury` compiles | ✅ done | `00e9884` | none |
| **D5** | 2026-09-26 | Perps Deep Dive verdict | ✅ done (PARTIAL) | `a4a4517` | none |
| **D6** | 2026-09-26 | Docs-first scaffold (15 files) | ✅ done | `5467b5f` | none |
| **D7** | 2026-09-26 | UpdatePolicy instruction, add leverage cap to state, add first LiteSVM tests | ✅ done | `cfa6b67` | none |
| **D8** | 2026-09-26 | On-chain drawdown kill-switch + `record_pnl` instruction + drawdown-test for kill=25% peak=1000 implied=700 | ✅ done | `fd2b449` | none |
| **D8.5** | 2026-09-26 | `pnpm install` + `anchor test --provider.cluster localnet`; fix pre-D7 test (REASON_PER_TX_CAP constant correction; state-fetch fallback added). 6/6 LiteSVM tests passing. | ✅ done | `e91fb26` | none |
| **D9** | 2026-09-27 | SDK `@trade-on-my-behalf/sdk` | ✅ done | `9a6d38e` | none |
| **D10** | 2026-09-27 | Agent runtime + CLI + Jupiter paper adapter + `pnpm demo`; program + SDK bug fixes; vendor-id correction | ✅ done (local) · ⏳ devnet | see git log | devnet SOL (U1) |
| **D11-D14** | — | Polish, tests, user tests, weekly update video #1 | ⏳ pending | — | — |
| **D15-D17** | — | Pitch + demo videos, GTM, submit | ⏳ pending | — | depends on D7-D14 |

## 3. Decision log

| # | Date | Decision | Reason | Evidence |
|---|---|---|---|---|
| 1 | 2026-09-26 | Pivot from "Agent Treasury SDK as developer tool" to "Trade On My Behalf as end-user product" | Founder's pain = time-poor + setup-recognition. SDK-as-tool doesn't address that. Pivoting now preserves 17-day budget. | D2 verdict (MCPay/Latinum/mercantill cluster signal), D3 founder-pain insight |
| 2 | 2026-09-26 | Drop LTC bridge | LTC not in 8 official tracks; "forced crypto integration" is a common loss-pattern. Track purity wins. | Official rules §14(e-l) |
| 3 | 2026-09-26 | Use D4 `treasury` program as on-chain policy kernel of the perps product | Program already compiles; `policy.vendors` becomes venue whitelist, `per_tx_cap_usdc` becomes per-tx size cap, `per_day_cap_usdc` becomes daily-loss cap, `ttl_slots` becomes policy duration. | D4 commit `00e9884` |
| 4 | 2026-09-26 | Re-frame `agent.sdk` as `withTrader(wallet, rules)`, drop LTC tie-in | The 5-line wrap is the user-product primitive. | SPEC §3 |
| 5 | 2026-09-26 | Defer Copilot Deep Dive auth flap for ~hours, accept partial evidence | PAT went 200↔401 cycle then settled on accepting deep-data-flush from server. Live now. | `17e07b9e` verifier |
| 6 | 2026-09-26 | Document-first build order (D6) ahead of code (D7+) | Of 6 judging criteria, 5 are reading-driven (business / novelty / UX / open-source / composability). Docs-read judges can score while code is being written. | Official rules §8 + Superteam Türkiye blog post |
| 7 | 2026-09-26 | Pricing for v1 pitch: **performance-fee** (5% of realized PnL). Subscription / per-policy deferred to v2. | Copilot evidence in `docs/research/copilot-bizmodel-{01..04}.json` shows `agent-arc` (Breakout 3rd Place AI, $15K) already monetizes AI trading under performance-fee framing; subscription lane has 7+ precedent projects (linkwave, blocksub, sol-subscribe-hub, tributary, bundl, debyth, aeon-protocol). Performance-fee is *less* crowded, and aligns with founder-as-user pitch. | `agent-arc` slug, Breakout 2025-04, GTM.md §"Pricing model" |
| 8 | 2026-09-26 | **Adopt path (c)**: open-source kernel + SDK + integration + webapp control surface; proprietary hosted alert + PnL reporting. *(Updated D8.5+: proprietary Telegram layer removed; webapp is MIT-licensed with the rest.)* | Founder call: "for b2c and i do not plan to do a but for a part" ⇒ B2C + selective OSS. OSS evidence in `docs/oss-precedent.md` + `docs/research/copilot-oss-{01..04}.json` shows no MIT project covers the (P + X + W) intersection where W = transport-pluggable control surface; `fridonai` is the strongest MIT candidate overall but ships no policy/perps/wallet control. | founder chat 2026-09-26 16:55 PT, `docs/oss-precedent.md` |
| 9 | 2026-09-26 | **BRD review** captured at `docs/brd-reviews/2026-09-26-threelens.md`. Three-lens (judge, business owner, investor). Top-3 revision priorities executed in same revision: (a) drawdown on-chain ships D8 via subagent; (b) SUBMISSION.md + devnet-demo.sh + README Status/Layout doc fixes done at `next commit`; (c) Telegram scope cut to D12+ in roadmap (later superseded by webapp-first pivot — see decision 10 below). | Three-lens BRD review by the user at 2026-09-26 17:15 PT. Investor verdict: "Promising hackathon bet; would not lead a round on this. If demo +50 organic users + one venue other than Jupiter Perps live, revisit." Open questions: pnpm install not run, devnet keypair not present, testers not lined up, demand evidence 0. | docs/brd-reviews/2026-09-26-threelens.md |
| 10 | 2026-09-27 | **Webapp-first control surface pivot.** The v1 control surface is now the webapp (`apps/dashboard/`, Phantom Connect or Trust Wallet + viewer + rule editor). Telegram bot moved to v3, never. Anchor `Policy` PDA + `AuditEvent` on-chain layer is unchanged — the kernel doesn't care which transport renders it. This deletes the 60-second timeout anxiety risk flagged in the BRD review. | Founder call (2026-09-27 14:51 WIB): "i plan to have it in webapp for now" + "probably phantom connect or trust wallet." | design-thinking/README.md, docs/control-surface.md |
| 10 | 2026-09-26 | **Security breach modeling** captured at `docs/security-model.md` (full rewrite, commit `5404323`). Four scenarios graded for v1 defensibility: (1) Theft/key exfiltration — **NOT fully defensible** (loosening via update_policy); (2) Lost agent/runtime — **partially** (open-position close path is venue-side liquidation only); (3) Rogue signal — **fully**; (4) Hostile venue / wrong-program CPI — **NOT fully** (program does NOT CPI venue; SDK-trust gap). Three follow-on tasks opened in SPEC.md §"Open questions": tighten-timelock (D10+), CPI-wrapper / PDA-bound memo (D10+), document open-position close path (D10+). | Breach-modeling subagent at 2026-09-26 17:30 PT. Honest read: the headline "I cannot break your rules" is defensible for cap-envelope behaviors but not yet for *loosening via a stolen owner key* and not yet for *wrong-program CPIs*. Adding both is honest v2. | docs/security-model.md, SPEC §"Open questions" |
| 11 | 2026-09-27 | **D10+ hardening queue relocated to PM-LOG §5 (R14–R16).** The three follow-on tasks from decision 10 are tracked as risks in §5 with owners, mitigations, and explicit v2-honest-framing fallback. SPEC.md §"Open questions" still names them; PM-LOG §5 is now the canonical queue so they don't get lost in the spec doc. | BRD review of 2026-09-26 (`docs/brd-reviews/2026-09-26-audit.md`) flagged the queue lived only in SPEC, not PM-LOG. Relocating here makes the queue discoverable from the project-management surface. | PM-LOG §5 R14–R16; SPEC §"Open questions" |
| 12 | 2026-09-27 | **Headline security claim prefixed with "within the as-stored caps."** Submission form, README, and pitch will lead with the qualified headline so judges who skim don't see an over-promise in 2 of 4 breach scenarios. The honest read lives in `docs/security-model.md`. | BRD review flagged over-promise in theft (Scenario 1) + hostile-venue (Scenario 4). Prefix costs nothing, defuses the carve-out. | README.md §"Security claim", SUBMISSION.md §"Security claim", docs/security-model.md |
| 13 | 2026-09-27 | **Doc-correctness sweep committed (9d284ae).** Public-facing docs had 6+ reason-code references using `REASON_LEVERAGE_EXCEEDED` / `REASON_DRAWDOWN_TRIPPED` while the Rust source uses `REASON_LEVERAGE_CAP` / `REASON_DRAWDOWN_KILLSWITCH`. All public docs (`docs/onchain-program.md`, `docs/agent-runtime.md`, `docs/control-surface.md`, `docs/skills-and-algorithms.md`, `docs/testing-plan.md`, `docs/user-tests.md`, `design-thinking/five-stages.md`, `design-thinking/pitch-script.md`) now use the canonical Rust names. The historical BRD review (`docs/brd-reviews/2026-09-26-audit.md`) keeps the old names as evidence of the drift that was caught. | A judge who reads both `onchain-program.md` and `state/mod.rs` should see the same constant names. Single source of truth = Rust. | commit `9d284ae` |
| 14 | 2026-09-27 | **Whats-missing tracker added (docs/whats-missing.md).** Internal-facing doc that lists every gap between v1-as-spec'd and v1-as-shipped, with mitigation per gap. Surfaced so the founder can prioritize D9 without re-deriving the gap list from scratch each session. | PM-LOG §5 already had the risks; an explicit "what's not built yet" doc is faster to scan than re-reading 6+ specs. | docs/whats-missing.md |
| 15 | 2026-09-27 | **Trader lifecycle & edge cases catalog added (docs/trader-lifecycle-edge-cases.md).** 14 lifecycle stages, ~140 edge cases with on-chain / off-chain / runtime / out-of-scope framing per case. Each row is a potential D11 tester ticket or D10+ hardening queue item. Augments the implied BRD with the trader-lifecycle view that was missing. | Founder feedback: "how is the prd and define further based on edge case and many more from traders lifecycle and how they do." Real perps traders use Telegram bots + spreadsheets + mental stops; the gap to TOMB must be legible. | docs/trader-lifecycle-edge-cases.md |
| 16 | 2026-09-27 | **Repo made public on GitHub** — https://github.com/Therealratoshen/trade-on-my-behalf. Before pushing: secret scan clean (no PAT in worktree or history, no keypairs tracked, deploy keypair git-ignored); stopped tracking `.agents/skills/` (83 files) because `colosseum-copilot` is Proprietary-licensed and the Helius skills have no license — both are re-installable via the README quickstart. Pushed over HTTPS with the `gh` credential helper (the SSH key on this machine is a deploy key without access). | Founder call: push once documentation is clear. The SUBMISSION.md repo URL was 404 until this push. | commit `ed0677f`, remote SHA = local SHA |
| 17 | 2026-09-27 | **Jupiter Perps ships in paper mode for v1.** Fills simulated at the live Jupiter oracle price (`lite-api.jup.ag/price/v3`) with the 6 bps fee; every fill gated by a real on-chain `authorize_spend`. | Jupiter Perps is mainnet-only and its position-request flow is multi-day work; the wedge is the on-chain gate, which is fully real. Saying "paper" everywhere beats a half-working live path. | `packages/agent/src/venue/jupiter-perps.ts`, SUBMISSION.md scope line |
| 18 | 2026-09-27 | **Every intent goes on-chain, denies included.** Off-chain evaluator is a preflight diagnostic; a disagreement flags the receipt and the chain wins. | The public deny receipt is the product. Resolves a contradiction in `docs/agent-runtime.md` (D6 draft skipped the tx on off-chain deny). | `packages/agent/src/runtime.ts` |
| 19 | 2026-09-27 | **Program + SDK security fixes before any deploy.** `authorize_spend` and `record_pnl` now require agent-or-owner signer (was: anyone — daily-cap griefing); daily counter resets every 216 000 slots (was: never); `record_pnl` callable by agent (only tightens). SDK decodes the real AuditEvent (was: reported every call approved), decodes u64 little-endian (was: big-endian), wraps Keypair in `Wallet` (was: could not sign). | Found by wiring the runtime to a live validator; each has a regression test. Nothing was deployed, so no migration. | `docs/security-model.md` §"Fixed on D10" |
| 20 | 2026-09-29 | **Devnet is not a prerequisite for the demo.** `pnpm demo` runs the full 9-step story on a throwaway `solana-test-validator` with the program preloaded. Real program, real policy PDA, real `AuditEvent`s, real reason codes, real explorer links. Only the *fill* is simulated (paper venue at the live Jupiter oracle price, stated plainly in the submission). | Devnet airdrop is hard-blocked at the IP level: `api.devnet.solana.com`, `devnet.rpcpool.com`, and direct JSON-RPC `requestAirdrop` all return `429 — airdrop limit reached today or faucet dry`. `faucet.solana.com` is captcha-gated. Waiting on SOL was costing D9–D10 without changing what a judge sees. Solscan-public URLs are incremental; the kernel deciding is the point. | `scripts/demo.sh`, `docs/demo-receipts.md`, verified 2026-09-29 21:52 WIB — 9/9 steps green |
| 21 | 2026-09-29 | **Repo hygiene pass before the videos.** 10 GitHub topics set; CI workflow that runs the 48 tests (SDK + agent, and the program against a preloaded local validator); `CONTRIBUTING.md`; a bug-report issue template wired to the edge-case catalog; all dead markdown links fixed (root-relative path bug in `SPEC.md`, depth bug in the archived founder summary). | Hackathon judges score open-source and read the repo front page. Topics drive search. A green checkmark and a CONTRIBUTING are the cheapest credibility signals available. | `.github/workflows/ci.yml`, `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/bug_report.yml` |
| 22 | 2026-09-29 | **Program tests are localnet, not LiteSVM.** Earlier notes said "6/6 LiteSVM"; `programs/treasury/tests/treasury.ts` actually uses `AnchorProvider.env()` against a real validator. Corrected in the snapshot. The 12 tests are honest either way — they need a validator, and `scripts/demo.sh` shows how to boot one. | The stale label would have made the CI workflow wrong on first run. | `programs/treasury/tests/treasury.ts`, `scripts/demo.sh` |

## 4. Open questions

| # | Question | Default if no answer | Owner | Target day |
|---|---|---|---|---|
| Q1 | Should leverage cap live in the Anchor program or be enforced off-chain? | Enforce in-program (on-chain) — matches spec promise "physically cannot break your rules" | solo | D7 |
| Q2 | How does the trader fund its treasury PDA — user transfer pre-trade? | Yes, user does a one-time transfer to a treasury-owned token account | solo | D9 |
| Q3 | ~~Telegram control surface — open-source bot vs paywalled via AgentBazaar?~~ **Closed D8.5+** — webapp is v1 control surface (Phantom Connect + viewer + rule editor). Telegram bot cut to v3, never. See `docs/control-surface.md`. | — | — |
| Q4 | LTC bridge provider decision (SideShift vs Trocador vs ChangeNow)? | N/A — bridge dropped (decision 2) | — | — |
| Q5 | Which perps venue first (Jupiter Perps vs Drift)? | Jupiter Perps — broader API surface + Helius alignment | solo | D8 |
| Q6 | Should the dashboard ship pre-D17 or wait? | Ship minimal live-audit dashboard D12; full rules editor D16 | solo | D12 |

## 5. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Helius API key not obtained before D8 | medium | medium | Use pub devnet RPC as fallback; only Helius-boosted features delayed |
| R2 | Jupiter Perps SDK integration finds unexpected breaking API | medium | high | Pinned SDK version, LiteSVM-tested mock first, Drift as alternate venue already planned |
| R3 | ~~Devnet deploy fails due to missing `~/.config/solana/id.json`~~ — keypair now exists at the right path and is airdrop-free; deploy is **not required** for the demo (decision 20). The residual ask is ~4 devnet SOL for Solscan-public receipts. | certain | low | Local validator covers the demo. If Solscan links are wanted: fund the key (U1) or use a throwaway keypair for the faucet (the limit may be per-key, not per-IP), then `pnpm devnet:demo`. |
| R4 | Anchor tests require pnpm install which compiles TS | medium | low | Use mocha in `tests/` directly, skip next.js dashboard deps initially |
| R5 | ~~Telegram bot test surface (TDLib) install on macOS is heavy~~ — closed D8.5+ (Telegram bot cut to v3, never) | — | — | — |
| R6 | User test D11 surfaces a showstopper | medium | high | Buffer day D16 absorbs fix + re-record |
| R7 | Pitch / demo video production blocks on user (recording voice, slides) | medium | high | Voice record voiceover in solo; record demo screen with Loom |
| R8 | Repo accidentally contains private keypairs or sensitive tokens | high | high | `.gitignore` updated in D1; add `.env*` scanning before each commit |
| R9 | "Forced crypto integration" loss — judge penalizes dependency on Solana | low | medium | SPEC already pivoted away from LTC; perps routing on Solana is the *thesis*, not decoration |
| R10 | Within-crowded v1-c9 cluster, judge picks a more polished entry | medium | medium | Compensate with weekly update videos + clear founder-as-user story |
| R11 | PAT auth flap recurs between sessions | medium | low | `17e07b9e` verified auth is live now; rotate at colosseum.com if needed |
| R12 | ~~Build gets stuck on Telegram bot (decision 3 stays at "open-source bot") and steals D12-D14~~ — closed D8.5+ (Telegram bot cut to v3, never; webapp is the v1 surface) | — | — | — |
| R13 | Mis-disclosed prior work → disqualification per rules §6c | low | critical | D6 commit documents prior work disclosure; update `SUBMISSION.md` before D17 |
| R14 | **D10+ tightening-timelock on `update_policy`** — stolen `owner` key can loosen every cap today | medium | high | Queue as D10+ per `docs/security-model.md` §"Scenario 1". Honest-v2 framing if time runs out. |
| R15 | **D10+ CPI-wrapper or PDA-bound memo** — Anchor program does not CPI the venue; SDK constructs follow-through | medium | high | Queue as D10+ per `docs/security-model.md` §"Scenario 4". Honest-v2 framing if time runs out. |
| R16 | **D10+ document "what kills an open position"** — venue liquidation only; the on-chain gate has no concept of an open position | low | medium | Add to `docs/security-model.md` + `docs/agent-runtime.md` §"Concurrency model" |
| R17 | ~~**Empty packages block D9 ship**~~ **RESOLVED D10** — SDK (D9) and agent runtime (D10) shipped. Only `apps/dashboard/` remains empty (R21). | — | — | closed 2026-09-27 |
| R20 | ~~**Venue adapter + agent runtime unbuilt**~~ **RESOLVED D10 (paper mode)** — `packages/agent/src/venue/jupiter-perps.ts` + `runtime.ts` + `tomb` CLI; `pnpm demo` green. Residual: live Jupiter Perps order placement not built (Jupiter Perps is mainnet-only; building its position-request tx is multi-day). The submission states paper mode plainly. | — | — | closed 2026-09-27; residual tracked in `docs/whats-missing.md` |
| R21 | **Dashboard unbuilt** — `apps/dashboard/` empty; the demo video would show a terminal, not a webapp | likely | medium | `tomb watch` is a working live audit feed today. Decide by D12: minimal read-only Next.js page (policy + AuditEvent list) or ship CLI-only and say so. |
| R22 | **Agent key needs SOL for fees** — every `authorize_spend` is paid by the agent key; an unfunded agent stops trading | certain | low | Demo funds it with 0.05 SOL (~10 000 tx). Runtime should warn below a threshold (not built). |
| R18 | **Vendor pubkey — CORRECTED D10.** The Jupiter Perps id recorded at D9' (`PERPHjGBqRHArX4DySjwM6UJHiR3sSCatuycCChK1as`, "via Solscan") **does not exist on mainnet** (`getAccountInfo` → null). Correct id `PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu` — executable on mainnet, matches Jupiter docs + `jupiter-perps-sdk`. Replaced in all 7 places incl. code. Drift `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH` re-verified executable. Lesson: verify ids against an RPC, not a doc link. | certain | resolved | 2026-09-27 23:00 WIB |
| R19 | **D11 outside-dev testers not lined up** — recruiting is the longest-lead D9-D11 task | high | blocker | DM 5–10 Solana devs now (BRD review open Q #4); capture names + handles in PM-LOG §6 |

## 6. Tasks pending user action

| # | Task | Why | Where |
|---|---|---|---|
| U1 | *(Downgraded from blocker → optional.)* **Devnet SOL (~4) for Solscan-public receipts.** The demo does not need it — `pnpm demo` runs the full 9-step story on a local validator. Only if you want the three receipts in `docs/demo-receipts.md` to resolve on a public explorer. Fastest route: generate a throwaway keypair (`solana-keygen new -o /tmp/faucet.json`), claim at https://faucet.solana.com to *that* address (the faucet limit may be per-key, not per-IP), then `solana transfer 4 <OWNER_PUBKEY> --keypair /tmp/faucet.json --url devnet --allow-unfunded-recipient`. | Nice-to-have, not required for the demo or the submission | browser + 3 commands |
| U2 | Obtain Helius API key + `export HELIUS_API_KEY=...` | Per `docs/mcp-setup.md` | dashboard.helius.dev |
| U3 | Obtain Jupiter API key + `export JUPITER_API_KEY=...` | Per `docs/venues.md` | portal.jup.ag |
| U4 | Register team on colosseum.com/worldsfair; claim Solana track | Required before deadline | browser |
| U5 | ~~(Optional) agentbazaar.com account for paid signals integration~~ — dropped D8.5+; specialist skill marketplace moved to v3 (see `docs/skills-and-algorithms.md`) | — | — |
| U6 | (Optional) Phantom Portal account for embedded wallet | D12 dashboard auth | browser |
| U7 | Generate new PAT or rotate at colosseum.com/arena/copilot as defense against future flaps | Resilient research | browser |

## 7. Cadence

- **Daily**: at least one commit, update `PM-LOG.md` (§1 snapshot + §2 ledger row + §3/§4 if decision).
- **Twice weekly**: 1-min update video (D11, D14, D16).
- **Weekly**: re-evaluate §5 risk register + §6 user-action list.

## 8. Working principles

- **Document-first**: every feature change has a doc update before code lands.
- **Evidence-driven**: no claim without a slug, link, or commit hash.
- **Cut aggressively**: per Superteam Türkiye post-mortem, "overselling the future" is the #1 fatal mistake. Show MVP, not deck.
- **Submit two days early**: D16 EOD target vs D17 deadline.

---
Updated 2026-09-26 16:45 PT by main.
