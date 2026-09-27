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
  Drift. Sampler inputs come from Helius webhooks (RSI, funding,
  mark-price, on-chain metrics). Fills,
  mark prices, liquidations come from indexed events. Every layer is a
  primitive the hackathon judges reward.

## Status

- [x] D1: scaffolding + skills installed (Copilot v1.2.1, Solana dev, Helius {build,jupiter,phantom,svm})
- [x] D2: Copilot Deep Dive verdict — see [docs/copilot-verdict.md](docs/copilot-verdict.md)
- [x] D3': **Pivot** — see [SPEC.md](SPEC.md). Now "Trade On My Behalf" (perps agent with on-chain policy gates). Treasury program from D4 becomes the risk-gate kernel.
- [x] D4: Anchor `treasury` program compiles (203KB .so, IDL generated).
- [x] D5: Perps-agent Copilot Deep Dive verdict — PARTIAL GAP in v1-c9 — see [SPEC.md](SPEC.md) §"Perps-agent deep dive (D5 — DONE)"
- [x] D6: 16-doc documentation-first scaffold (see [docs/](docs/))
- [x] D7: leverage cap + `update_policy` + 3 LiteSVM tests; treasury.so → 209 KB
- [x] D8: on-chain drawdown kill-switch (`record_pnl` + drawdown check in `authorize_spend` + LiteSVM test); 6/6 tests passing
- [x] D8.5: webapp-first pivot (Telegram bot → webapp), SAS framing, breach-modeling (4 scenarios), D10+ hardening queue captured
- [ ] **D9: SDK `withTrader(wallet, rules)` + Jupiter Perps adapter + Next.js 15 webapp** — *the load-bearing gate; everything below depends on this*
- [ ] D10: Surfpool integration test + devnet deploy
- [ ] D11: 3 outside-dev user tests (decision gate per [docs/user-tests.md](docs/user-tests.md))
- [ ] D12: weekly 1-min update #1 (per SPEC §"Iteration cadence")
- [ ] D13: pitch video (2–3 min) — see [design-thinking/pitch-script.md](design-thinking/pitch-script.md)
- [ ] D14: demo video (≤3 min) + Drift drawdown extension (stretch)
- [ ] D15: polish pass + cross-doc consistency
- [ ] D16: outside-person link check + final read-through
- [ ] D17: submit by Oct 12 11:59 pm PT (target D16 EOD)

**Days remaining:** ~16. **Commits:** 14. **Critical path:** D9 → D11 → D14 → D16.

## Security claim — honest read (D7 BRD → D8 ship → D8.5 breach-model)

> **Headline (verbatim):** *"I cannot break your rules — **within
> the as-stored caps**."*

The qualifier is load-bearing. Without it, the claim over-promises
in two of four breach scenarios — see [docs/security-model.md](docs/security-model.md).

- **On-chain enforced today** (D7): vendor whitelist, per-tx cap,
  per-day cap, TTL, leverage cap.
- **On-chain enforced today** (D8): drawdown kill-switch via
  `record_pnl` + monotonic `peak_equity_usdc` + drawdown check at
  the top of `authorize_spend`.
- **Best-effort runtime-supplied** (caveat): the implied-current-
  equity number is reported by the runtime from off-chain venue
  reconciliation. Peak is on-chain monotonic; the *delta* is
  best-effort. A compromised runtime can lie about current
  equity; the wedge defends the *envelope*, not the *truth*.
- **Off-chain (runtime) enforced**: signal classification, position
  sizing before CPI, webapp refresh interval (~2 s), position
  reconciliation, fill-event ingestion.
- **Honest carve-outs** (per [docs/security-model.md](docs/security-model.md) §"Scenario 1" + §"Scenario 4"):
  - A **stolen `owner` key** beats every cap *via `update_policy`* — `update_policy` accepts loosening today. Mitigated by adding a **tighten-timelock** (D10+; queued).
  - The **on-chain gate does not CPI the venue** — the SDK constructs the follow-through CPI. A compromised SDK could lie about the destination program id or the amount. Mitigated by adding a **CPI-wrapper or PDA-bound memo** (D10+; queued).
  - See [PM-LOG.md](PM-LOG.md) §5 R14–R16 for the full D10+ hardening queue with owners and targets.

The headline is true **for the envelope**: vendor / size / day /
TTL / leverage / drawdown-envelope at the as-stored policy values.
For the two carve-outs, see the D10+ queue in PM-LOG §5.

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
# 1. (optional) install the agent skills this project was built with.
#    They are tooling instructions, not shipped code — see skills-lock.json:
npx skills add ColosseumOrg/colosseum-copilot
npx skills add https://github.com/solana-foundation/solana-dev-skill
npx skills add helius-labs/core-ai --skill build
npx skills add helius-labs/core-ai --skill jupiter
npx skills add helius-labs/core-ai --skill phantom
npx skills add helius-labs/core-ai --skill svm

# 2. build + test
pnpm install
anchor build
anchor test --provider.cluster localnet   # 6/6 expected

# 3. SDK smoke tests
pnpm --filter @trade-on-my-behalf/sdk test   # 8/8 expected

pnpm dev
```

See `SPEC.md` for the frozen scope and `docs/copilot-verdict.md` for the idea's
evidence-backed gap classification.

## Layout

```
programs/treasury/             Anchor program: per-agent policy engine
packages/sdk/                  @trade-on-my-behalf/sdk: 5-line withTrader wrap
packages/agent/                trader runtime (webapp v1 control surface, see docs/control-surface.md)
packages/policy-engine/        off-chain policy evaluator (LiteSVM-tested)
packages/bridge/               USDC -> wSOL (LTC bridge dropped D3')
apps/dashboard/                Next.js 15 webapp control surface (Phantom Connect or Trust Wallet) — see docs/control-surface.md
scripts/devnet-demo.sh         one-shot judges can run
docs/                          architecture, onchain-program, sdk-api,
                               agent-runtime, venues, control-surface,
                               audit-and-receipts, testing-plan,
                               security-model, user-tests,
                               gtm-and-submission, onboarding, roadmap,
                               mcp-setup, research/, dimension-map,
                               oss-precedent
design-thinking/               founder voice: why I'm building this
PM-LOG.md                      single-page PM dashboard
SPEC.md / GTM.md / SUBMISSION.md
```

## License

MIT
