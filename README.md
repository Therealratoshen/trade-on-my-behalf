# Trade On My Behalf

> Per-agent on-chain policy enforcement for Solana perps. Routes trades
> through Jupiter Perps and Drift; signs only inside your wallet's rules.

A end-user perps product where "I trade for you" and "I cannot break your
rules" are the *same statement*. The Anchor program gates every trade at the
signing layer, so no signal — RSI, LLM, copy-trade, Telegram — can bypass it.

Built for the [Crypto World's Fair Hackathon 2026](https://colosseum.com/worldsfair)
(Solana track).

## Why this and not another perps bot

- **No end-user product is policy-bound at the wallet layer.** Existing
  perps bots run as off-chain services; a bad signal or a compromised
  signal source can blow past your rules. We move the rules **on-chain**
  so they cannot be circumvented.
- **The founder is the user.** I'm building this because I want to use it.
  That's the strongest possible pitch for judges weighing the Business
  Plan criterion.
- **Composability.** Trades route through Jupiter Perps, Drift, and Zeta.
  Signals can come from AgentBazaar. Webhooks via Helius. Every layer is
  a primitive the hackathon judges already reward.

## Status

- [x] D1: scaffolding + skills installed (Copilot v1.2.1, Solana dev, Helius {build,jupiter,phantom,svm})
- [x] D2: Copilot Deep Dive verdict — see [docs/copilot-verdict.md](docs/copilot-verdict.md)
- [x] D3': **Pivot** — see [SPEC.md](SPEC.md). Now "Trade On My Behalf" (perps agent with on-chain policy gates). Treasury program from D4 becomes the risk-gate kernel.
- [x] D4: Anchor `treasury` program compiles (203KB .so, IDL generated). D4 logic stays; D5+ extends with leverage cap + drawdown kill.
- [ ] D5: Rotate Copilot PAT, re-run Deep Dive on perps-agent wedge. **Pending your new PAT.**
- [ ] D6-D9: SDK + agent runtime + venue adapters (Jupiter Perps primary, Drift secondary).
- [ ] D10-D11: Surfpool integration + 3 outside-dev user tests.
- [ ] D12-D14: weekly 1-min update + pitch (2-3 min) + demo (<=3 min).
- [ ] D15-D17: polish + submit by Oct 12 11:59pm PT (target D16 EOD).

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
