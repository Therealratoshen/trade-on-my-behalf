# SPEC — Agent Treasury SDK (frozen D3)

> Frozen after D2 Colosseum Copilot Deep Dive. See
> `docs/copilot-verdict.md` for evidence and gap classification.

## Problem

Inside the most crowded cluster in Colosseum's project corpus (v1-c14 "Solana
AI Agent Infrastructure", 325 projects), 4 recent prize winners already cover:

- **MCPay** (C4 accelerator) — x402 micropayments for MCP tools.
- **Latinum Agentic Commerce** (Breakout 1st-AI $25K) — payment middleware.
- **CORBITS.DEV** (Cypherpunk 2nd-Infra $20K) — x402 merchant dashboard.
- **Mercantill** (Cypherpunk 4th-Stablecoins $10K) — enterprise policy engine
  + audit log, Squads Grid-based.

None of them is a drop-in SDK that *any agent wallet can call*. None ships a
Web2 bridge. None emit on-chain anomaly events. None is openly designed to
*compose* with the others.

## Target user (frozen)

1. **Indie MCP server authors** who already integrate with MCPay or Latinum
   and need spend controls (the closest seg-needs).
2. **Agent framework authors** (LangChain, Eliza, OpenAgents) shipping a wallet
   and needing policy enforcement.
3. **Single developers / small teams** running agent wallets — too small for
   Mercantill's enterprise dashboard.

## Top-5 user stories (frozen)

1. As a developer, I `pnpm add @agent-treasury/sdk` and wrap my agent's wallet
   with `withTreasury(wallet, policy)` in 5 lines of code.
2. As a developer, I define a policy once:
   `{ vendors: ["openai","anthropic"], perTxCap: 0.5_USDC, perDayCap: 10_USDC, ttl: 30d }`
   and every spend is checked on-chain before signing.
3. As an operator, I call `treasury.audit(agent)` and get a paginated array
   of on-chain spend events with risk scores.
4. As an agent, when my goal requires a non-x402 endpoint, the SDK
   auto-detects, swaps USDC→wSOL→LTC via the bridge package, settles to the
   merchant, and emits a `BridgeSettled` event.
5. As an auditor, I subscribe to `RiskFlag` events on devnet/mainnet and see
   any over-limit or anomalous spend in real time (Helius webhook).

## Explicit non-goals (frozen)

- Enterprise dashboard UI. Out of scope.
- Our own payment rail. Compose with MCPay, Latinum, CORBITS.
- KYC/AML. Out of scope.
- Agent identity / reputation engine. Compose with AgentBazaar.
- Credit lines (Amex-for-agents). Out of scope for 17 days.
- Multi-chain. Solana only.

## Tech stack (frozen)

- Anchor **0.31.1** for the policy program (already installed).
- `@solana/kit` (web3.js v3) + `@solana/react` for client.
- Helius RPC + webhooks + DAS via `/helius:build` skill.
- AgentBazaar MCP for agent identity + x402.
- Jupiter for USDC → wSOL via `/helius:jupiter` skill.
- Phantom Connect for embedded wallet via `/helius:phantom` skill.
- LiteSVM for unit tests (per Solana dev skill testing pyramid).
- Surfpool for devnet fork + cheatcodes (D10).
- LTC bridge: TBD on D8 from `{SideShift, Trocador, ChangeNow}`.

## Architecture diagram

```
+------------------+   +--------------------+   +-----------------+
| MCPay/Latinum/   |-->|  @agent-treasury/  |-->|  USDC transfer  |
| CORBITS/Custom   |   |  sdk (5-line wrap) |   |  on Solana      |
+------------------+   +--------------------+   +-----------------+
                                |
                                v
                       +----------------+        +----------------+
                       | Anchor treasury|        | Helius webhook |
                       | program        |<------>| RiskFlag       |
                       +----------------+        +----------------+
                                |
                       (over-limit or non-x402)
                                v
                       +----------------+        +----------------+
                       | Bridge package |------->| SideShift /    |
                       | USDC->wSOL->LTC|        | Trocador (TBD) |
                       +----------------+        +----------------+
```

## Repository layout (frozen)

```
programs/treasury/             Anchor program: spend authorization + audit events
packages/sdk/                  npm package: 5-line `withTreasury` wrapper
packages/agent/                x402 + AgentBazaar client (composes, doesn't own)
packages/policy-engine/        off-chain policy evaluator (LiteSVM-tested)
packages/bridge/               USDC -> wSOL -> LTC bridge (provider TBD D8)
apps/dashboard/                Next.js 15 minimal audit viewer (not enterprise)
scripts/devnet-demo.sh         one-shot judges run cold
docs/                          architecture, copilot-verdict, user-tests, ltc-settlement
```

## Integration adapters (D6-D7)

Each a thin file in `packages/sdk/src/integrations/`:

- `mc-pay.ts` — wraps MCPay payments with a policy check before signing.
- `latinum.ts` — same for Latinum Agentic Commerce.
- `corbits.ts` — same for CORBITS.DEV reverse-proxy.
- `phantom.ts` — for raw Phantom-walleted agents.
- `agent-bazaar.ts` — registers the wallet + policy with AgentBazaar.

## Iteration cadence (composability principle)

Every Monday after D7: a 1-min update video showing one new integration or one
new anomaly rule. By D15 that's 3 updates posted — judges see momentum.

## Open questions (resolve D4-D8)

- D4: Anchor program storage strategy. Per-(agent, vendor) PDA vs per-tag?
- D6: How to integrate with MCPay without forking — interceptor vs proxy?
- D8: LTC bridge provider by fee/UX/country availability.
- D10: Anomaly model. Z-score on per-vendor spend? Time-of-day pattern?

## Out of scope deferred notes (for accelerator pitch post-hackathon)

- A risk-scoring model trained on on-chain spend history (agent credit).
- A credit line against accumulated on-chain reputation (Amex layer).
- Dashboards for fleets (enterprise).

---
Updated D3-frozen by Copilot Deep Dive.
