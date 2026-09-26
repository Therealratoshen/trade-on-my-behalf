# Trade On My Behalf

> An on-chain risk-gated perps agent for time-poor Solana traders.

I can see a setup in the market — a trend forming, an RSI dipping, a
news-driven move — and I know what the right trade is. I don't have the
time to sit in front of charts waiting for it. So I'm building software
that watches the market for me, executes trades I would have taken, and
**physically cannot break the rules I set**, because the rules are
enforced at the wallet's signing layer by an Anchor program.

Built for the [Crypto World's Fair Hackathon 2026](https://colosseum.com/worldsfair)
(Solana track).

## Why this and not another perps bot

- **The pain is mine.** I'm the first user. I can describe setups but
  cannot watch charts. Existing perps bots solve a different problem:
  they're 24/7 *signal executors*. None of them lets you write down your
  own setup, your budget, and your kill-switch, and have those rules
  enforced at the signing layer.
- **Rules are enforced on-chain.** No rogue signal source, no exploited
  dependency, no compromised key wrapping can bypass them. The Anchor
  program signs or doesn't sign.
- **Composability.** Trades route through Jupiter Perps (primary) and
  Drift. Signals can come from AgentBazaar. Webhooks via Helius. Fills,
  mark prices, liquidations come from indexed events. Every layer is a
  primitive the hackathon judges reward.

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
