# MCP Servers — setup plan (D1 stub)

> MCP servers must be installed via Cursor Settings > MCP, not by guessing
> `npx` package names. This doc lists what we want and how to verify each.

## Planned MCP servers

| Server | Purpose | Required env / key | Verify by |
| --- | --- | --- | --- |
| **Solana MCP** (official) | Docs + Anchor + Stack Exchange Q&A in-IDE | none | Asking "what is rent on Solana?" returns cited answer |
| **Helius MCP** | RPC, webhooks, DAS | `HELIUS_API_KEY` (free tier at dashboard.helius.dev) | Query `getAccountInfo` on a public devnet key |
| **AgentBazaar MCP** | x402, register/hire agents | USDC wallet on devnet (sign at colosseum.com) | `search_agents` returns list |
| **Jupiter MCP** | Swap routing | `JUPITER_API_KEY` (free at portal.jup.ag) | `getQuote(USDC->SOL)` returns a route |
| **Phantom Connect MCP** | Embedded wallets | Phantom Portal account | Dashboard logs in |

## Why I did NOT auto-write mcp.json entries

I don't know the exact published `npx` package names for these servers —
guessing would break the install. The reliable path is:
1. Cursor Settings > MCP > Add server.
2. Paste the documented command (each MCP server's docs page is the source of
   truth).
3. Test with a single in-IDE query before relying on it.

## Done so far

- All skills installed: Copilot, Solana dev, Helius {build, jupiter, phantom, svm}.
- `~/.zshrc` updated with `COLOSSEUM_COPILOT_PAT` + `_API_BASE`. Verified.

## Still to do (user actions)

- [ ] Add `HELIUS_API_KEY` (helius.dev dashboard).
- [ ] Add `JUPITER_API_KEY` (portal.jup.ag).
- [ ] Add Cursor MCP entries via Settings UI, not by hand.
- [ ] Generate an AgentBazaar devnet wallet (colosseum.com/agentbazaar).
- [ ] Register team on colosseum.com/worldsfair (claim Solana track).
