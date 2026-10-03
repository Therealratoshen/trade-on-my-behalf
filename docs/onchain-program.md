# On-chain Program — Implemented Policy Contract

Updated 2026-10-03. Source: `programs/treasury/programs/treasury/src`. [TRD](../TRD.md) specifies required hardening.

## Identity and state

Configured ID: `4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph`. It was not present in the dated devnet observation; compilation/local history is not deployment evidence.

PDA seeds: `["policy", agent]`. State stores owner/agent, fixed vendor list, six-decimal collateral budgets and usage, creation/reset/TTL slots, requested leverage cap, supplied peak-equity watermark and integer drawdown percent.

## Instructions

| Instruction | Permission | Actual effect |
|---|---|---|
| `create_policy` | Owner signer/payer | Creates agent-bound PDA; ≤16 vendors; leverage cap 0 or 100–10,000; drawdown 0–100; peak starts zero |
| `authorize_spend` | Owner or agent | Checks supplied vendor/amount/leverage/equity and slots; emits verdict; approved collateral increments usage |
| `update_policy` | Owner only | Changes provided caps/TTL/drawdown; preserves spend/reset/peak/creation; no vendors argument |
| `record_pnl` | Owner or agent | Raises watermark from caller-supplied equity; cannot lower it; does not verify venue PnL |

No custody, token transfer, venue CPI, consumed-intent/replay account, policy close, vendor replacement, enforced delegate revocation or timelock exists.

## Decision semantics

Drawdown is checked first if percent and peak are nonzero, followed by vendor, per-trade cap, daily cap, expiry and requested leverage. Codes: 0 approved, 1 vendor, 2 per-trade, 3 daily, 4 expired, 5 reserved, 6 leverage, 7 drawdown.

Denials return `Ok` with `approved: false`; unauthorized signer returns an error. Never infer approval from transaction success. `nonce` is emitted, not consumed/deduplicated.

Budget resets lazily after 216,000 slots from reset slot, even when the next authorization is denied. TTL uses strict `>` from creation slot. Saturating addition has an overflow approval edge at max cap; checked arithmetic is required.

## AuditEvent

Fields: policy, agent, vendor, amount_usdc, approved, reason_code, nonce, at_slot. It does not include market, side, effective leverage, venue order, actual fill or economic equity proof.

Admin updates and PnL recording also emit successful events using the system-program vendor and zero amount. Distinguish these from approved trade authorizations by instruction context; do not count every successful event as a trade.

[Security model](security-model.md), [unit plan](unit-testing.md) and [audit contract](audit-and-receipts.md) explain the trust and test boundaries. No future transaction-format/size feature is assumed without actual current cluster/toolchain support.
