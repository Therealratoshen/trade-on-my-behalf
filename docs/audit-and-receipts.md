# Audit and Receipts — `AuditEvent` Stream

> Frozen for D6. Implementation lands D9-D11 (indexing + viewer) and
> D14-D17 (Pieverse-style receipts, stretch).

The audit story is half on-chain, half off-chain. The on-chain half
is already shipping: every `authorize_spend` call emits an `AuditEvent`
with eight fields. The off-chain half is the dashboard viewer that
turns that stream into something a human can read.

## Event shape (recap)

```rust
#[event]
pub struct AuditEvent {
    pub policy: Pubkey,
    pub agent: Pubkey,
    pub vendor: Pubkey,
    pub amount_usdc: u64,
    pub approved: bool,
    pub reason_code: u8,
    pub nonce: u64,
    pub at_slot: u64,
}
```

Source: `programs/treasury/programs/treasury/src/state/mod.rs`.
IDL: `programs/treasury/target/idl/treasury.json` (discriminator
`241,242,94,109,175,205,78,0`).

## On-chain query path

The runtime maintains two parallel cursors:

1. **Helius DAS** — `getProgramAccountsV2` filtered by the program ID
   `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph` with `encoding:
   jsonParsed` and `dataSlice` set to the discriminator only. This
   returns every `AuditEvent` ever emitted under the program. The
   cursor is `(policy, at_slot)` and is checkpointed in the runtime's
   local SQLite every 100 events.
2. **Helius Enhanced Webhooks** — `transactionSubscribe` watching the
   program ID with `mentions: [program_id]`. This is the low-latency
   tail; new events land in the runtime within ~400 ms of slot
   confirmation on devnet.

The runtime also emits a duplicate event on the off-chain audit log
when the off-chain mirror denies, so the dashboard can show *all*
denied intents, not only the ones that reached the chain. Off-chain
events use the same shape with an `at_slot: 0` and a `nonce` prefixed
with `"off"` so a downstream auditor can tell them apart.

## Dashboard query model

```ts
// apps/dashboard/src/lib/audit.ts (sketch)
export interface AuditQuery {
  policy?: PublicKey;          // filter to one wallet
  agent?: PublicKey;           // filter to one agent
  approved?: boolean;          // true | false | undefined (both)
  reasonCode?: number[];       // 1..7
  sinceSlot?: number;          // cursor
  untilSlot?: number;
  limit?: number;              // default 100, max 1000
}
```

The viewer defaults to `(policy: userWallet, limit: 50, approved: both)`
and renders a virtualized table. Each row is a link to the underlying
transaction on Solana Explorer (or Solscan / Solana FM) with the
`AuditEvent` decoded inline.

## Drawdown computation

Drawdown is not a single `AuditEvent` field — it is derived. The
runtime computes it from a rolling window of fills:

```text
drawdownPct = (peakEquityUsd - nowEquityUsd) / peakEquityUsd * 100
```

Where:

- `peakEquityUsd` is the max value of `nowEquityUsd` over the past
  24 hours (or since policy creation, whichever is shorter).
- `nowEquityUsd` is `policy.day_spent_usdc` adjusted for the
  cumulative `unrealizedPnlUsd` from open positions.

The runtime publishes `nowEquityUsd` and `peakEquityUsd` to the
dashboard every fill and every 30 s while a position is open. The
dashboard plots both as a sparkline and overlays the
`killSwitchDrawdownPct` line so the user can see how close they are.

On D8 the runtime gains an on-chain `drawdown_reset` instruction
that lets the Anchor program acknowledge a `drawdown_peak` and
`drawdown_now` pair if a future design wants the gate to live
on-chain. For D6-D11 the drawdown check is off-chain only.

## Per-fill receipts (D14-D17 stretch)

The D3''' adjacent-protocol scan flagged Pieverse (PIEVERSE) as the
nearest existing *receipt-layer* on Solana. Pieverse ships legal
receipts via the x402b protocol; chat surface on WhatsApp/LINE/Kakao.

If we have time D14-D17, the runtime will emit a per-fill receipt
on every `Fill` event:

```json
{
  "receipt_type": "tomb_perp_fill",
  "policy": "9X...Y",
  "agent": "7Z...W",
  "venue": "jupiter-perps",
  "venue_position_id": "jp-3142",
  "market": "SOL-PERP",
  "side": "long",
  "size_usd": "150_000000",
  "fill_price_usd": "98.42",
  "fee_usd": "0.75",
  "leverage_bps": 300,
  "tx_sig_venue": "5B...A",
  "tx_sig_authorize": "5B...B",
  "at_slot": 312450922,
  "audit_reason_code": 0
}
```

This receipt is *not* an on-chain event in v1 (we do not want to
spam the chain). It is a typed HTTP POST to a configurable receipt
endpoint, plus a copy stored in the dashboard's audit log. If the
endpoint is a Pieverse-compatible x402b receiver, the receipt doubles
as a legal record of the trade. If not, the receipt is a plaintext
JSON in the user's audit log and is enough for personal bookkeeping.

## Why this design

- **Every decision is auditable.** Approve and deny emit the same
  event shape, so a downstream auditor can replay a session without
  missing any branch.
- **No event is silent.** The runtime's off-chain mirror emits the
  same shape for off-chain denies. There is no decision the system
  can take that leaves no trail.
- **The trail is cheap to keep.** `AuditEvent` is a single log entry
  per call. Helius indexing handles it; no custom indexer required
  for v1.

## What an auditor sees

A user exports their session as JSON by hitting
`/api/export?policy=<pubkey>&since=<slot>`. The response is a flat
array of `AuditEventView` rows ordered by `at_slot`. From there the
auditor has the same picture the runtime had at decision time,
including every denied trade and the reason.

For D14-D17 stretch, the same export gains a second array of
`receipt` rows (one per fill). The two arrays together are the
complete forensic record of the wallet's trading session.