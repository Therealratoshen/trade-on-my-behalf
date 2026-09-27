# Trader Lifecycle & Edge Cases — PRD Augmentation

> **Augments the implied BRD with the trader-lifecycle view.**
> Source-of-truth for v1 acceptance criteria at D11 and for the
> D10+ hardening queue at [PM-LOG §5 R14–R16](../PM-LOG.md).
>
> Created D9 (2026-09-27). Living document — every edge case
> surfaced during D9 build or D11 user test gets appended here.

A trader using **Trade On My Behalf (TOMB)** moves through **14
lifecycle stages**. Each stage has a happy path and a non-trivial
edge case catalog. Edge cases are split by who *should* handle them:

- **On-chain enforced** — the kernel rejects the input (REASON_*).
- **Off-chain runtime enforced** — the runtime denies pre-CPI, saves the fee.
- **Runtime logs + surfaces** — non-blocking anomaly that the webapp flags.
- **Out of scope v1** — honest v2+ framing.

The 14 stages follow the actual sequence of how a retail trader
uses the product. The shape mirrors what real perps traders do
today (Telegram bots + spreadsheets + manual stops), so the gap
between today's workflow and TOMB's is legible.

---

## Stage 1 — Onboarding

**Goal:** Connect wallet, create the first `Policy` PDA.

### Happy path
1. User opens `apps/dashboard/`, connects Phantom or Trust Wallet.
2. Sees "no policy yet" empty state with a "Create policy" CTA.
3. Fills in: vendors (max 16 multi-select), per-tx cap USD,
   per-day cap USD, TTL slots, max leverage bps, kill-switch pct.
4. Signs `create_policy` transaction.
5. Webapp fetches the new policy via `fetchPolicy()` and renders
   the 5-panel view.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 1.1 | Wallet has < 0.001 SOL (cannot pay rent + fees) | runtime pre-check | Block CTA, link to https://faucet.solana.com |
| 1.2 | Policy already exists for this agent | runtime `fetchPolicy()` | Redirect to "Edit policy" view; CTA becomes "Update policy" |
| 1.3 | User enters `max_leverage_bps` > 10_000 | client validation | Reject input, explain "1×–100×" |
| 1.4 | User enters `kill_switch_drawdown_pct` > 100 | client validation | Reject input, explain "1–100%" |
| 1.5 | User selects 17 vendors | client validation | Disable 17th vendor; explain "max 16" |
| 1.6 | User duplicates vendors in whitelist | runtime dedup | Dedup silently; log to console |
| 1.7 | User picks `ttl_slots = 0` | client validation | Default to `DEFAULT_TTL_SLOTS` (1.5M, ~7 days) |
| 1.8 | User picks `kill_switch_drawdown_pct = 0` | accepted (means disabled) | Show "kill-switch disabled" warning |
| 1.9 | Network drop mid-`create_policy` | runtime retry + user prompt | Show "tx may have landed — reloading", idempotently re-derive PDA |
| 1.10 | User disconnects wallet between form-fill and sign | runtime | Re-prompt connect on submit; do not submit partial tx |

---

## Stage 2 — Configuration / policy updates

**Goal:** User edits the policy after creation (raise/lower caps,
extend TTL, rotate vendor, change leverage cap).

### Happy path
1. User opens "Edit policy" view.
2. Edits cap / TTL / leverage / kill-switch fields.
3. Signs `update_policy` with `Option<T>` = new value, others `null`.
4. Webapp re-fetches via `fetchPolicy()`.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 2.1 | User raises per-tx cap to absurd value (e.g. $10M) | on-chain | Anchor accepts (no upper bound); runtime shows warning "this is your entire wallet" |
| 2.2 | User lowers per-tx cap below current open position | runtime log + warning | Allow but warn "open positions may exceed new cap"; close them manually |
| 2.3 | User raises kill-switch from 25% to 100% | runtime warning | Show "kill-switch effectively disabled at 100%" |
| 2.4 | User disables kill-switch (set to 0) | runtime warning | Show "no drawdown protection" banner |
| 2.5 | User rotates vendor while open position exists there | out of scope v1 | v1 has no vendor-rotate-in-place; user must close positions first, then call `replaceVendors` |
| 2.6 | User extends TTL with open positions | accepted | TTL is policy-wide; position lifecycle is venue-side |
| 2.7 | User submits two `update_policy` calls in same slot | runtime | First wins; second overwrites; off-chain dedup via sequence nonce (v2) |
| 2.8 | `update_policy` cap > 2^53 (BN precision loss in JS) | runtime | Reject pre-flight; cap to 2^53 - 1 for human-readable display |
| 2.9 | `update_policy` while policy is expired | runtime | Allow — extending TTL revives the policy |

---

## Stage 3 — Signal reception

**Goal:** A specialist algorithm (SAS model: Specialist /
Algorithm / Skill) produces a `TradeIntent` and pushes it to the
runtime via `packages/agent/src/intake.ts`.

### TradeIntent shape (canonical)

```ts
interface TradeIntent {
  side: 'long' | 'short';
  market: string;          // e.g. 'SOL-PERP'
  sizeUsd: number;         // human units, > 0, ≤ $1M
  leverageBps: number;     // 100..=10000 (1×..=100×)
  ttlSlots?: number;       // override policy TTL for this intent
  // v2: stopLossBps, takeProfitBps, signalMeta { source, confidence }
}
```

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 3.1 | Intent for market not on any venue (typo 'SOL-PRP') | runtime pre-check | Reject; runtime lists whitelisted markets |
| 3.2 | Intent with `side: 'long-short'` (malformed) | runtime | Reject; signal must be exactly 'long' or 'short' |
| 3.3 | Intent with `sizeUsd` ≤ 0 | runtime | Reject |
| 3.4 | Intent with `sizeUsd` > 2^53 | runtime | Reject; cap to 2^53 - 1 |
| 3.5 | Intent with `leverageBps` > 10_000 | runtime | Reject |
| 3.6 | Intent with NaN / Infinity in any numeric field | runtime | Reject; check `Number.isFinite()` |
| 3.7 | Multiple intents in same slot | runtime queue | Process serially; first wins; second may be stale by the time it lands |
| 3.8 | Signal source is unavailable | runtime | Buffer last N intents (ring buffer); replay when source reconnects |
| 3.9 | Signal source sends malformed JSON | runtime | Log + drop; do not crash intake |
| 3.10 | Signal arrives before `create_policy` is signed | runtime | Reject; return `NO_POLICY` reason |
| 3.11 | Signal arrives during `update_policy` mid-flight | runtime | Use *new* policy state for evaluation; race-tolerant because on-chain re-checks |

---

## Stage 4 — Off-chain rule evaluation (`evaluator.ts`)

**Goal:** Mirror the on-chain gates in JS so the runtime can deny
off-chain (saves the tx fee) when a deny is certain. If off-chain
approves, the runtime still submits to the chain — on-chain is
the authority.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 4.1 | `implied_current_equity_usd` estimate is > 1 minute old | runtime | Use last good value + warning flag; never use value older than 5 min |
| 4.2 | Equity estimate is negative | runtime | Treat as 0 (worst case); always trips kill-switch |
| 4.3 | Equity estimate > 2^53 | runtime | Cap to 2^53 - 1 for math; log anomaly |
| 4.4 | Two intents submitted in same slot, second would push over per-day cap | runtime | Reject second off-chain; first wins |
| 4.5 | Off-chain approves but on-chain denies | on-chain | **Normal operation.** On-chain is the authority. The webapp surfaces the on-chain reason code |
| 4.6 | Off-chain denies but on-chain would approve | runtime | Trust on-chain; show off-chain warn banner ("rejected pre-flight, you can manually submit") |
| 4.7 | Equity reconciliation conflict (venue reports different equity) | runtime log | Surface "venue vs runtime PnL mismatch" in the webapp |
| 4.8 | Per-day cap already at limit but `day_spent_usdc` not reset yet | runtime | Until slot-based reset (every ~150k slots = ~16h), the cap holds; surface "day cap reset in X slots" |
| 4.9 | Vendor on whitelist but venue program halted | runtime quote | Treat as unavailable; do not submit |

---

## Stage 5 — On-chain `authorize_spend`

**Goal:** Submit the final transaction: `[authorize_spend,
optional venue CPI, optional memo]`. Parse the `AuditEvent`.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 5.1 | Tx simulated OK but reverts on-chain | on-chain | Anchor returns `InstructionError`; runtime parses reason code from logs |
| 5.2 | Tx dropped from mempool (no confirmation in 60s) | runtime retry | Retry with bumped priority fee up to 3×; after 3 retries, mark `TIMEOUT` |
| 5.3 | Tx landed, AuditEvent approve, but venue CPI failed in same tx | on-chain | Authorize was on-chain approved; runtime records the approve event and surfaces the venue failure separately |
| 5.4 | Tx landed, AuditEvent deny (e.g. vendor cap rebalanced mid-flight) | on-chain | Runtime captures `reason_code`, surfaces as red row in webapp |
| 5.5 | Tx fails because agent wallet was just rotated | runtime | Detect `AccountNotFound`; prompt re-connect |
| 5.6 | RPC node stale (sees old block height) | runtime retry | Re-submit to a fresh RPC endpoint |
| 5.7 | Priority fee too low during congestion | runtime | Auto-bump to 5_000 microlamports; surface cost to user |
| 5.8 | Jito bundle rejected | runtime | Fall back to regular RPC submission |
| 5.9 | AuditEvent missing from logs (RPC truncated) | runtime retry | Fetch transaction again with full logs; v2 use Helius DAS for guaranteed event delivery |
| 5.10 | Two simultaneous `authorize_spend` for the same agent in same slot | on-chain | Both serialize through the agent pubkey; first wins; second may see updated state |

---

## Stage 6 — Venue execution (Jupiter Perps / Drift v2)

**Goal:** Venue CPI opens the position; runtime records the fill.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 6.1 | Venue program paused / halted | runtime | Tx fails; runtime captures error; user notified "venue paused" |
| 6.2 | Fill at much-worse price than quote (slippage > 100 bps) | runtime warn | Surface "slippage X bps" in audit row; v2 add `max_slippage_bps` to rule |
| 6.3 | Partial fill (got 80% of size) | runtime | Treat as full fill of the actual size; surface "partial fill" in audit row |
| 6.4 | Venue reverses a fill (clawback) | runtime | Reverse `record_pnl` call with original equity; v2 introduce negative-u64 extension or close-position event |
| 6.5 | PositionRequest created but never filled | runtime | Surface "stuck open position" warning; user closes manually |
| 6.6 | Oracle deviation (Pyth price vs venue mark > 1%) | runtime warn | Surface "stale oracle" banner; do not submit new intents until oracle refreshes |
| 6.7 | Funding payment due | runtime | Out of scope v1; funding payments tracked in v2 as a separate `record_funding` event |
| 6.8 | Auto-deleverage event on venue | out of scope v1 | Position auto-closed by venue; runtime reconciles on next `listPositions` |
| 6.9 | Liquidation imminent (mark price > liquidation price) | runtime warn | Surface "liquidation in X minutes" banner; offer one-click close |
| 6.10 | venue CPI in same tx as `authorize_spend` fails but the auth succeeded | runtime | Log both events; the kernel decision stands; the position did not open |

---

## Stage 7 — Position management

**Goal:** Webapp shows live open positions; user monitors drawdown.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 7.1 | Position marked open in runtime but venue says closed | runtime reconcile | Auto-correct; surface "position X closed externally" |
| 7.2 | Position size mismatch (runtime says 1.5 SOL, venue says 1.0 SOL) | runtime reconcile | Trust venue as authority; correct runtime record; surface "size drift" warning |
| 7.3 | Position on a vendor that was removed from whitelist | runtime | Position still exists (venue-side); user cannot open *new* positions there; surface "orphan position" |
| 7.4 | Multiple positions on the same market, same direction | runtime | Sum exposure; check against per-day cap |
| 7.5 | Position on a market where oracle is suspended | runtime warn | Surface "oracle suspended — close recommended" |
| 6 | Webapp polling interval too slow (1 min+) for fast moves | runtime | v1 polling at 2s; v2 use Helius DAS for sub-second |
| 7.7 | User has open position but policy is expired | on-chain | Position still exists; next `authorize_spend` fails `REASON_EXPIRED`; surface "policy expired, renew to close" |
| 7.8 | User wants to reduce position size (partial close) | out of scope v1 | v1 close = full close only; v2 add partial close |

---

## Stage 8 — Reconciliation

**Goal:** Match venue state against runtime state. Detect phantom
fills, missed fills, size drift.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 8.1 | RPC gap (didn't see a fill event) | runtime reconcile on next boot | Surface "X fills occurred while runtime was offline" |
| 8.2 | Phantom fill (replayed event) | runtime dedup by signature | Drop duplicates |
| 8.3 | Venue reverses a fill | runtime | Reverse record_pnl; v2 add reverse event |
| 8.4 | Venue halts and reopens with state reset | runtime warn | All positions gone; surface "venue state reset" |
| 8.5 | Wallet A on venue is closed externally | runtime | Position list returns empty; user notified |
| 8.6 | Position visible on two venues for the same market (cross-venue) | runtime | Treat as separate positions; sum exposure across |

---

## Stage 9 — P&L recording (`record_pnl`)

**Goal:** Update `peak_equity_usdc` monotonically so drawdown math
has a stable reference.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 9.1 | `new_equity` > `peak` | on-chain | Peak updates to `new_equity` (monotonic `max`) |
| 9.2 | `new_equity` == `peak` | on-chain | No state change |
| 9.3 | `new_equity` < `peak` | on-chain | Peak unchanged; drawdown check at next `authorize_spend` |
| 9.4 | `record_pnl(0)` | runtime warn | Treat as "fully drained"; reset peak (caution); kill-switch trips |
| 9.5 | `record_pnl` with negative equity | on-chain | Anchor rejects (u64 can't be negative); runtime must pass `max(0, equity)` |
| 9.6 | `record_pnl` called by non-owner key | on-chain | Rejected `Unauthorized` |
| 9.7 | `record_pnl` called twice in same slot with different values | on-chain | First wins; second overwrites (no sequence nonce yet) |
| 9.8 | `record_pnl` skipped (no equity update this slot) | runtime | Peak stale; drawdown check uses last good peak; surface "peak stale" if >5 min |
| 9.9 | `record_pnl` after kill-switch trips | on-chain | Allowed; updates peak; does *not* reset kill-switch state |
| 9.10 | Cross-venue equity (long Jupiter + short Drift) | out of scope v1 | v2: aggregate equity before `record_pnl` |

---

## Stage 10 — Kill-switch events

**Goal:** When drawdown exceeds threshold, deny all subsequent
`authorize_spend` calls until user takes action.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 10.1 | Kill-switch trips with open position (not auto-closed by us) | runtime warn | Surface "kill-switch active, position still open at venue"; user must close manually |
| 10.2 | Kill-switch trips repeatedly (oscillation) | on-chain | Each trip emits AuditEvent; runtime dedupes consecutive same-reason events |
| 10.3 | Equity recovers after kill-switch trips | on-chain | Kill-switch stays tripped until user calls `update_policy` (e.g. lower threshold or set to 0) |
| 10.4 | Kill-switch disabled (`kill_switch_drawdown_pct = 0`) | on-chain | No behavior; drawdown check skipped |
| 10.5 | Kill-switch at exactly threshold | on-chain | `(peak - now) * 100 <= peak * pct` ⇒ inclusive of equality; kill-switch *trips* at equality |
| 10.6 | Kill-switch trips mid-intent (intent in flight) | on-chain | Intent may already be on-chain; runtime cannot recall. Surface "intent landed before kill-switch" |
| 10.7 | Kill-switch trips when per-day cap not yet reset | on-chain | Day cap and kill-switch are independent; both must be passed |
| 10.8 | Kill-switch trips on a market that the user later removes from whitelist | on-chain | Kill-switch is policy-wide; removing market does not reset |
| 10.9 | `record_pnl` after kill-switch with new peak | on-chain | Peak updates; kill-switch stays tripped because drawdown is computed vs peak |
| 10.10 | User resets kill-switch by setting `kill_switch_drawdown_pct = 0` | runtime warning | "drawdown protection removed" |

---

## Stage 11 — Policy renewal / expiry

**Goal:** TTL expires; user must renew to keep trading.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 11.1 | TTL expires during open position | on-chain | Position still exists (venue-side); next `authorize_spend` fails `REASON_EXPIRED`; user can still call `record_pnl` and `update_policy` |
| 11.2 | TTL expires between intents (no harm) | on-chain | Next intent fails `REASON_EXPIRED` |
| 11.3 | User wants to extend TTL with open positions | on-chain | `update_policy(ttl_slots = Some(new_ttl))` extends; open positions unaffected |
| 11.4 | User wants to extend TTL with new vendors | runtime | Today: `replaceVendors` re-creates the policy; v1 limitation |
| 11.5 | TTL set to 0 | runtime | Reject; minimum TTL = 1 slot |
| 11.6 | User's clock / slot estimate drifts | runtime | Use Solana `Clock.slot`, not wall-clock |
| 11.7 | Policy expires and user forgets to renew | runtime | Webapp shows "policy expired" banner on every load until renewal |

---

## Stage 12 — Emergency / key management

**Goal:** Handle compromised keys, lost keys, external drains.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 12.1 | Owner key compromised → attacker calls `update_policy` to loosen every cap | **known gap (R14, queued D10+)** | Today: attacker wins. Mitigated by **tighten-timelock**: `update_policy` can only *tighten* (lower cap, raise kill-switch pct) within policy TTL |
| 12.2 | Owner key compromised → attacker rotates vendor to malicious program | **known gap (R15, queued D10+)** | Today: attacker wins. Mitigated by **CPI-wrapper or PDA-bound memo** so vendor is bound to the whitelisted pubkey at execution time |
| 12.3 | Owner key lost → no one can update policy | runtime | Funds stuck on-chain at the agent PDA; user must wait for key recovery (Ledger, etc.) |
| 12.4 | Owner key lost but agent wallet still has funds on venue side | runtime | User must import agent wallet into a new owner-controlled setup; vendor rotation blocked because policy is unreadable |
| 12.5 | Wallet drained externally (venue-side hack, not on-chain) | out of scope v1 | TOMB defends on-chain rules, not venue custody. If venue is hacked, TOMB has no recourse |
| 12.6 | RPC node returns wrong slot (re-org) | runtime | Re-fetch slot from 3 nodes; use median |
| 12.7 | Program upgrade attempted | out of scope v1 | Programs are immutable today; upgrade authority held by deployer (founder); v2 use multisig or timelock |

---

## Stage 13 — Multi-account / operator mode

**Goal:** Operator runs N agents with different rules. Each has
its own policy PDA.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 13.1 | Aggregate exposure across N agents exceeds operator's "true" cap | out of scope v1 | Each policy is independent; operator must set per-agent caps |
| 13.2 | Agent A's kill-switch trips while Agent B still active | on-chain | Independent; expected behavior |
| 13.3 | Operator wants to clone a rule template across N agents | runtime | Export policy as JSON; import to new agent; sign `create_policy` for each |
| 13.4 | Two agents use the same `owner` key | runtime | Allowed; same owner can manage N policies |
| 13.5 | Two agents use the same `agent` key | runtime | Reject; PDA collision at `[b"policy", agent]` |
| 13.6 | Operator wants to enforce a global kill-switch across all agents | out of scope v1 | v2: aggregate policy at a master PDA |
| 13.7 | One agent's webapp session leaks to another agent | runtime | Webapp scopes by agent pubkey; never cross-pols |

---

## Stage 14 — Audit / reporting

**Goal:** Every `AuditEvent` recorded on-chain, immutable; webapp
shows row per event; CSV export for tax filing.

### Edge cases

| # | Edge case | Handled by | Behavior |
|---|---|---|---|
| 14.1 | Audit log spans months (storage growth) | on-chain | Solana rent: ~0.00089 SOL per AuditEvent; v1 doesn't care, v2 archives to Arweave/IPFS |
| 14.2 | AuditEvent signature missing (RPC truncated) | runtime retry | Re-fetch transaction with `maxSupportedTransactionVersion: 0` |
| 14.3 | Cross-venue P&L not netted in reports | runtime | v1 reports per-venue; v2 add cross-venue netting |
| 14.4 | Audit log missing fill events (venue-side fills that didn't go through `authorize_spend`) | runtime reconcile | Surface "X fills occurred that bypassed the gate" — should be zero in normal operation |
| 14.5 | Tax-filing jurisdiction requires realized vs unrealized split | runtime | v1 surfaces both per AuditEvent; v2 add tax-export with FIFO/LIFO |
| 14.6 | User wants to verify receipt on Solscan | runtime | Each receipt row has the Solscan link; see [demo-receipts.md §"How judges verify"](demo-receipts.md) |

---

## How this maps to the wedge

The wedge is *"personal trader with on-chain rules."* That wedge
is *legible* only when you can answer these questions:

- **What happens if my owner key is stolen?** → Stage 12.1, 12.2 (today: attacker wins; D10+: tighten-timelock)
- **What happens if my position goes against me while I sleep?** → Stage 10 (kill-switch fires; I'm told at next check)
- **What happens if the venue goes down?** → Stage 6.1, 8.4 (runtime halts new submissions; existing positions stay at venue)
- **What happens if my algorithm sends garbage?** → Stage 3.6, 3.9 (runtime rejects; doesn't submit)
- **What happens if my policy is too loose?** → Stage 1.3, 1.4 (client validation; runtime warning)
- **What happens if I forget to renew?** → Stage 11.7 (banner on every load; renew anytime)

Each row in this doc is a ticket a tester would write in D11.
The catalog is what the founder should be able to walk a judge
through in the demo video without losing the thread.

---

## Updates

This doc is appended to whenever:
- A new edge case surfaces during D9 build (sdk / agent / webapp)
- A tester reports a bug during D11
- A new attack class emerges during the security model audit
- A D10+ hardening item resolves one of the gaps (R14/R15/R16)

Last updated: 2026-09-27 16:23 WIB (D9').