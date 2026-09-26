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
size caps, daily loss caps, and (D7-D8 stretch) leverage and drawdown
limits on perps positions. The fields already exist for the first two
and will be extended with `max_leverage_bps` and a drawdown checkpoint.

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
) -> Result<()>
```

Accounts:

| Name | Signer | Writable | Notes |
|---|---|---|---|
| `policy` | – | yes | PDA at `[b"policy", agent]`, freshly initialized. |
| `agent` | – | – | The wallet the policy applies to. Stored as `UncheckedAccount`. |
| `owner` | yes | yes | Pays rent. Stored as `policy.owner`. |
| `system_program` | – | – | Standard `11111111…`. |

Enforced invariants:

- `vendors.len() <= 16` → `TreasuryError::TooManyVendors`.
- `policy` PDA is freshly initialized (Anchor `init`).
- `owner` and `agent` are independent pubkeys; one policy per agent.

Behavior: writes all the fields above to the PDA, stores the current
slot in both `created_at_slot` and `last_reset_slot`, and returns.
No event is emitted; the PDA itself is the receipt.

## Instruction — `authorize_spend`

Source: `programs/treasury/programs/treasury/src/instructions/authorize_spend.rs`.

```text
authorize_spend(
    vendor: Pubkey,
    amount_usdc: u64,
    nonce: u64,
) -> Result<()>
```

Accounts:

| Name | Signer | Writable | Notes |
|---|---|---|---|
| `policy` | – | yes | Derived PDA; must match `[b"policy", policy.agent]`. |
| `owner` | yes | – | The same owner that created the policy. |

Evaluation order (first match wins):

1. `vendor` not in `policy.vendors` → `REASON_VENDOR_DENIED` (1).
2. `amount_usdc > policy.per_tx_cap_usdc` → `REASON_PER_TX_CAP` (2).
3. `day_spent_usdc + amount_usdc > policy.per_day_cap_usdc` → `REASON_DAILY_CAP` (3).
4. `Clock::slot - created_at_slot > ttl_slots` → `REASON_EXPIRED` (4).

If none of the above, the spend is approved: `day_spent_usdc` is
saturated-added by `amount_usdc`, and the event reason is `REASON_OK` (0).

In every branch the program emits a single `AuditEvent`. Denial paths do
not write to `day_spent_usdc`. This means a denied trade does *not*
consume the daily budget — by design, so the user can correct the call
without eating into the cap.

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

Every decision — approve or deny — emits one of these. The runtime
uses `nonce` to deduplicate replays; off-chain indexers use
`policy + at_slot` as a cursor.

Reason codes (constant, frozen):

| Code | Name | Meaning |
|---|---|---|
| 0 | `REASON_OK` | Approved. |
| 1 | `REASON_VENDOR_DENIED` | Vendor not whitelisted. |
| 2 | `REASON_PER_TX_CAP` | Exceeds per-tx cap. |
| 3 | `REASON_DAILY_CAP` | Exceeds daily cap. |
| 4 | `REASON_EXPIRED` | TTL elapsed. |
| 5 | `REASON_UNKNOWN_VENDOR` | Reserved for future use (e.g., venue adapter mismatch). |

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
  moves money. This separation keeps the program small and reviewable.
- No leverage cap field. `per_tx_cap_usdc` is in dollar terms, not
  leverage-bps terms. The D7 deliverable adds `max_leverage_bps: u16`
  to `Policy` with a corresponding `REASON_LEVERAGE_EXCEEDED` (6).
- No drawdown kill-switch. The D8 deliverable adds a `drawdown_peak_usdc:
  u64` field and an `REASON_DRAWDOWN_TRIPPED` (7).
- No automatic `day_spent_usdc` reset. The runtime triggers
  `last_reset_slot` updates via a separate `reset_day_window` instruction
  (D7) once per day.

Each of those is a small additive change to `state/mod.rs` and one
more `if/else` branch in `authorize_spend`. No existing account layout
is broken; new fields go at the end and account space grows by 2/8/8
bytes respectively.