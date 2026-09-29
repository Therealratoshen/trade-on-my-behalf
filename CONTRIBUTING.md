# Contributing to Trade On My Behalf

Thanks for looking. This is a hackathon build (Colosseum Crypto World's Fair
2026, Solana track) — contributions, issues, and forks are all welcome, and
issues filed by outside testers are actively used to harden the security model.

## What this is

An on-chain policy gate for perps trading. An agent (or a specialist algorithm)
proposes a trade; the Anchor program decides whether it may proceed; every
decision — approve *and* deny — emits an `AuditEvent` on chain.

The claim is: **"I cannot break your rules — within the as-stored caps."**
See [`SUBMISSION.md`](SUBMISSION.md) for the exact wording and the two known
carve-outs.

## Run the demo (no SOL needed)

```bash
pnpm install
pnpm demo
```

This boots a throwaway local validator with the program preloaded and walks the
full 9-step story. Every step is a real on-chain transaction. No devnet SOL
required.

## Layout

| Path | What |
|---|---|
| `programs/treasury/` | The Anchor program. The kernel. 4 instructions, 8 reason codes. |
| `packages/sdk/` | TypeScript SDK. `withTrader(wallet, rules)`. |
| `packages/agent/` | Trader runtime, off-chain preflight evaluator, venue adapter, `tomb` CLI. |
| `apps/dashboard/` | Read-mostly webapp: view policy, view audit log, edit policy. |
| `docs/` | Specs, security model, trader-lifecycle edge-case catalog, demo receipts. |

## Tests

```bash
pnpm -r test                       # SDK + agent (fast, no validator)
pnpm anchor:test                   # Anchor program (needs a local validator)
```

The program tests boot a local validator with the program preloaded. They do not
use devnet and do not need SOL.

## How to contribute

**Reporting a bug or an edge case.** Open an issue. The
[trader-lifecycle edge-case catalog](docs/trader-lifecycle-edge-cases.md) is the
best guide — if your case is not in there, that is a genuine gap and we want it.
Please include:

- What you did
- What the kernel decided (`reason_code` if it denied)
- Whether off-chain and on-chain disagreed

**Proposing a rule.** The kernel is the product. New rules need to be
enforceable on-chain within a transaction. A proposal should answer: what is the
on-chain check, what reason code does it emit, and what is the worst case when
the runtime lies to the kernel.

**Security findings.** Read
[`docs/security-model.md`](docs/security-model.md) first — it documents the four
breach scenarios we consider, and two of them are known gaps (queued as
`PM-LOG.md` §5 R14–R16). Findings on those two are still valuable: they tell us
whether our accepted risk is correctly scoped.

## Conventions

- **Rust** — `cargo fmt` + `cargo clippy`. No `unwrap()` in instruction handlers.
- **TypeScript** — `pnpm lint` in the package you touched. Strict mode is on.
- **Reason codes** are a stable public interface. `REASON_CODES` in
  `packages/sdk/src/types.ts` is pinned by a test. Adding a code means adding
  the Rust constant, the IDL, the SDK map, and the test together.
- **Docs move with code.** If you change the kernel, update
  `docs/onchain-program.md` in the same commit. A judge reads the docs and the
  Rust side by side.

## Before you push

- `pnpm build` exits 0
- `pnpm -r test` passes
- No keypairs, `.env` files, or RPC keys in the diff
- `git status` shows no unintended files

## License

MIT. See [`LICENSE`](LICENSE).
