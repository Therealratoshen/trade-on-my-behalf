# Agent Treasury SDK

> Drop-in on-chain spending policies for AI agent wallets on Solana.
> Composes with MCPay, Latinum, and CORBITS.DEV.

Agent Treasury is an open-source SDK + Anchor program that lets any agent
wallet opt in to programmable, on-chain-enforced spending rules: vendor
whitelists, per-tx caps, per-day budgets, time-bounded limits, and a public
`RiskFlag` event stream. It also ships a USDC→wSOL→Litecoin bridge for
non-x402 endpoints — the only Web2 bridge in cluster v1-c14.

Built for the [Crypto World's Fair Hackathon 2026](https://colosseum.com/worldsfair)
(Solana track).

## Why this and not another agent wallet

Per [Colosseum Copilot Deep Dive](../docs/copilot-verdict.md):

- The cluster is the densest in Solana (v1-c14, 325 projects).
- MCPay, Latinum, CORBITS.DEV, and Mercantill already won prizes on adjacent
  theses. We don't compete with them — we **compose with them**.
- Our wedge: open-source SDK + on-chain anomaly events + the only USDC→LTC
  Web2 bridge inside v1-c14.

## Status

- [x] D1: scaffolding + skills installed (Colosseum Copilot v1.2.1, Solana dev, Helius {build,jupiter,phantom,svm})
- [x] D2: **Copilot Deep Dive verdict written** — see [`docs/copilot-verdict.md`](docs/copilot-verdict.md). Verdict: PIVOT to SDK+composition wedge.
- [x] D3: **SPEC frozen** — see [`SPEC.md`](SPEC.md).
- [ ] D4-D7: Anchor program + Next.js audit viewer + Helius webhook + adapters for MCPay/Latinum/CORBITS
- [ ] D8-D9: USDC -> wSOL -> LTC bridge
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
