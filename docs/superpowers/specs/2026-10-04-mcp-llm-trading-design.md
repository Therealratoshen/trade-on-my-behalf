# Design: LLM trading over an on-chain policy gate

Date: 2026-10-04
Status: approved in dialogue; not yet implemented
Author: Filbert Henrico (Terading)

## Problem

Terading has a working constraint engine and no way to trade. Today the
repository contains:

- `treasury`, an Anchor program that **authorizes and records only**. It holds
  no custody, performs no CPI, and moves no funds. `create_policy` declares a
  `system_program` account, but no instruction transfers.
- `JupiterPerpsPaperVenue`, which is `mode = 'paper'` and returns
  `simulated: true` on every fill.
- No real venue implementation anywhere in the repo.

The question is whether the user should drive Terading from the web app, from
a direct bot (Grok, Hermes), or from an LLM reached over MCP — and how any of
those can trade automatically without the LLM becoming the thing that loses the
money.

## Decision

The LLM is a **discretionary layer above a hard on-chain floor**, and it is
**never given a key**.

Concretely, four constraints were chosen:

1. The LLM decides; the program constrains. The LLM generates the signal from
   the user's psychology profile, and the program vetoes anything outside the
   user's policy.
2. Key custody is **ephemeral and non-withdrawable**: the LLM cannot move
   funds, so the program is the only path to a trade.
3. The LLM's signal source is the **psychology profile**, with the existing
   deterministic evaluator retained as the hard floor beneath it.
4. First version is an **MCP server exposing policy-bounded intents** plus one
   real venue read. It proves the architecture end-to-end without risking a
   live trade.

The MCP server exposes a single write capability, `propose_intent`. It never
returns a signing key, a signed transaction, or a capability token. The LLM's
blast radius is *asking*.

## Why this and not the alternatives

**Ephemeral session key held by the LLM** was considered and rejected for now.
It is the literal reading of "ephemeral custody" and gives full autonomy, but
it requires per-key withdrawal limits expressed on-chain, and `Policy` today is
bound to an agent pubkey with aggregate caps — not a scoped allowance. That is
new program work, and it is the riskiest thing that could be attempted in the
time available. A key an LLM holds is also a demo-day liability: one prompt
injection drains it.

**Advisory-only LLM** was considered and rejected as too weak. If the LLM never
triggers anything, a judge asking "does the AI actually trade?" gets the
answer "it suggests."

**LLM proposes, deterministic agent decides** is the fallback if the
architecture cannot be completed. It is the smallest change and it is safe, but
it demotes the LLM to a planner.

## Architecture

```
  psychology profile
          |
          v
   LLM (Grok / Hermes / any MCP client)
          |  propose_intent(symbol, side, size_usdc, leverage_bps, thesis)
          v
   MCP server  ── read-only tools: policy_state, audit_tail, position_book
          |
          v
   packages/agent  classify() -> evaluator.evaluate()   [deterministic floor]
          |
          v
   packages/sdk   withTrader().ensurePolicy()  [signs; agent key is the only signer]
          |
          v
   treasury program  authorize_spend  --> approve? --> AuditEvent
          |                                    |
          |                                    +--> reason code 1..7
          v
   real venue (read-only in v1)  |  future: fill, then record_pnl
```

The LLM sits strictly above `classify()` and can never bypass it. It proposes an
intent; whether that intent is allowed is decided twice, once off-chain by the
deterministic evaluator and once on-chain by the program.

### Component boundaries

| Unit | Responsibility | Depends on |
|---|---|---|
| `mcp/src/server.ts` | Translate MCP tool calls into agent operations. Holds no key material. | `packages/agent` |
| `packages/agent/src/evaluator.ts` | Deterministic policy check. Unchanged in v1. | `packages/sdk` types |
| `packages/agent/src/runtime.ts` | classify -> evaluate -> authorize. Unchanged in v1. | SDK, evaluator |
| `packages/sdk/src/withTrader.ts` | Signs and submits. Sole holder of the agent key. | `treasury` program |
| `treasury` | On-chain authority. Vetoes, records. Moves no funds. | — |

Each unit has one reason to change. The MCP server changes when the tool surface
changes; the program changes only when a new cap is needed; `withTrader`
changes only when the signing model changes.

## Trust model, stated honestly

**What the LLM can do:** read policy state, read the audit tail, propose
intents, and see why an intent was denied.

**What the LLM cannot do:** sign, move funds, widen a policy, extend a TTL,
unlock the kill-switch, or suppress an **on-chain** denial. On-chain denials
return `Ok(())` with a non-OK reason code and are emitted as an `AuditEvent`,
so they are permanent and public. An **off-chain** denial by `classify()` or
`evaluate()` is not on-chain and the LLM is not obligated to surface it — the
server returns it, but nothing forces it to be shown. This asymmetry is real and
should not be glossed: the strong "cannot edit" claim holds for anything that
reached the chain, and the honest pitch is scoped to that.

**Residual risks, which are real and must be stated rather than implied:**

- The LLM can still *waste* the user's daily budget by making poor but
  policy-legal trades. The cap bounds the damage; it does not prevent stupidity.
- An LLM outage stalls trading entirely, because the LLM is the signal source.
  A deterministic fallback path is desirable and is not in v1.
- The agent key is still a hot key on the machine running the MCP server. The
  ephemeral-custody property is a property of *what the LLM is given*, not of
  what the host holds.
- The program cannot verify that a real venue actually filled at the price the
  agent believed. `record_pnl` trusts the caller. This is the largest
  unverified claim in the system and is already noted in
  `docs/security-model.md`.

## Data flow for one proposed trade

1. LLM calls `propose_intent` with a thesis drawn from the psychology profile.
2. MCP server builds a `Signal` and calls `handle(signal)`.
3. `classify()` mirrors the policy bounds; `evaluate()` returns a decision.
4. If denied **off-chain** by `classify()` or `evaluate()`, the reason code is
   returned to the LLM as explanation and nothing is signed, so nothing reaches
   the chain and nothing is recorded. These denials are visible to the LLM and
   to the dashboard, but they are not on-chain.
5. If allowed off-chain but denied **on-chain** by `authorize_spend`, the
   program returns `Ok(())` and emits an `AuditEvent` with `approved: false` and
   a non-OK reason code. This is deliberate: returning `Err` would abort the
   transaction before the event could be written, destroying the record. So an
   on-chain denial *is* permanent and public, and this is the case the pitch
   line "every decision — including the ones that stop me — is a public record I
   cannot edit" refers to.
6. If approved on-chain, `p.day_spent_usdc` advances and an `AuditEvent` with
   `approved: true` is emitted.
7. In v1 the venue call is **read-only** — the agent can see a live price and
   current positions, but no order is placed.

## Error handling

- **LLM returns a malformed intent** (bad symbol, non-numeric size, absurd
  leverage): rejected at the MCP boundary with a typed error, never forwarded to
  the chain. The MCP server must not silently coerce.
- **`authorize_spend` denies**: returned to the LLM with the reason code and a
  plain-language explanation. This is a normal outcome, not an error.
- **RPC failure**: the SDK's new devnet genesis guard refuses to sign when
  `getGenesisHash` cannot be confirmed, so an unreachable node fails closed.
- **Venue read failure**: surfaced as `null`, never as a fabricated price. This
  matches the existing behaviour of `app/api/quote/route.ts`.

## Testing

- **MCP boundary**: a unit test per tool, asserting the server holds no key and
  that a malformed intent never reaches `handle()`.
- **Denial path**: an intent that violates a cap returns the reason code and
  performs no signature. This is the test that proves the gate works.
- **Regression**: the existing 20 program tests, 37 agent tests and 31 SDK tests
  must stay green, unchanged. New code in `packages/agent` or `packages/sdk`
  requires new tests there, per `AGENTS.md`.
- **No live trade test.** v1 must not place a real order, and there is
  deliberately no test that does so.

### Workspace placement — a concrete trap

`pnpm-workspace.yaml` globs **only** `apps/*` and `packages/*`. A new package
placed at `packages/mcp` is inside the workspace and will be picked up by
`pnpm -r test`, which is what CI runs. A folder created at the repository root
as `mcp/` would be **outside the workspace**: its dependencies would not install
under `pnpm -r`, and its tests would silently never run in CI. Any new package
must therefore live under `packages/`, and must declare a `test` script matching
the existing convention:

```json
"test": "node --test --import tsx tests/*.test.ts"
```

## Deliberately out of scope for v1

- A real venue write path, and therefore any real trade.
- Capability tokens or per-key on-chain allowances.
- A deterministic fallback when the LLM is unavailable.
- Any new instruction on the `treasury` program.
- Venue fill reconciliation — the program trusts the caller's `record_pnl`.

## Open questions

1. **Which venue read?** v1 needs one real read to make the demo honest. A perp
   DEX price feed is the natural fit given `JUPITER_PERPS_PROGRAM_ID` is already
   referenced, but the choice should be made against what is actually
   available and rate-limited at the time.
2. **Psychology profile format.** The LLM needs a structured representation of
   the user's behavioural rules. `docs/` has no format yet. This is a design
   task in its own right and should be specified before implementation.
3. **Rate limiting.** The daily cap bounds loss but an LLM can burn the budget
   in seconds. A per-session trade rate limit may be warranted; it is currently
   unspecified.
