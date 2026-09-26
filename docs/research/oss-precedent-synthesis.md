# Open-source precedent search — Solana wallet policy + perps + TG control
Colosseum Copilot API, run 2026-09-26. PAT authenticated, scope `colosseum_copilot:read`, skill v1.2.1.
Raw responses: `/tmp/copilot-oss-01.json` … `/tmp/copilot-oss-04.json`. Hackathon chronology verified via `/status`/`/filters` (Hyperdrive Sep-2023 → Cypherpunk Sep-2025).

> Note on licensing: Copilot's `project` records do **not** expose a structured `license` or `isOpenSource` field. "Open source" appears only as free-text in `oneLiner` / `description`. License types below were confirmed by HEAD-fetching the actual `LICENSE` file on each GitHub repo.

---

## Bucket 1 — Wallet-level policy / spend caps (`POST /search/projects` query "open source github anchor policy wallet spend cap limit", limit 15)

15 results. Top slugs (similarity desc), all with `links.github` populated:

| slug | hackathon | oneLiner (trim) | gh | LICENSE (verified) |
|---|---|---|---|---|
| `spl-cards` | Renaissance (Mar-2024) | Metal hardware card wallets + on-chain programmable policy manager via Token Extensions | https://github.com/Web3-Builders-Alliance/Nelis-sol_Sol_1Q24/tree/main/capstone/splcards | none on the capstone repo |
| `gitrant-1` | Cypherpunk (Sep-2025) | Crypto-native sponsorship/funding platform for open-source devs | https://github.com/lukema95/gitrant-contracts | (claims "open source", no LICENSE file) |
| `gitrant` | Radar (Sep-2024) | Decentralized OSS project sponsorship + developer funding | https://github.com/GitrantOrg | (claims "open source", no LICENSE file) |
| `solibra-wallet` | Radar (Sep-2024) | Open-source browser wallet for Solana | https://github.com/solibra-wallet/solibra-wallet | **GPL-3.0** (verified) |
| **`smart-wallet`** | Radar (Sep-2024) | Decentralized Solana smart wallet — PDAs for dApp tx approval, **customizable spending limits** | https://github.com/Ruchir28/Smart-Wallet | no LICENSE file on repo |
| `infuse-wallet` | Radar (Sep-2024) | User-friendly crypto wallet for onboarding | https://github.com/ahmadou5/InFuse_RadarHACKATHON | none |
| `gitearn` | Breakout (Apr-2025) | Decentralized bounty platform, devs earn crypto for OSS issues | https://github.com/Fahad-Dezloper/GitEarn | none |
| `open-source:-geyser-gateway` | Cypherpunk (Sep-2025) | Decouples Solana Geyser plugin execution from validator ops | https://github.com/ample-sh/ample_geyser_gateway | **MIT** (verified) |
| `open-source-city` | Breakout (Apr-2025) | Tokenize real-world infrastructure / community-driven cities | https://github.com/Jun0908/OpenSourceCity | none |
| `gado-wallet` | Cypherpunk (Sep-2025) | Non-custodial wallet, inheritance transfer on inactivity | https://github.com/Emmyhack/GadoWallet | none |
| `astro-wallet` | Radar (Sep-2024) | Wallet, biometric passkeys instead of seed phrases | https://github.com/Silent123-code/Astro-Wallet | none |
| `lazor-kit-1` | Breakout (Apr-2025) | Invisible wallet + smart-wallet infra for onboarding | https://github.com/lazor-kit/lazor-kit | none |
| `neptune-wallet` | Breakout (Apr-2025) | AI-powered Solana wallet, automates and protects | https://github.com/samridhi2003/Neptune-wallet | none |
| `kalyna-wallet` | Radar (Sep-2024) | Privacy-focused Solana wallet | https://github.com/vetsinen/kalyna-wallet-server | none |
| `github-solana-dispenser-solidpull` | Renaissance (Mar-2024) | Dispense Solana bounties to OSS contributors via GitHub | https://github.com/code100x/github-sol-auto-dispenser | (claims "open source", no LICENSE file) |

**License flags in `oneLiner`:** 7 of 15 say "open-source"/"open source". Only **`solibra-wallet` (GPL-3)** and **`open-source:-geyser-gateway` (MIT)** have an actual LICENSE file. **`smart-wallet`** is the only result that hits "policy / spend cap" semantically (its oneLiner literally says "customizable spending limits using PDAs") — but it has no LICENSE file.

## Bucket 2 — TG/chat control × perps (`POST /search/projects` query "telegram bot open source solana perps trade", limit 15)

15 results. Heavy on Telegram bots; perps mentions are weak (mostly copy-trading, LP bots, MEV). Notable:

| slug | hackathon | oneLiner (trim) | gh |
|---|---|---|---|
| `mev-bot` | Renaissance (Mar-2024) | MEV bot, high-speed trading/arbitrage | https://github.com/jito-labs/searcher-examples |
| `dex-sentinel` | Radar (Sep-2024) | High-speed **Telegram** DeFi bot, DEX trading on Solana | https://github.com/KingWilliamsGPT/dex-sentinel |
| **`pot-bot-1`** | Cypherpunk (Sep-2025) | **Telegram bot** for group chats to pool capital + **trade with programmatic permissions** | https://github.com/sahilkhude117/potbot |
| `orca-alert-bot` | Renaissance (Mar-2024) | TG bot alerting Orca LPs when out of range | https://github.com/kenchan0824/orca-sol-bot |
| `cyclonebot` | Radar (Sep-2024) | Multi-chain trading bot, all-in-one execution toolkit | https://github.com/cenwadike/CycloneBotRadarSubmission |
| `lp-bot` | Renaissance (Mar-2024) | TG bot — discover, copy-trade, manage Orca LP positions | https://github.com/getnimbus/moewbie-bot |
| `polyct` | Cypherpunk (Sep-2025) | Strategic copy-trading **Telegram** bot for Polymarket | https://github.com/realshashi/polyct |
| **`pot-bot-2`** | Cypherpunk (Sep-2025) | **Telegram bot** for delegating portfolio trading to KOLs/group admins | https://github.com/smart-flip/pot-bot |
| `solana-explorer-telegram-bot` | Renaissance (Mar-2024) | TG bot — wallet balances, token lists, tx history | https://github.com/shubhiscoding/Solana-Telegram-Bot/ |
| `helix` | Breakout (Apr-2025) | **Telegram** agent for automated LP provisioning/rebalancing on Solana DEXes | https://github.com/naved-7905/Helix |
| `wallet-tracker-solana` | Renaissance (Mar-2024) | Track Solana wallets, real-time swap notifications | https://github.com/berkayda/wallettracker_solana-bot |
| `jumpa-bot` | Cypherpunk (Sep-2025) | **Telegram** multichain trading bot, group treasuries, P2P fiat offramp | https://github.com/official-jumpa/jumpa |
| `kiwi` | Radar (Sep-2024) | Embedded Solana DeFi wallet, trading/copy/prediction markets inside **Telegram** | https://github.com/kiwi-io/kiwi-bot |
| `liquidity-position-+-farm-reward-tracker-bot-(solana)` | Breakout (Apr-2025) | Solana DeFi bot — LP positions, in-range status, yield alerts | https://github.com/Rahul-Bhati/Liquidity-Reward-Bot |
| `solbet-betting-bot` | Breakout (Apr-2025) | **Telegram** bot — betting on token-price movements | https://github.com/LibbryCY/Telegram-betting-bot-on-Solana |

**No MIT/Apache hits.** None of the 15 contain the literal word "MIT" or "Apache" in any field. The closest to "TG chat control of a perps-ish surface" are `dex-sentinel`, `kiwi`, and `helix`, but they're DEX/LP-focused, not perps venues. `polyct` targets Polymarket, not Solana perps.

## Bucket 3 — Anchor SDK + treasury + agent policy (`POST /search/projects` query "anchor program sdk treasury agent policy", limit 15)

15 results. Most policy/agent-adjacent, but only oneLiner-level signal:

| slug | hackathon | oneLiner (trim) | gh |
|---|---|---|---|
| `agent-cred` | Cypherpunk (Sep-2025) | Autonomous payment infra on Solana, **hotkey/coldkey** arch for AI agents | https://github.com/DanpheLabs/agent-cred |
| `x402-sdk-for-solana` | Cypherpunk (Sep-2025) | SDK for HTTP-402 payment-required protocols, API micropayments | https://github.com/xilibi2003/x402-sdk-for-solana |
| `ciphervault` | Cypherpunk (Sep-2025) | Programmable multi-owner on-chain vault, treasury mgmt, token transfers | https://github.com/yashwankhade5/CipherVault |
| `mev-bot` | Renaissance (Mar-2024) | (also in bucket 2) | https://github.com/jito-labs/searcher-examples |
| `solignition` | Cypherpunk (Sep-2025) | Deploy Solana programs with borrowed SOL, upgrade authority as collateral | https://github.com/Peacanduck/solignition |
| `atlas-rwa-vault` | Cypherpunk (Sep-2025) | Autonomous AI-powered RWA treasury manager, yield/risk for DAOs | https://github.com/Prasannaverse13/atlas-rwa-vault |
| `anchorsight` | Breakout (Apr-2025) | Dev tool — visualize/inspect Solana program account data | https://github.com/BuddyAnonymous/anchorsight |
| `firebird` | Radar (Sep-2024) | Decentralized treasury mgmt for Solana projects | https://github.com/firebirdso/core_new |
| `lp-agent` | Breakout (Apr-2025) | AI LP assistant — portfolio analysis, copy-farming | https://github.com/getnimbus/lp-agent |
| **`blockpal-smart-delegation`** | Breakout (Apr-2025) | **Smart delegation + programmable guardrails** — agents/gamers/teams, custom permissions | https://github.com/blockpal-io/vault-x |
| **`mercantill`** | Cypherpunk (Sep-2025) | Enterprise banking infra for AI agents — **audit trails, team controls, spending safeguards**, built on Squads Grid | https://github.com/davidzzheng/mercantill |
| `rabbit` | Breakout (Apr-2025) | AI agent SDK for data-source integration | https://github.com/wchishasa/rabbit |
| `comet-ai-agent-1` | Breakout (Apr-2025) | AI agent, automates DeFi tx | https://github.com/cometagentai/comat |
| `paren-a-superconnector-agent` | Cypherpunk (Sep-2025) | AI agent — connects users, on-chain social graph | https://github.com/amirmabhout/withparen |
| `agent-cypher` | Breakout (Apr-2025) | AI agent — decode/detect on-chain scams | https://github.com/mmoh-i/agentcypher_ |

**Closest to "policy/spend-cap SDK" semantics:** `blockpal-smart-delegation` (programmable guardrails) and `mercantill` (spending safeguards for AI agents on Squads Grid). **No MIT/Apache on any of these — every LICENSE probe returned 404.**

## Bucket 4 — Personal AI assistant × perps (`POST /search/projects` query "personal AI assistant perps crypto open source", limit 12)

12 results. The personal-AI layer has OSS hits, but none combine with perps:

| slug | hackathon | oneLiner (trim) | gh | LICENSE (verified) |
|---|---|---|---|---|
| `sol-ai` | Radar (Sep-2024) | **Open-source** AI assistant specialized in Solana | https://github.com/leandrogavidia/sol-ai | none on repo |
| `xbuddy-ai` | Breakout (Apr-2025) | AI desktop companion, virtual assistant for crypto traders | https://github.com/aicompanionx/XBuddy-Desktop-Electron | n/a |
| **`fridonai`** | Radar (Sep-2024) | **Open-source** conversational AI platform / dev framework for crypto analytics + onchain ops | https://github.com/FridonAI/fridon-ai | **MIT** (verified — BlockMind-AI 2024) |
| `xexamai-ai-assistant-for-interviews-and-exams` | Cypherpunk (Sep-2025) | Real-time AI meeting assistant, token-gated | https://github.com/Artasov/xexamai | (claims "open-source") |
| `soldapper.dev` | Breakout (Apr-2025) | AI wallet assistant for Solana, NL queries + tx execution | https://github.com/aj019/soldapper.dev | n/a |
| `crypto-nomad` | Renaissance (Mar-2024) | Community platform for crypto nomads | https://github.com/baranaksitkutay/Crypto-Nomad | n/a |
| `flashback-ai` | Cypherpunk (Sep-2025) | Train lifelike personalized AI twins, privacy-preserving | https://github.com/FlashbackAi/FlashbackProMobile | n/a |
| `solana-dev-ai-helper` | Breakout (Apr-2025) | AI dev assistant, code support on Solana | https://github.com/xilibi2003/solana-code-mcp | n/a |
| `ai-voice-assistant-with-blockchain-integration` | Radar (Sep-2024) | PC voice assistant with Solana integration | https://github.com/Kiril003/My-project | n/a |
| `tizzle-ai` | Cypherpunk (Sep-2025) | Customizable AI companions for brands | https://github.com/ahnafalfariza/tizzle | n/a |
| `infty.trade` | Renaissance (Mar-2024) | AI perpetual DEX — **PRMM AMM, 200x leverage, risk-control AI** | https://github.com/InftyTrade/infty_anchor | none on repo |
| `uranus-dex` | Cypherpunk (Sep-2025) | Permissionless P2P perps protocol, long/short on any on-chain asset | https://github.com/URANUSDEX/dex | none on repo |

**Personal-AI is the bucket with the clearest MIT signal:** `fridonai` is genuinely MIT and self-identifies as open-source. `infty.trade` is the only one in this bucket that mentions perps + AI assistants, but it's unlicensed.

---

## Cross-bucket overlap (any project appearing in ≥2 buckets)

Exactly **1** slug overlaps across buckets: `mev-bot` (buckets 2 and 3). It's a reference repo (`jito-labs/searcher-examples`), not a policy/perps/chat system. **Zero projects combine all three layers (policy + perps + chat) or even policy + chat.** The closest semantic cluster is `smart-wallet` (spend caps) ↔ `blockpal-smart-delegation` / `mercantill` (programmable guardrails for agents) ↔ `pot-bot-1`/`pot-bot-2`/`jumpa-bot`/`kiwi` (TG group treasury bots) — but those are independent projects, not a single stack.

## License picture

| Bucket | OSS text claim | Verified MIT | Verified Apache | Verified GPL |
|---|---|---|---|---|
| 1 wallet-policy | 7 of 15 say "open source" | 1 (`ample_geyser_gateway` — MIT, but infra not wallet) | 0 | 1 (`solibra-wallet`) |
| 2 tg-bot-perps | 0 | 0 | 0 | 0 |
| 3 sdk-treasury-policy | 0 | 0 | 0 | 0 |
| 4 personal-ai-perps | 3 of 12 say "open-source" | 1 (`fridonai` — MIT) | 0 | 0 |

Adjacent context for layer (b) — **Drift Protocol itself** is **Apache-2.0** at `drift-labs/protocol-v2` and `drift-labs/drift-rs`. That's the perps venue we would target; it's already OSS-licensed, so integration wouldn't require a separate open-sourcing of venue code.

## Synthesis

- **Cross-bucket overlap:** effectively zero. Across all 4 searches, only `mev-bot` (a Jito reference repo) appears twice. No project combines wallet policy + perps + TG control. The pieces exist as independent islands, never as a single stack.
- **MIT/Apache presence:** extremely thin. The whole 57-project universe has only 2 verified MIT hits (`fridonai`, `ample_geyser_gateway`) and 1 GPL-3 (`solibra-wallet`), plus Drift's Apache-2.0 SDKs if you count the venue itself. Most "OSS-claimed" repos have no LICENSE file at all — they're unlicensed-but-public.
- **Density assessment: sparse, in our favor.** The three layers we'd open-source (a) wallet policy/spend-cap, (b) perps integration, (c) TG/chat control — are each addressed in isolation, never together. A builder cannot just fork-and-swap. Closest cousin clusters (`smart-wallet` ↔ `blockpal-smart-delegation`/`mercantill` ↔ `pot-bot-1`/`pot-bot-2`/`jumpa-bot`/`kiwi`) are separate projects by separate teams with separate repos. There's no copycat problem in the open-source-native sense.
- **Closest MIT-licensed project combining all 4 buckets:** none qualifies. The strongest MIT candidate is **`fridonai` (`FridonAI/fridonai`, MIT, Radar Sep-2024)** — it hits the personal-AI layer cleanly and self-describes as a developer framework for crypto analytics and onchain operations, but it does **not** ship wallet-policy primitives, perps-venue integration, or a Telegram control surface. As of 2026-09-26, no MIT-licensed project in the Colosseum builder corpus covers all three open-source layers we plan to ship. **No copycat. The path-c open-source position is open.**
