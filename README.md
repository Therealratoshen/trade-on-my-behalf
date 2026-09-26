# Agent Treasury

> Programmable on-chain spending policies for AI agent wallets on Solana.

Agent Treasury is a developer SDK + Anchor program that lets AI agents spend USDC
freely under rules enforced by a Solana program. Wallets get per-vendor limits,
per-category caps, time-bounded budgets, and an on-chain audit trail. An opt-in
Web2 bridge converts USDC to Litecoin for non-x402 endpoints.

Built for the [Crypto World's Fair Hackathon 2026](https://colosseum.com/worldsfair)
(Solana track).

## Why

Per [Colosseum Copilot](https://docs.colosseum.com/copilot)'s AI-agent-payments
research, the base x402 payment layer is saturated (MCPay, Latinum, Corbits).
The unsolved gap is **spend management**: who sets the agent's spending rules,
who audits them, who extends credit. This project targets that gap, plus the
Web2-bridge gap, by settling non-x402 endpoints through a Litecoin rail.

## Status

- [x] D1: scaffolding + skills installed (Colosseum Copilot, Solana dev, Helius, AgentBazaar)
- [ ] D2: Copilot Deep Dive verdict (gating artifact: `docs/copilot-verdict.md`)
- [ ] D3: SPEC.md frozen
- [ ] D4-D7: Anchor program + Next.js dashboard + Helius webhook
- [ ] D8-D9: USDC -> LTC bridge
- [ ] D10-D11: tests + 3 outside-dev user tests
- [ ] D12-D14: videos
- [ ] D15-D17: submit by Oct 12 11:59pm PT (target D16 EOD)

## Quickstart

```bash
pnpm install
anchor build
anchor test
pnpm dev
```

See `SPEC.md` once frozen on D3 and `docs/copilot-verdict.md` for the idea's
evidence-backed gap classification.

## Layout

```
programs/treasury/      Anchor program: spending policy engine
packages/sdk/           npm package developers install
packages/agent/         x402 + AgentBazaar client + Helius webhook handler
packages/policy-engine/ off-chain policy evaluator (LiteSVM-tested)
packages/bridge/        USDC -> wSOL -> LTC provider integration
apps/dashboard/         Next.js 15 dashboard
scripts/devnet-demo.sh  one-shot judges can run
docs/                   architecture, copilot verdict, user tests
```

## License

MIT
