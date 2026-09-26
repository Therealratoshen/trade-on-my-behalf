# PM Log — Solana World Fair 2026

> Living project-management surface. Updated at every meaningful change.
> Canonical reference: [`docs/roadmap.md`](docs/roadmap.md) for the day-by-day
> plan. This file tracks *state*, *blockers*, *decisions*, and *risk*.

---

## 1. Snapshot (last updated 2026-09-26 16:45 PT / 16:45 WIB)

| Field | Value |
|---|---|
| Project | "Trade On My Behalf" |
| Wedge | Personal time-poor retail perps agent with on-chain policy gates |
| Cluster | v1-c9 "Solana DEX and Trading" (323 projects, 23 winners) |
| Verdict (D5) | Partial gap. Closest analogs: `infty.trade` (AI pricing AMM), `armor-wallet` (AI wallet + trading, no perps, no on-chain policy), `mercantill` (on-chain policy, no perps), `solmind`/`pot-bot`/`debonk` TG bots (no policy layer). |
| Build state | Docs-first (D6 done). Code resume at D7. |
| Branch | `main` |
| Last commit | `5467b5f D6: documentation-first scaffold (12 docs + GTM)` |
| Days to deadline | **16** (Oct 12, 2026 11:59pm PT) |
| Commits | 10 |
| Sol at risk | Tests + venue adapter not yet written. |

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
| **D7** | next | UpdatePolicy instruction, add leverage cap to state, add first LiteSVM tests | ⏳ pending | — | need `~/.config/solana/id.json` for devnet deploy |
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

## 4. Open questions

| # | Question | Default if no answer | Owner | Target day |
|---|---|---|---|---|
| Q1 | Should leverage cap live in the Anchor program or be enforced off-chain? | Enforce in-program (on-chain) — matches spec promise "physically cannot break your rules" | solo | D7 |
| Q2 | How does the trader fund its treasury PDA — user transfer pre-trade? | Yes, user does a one-time transfer to a treasury-owned token account | solo | D9 |
| Q3 | Telegram control surface — open-source bot vs paywalled via AgentBazaar? | Open-source bot first; AgentBazaar-as-paid-alert is stretch | solo | D11 |
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
| R5 | Telegram bot test surface (TDLib) install on macOS is heavy | medium | medium | Use Bot API long-poll instead of TDLib; stretch goal = TDLib |
| R6 | User test D11 surfaces a showstopper | medium | high | Buffer day D16 absorbs fix + re-record |
| R7 | Pitch / demo video production blocks on user (recording voice, slides) | medium | high | Voice record voiceover in solo; record demo screen with Loom |
| R8 | Repo accidentally contains private keypairs or sensitive tokens | high | high | `.gitignore` updated in D1; add `.env*` scanning before each commit |
| R9 | "Forced crypto integration" loss — judge penalizes dependency on Solana | low | medium | SPEC already pivoted away from LTC; perps routing on Solana is the *thesis*, not decoration |
| R10 | Within-crowded v1-c9 cluster, judge picks a more polished entry | medium | medium | Compensate with weekly update videos + clear founder-as-user story |
| R11 | PAT auth flap recurs between sessions | medium | low | `17e07b9e` verified auth is live now; rotate at colosseum.com if needed |
| R12 | Build gets stuck on Telegram bot (decision 3 stays at "open-source bot") and steals D12-D14 | medium | medium | Fallback: ship email-only control surface + dashboard-only D12-D14 |
| R13 | Mis-disclosed prior work → disqualification per rules §6c | low | critical | D6 commit documents prior work disclosure; update `SUBMISSION.md` before D17 |

## 6. Tasks pending user action

| # | Task | Why | Where |
|---|---|---|---|
| U1 | Generate fresh `~/.config/solana/id.json` + airdrop SOL on devnet | Required for anchor deploy D7 | shell |
| U2 | Obtain Helius API key + `export HELIUS_API_KEY=...` | Per `docs/mcp-setup.md` | dashboard.helius.dev |
| U3 | Obtain Jupiter API key + `export JUPITER_API_KEY=...` | Per `docs/venues.md` | portal.jup.ag |
| U4 | Register team on colosseum.com/worldsfair; claim Solana track | Required before deadline | browser |
| U5 | (Optional) agentbazaar.com account for paid signals integration | D13-D14 stretch | browser |
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
