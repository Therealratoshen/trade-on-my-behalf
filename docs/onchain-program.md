# On-chain Program — `programs/treasury`

> Frozen for D6. The compiled artifact is `programs/treasury/target/deploy/treasury.so`
> (203 KB, program ID `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`).
> The IDL is at `programs/treasury/target/idl/treasury.json`.

## What the program does, in plain English

`treasury` is a **per-agent spending policy gate**. The user creates
a `Policy` PDA that says:

- which agents are allowed to spend on its behalf,
- which vendor pubkeys are whitelisted,
- how much USDC can move in a single transaction,
- how much USDC can move in a 24-hour window,
- how long the policy lives before it expires (`ttl_slots`).

Every time an agent wants to spend, it calls `authorize_spend` against
the PDA. The program checks the four rules and emits an `AuditEvent`
whether the spend is approved or denied. **There is no token transfer
inside this program.** The Anchor program is a gatekeeper, not a
custodian. The actual transfer happens downstream in the venue adapter,
and the `AuditEvent` is the proof that the venue call was sanctioned
by the policy.

For Trade On My Behalf, the same gate is reused to enforce per-trade
size caps, daily loss caps, leverage limits, and drawdown kill-switches
on perps positions. **D7 shipped the leverage cap** (`max_leverage_bps`)
in [`authorize_spend.rs`](../programs/treasury/programs/treasury/src/instructions/authorize_spend.rs).
**D8 shipped the drawdown kill-switch** (`peak_equity_usdc` monotonic
watermark + threshold check at the top of `authorize_spend`) via the
new `record_pnl` instruction. Both ship in the same compiled `.so`
artifact (~209 KB).

Future hardening (D10+) is tracked in [PM-LOG §5 R14–R16](../PM-LOG.md):
tighten-timelock on `update_policy`, CPI-wrapper or PDA-bound memo, and
documentation of "what kills an open position." Those are honest v2
work, not v1 blockers.

## State — `Policy` PDA

Source: `programs/treasury/programs/treasury/src/state/mod.rs`.

| Field | Type | Meaning |
|---|---|---|
| `owner` | `Pubkey` | Wallet that funded the policy; signs every subsequent update. |
| `agent` | `Pubkey` | Wallet the policy applies to (used as the PDA seed). |
| `vendors` | `Vec<Pubkey>` | Whitelisted vendor pubkeys. Max 16 (enforced in `create_policy`). |
| `per_tx_cap_usdc` | `u64` | Max USDC (6-decimal microunits) per single `authorize_spend`. |
| `per_day_cap_usdc` | `u64` | Max USDC rolling window; reset via `last_reset_slot` cron. |
| `day_spent_usdc` | `u64` | Live counter; incremented on each approved spend. |
| `ttl_slots` | `u64` | Slots the policy lives from `created_at_slot`. |
| `created_at_slot` | `u64` | Slot at `create_policy`. |
| `last_reset_slot` | `u64` | Slot when `day_spent_usdc` was last zeroed. |
| `bump` | `u8` | PDA bump (Anchor-managed). |

PDA seed: `[b"policy", agent.as_ref()]`. Account size with 16 vendors:
`8 + 32 + 32 + (4 + 16*32) + 8 + 8 + 8 + 8 + 8 + 1 = 619` bytes.

## Instruction — `create_policy`

Source: `programs/treasury/programs/treasury/src/instructions/create_policy.rs`.

```text
create_policy(
    vendors: Vec<Pubkey>,
    per_tx_cap_usdc: u64,
    per_day_cap_usdc: u64,
    ttl_slots: u64,
    max_leverage_bps: u16,          // 0 = no cap, else 100..=10_000
    kill_switch_drawdown_pct: u8,   // 0 = off, else 1..=100 (PERCENT)
) -> Result<()>
```

| Account | Signer | Writable | Notes |
|---|---|---|---|
| `policy` | – | yes | PDA at `[b"policy", agent]`, freshly initialized (`init`). |
| `agent` | – | – | The agent's hot-key pubkey. `UncheckedAccount`. |
| `owner` | yes | yes | Pays rent. Stored as `policy.owner`. |
| `system_program` | – | – | |

Invariants: `vendors.len() <= 16`; leverage and percent ranges above.
Writes the current slot to `created_at_slot` and `last_reset_slot`.
`vendors` cannot be changed afterwards.

## Instruction — `authorize_spend`

Source: `programs/treasury/programs/treasury/src/instructions/authorize_spend.rs`.

```text
authorize_spend(
    vendor: Pubkey,
    amount_usdc: u64,
    nonce: u64,                         // recorded, not checked in v1
    leverage_bps: u16,
    implied_current_equity_usdc: u64,   // runtime-reported
) -> Result<()>
```

| Account | Signer | Writable | Notes |
|---|---|---|---|
| `policy` | – | yes | Must match `[b"policy", policy.agent]`. |
| `authority` | yes | – | Must be `policy.agent` or `policy.owner`, else `Unauthorized` (6005) and the tx fails. |

Order of operations:

0. If `slot - last_reset_slot >= 216_000` (~24h), reset `day_spent_usdc`
   to 0 and set `last_reset_slot = slot`. Rolling window, not UTC-aligned.
1. Kill-switch: if `kill_switch_drawdown_pct > 0` and `peak_equity_usdc > 0`
   and `implied_current_equity_usdc < peak × (100 − pct) / 100`
   → `REASON_DRAWDOWN_KILLSWITCH` (7).
2. `vendor` not in `policy.vendors` → `REASON_VENDOR_DENIED` (1).
3. `amount_usdc > per_tx_cap_usdc` → `REASON_PER_TX_CAP` (2).
4. `day_spent_usdc + amount_usdc > per_day_cap_usdc` → `REASON_DAILY_CAP` (3).
5. `slot - created_at_slot > ttl_slots` → `REASON_EXPIRED` (4).
6. `max_leverage_bps != 0` and `leverage_bps > max_leverage_bps` → `REASON_LEVERAGE_CAP` (6).

Otherwise approved: `day_spent_usdc += amount_usdc`, reason `REASON_OK` (0).

Every branch emits exactly one `AuditEvent` and returns `Ok`, so a deny
is a successful transaction with `approved = false` in the event.
Clients must read the event, not the transaction status. Denials do not
consume the daily budget.

## Instruction — `update_policy`

`update_policy(max_leverage_bps?, per_tx_cap_usdc?, per_day_cap_usdc?, ttl_slots?, kill_switch_drawdown_pct?)`.
Signer `owner` must equal `policy.owner`. `None` leaves a field unchanged.
Loosening is allowed (see security-model.md Scenario 1, R14 timelock).
Emits an `AuditEvent` with `vendor = system_program`, `amount = 0`.

## Instruction — `record_pnl`

`record_pnl(new_equity_usdc)`. Signer `authority` must be `policy.agent`
or `policy.owner`. Sets `peak_equity_usdc = max(peak, new)`; it can only
raise the kill-switch floor, never lower it. Emits an admin `AuditEvent`.

## Event — `AuditEvent`

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

Every decision — approve or deny — emits one of these. The program does
not deduplicate `nonce`; off-chain indexers use `policy + at_slot +
signature` as a cursor.

Reason codes (constant, frozen):

| Code | Name | Meaning |
|---|---|---|
| 0 | `REASON_OK` | Approved. |
| 1 | `REASON_VENDOR_DENIED` | Vendor not whitelisted. |
| 2 | `REASON_PER_TX_CAP` | Exceeds per-tx cap. |
| 3 | `REASON_DAILY_CAP` | Exceeds daily cap. |
| 4 | `REASON_EXPIRED` | TTL elapsed. |
| 5 | `REASON_UNKNOWN_VENDOR` | Reserved; not emitted in v1. |
| 6 | `REASON_LEVERAGE_CAP` | Leverage above `max_leverage_bps`. |
| 7 | `REASON_DRAWDOWN_KILLSWITCH` | Equity below the drawdown floor. |

## Forward compatibility — v1 transaction format (SIMD-0385)

Per the `solana-dev` skill, transactions are v1 by default on
mainnet (Agave 4.2.2+, activated 2026-09-15). The treasury program
emits no `ComputeBudget` instructions, so the runtime-side v1
transaction contains only `authorize_spend` (one instruction, one
account-list, ~120 bytes serialized). The size is well under the 4096-byte
v1 cap and nowhere near the resource-estimation ceilings. No code change
is required to support v1; only the client SDK has to opt in by passing
`transactionConfig: { version: 1 }` when assembling the `createClient()`.

This matters for Trade On My Behalf because the venue router will often
bundle multiple instructions in one transaction (e.g., a Jupiter Perps
open + a memo + the treasury authorize). v1 gives the headroom without
requiring version negotiation at the wallet layer.

## What is **not** in the program (yet)

- No CPI to a perps venue. The program approves; the venue adapter
  moves money (paper-simulated in v1). See security-model.md Scenario 4.
- No nonce replay protection.
- No way to change `vendors` or close a policy.
- No tighten-timelock on `update_policy` (R14).
- No notion of open positions (R16).

Tests: `programs/treasury/tests/treasury.ts`, 12 cases covering every
emitted reason code, signer checks, and agent-vs-owner permissions.
Run with `anchor test --provider.cluster localnet`.
