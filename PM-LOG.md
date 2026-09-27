# PM Log — Solana World Fair 2026

> Living project-management surface. Updated at every meaningful change.
> Canonical reference: [`docs/roadmap.md`](docs/roadmap.md) for the day-by-day
> plan. This file tracks *state*, *blockers*, *decisions*, and *risk*.

---

## 1. Snapshot (last updated 2026-09-27 15:36 WIB)

| Field | Value |
|---|---|
| Project | "Trade On My Behalf" |
| Wedge | Personal time-poor retail perps agent with on-chain policy gates (SAS model: Specialist, Algorithm, Skill) |
| Cluster | v1-c9 "Solana DEX and Trading" (323 projects, 23 winners) |
| Verdict (D5) | Partial gap. Closest analogs: `infty.trade` (AI pricing AMM), `armor-wallet` (AI wallet + trading, no perps, no on-chain policy), `mercantill` (on-chain policy, no perps), `solmind`/`pot-bot`/`debonk` TG bots (no policy layer). |
| Build state | Kernel done (D8.5+). SDK + webapp + venue adapter empty (D9 = load-bearing gate). |
| Branch | `main` |
| Last commit | `9d284ae D9' Doc-correctness sweep: fix reason-code naming drift in 8 docs` |
| Days to deadline | **15** (Oct 12, 2026 11:59 pm PT) |
| Commits | 14 |
| Sol at risk | Tests done (6/6 LiteSVM); **venue adapter, SDK, and webapp all empty**. D9 has nothing to ship. |
| On-chain program | `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`, 209 KB, 4 instructions, 8 reason codes |
| On-chain deployed? | **No** — devnet keypair not yet generated (R3 open). |
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
| **D8-D10** | — | SDK + agent runtime + venue adapter + first devnet demo | ⏳ pending | — | see risks §5 |
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
| R3 | Devnet deploy fails due to missing `~/.config/solana/id.json` (default points to a Monad keypath) | **certain** | blocker | Generate fresh keypair, copy to `~/.config/solana/id.json`, airdrop SOL, deploy |
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
| R17 | **Empty packages block D9 ship** — `packages/sdk/src`, `packages/agent/src`, `apps/dashboard/` are all `.gitkeep`-only as of D8.5 | **certain** | blocker | D9 is the load-bearing gate; **start D9 today**; use the SDK skeleton from `docs/sdk-api.md` §"Entry point" |
| R18 | ~~**Vendor pubkey TBD** — `docs/venues.md` §"Vendor pubkey mapping" lists Jupiter / Drift / Zeta pubkeys as `TBD`.~~ **RESOLVED D9'** — Jupiter Perps mainnet program id confirmed at `PERPHjGBqRHArX4DySjwM6UJHiR3sSCatuycCChK1as` (via Solscan IDL link); Drift v2 confirmed at `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH` (same on mainnet + devnet); Zeta discontinued May 2025 (pivoted to Bullet), removed from v1. Devnet Jupiter Perps program id is resolved at boot from the on-chain IDL, never hardcoded. See `docs/venues.md` §"Vendor pubkey mapping". | certain | resolved | resolution captured 2026-09-27 15:40 WIB; `docs/venues.md` rewritten |
| R19 | **D11 outside-dev testers not lined up** — recruiting is the longest-lead D9-D11 task | high | blocker | DM 5–10 Solana devs now (BRD review open Q #4); capture names + handles in PM-LOG §6 |

## 6. Tasks pending user action

| # | Task | Why | Where |
|---|---|---|---|
| U1 | Generate fresh `~/.config/solana/id.json` + airdrop SOL on devnet | Required for anchor deploy D7 | shell |
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
