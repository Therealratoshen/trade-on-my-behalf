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
| **Telegram bot runtime** | Holds the binding token (`HMAC(chat_id, pubkey, nonce)`). | Can lie to the user about what trades will happen. Cannot sign anything. Cannot trigger a trade. |

## Threat scenarios and the layer that defends

### 1. Malicious signal source

**Scenario.** A user subscribes to a paid signal stream via
AgentBazaar. The stream pushes a `Signal` that would breach the
user's rules (e.g. 50x leverage on SOL-PERP, far above the user's
3x cap).

**Defense.** The off-chain policy evaluator in
`packages/agent/src/evaluator.ts` clamps the intent to the user's
`maxLeverage` and `maxPositionUsd`. If clamping still leaves a
size > 0 and the signal exceeded `maxLeverage`, the runtime returns
`REASON_LEVERAGE_EXCEEDED` (D7) and emits an `AuditEventView(approved:
false)` without submitting a transaction. The signal source never
reaches the Anchor program. If somehow the off-chain check is
bypassed, the Anchor program itself would deny a venue tx whose
`vendor` isn't in the whitelist or whose size exceeds `per_tx_cap_usdc`.
The signal source has no signing authority and cannot bypass this.

**Residual risk.** The signal source can spam the user with false
rationales, or DoS the runtime. Mitigated by rate-limiting on the
runtime (D9) and by the Telegram bot's 60-second window.

### 2. Malicious venue

**Scenario.** Jupiter Perps (or a venue the user whitelisted) is
compromised. The user's runtime submits a position CPI, and the
venue program does something unexpected — overcharges, freezes the
funds, returns a different `venue_position_id` than reported.

**Defense.** The Anchor program *already* authorized the spend
before the venue CPI runs. If the venue misbehaves after the auth,
the on-chain `AuditEvent` is the proof that the spend was within
the user's rules. The user can present this to a refund/insurance
process (out of scope for v1) and the dashboard clearly shows the
venue tx signature alongside the audit event so the user can prove
what the venue actually did.

**Residual risk.** The user chose to whitelist the venue. Mitigation
in v1: the runtime's `quote()` returns `available: false` if the
venue's program logs show recent anomalies; in v2: an on-chain
venue reputation registry.

### 3. Malicious or compromised trader runtime

**Scenario.** The runtime process is compromised (e.g. an exploited
npm dependency). The attacker controls which `Signal` becomes a
`TradeIntent` and can submit transactions.

**Defense.** The runtime can submit transactions, but every
transaction must include `authorize_spend` as the first instruction
(or, for time-batched flows, the most recent `authorize_spend` must
cover the venue CPI). The Anchor program checks vendor, per-tx cap,
daily cap, TTL. The attacker can choose to *not* submit a trade, or
to submit a trade that complies with the user's rules. The attacker
*cannot* submit a trade that breaches the rules. The AuditEvent
stream is the forensic record — a runtime exploit shows up as
"approved events that match the user's stated intent," which is
indistinguishable from a non-compromised runtime.

**Residual risk.** The attacker can suppress a trade the user wanted.
Mitigation: the runtime is small, audited-by-construction (it just
calls the SDK + the Anchor program), and re-bootable from any state.

### 4. Compromised Telegram account

**Scenario.** An attacker gains control of the user's Telegram
account (SIM swap, stolen phone). They DM the bot `/status` and see
the user's recent activity. They tap *Approve* on the next DM and
the trade goes through.

**Defense.** The Telegram bot cannot trigger a trade. The DM
approval goes back to the runtime, which still has to call
`authorize_spend` and submit the venue CPI. The user chose to bind
this chat to the wallet; the binding is revocable via `/bind <new
pubkey>` from a session where the user signs a new challenge. If
the attacker has the user's phone, they probably have the user's
Telegram 2FA and could re-bind anyway — at that point the attacker
has effectively taken over the user's identity, which is a
fundamentally hard problem.

**Residual risk.** As above: identity takeover is hard. The bot
honestly says so on every `/start`: "anyone who can read this chat
can read your trade history."

### 5. Bug in the Anchor program itself

**Scenario.** A bug in `authorize_spend` lets an unauthorized spend
go through. This is the worst case.

**Defense.** The program is small, the logic is linear (no
arithmetic overflow on u64 thanks to `saturating_add`), and the
Tier 1 LiteSVM tests cover every `REASON_*` branch. CI runs them
on every push. The program IDL is reproducible. Before mainnet
deployment the founder does a personal review pass; v2 adds Trident
fuzz.

**Residual risk.** A bug that allows an off-chain-looking approve
to bypass the check. Mitigation: ship with a bug-bounty program
post-hackathon, even if $100.

## What anchors trust

Trust in this product flows from one fact: the Anchor program is
deterministic, open-source, compiled to a verifiable artifact, and
the only way a spend gets the user's signature is by passing the
program's checks. Every other layer is replaceable. The signal
source can be swapped, the venue can be swapped, the runtime can
be rebuilt, and the Telegram bot can be re-bound — but the program
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