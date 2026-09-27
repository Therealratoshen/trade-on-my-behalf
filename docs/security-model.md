# Security Model — Threat Model for the On-Chain Policy Gate

> Frozen for D6. The Anchor program is the only trust anchor in the
> stack; every other layer is "best effort" and degrades to "no
> trade" if compromised.

The product's safety claim is:

> "No rogue signal source, no exploited dependency, no compromised
> key wrapping can bypass the user's rules — because the rules are
> enforced at the wallet's signing layer by an Anchor program."

That claim is true *only* under the threat model below. If you read
this and think "wait, what about X?", that is a gap we want named.

## Trust anchors

| Anchor | What it anchors | Compromise cost |
|---|---|---|
| **Anchor treasury program** | Every rule evaluation. The only code that can move the wallet through `authorize_spend`. | Would require program upgrade + governance capture. Not realistic for a single hackathon project; mitigated by shipping the program as verified source + reproducible IDL. |
| **Solana runtime** | Transaction ordering, slot time, PDA derivation. | Out of scope; if Solana runtime is compromised, every Solana dapp is compromised. |
| **User's signer** | Holds the key that signs `create_policy`, `authorize_spend`, and venue CPIs. | Loss of key = loss of wallet. Standard. The product never sees the key. |
| **Webapp frontend (`apps/dashboard`)** | Holds the user's wallet connection (read-only; signing delegated to Phantom Connect / Trust Wallet). | Can display fake data to the user (e.g. hide an `AuditEvent` they should see). Cannot move funds, cannot trigger trades, cannot change rules (those require wallet-signed instructions). |

## Threat scenarios and the layer that defends

> The D9 SDK must answer for the four scenarios below. Each one
> names (a) the precise failure mode, (b) which layer of the program
> + SDK defends, and (c) what the next deliverable has to do for
> the defense to actually hold. The on-chain policy gate is the
> only thing in the stack the user trusts; everything else is
> "best effort" and degrades to "no trade" on failure.

### Scenario 1 — Theft / key exfiltration

**Failure mode.** An attacker holds the user's cold-wallet
keypair (`policy.owner`) — SIM-swap + hot-wallet compromise, or
physical device seizure. They can sign any instruction whose
authority is `owner`. They can **not** sign instructions whose
authority is anything else; the on-chain checks that follow are
unconditional on who the signer is *as long as* that signer is
the policy's recorded `owner`.

What the attacker **can** do, given the current
`programs/treasury/src/instructions/{authorize_spend,update_policy,record_pnl}.rs`:

- **`update_policy`** — raise every cap. Set `per_tx_cap_usdc`
  to `u64::MAX`. Set `per_day_cap_usdc` to `u64::MAX`. Raise
  `ttl_slots` arbitrarily. Raise `kill_switch_drawdown_pct` to
  100 (effectively disabling it). Raise `max_leverage_bps` to
  10_000 (100x). Then call `authorize_spend` and drain.
  `update_policy` requires only `owner` as signer and emits no
  guard against tightening *or* loosening.
- **`authorize_spend`** — after the fake update, drain in chunks
  ≤ `per_tx_cap_usdc`, against any vendor in `policy.vendors`,
  at any leverage ≤ `max_leverage_bps`, until the day counter
  trips `per_day_cap_usdc` (which they just raised). The
  per-tx, per-day, leverage, vendor, TTL, and drawdown gates
  all *fire* — they just fire at values the attacker chose.
- **`record_pnl`** — they can write `new_equity_usdc` upward to
  raise `peak_equity_usdc`. The monotonic `max(peak, new)`
  semantics mean a stolen key can raise the watermark but **not
  lower it**. Raising the peak raises the kill-switch floor, so
  this can only make the kill-switch trip *sooner* (a nuisance,
  not a loosening).

What the attacker **can NOT** do:

- Bypass the on-chain checks at the **current** policy values
  before raising them — those gates fire on the *as-stored*
  `per_tx_cap_usdc`, `per_day_cap_usdc`, `vendors`,
  `max_leverage_bps`, `ttl_slots`, and `kill_switch_drawdown_pct`.
- Reset `peak_equity_usdc` downward to fake "we never had the
  gains" — `record_pnl` is monotonic by construction.
- Bypass the policy check by going around the program — every
  venue CPI is a separate tx whose `authorize_spend` must cover
  it.
- Rotate `policy.vendors` — `update_policy` does **not** accept
  a vendor-list argument. The attacker cannot add a new
  drain-address by adding a fake program to the whitelist
  *unless* it was already in the v1 whitelist.

The honest answer: a stolen `owner` key beats every cap *as
soon as the attacker calls `update_policy`*. The caps defend
against a *constrained* attacker (e.g. a runtime exploit, a
rogue signal); they do **not** defend against a key thief.
This is the standard cold-wallet threat model and the product
never holds the key.

| Attack vector | Defense layer | Defense mechanism |
|---|---|---|
| Stolen `owner` key → raise caps, then drain | Anchor program | None at v1 — `update_policy` accepts loosening. Owner-only is the *only* gate. |
| Stolen `owner` key → drain within current caps | Anchor program | `authorize_spend` enforces `per_tx_cap_usdc`, `per_day_cap_usdc`, `vendors` whitelist, `max_leverage_bps`, `ttl_slots`, `kill_switch_drawdown_pct` against *as-stored* values. |
| Stolen `owner` key → reverse peak-equity watermark | Anchor program | `record_pnl` is monotonic (`peak = max(peak, new)`). Attacker can only raise, never lower. |
| Stolen `owner` key → add a drain vendor | Anchor program | `update_policy` does not expose `vendors`. Rotation requires a new `create_policy` (and so a new PDA / new agent). |

**What D# must do.** To make this scenario "honest" in v1, the
next deliverable must add a **policy-tighten timelock** to
`update_policy`: any change that *raises* a cap or *lengthens*
TTL must be queued for a delay window (e.g. 24h / 172_800
slots) before taking effect, during which a `cancel_update`
instruction lets the legitimate owner (or a guardian key) abort.
D10 (security hardening) is the natural slot. Without this,
the "anchored rules" claim degrades to "rules anchored *as long
as nobody steals the key*", which is true but un-defensible.

### Scenario 2 — Lost agent / runtime integrity failure

**Failure mode.** The runtime crashes mid-session
(process-killed, OOM, dropped network) **or** is compromised via
an npm supply-chain attack on a dependency in `packages/agent/`.
The runtime holds the *agent* keypair (`policy.agent`), not the
owner's.

What the runtime **can** do today:

- Sign `authorize_spend` and `record_pnl` with the agent key.
  Since D10 both instructions require the signer to be
  `policy.agent` or `policy.owner` (Anchor `constraint`, error
  `Unauthorized`).
- Choose which signals to act on; choose to skip trades
  silently; replay stale nonces (the program does **not** dedupe
  by `nonce`); sequence trades to *just* hit `per_day_cap_usdc`.
- Raise `peak_equity_usdc` via `record_pnl`. This only tightens
  the kill-switch, so it is safe to give the agent.
- Spend the agent's SOL on transaction fees (the agent key pays
  its own fees; fund it with a small amount only).

What the runtime **can NOT** do:

- Call `update_policy` — it requires `owner.key() == p.owner`.
  Tested: `agent key cannot loosen the policy via update_policy`.
- Bypass any of the six on-chain checks at their current policy
  values.
- Reuse an `authorize_spend` across more than one venue CPI
  in a way that exceeds `per_tx_cap_usdc` — each call
  individually gates on its own `amount_usdc`.

Specific stuck-state questions:

- **Is a stuck `authorize_spend` reopenable?** Yes, with
  caveats. There is no on-chain "pending" state — `authorize_spend`
  emits an `AuditEvent` (approved or denied) and returns `Ok(())`.
  A crashed runtime simply means no follow-up venue CPI is
  submitted; the user's `day_spent_usdc` was *not* incremented
  on the deny path, so the day's budget is intact. A new runtime
  can resume from any state because nothing is held in a
  half-open lock.
- **What about an open position?** The on-chain policy has no
  notion of an "open position". `policy` is a static rule set;
  the venue holds the position. If the runtime dies with an
  open venue position, the venue's own liquidation engine is
  the only thing that closes it. The runtime can be rebooted
  and the next `authorize_spend` will see the same caps
  (`day_spent_usdc` was incremented at entry); the position
  itself is invisible to the policy.

| Attack vector | Defense layer | Defense mechanism |
|---|---|---|
| Runtime exploit → submit policy-compliant trade | Anchor program | Every `authorize_spend` enforces vendor, per-tx, per-day, TTL, leverage, drawdown. Approved trades are *indistinguishable* from legit runtime output by design. |
| Runtime exploit → suppress a trade the user wanted | Anchor program / SDK | None on-chain — suppression is off-chain. Mitigated by an out-of-band heartbeat DM (D10 candidate) the user can disable. |
| Runtime crash mid-`authorize_spend` | Anchor program | None needed — the instruction is atomic; on crash no state is partially written. Day counter unchanged on deny. |
| Runtime crash with open venue position | Anchor program | None — the policy is stateless w.r.t. positions. The venue's own liquidation closes the position. Reboot of runtime resumes from same caps. |
| Compromised npm dep → submit two parallel venue CPIs from one `authorize_spend` | Anchor program | None at v1 — `authorize_spend` does not bind to a specific downstream CPI hash. Mitigated by the SDK constructing the venue CPI inline (D9 candidate). |

**What D# must do.** D9 SDK must guarantee that every
`authorize_spend` it submits is *immediately followed* by a
single venue CPI in the same transaction, so a compromised
runtime cannot reuse one authorization for two spends. This is
a SDK-side discipline — the on-chain program can't see the
"follow-through" — but it must be enforced by the SDK
construction path (`packages/agent/src/executor.ts`) so the
runtime never has the choice.

#### Fixed on D10 (2026-09-27)

Found while wiring the runtime to the program:

| Bug (before D10) | Impact | Fix | Test |
|---|---|---|---|
| `authorize_spend` accepted **any** signer | Anyone could call it on anyone's policy and burn the daily cap with approved spends — a free denial-of-service on the user's agent | Signer must be `policy.agent` or `policy.owner` | `rejects authorize_spend signed by a key that is neither agent nor owner` |
| `day_spent_usdc` never reset | The "per-day" cap was a lifetime cap; the agent would stop forever after one day's budget | Rolling reset when `slot - last_reset_slot >= 216_000` (~24h) | evaluator mirror test (a 216k-slot wait is impractical on localnet) |
| `record_pnl` was owner-only | The runtime (agent key) could not arm or raise the kill-switch without the user's key online | Agent or owner may call it; it can only tighten | `agent key can authorize_spend and record_pnl on its own policy` |
| SDK reported every `authorize_spend` as approved | A runtime built on it would have traded after on-chain denies | SDK decodes the AuditEvent from logs; throws if absent | `parseAuditEvents surfaces a deny even though the transaction succeeded` |

### Scenario 3 — Rogue signal source

**Failure mode.** A malicious webhook, RSS feed, copy-trade
influencer, or rogue specialist-skill output pushes an intent that
would breach the user's policy (50x leverage on SOL-PERP when
the cap is 3x, vendor X when the whitelist is Y, etc.). The
signal source has **no signing authority** — it can only emit
data that the runtime *chooses* to act on.

Where the policy is **explicitly** enforced:

- **Leverage cap** — `authorize_spend` compares
  `leverage_bps > p.max_leverage_bps` and emits
  `REASON_LEVERAGE_CAP`. The runtime surfaces this as a
  `RiskFlag` DM in D9.
- **Per-tx cap** — `amount_usdc > p.per_tx_cap_usdc` →
  `REASON_PER_TX_CAP`.
- **Per-day cap** — `day_spent_usdc.saturating_add(amount_usdc)
  > p.per_day_cap_usdc` → `REASON_DAILY_CAP`.
- **Vendor whitelist** — `!p.vendors.contains(&vendor)` →
  `REASON_VENDOR_DENIED` (note: this checks the *program id* of
  the venue, not the market — see Scenario 4 for the implication).
- **TTL** — `clock.slot - created_at_slot > ttl_slots` →
  `REASON_EXPIRED`.
- **Drawdown kill-switch** — `implied_current_equity_usdc <
  threshold` → `REASON_DRAWDOWN_KILLSWITCH`.

Where the policy is **only implicitly** enforced:

- **Signal validity** — the program does not check whether a
  `Signal` is well-formed, recent, or from a known source. A
  malicious signal can feed the runtime garbage; the runtime
  is responsible for ignoring it. The on-chain gate only fires
  on the *spend attempt* that follows.
- **Signal-stuffing DoS** — the runtime's rate-limiter (D9)
  is the only thing between a spam signal source and the user.
  The program has no notion of "rate of intent arrivals."
- **Adversarial rationale text** — a malicious signal can lie
  about *why* it's asking for the trade. The on-chain
  `AuditEvent` records `amount_usdc`, `vendor`, `reason_code`,
  and `nonce`, but **not** the signal's free-form payload. The
  forensic record is on what was attempted, not on what was
  claimed.

| Attack vector | Defense layer | Defense mechanism |
|---|---|---|
| Signal exceeds leverage cap | Anchor program | `leverage_bps > max_leverage_bps` → `REASON_LEVERAGE_CAP`. |
| Signal targets non-whitelisted vendor | Anchor program | `!vendors.contains(vendor)` → `REASON_VENDOR_DENIED`. |
| Signal exceeds per-tx or per-day cap | Anchor program | `amount_usdc > per_tx_cap_usdc` → `REASON_PER_TX_CAP`; daily cap via `saturating_add`. |
| Signal pushes drawdown past threshold | Anchor program | `implied_current_equity < peak * (1 - kill_pct)` → `REASON_DRAWDOWN_KILLSWITCH` (D8). |
| Signal lies about rationale | Off-chain only | The on-chain `AuditEvent` does not record the signal payload. Forensic record is on the spend attempt, not the claim. |
| Signal stuffs the runtime with garbage intents | Off-chain only | Rate-limiter on the runtime (D9). Program has no rate-of-arrival concept. |

**What D# must do.** D9 SDK must (1) refuse to forward any
signal payload that has *already* been denied off-chain —
i.e. the evaluator in `packages/agent/src/evaluator.ts` must
be the source of truth for "this intent would fail," not a
hint. (2) The risk-flag DM template must include the
**reason_code** the on-chain program would emit, not a
runtime-rewritten version, so the user sees a canonical rule
firing. Both are already specced at `docs/control-surface.md`
§"Approve / deny"; D9 closes the loop.

### Scenario 4 — Hostile venue / CPI to wrong program

> **v1 status (D10):** the shipped runtime runs Jupiter Perps in
> **paper mode** — it sends `authorize_spend` on-chain and then
> simulates the fill; no venue transaction exists. The
> follow-through gap below is therefore not exercised by the demo,
> but it is the first thing live mode must solve.

**Failure mode.** The user's runtime intends to CPI into
Jupiter Perps (`JupiterPerpsProgram1111...`). A compromised or
buggy routing layer (SDK adapter, npm dependency, RPC) returns
the program id of a *look-alike* program — same first/last
bytes, different middle — or of a wrapper that mimics the
venue's interface but routes funds elsewhere. The runtime
submits `authorize_spend` with `vendor = <fake program id>`
followed by the (now misdirected) venue CPI.

What the program does:

- `authorize_spend` checks `p.vendors.contains(&vendor)`. The
  `vendors` list is a `Vec<Pubkey>` populated at `create_policy`
  time. If the fake program id is **exactly** one of those
  Pubkeys, the check passes. If it differs by even one byte,
  it fails — `Pubkey` equality is a 32-byte equality check, not
  a prefix or suffix match.
- The check is at the *program-id* level, not the *market*
  level. A whitelisted Jupiter Perps program id approves
  *any* market on Jupiter, not just SOL-PERP. This is the
  BRD-review action item #3 ("per-market vendor resolution").

The honest gap:

> **The Anchor program does not CPI the venue. The SDK does.**
> `authorize_spend` returns `Ok(())` after emitting an
> `AuditEvent`; the *next* instruction in the transaction —
> the actual venue CPI — is constructed by the SDK in
> `packages/agent/src/executor.ts`. The program has no way to
> verify that the instruction immediately following
> `authorize_spend` actually targets the same `vendor` Pubkey
> it just authorized.

Concretely: the program can answer "is `vendor` in the
whitelist?" but cannot answer "did the next instruction
actually CPI to that vendor?" — because there is no CPI from
the policy program into the venue. The policy program is a
*gate*, not a *router*. This is the design choice (the
program holds no funds and is not in the fund-flow path), and
it is the load-bearing assumption of the whole architecture.

Defenses available in v1:

- **Pubkey equality is exact.** A look-alike with one byte
  flipped will not be in `vendors`. This stops naive typosquats
  but not a *deliberate* alias registered in the policy.
- **`amount_usdc` is what gets authorized, not what gets
  spent.** The runtime could authorize a 100 USDC trade and
  then call the venue with a different amount in the CPI —
  the program has no way to know. Mitigation: the SDK
  constructs the venue CPI from the *same* `amount_usdc` it
  passed to `authorize_spend`. D9 must enforce this in
  `executor.ts`.
- **No on-chain enforcement of "this CPI follows this
  authorization."** A runtime exploit can submit
  `authorize_spend` for vendor A and then CPI vendor B; the
  program emits an `AuditEvent` for vendor A and the user
  sees a clean trail that doesn't match what actually happened.

Proposed defense (D10+): a **CPI wrapper instruction** on
the treasury program — `treasury_cpi_to_vendor(vendor,
amount, ix_data)` — that the SDK calls *instead of* the
venue directly. The wrapper re-checks `vendors.contains(&vendor)`
and `amount_usdc <= per_tx_cap_usdc`, then issues a
program-signed CPI (`invoke_signed`) to the venue. The
program then becomes a *router*, not a gate, which is a
significant architectural change (it now sits in the
fund-flow path, holds no funds, but does observe the fund
flow). Alternative: **PDA-bound instruction** — the
`authorize_spend` emits an `AuditEvent` with a one-time
`auth_nonce`, and the venue CPI must include that nonce as a
memo; the venue's instruction parser rejects CPIs whose
memo doesn't match an `AuditEvent` from the policy. This
requires venue cooperation and is out of scope for v1.

| Attack vector | Defense layer | Defense mechanism |
|---|---|---|
| Routing layer swaps in a look-alike program id (one byte different) | Anchor program | `vendors.contains(&vendor)` is a 32-byte equality check. Look-alike fails the check. |
| Routing layer reuses the *exact* whitelisted program id but routes to a different market | Anchor program | **None at v1.** The check is at program-id level, not market level. (BRD action #3.) |
| Runtime CPI's vendor A after `authorize_spend` for vendor B | Anchor program | **None.** The program does not CPI the venue. Mitigation: SDK enforces single-CPI follow-through (D9). |
| SDK lies about the amount in the venue CPI vs the `authorize_spend` amount | Anchor program | **None.** The program never sees the venue CPI. Mitigation: SDK constructs CPI from same `amount_usdc` (D9). |
| Compromised runtime submits N venue CPIs after one `authorize_spend` | Anchor program | **None.** The program has no concept of "follow-through count." Mitigation: SDK wraps authorize + venue into one atomic tx (D9). |

**What D# must do.** Two-track answer: (1) **D9 SDK** must
*guarantee* that the transaction it submits contains exactly
two instructions — `authorize_spend` then the venue CPI, in
that order, with the same `vendor` and `amount_usdc` — and
must construct the venue CPI inline (no dynamic program-id
resolution at runtime, only the static `vendor` Pubkey from
the policy). (2) **D10+ on-chain** must introduce a
CPI-wrapper or PDA-bound memo so the program becomes the
*authoritative* enforcer of "follow-through," not the
optimistic enforcer it is today. Until (1) ships, the
v1 security claim degrades to "the on-chain gate *audits*
spends; the SDK *controls* whether the spend actually
happens at the right venue." That is honest, and it is what
the v1 demo should say.

## What anchors trust (revised)

Trust in this product flows from one fact: the Anchor program
is deterministic, open-source, compiled to a verifiable
artifact, and the only way a spend gets the user's signature
is by passing the program's checks *as currently stored in
the policy account*. The four scenarios above name the
limits of that claim explicitly:

- A **stolen owner key** beats every cap via `update_policy`
  until D# ships a tighten-timelock.
- A **compromised runtime** can submit any policy-compliant
  trade and can suppress policy-compliant trades; the on-chain
  audit log will not flag this.
- A **rogue signal** is fully bounded by the on-chain gates
  *if* the SDK forwards it; off-chain rate-limiting and
  signal-stuffing defenses are the only limits on the signal
  *layer*.
- A **hostile venue** is bounded by exact Pubkey matching at
  the *gate*, but the *follow-through* (that the venue CPI
  actually targets the authorized vendor) is a SDK
  responsibility until D# ships a CPI-wrapper or PDA-bound
  memo.

The program stays, and as long as it stays correct, the user's
rules stay enforced *for the threats it was designed to bound*.
For the threats above the program's design ceiling, the next
deliverables close the gap.

## What anchors trust

Trust in this product flows from one fact: the Anchor program is
deterministic, open-source, compiled to a verifiable artifact, and
the only way a spend gets the user's signature is by passing the
program's checks. Every other layer is replaceable. The signal
source can be swapped, the venue can be swapped, the runtime can
be rebuilt, and the user can reconnect their wallet to a fresh
webapp deploy — but the program
stays, and as long as it stays correct, the user's rules stay
enforced.

## What is *not* in the threat model

- **Oracle manipulation.** The venue's own oracle (Pyth etc.) is
  trusted. If Pyth reports a wrong price, the venue fills at the
  wrong price. The runtime records the `venue.markPrice` per fill
  but cannot second-guess the venue's oracle in v1.
- **MEV / sandwich.** v1 transactions are v1, which gives some
  headroom for atomic arb but does not change MEV dynamics. The
  runtime accepts that adversarial fills can be sandwiched on
  high-impact markets; v2 considers a private mempool integration
  (Helius Sender already supports this).
- **Regulatory risk.** A perps agent is not a regulated entity in
  v1. If the user's jurisdiction treats this as a money-services
  business, that is the user's problem, not the runtime's.