# Copilot Deep Dive Verdict — D2

> Generated Sat Sep 26 2026 via Colosseum Copilot PAT authenticated against
> `https://copilot.colosseum.com/api/v1` (scope: `colosseum_copilot:read`,
> expires 2026-12-25).

## Prompt

> Vet this idea: an on-chain spending-policy engine for AI agent wallets on
> Solana (per-vendor limits, per-category caps, time-bounded budgets, audit log,
> anomaly detection), with an opt-in Web2 bridge that converts USDC to Litecoin
> to pay non-x402 endpoints. Single-person team, first Solana hackathon, deadline
> Oct 12, 2026.

## Verdict: PIVOT — narrow the wedge or change the surface

The direct thesis ("on-chain spending-policy engine for AI agent wallets") is
**PARTIAL — Cluster (v1-c14 "Solana AI Agent Infrastructure", crowdedness 325)**.

### Closest incumbents (named, with evidence floors met)

| Project (slug) | Hackathon | Track prize | What they shipped | Limit they left |
| --- | --- | --- | --- | --- |
| **mercantill** | cypherpunk 2025-09 | 4th-Stablecoins $10K | "Agent banking infrastructure: policy-based spending safeguards, multi-sig team controls, verifiable audit logging." Uses Squads Grid for multisig. | No LTC bridge; enterprise-focused; not a per-developer SDK. |
| **MCPay** | cypherpunk 2025-09 | 1st-Stablecoins $25K + C4 accelerator | "Monetize MCP tools via HTTP 402 micro-payments, x402 on Solana." Single-person team (microchipgnu). | No policy engine — budget management delegated to the developer in code. |
| **CORBITS.DEV** | cypherpunk 2025-09 | 2nd-Infrastructure $20K | "API reverse proxy for x402 + merchant revops dashboard." | Has a dashboard, but no SDK / no webhook / no enforcement layer. |
| **Armor Wallet** | breakout 2025-04 | Honorable Mention - AI | "AI-powered crypto wallet, autonomous agents, multi-chain trading." | Trading wallet, not a policy engine for agent wallets. |

### Cluster density

- v1-c14 "Solana AI Agent Infrastructure": **325 projects** (densest cluster).
- v1-c22 "AI-Powered Solana DeFi Assistants": 270.
- v1-c16 "Stablecoin Payment Rails and Infrastructure": 202.

A search for "agent spending policy budget limits audit AI wallet" returns 11
matches with low (0.04–0.09) similarity scores, meaning the policy-engine
sub-vertical inside v1-c14 is sparse, but the broader cluster is not.

### Why a direct build is risky

1. **Mercantill already exists.** 4th place Stablecoins at Cypherpunk means the
   judges saw the thesis already. A new project would have to explicitly beat
   it on UX, price, or scope within 17 days — hard for a first-time Solana
   builder.
2. **Cluster v1-c14 is the most crowded.** Judges see 325 entries in it. A
   "policy engine" alone will land as "another AI agent wallet."
3. **Open-source / composability criterion (5/6 weight):** Mercantill uses
   Squads Grid. Anything I build that doesn't extend a *different*
   primitive risks looking redundant.

### What is genuinely open (Full gap opportunities inside Partial gap)

| Sub-gap | Status | Why it's the wedge |
| --- | --- | --- |
| Per-developer SDK (not enterprise dashboard) | Partial - Segment | Mercantill targets enterprises. A drop-in `npm i` for indie devs/MCP server authors is the empty seat. |
| Web2 bridge via Litecoin rail | Full | Only "BlindPay" (Renaissance) and ~5 no-prize ideas have touched it. No project ships USDC→LTC→Web2 endpoint. |
| Anomaly detection / risk scoring on-chain | Full | No project in v1-c14 ships ML-driven anomaly flagging. Closest is Mercantill's "verifiable audit logging" (off-chain). |
| Composability with MCPay/Latinum (open-source) | Full | All incumbents are closed-source; an *open* SDK that integrates with MCPay + Latinum + CORBITS is a wedge on the composability criterion. |

## Recommended pivot for D3 SPEC freeze

**Keep the policy engine; narrow the wedge and lean on composition.**

**Project: Agent Treasury SDK** — *open-source* npm package + Anchor program
that any agent wallet (MCPay, Latinum, Corbits, custom) can opt-in to. Per-call
policy checks (vendor whitelist, per-tx cap, per-day budget) with an on-chain
audit log. Adds the LTC bridge as the only Web2 endpoint in this category.

**Four non-negotiable differentiators:**

1. **Open-source from day 7.** Mercantill, MCPay, CORBITS are public GitHub
   repos; we ship under MIT, with a programmatic adapter for MCPay, Latinum, and
   CORBITS. This is pure composability and covers the open-source criterion.
2. **Drop-in SDK, not a dashboard.** `treasury.authorize(...)` /
   `treasury.spend(...)` / `treasury.audit()` — five lines of code. Mercantill
   is an enterprise dashboard; MCPay is a payment rail. We are the *missing
   layer between them*.
3. **USDC → LTC Web2 bridge.** Off-ramp to LTC for non-x402 endpoints. This is
   the only Web2-bridge use of LTC inside v1-c14. Triple use of LTC: (a)
   funding source, (b) settlement rail, (c) micropayment denomination for
   Web2-via-LTC-pay providers.
4. **On-chain anomaly events** (not off-chain logs). Every over-limit or
   anomaly-flagged spend emits a `RiskFlag` event with a risk score.
   Off-chain indexer reads events. This is novel inside v1-c14.

### What we are NOT doing (cuts)

- Enterprise dashboard UI. Use Mercantill if you need that.
- Our own payment rail. We compose with MCPay/Latinum/CORBITS.
- KYC/AML features. Out of scope.
- Agent identity / reputation. Composes with AgentBazaar only.

### Updated risk map

- If Mercantill adds a developer SDK between now and D17, our wedge collapses.
  Mitigation: weekly 1-min updates make our iteration cadence visible.
- If MCPay/Latinum add a policy engine, we compete directly. Mitigation: their
  teams are larger; their roadmap bias is payments not policy.
- Cluster density means our pitch must front-load composition + novelty.

## Decision gate answer: PROCEED with the pivot

| Copilot result        | Action taken                            |
| --------------------- | --------------------------------------- |
| Confirms Partial-Seg | Lock the pivot. Update SPEC for D3.     |
| Cluster risks        | Documented above; weekly updates mitigate. |
| Genuine open sub-gaps | 4 named above; SDK + LTC + anomaly + open-source. |

## Evidence floors satisfied

- Builder project data: 4 direct predecessors named with slugs, prizes,
  hackathons, tags.
- Archive / market signal: cluster density from `/filters`, prize placement
  proves judge validation.
- Landscape: lightweight web check deferred; will run on D8 when picking the
  LTC bridge provider.

## Source citations (for SUBMISSION.md)

- mercantill: https://colosseum.com/projects/explore/mercantill
- MCPay: https://colosseum.com/projects/explore/mcpay
- CORBITS.DEV: https://colosseum.com/projects/explore/corbits.dev
- Armor Wallet: https://colosseum.com/projects/explore/armor-wallet
- Colosseum cluster v1-c14 density: Copilot `/filters` endpoint.
