# SPEC — Agent Treasury (draft, frozen after D3)

> Status: D1 stub. Frozen on D3 after the Copilot Deep Dive verdict in
> `docs/copilot-verdict.md` is reviewed.

## Problem

AI agent wallets today are either too locked down (hardcoded limits in code) or
too loose (unrestricted spend is a liability). No on-chain policy engine exists.
Closest predecessors (per Copilot research): MCPay, Latinum, Corbits — all
solve the x402 payment plumbing, none solve the policy/audit gap.

## Target user

- Agent framework authors (LangChain, Eliza, OpenAgents).
- MCP server operators monetizing via x402.
- Companies running fleets of agents that need audit trails.

## Top-5 user stories (freeze on D3)

1. As a developer, I `npm i @agent-treasury/sdk` and call `treasury.authorize({ agent, vendor, amount })` to register an on-chain policy for an agent wallet.
2. As a developer, I call `treasury.spend({ agent, vendor, amount })` and get an enforced yes/no based on the policy.
3. As an operator, I see a dashboard with per-agent spend, audit log, and per-vendor limit headroom.
4. As an agent, when an x402 endpoint is non-crypto, the SDK falls back to a USDC -> wSOL -> LTC bridge to settle.
5. As an auditor, I export a CSV of every on-chain spend with vendor, amount, timestamp, policy verdict.

## Explicit non-goals (freeze on D3)

- No credit lines (Brex/Ramp "Amex for agents" — out of scope for 17 days).
- No fiat off-ramp via ACH — LTC bridge only.
- No mobile-first design.
- No multi-chain support — Solana only. Tempo / Base mentioned in GTM only.

## Tech stack (subject to D3 freeze)

- Anchor 0.31.1 for the policy program.
- `@solana/kit` + `@solana/react` (web3.js v3) for client.
- Helius RPC + webhooks + DAS for indexing.
- AgentBazaar MCP for agent identity + x402 payments.
- Jupiter for USDC -> wSOL.
- SideShift / Trocador / ChangeNow (TBD on D8) for USDC -> LTC.
- Phantom Connect for embedded wallet in dashboard.
- Next.js 15 for the dashboard.

## Architecture diagram

```
+------------------+        +----------------+        +----------------+
| AI Agent Wallet  | -----> | Agent Treasury | -----> | Jupiter / USDC |
| (Phantom/MCPay)  |        | Anchor Program |        | settlement     |
+------------------+        +----------------+        +----------------+
                                       |
                                       v
                              +----------------+
                              | Bridge (LTC)   |
                              | for non-x402   |
                              +----------------+
```

## Open questions

- Which LTC bridge provider is cheapest + most reliable? Tested on D8.
- Should the policy program store limits per (agent, vendor) or per (agent, tag)?
- Should audits be on-chain events or off-chain indexed (Helius)? Likely events + indexer.

---
Updated by D3 freeze.
