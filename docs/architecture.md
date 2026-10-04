# Architecture — Implemented System and Required Devnet Terminal

Updated 2026-10-03. Revised 2026-10-04: added "What the gate does and
does not do" and the `close()` finding, after an audit found the
"cannot be bypassed" framing carried in the frozen D6 GTM and
design-thinking drafts was false against the shipped program.
[PRD](../PRD.md) defines scope; [TRD](../TRD.md) defines contracts.

## Implemented path

```text
CLI signal → classifier/clamp → local preflight
                              → Treasury authorize_spend transaction
                              → decoded policy AuditEvent
                                  denied: stop
                                  approved: separate Jupiter PAPER fill

Next.js dashboard → wallet/policy/audit RPC reads
                  → browser owner-signed update_policy
                  → server /api/positions → shared demo paper file
```

Authorization and paper execution are not atomic. Treasury does not custody funds or CPI any venue. The SDK is a policy wrapper, not a Jupiter transaction builder. The current dashboard uses RPC polling; no implemented Helius DAS audit-indexing, live venue fill ingestion, automatic venue fallback or strategy samplers are evidenced.

## What the gate does and does not do

Short version: **the program authorises and records. It does not
custody, does not CPI, does not bind the venue action, and does not
block a caller who never asks it.** A fill is a separate off-chain
step taken by a different process after the authorisation has already
committed.

**Does — verifiable in the source:**

- Holds the caps on chain, mutable only by the policy owner
  (`instructions/update_policy.rs`, owner-only signer).
- Emits an `AuditEvent` for every call, approved or denied, with the
  committed `at_slot` (`instructions/authorize_spend.rs:104-113`).
- Consumes `day_spent_usdc` on approval only
  (`authorize_spend.rs:101-103`), with a 216 000-slot rolling window
  from `last_reset_slot` (`state/mod.rs:40`).
- Is the only path that can raise `peak_equity_usdc`, so a runtime lie
  about current equity cannot widen the kill-switch
  (`record_pnl.rs`, and the note in `lib.rs:48-53`).
- Rejects an unauthorised signer, so the agent key or the owner must
  sign each call (`authorize_spend.rs:10-11`).

**Does not — also verifiable:**

- **No CPI and no transfers.** `programs/treasury/src/` contains no
  `invoke`, no `invoke_signed`, no `CpiContext` and no
  `system_program::transfer`. `create_policy` declares
  `system_program` only to pay the account-rent `init`; `record_pnl`
  and `update_policy` reference `system_program::ID` solely as an
  `AuditEvent.vendor` label. There is no code path that moves a
  user's funds or calls a venue.
- **Does not bind the venue action.** Nothing in the policy is bound
  to a venue account, market or side. `vendor` is caller-supplied, and
  the same key that submits the authorisation submits the venue order
  independently. An `approved: true` event is a statement about
  caller-supplied fields, not an execution that occurred.
- **Does not prevent bypass.** A caller holding a key can trade at the
  venue without ever calling `authorize_spend`. This is test **E17**,
  which currently records that the design cannot claim the bypass
  attempt passes ([e2e-testing](e2e-testing.md)).
- **Denial is not an exception.** Denials `return Ok(())` with a
  denied `AuditEvent` (`authorize_spend.rs:57-67`, `84-97`) so the
  runtime can surface a risk flag. A denied transaction still
  succeeds on chain; the refusal is data, not a failed instruction.
- **Equity is a soft input.** The drawdown kill-switch consumes
  runtime-reported `implied_current_equity_usdc`; it is not verified
  venue equity.

**Consequence for how this is described:** an `AuditEvent` proves the
committed program decision about the fields it was given. It does not
prove an order, a fill, a side, a size actually taken, or that the
authorisation was load-bearing. Binding policy to the action requires
an app-managed account or custody wrapper — the "Required additions"
column above and [security-model](security-model.md).

### The `close()` path skips `authorize_spend`

`packages/agent/src/runtime.ts:114-118` — `close()` calls
`venue.closePosition()`, then `syncEquity()`. It never calls
`authorizeSpend`, unlike `handle()` (`runtime.ts:87-94`).

**Verdict: correct by design, not a gap.** The reasoning:

- `authorize_spend` is an *entry* gate. Its checks are
  `per_tx_cap_usdc`, `per_day_cap_usdc`, `max_leverage_bps` and TTL —
  all constraints on *opening new exposure*. A close reduces
  exposure, so none of those are the right test for it. Routing a
  close through them would be a category error, and routing it through
  the daily-spend ledger would charge a reduction against the budget
  meant for new risk.
- Applying a kill-switch test to a close would be actively harmful:
  the kill-switch fires when reported equity is below the drawdown
  threshold, which is precisely when reducing exposure matters most.
  Gating that behind an approval check invites denying the exit.
- The counters are monotonic in the wrong direction for closures
  anyway: approving a close would inflate `day_spent_usdc` without
  adding risk, eroding the cap's meaning.

What still applies to a close is the one thing `close()` does keep:
`syncEquity()` → `recordPnl` (`runtime.ts:117`), so a realised gain
raises the peak watermark and a realised loss feeds the next
kill-switch comparison. The equity bookkeeping is preserved.

**The caveat a reviewer should record:** because the venue position
is a paper entry that `authorize_spend` never bound, `close()` is
trusting an off-chain `venuePositionId` with no on-chain check that
the position exists or is owned. That is a *different* gap from the
missing gate call — it is a missing identity binding, and it is
already listed in the "Required additions" column above. It does not
argue for adding an `authorizeSpend` to `close()`.

## Target path — not implemented

```text
Devnet/identity verifier → wallet + owner/agent/account selection
Market-data service → timestamped chart / reference data
Trade ticket → validated preview + refreshed executable estimate
Intent journal → verified policy-bound app-account execution
               → chain/order/fill reconciliation
Account-scoped positions + orders + risk state + receipt viewer
```

A compatible custody/wrapper must bind policy parameters to venue accounts/action and prevent direct agent bypass. Request/keeper execution requires a separate asynchronous lifecycle; submitting the request is not the fill.

## On-chain versus off-chain responsibilities

| On-chain current | Off-chain current | Required additions |
|---|---|---|
| Policy ownership, stored caps/slots, authorization decisions, supplied-equity comparison | Signals, clamp/preview, spot-price reference, paper ledger, dashboard reads | Devnet identity checks, real adapter, verified risk, enforced authority binding, durable journal, chart/ticket, scoped storage and audit recovery |

The current four instructions are `create_policy`, `authorize_spend`, `update_policy`, `record_pnl`. `record_pnl` permits owner or agent and does not verify venue PnL.

Use [readiness](devnet-readiness.md), [security](security-model.md) and [testing](testing-plan.md) before describing the target as shipped.
