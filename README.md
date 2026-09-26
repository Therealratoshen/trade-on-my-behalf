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

## Reading paths

If you have **5 minutes** and want the picture:

1. [docs/architecture.md](docs/architecture.md) — system diagram and end-to-end data flow.
2. [docs/onchain-program.md](docs/onchain-program.md) — the Anchor `Policy` PDA, every instruction, every `AuditEvent` field.
3. [docs/sdk-api.md](docs/sdk-api.md) — `withTrader(wallet, rules)` plus a copy-pasteable 5-line example.

If you are **a judge** with **15 minutes**, walk this path:

1. [docs/onboarding.md](docs/onboarding.md) — clone to devnet demo in 5 steps.
2. [docs/architecture.md](docs/architecture.md) — what the product does.
3. [docs/security-model.md](docs/security-model.md) — why the on-chain gate is the only trust anchor.
4. [docs/user-tests.md](docs/user-tests.md) — three outside-dev test runs on D10-D11.
5. [docs/roadmap.md](docs/roadmap.md) — what shipped when.

If you are **a developer** cloning the repo:

- [docs/onboarding.md](docs/onboarding.md) is the canonical entry. Five steps.
- [docs/sdk-api.md](docs/sdk-api.md) is the API surface; the rest of the docs assume you have read it.
- [docs/testing-plan.md](docs/testing-plan.md) is the testing pyramid and what to run before submitting a PR.

## Quickstart

```bash
pnpm install
anchor build
anchor test
pnpm dev
```

See `SPEC.md` for the frozen scope and `docs/copilot-verdict.md` for the idea's
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
