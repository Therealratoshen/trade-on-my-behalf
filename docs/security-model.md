# Security Model — Actual Gate and Required Execution Boundary

Updated 2026-10-03. Static source review plus the dated read-only checks in [devnet readiness](devnet-readiness.md); no penetration test, deployment or live trade was performed.

## Accurate current claim

**The Treasury program checks and records an authorization request against stored policy fields. The current runtime respects that decision before a simulated fill. It does not prove that all venue transactions obey those fields.**

Do not use "physically cannot break your rules," "wallet signing-layer enforcement," or "every trade is unbypassable" for this implementation. [TRD](../TRD.md) states the authority binding required for that stronger claim.

## Execution binding — implemented, and the limit it does not cross

Updated 2026-10-04. The gap this closes was real: `authorize_spend` emits an `AuditEvent`
carrying a `nonce`, and before this change **nothing consumed it**. The runtime gated the venue
call on the in-memory boolean `audit.approved`, so a different process, a mutated intent or a
replayed approval could reach the venue unchecked.

**What is implemented now.** The runtime mints a `SpendPermit` from each approved `AuditEvent`
(`packages/agent/src/venue/permit.ts`) and `Venue.openPosition` requires it. The venue adapter
recomputes the binding itself before touching any state, and refuses with a `PermitError` on a
missing or hand-built permit, on any field mismatch (vendor, collateral, leverage, market,
side), and on a nonce already spent in this process. The permit is frozen, carries the
`authorize_spend` signature and slot, and a rejected order leaves both the paper account and
the unspent permit unchanged. The permit is present on the `TradeReceipt` and printed by the
CLI.

**The claim this supports:** *the runtime will not execute what it did not approve.*

**The claim this does NOT support:** *on-chain, an unapproved execution is impossible.*
That remains false, for concrete reasons:

1. **The chain does not know a permit exists.** `authorize_spend` is unchanged: it neither
   consumes the nonce nor stores a permit. `AuditEvent.nonce` is still a caller-supplied `u64`
   that is logged and never checked, exactly as before.
2. **The chain's approval covers less than the permit checks.** `AuditEvent` echoes `vendor`
   and `amount_usdc` only. The program is never passed `market` or `side`, so those two
   permit fields are bound to what the runtime *recorded* having sent, not to a chain decision.
   `leverage_bps` is genuinely enforced on chain against the cap, but the permit proves the
   fill matches the value submitted — the event does not echo it back.
3. **The enforcement is code in this repository.** The permit's issuer marker is an identity
   check, not a signature. A process that skips `authorize_spend` and builds its own permit
   object can still open a position. This defends against substitution and replay *within* the
   runtime, not against a runtime replacement.
4. **Replay protection does not survive a restart.** Consumed nonces are an in-memory set, so
   a process restart re-opens the replay window. An on-chain permit account is required to close
   that.
5. **The venue cannot enforce anything.** `JupiterPerpsPaperVenue` is a local simulation, and a
   live venue enforces its own rules on its own accounts regardless of this process.

**Recorded follow-up (not implemented).** Make the binding a chain property: have
`authorize_spend` mint an on-chain permit keyed by the policy PDA, carrying the approved
vendor/amount/leverage plus the market and side the order needs, and have the execution path
consume that permit exactly once. `Policy` has no spare field for a consumed-nonce set and
`vendors` is fixed at `create_policy`, so this needs a new `Permit` account rather than a field
on `Policy`, and a new `REASON_*` code if a denial is to stay on the ladder. It must not add
custody, transfers or CPI. Until that ships, treat the row above as the ceiling.

## Threat and limitation ledger

| Risk | Source-backed current behavior | Required mitigation / acceptance |
|---|---|---|
| Compromised agent/executor | Cannot update owner policy. Execution is now bound to the approval **by a `SpendPermit`** that the venue verifies, but that binding is off-chain and lives in this repository's code | On-chain spend permit / venue authority so the binding is a chain property, not a code property; direct bypass and parameter substitution tests fail |
| Vendor/size/market substitution | The permit binds vendor and collateral to the values the chain decided, and binds market/side/leverage to what the runtime submitted — but off-chain. A process that skips the runtime is still unbound | Bind exact intent and validated venue accounts on chain; enforce controlled authority |
| Denial followed by venue instruction | Policy denial returns `Ok`; unrelated later instruction could run | Wrapper must skip/reject venue action on denial; transaction success is not approval |
| Stolen owner key | Owner can loosen caps, disable drawdown and update TTL | Explicit owner compromise limitation; evaluate timelock/multisig/revocation; not implemented |
| Fabricated equity | Overreported current equity bypasses drawdown; supplied peak can be inflated | Verify venue state/oracles; fail closed for new risk on unavailable data |
| Uninitialized risk | Peak is zero at creation; advertised SDK initial peak is not applied | Explicit unarmed state and verified initialization before claiming drawdown safety |
| Replay / crash / ambiguous RPC | Nonce still only logged **on chain**; off-chain the permit makes a nonce single-use within the process, which does not survive a restart. SDK can throw after authorization committed | On-chain nonce consumption in a permit account; durable intent journal and consumed-intent state; reconcile before fresh signature |
| Budget misunderstanding | Approved collateral counted, even if subsequent venue step fails | Clear budget semantics; do not promise a daily loss ceiling or automatic refund |
| Arithmetic overflow | Saturating addition may approve overflow at max cap | Checked arithmetic and adversarial maximum-value tests |
| Paper data leakage/lost writes | Shared unauthenticated demo state; non-atomic file writes and async races | Account isolation, no filesystem disclosure, validated atomic transactional storage |
| Wrong cluster/program | Writes now gated on `getGenesisHash` (SDK + dashboard); deployed program identity and upgrade authority still unverified | Verify genesis/program/mint/market before signature, reject mismatch |
| False receipt completeness | Missing transactions cached empty; bounded scans; failed logs unchecked | Retry/backfill/check meta.err; show verified completeness and provenance |
| False venue fidelity | Paper omits liquidation/funding and uses spot reference with simplified fees | Explicit simulation limits; live risk/fees from selected venue, not paper formulas |

## Cluster identity — what is enforced, and what is not

**Enforced.** The SDK gates every wallet write (`ensurePolicy`, `authorizeSpend`, `recordPnl`, `updatePolicy`) and the dashboard's own `updatePolicy` path on the node's `getGenesisHash`. Anything that is not Solana devnet is refused. A local validator is permitted only when the caller passes `allowLocalValidator` (`--local-validator` on the `tomb` CLI), and only on a loopback host whose genesis is not one of the three public clusters — so a mainnet node proxied onto `127.0.0.1` is still refused. See `packages/sdk/src/registration.ts` and `packages/sdk/tests/registration.test.ts`.

The comparison is `startsWith`, not `===`, and the reason is worth stating because the reverse is a silent failure: the shortened Wallet Standard chain id `EtWTRABZaYq6iMfeYKouRu166VU2xqa1` is a **prefix** of the full 44-char RPC value `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`. An exact comparison against the full hash would reject devnet; an exact comparison against the short id would never match a real node. A guard written that way looks present and never fires.

**Not enforced, and the exposure that remains.** The guard proves *which cluster* is being written to. It does not prove *what* is being written:

- **The program address is not verified on the far side.** The guard confirms the endpoint is devnet; it does not confirm that devnet has the treasury program deployed, or that the deployed binary matches this source. A devnet RPC proxying a different program at the same address would pass. Verifying the on-chain program account's executable status and upgrade authority against a known value is still open.
- **A malicious or compromised RPC can lie.** `getGenesisHash` is answered by the node the SDK is configured to trust. An RPC that reports devnet while relaying to mainnet defeats this check entirely. Only an independent second data source (a different provider, or a client-side check) would raise the bar; nothing here does that.
- **Read paths are ungated.** Only writes are checked. A misconfigured endpoint will show a viewer real-looking mainnet state for the same address with no error.
- **The dashboard's `CLUSTER` is still a build-time label.** `NEXT_PUBLIC_CLUSTER` selects the endpoint at build time and is what the explorer links are built from. The write guard does not read it, so a `mainnet-beta` build now fails at the write rather than silently signing — but a bad build still looks correct until someone clicks save.

## Custody and scope of any future guarantee

A wrapper or PDA is useful only when the venue account authority actually requires it. An executor key with independent venue trading permission can still bypass a preflight or memo. Verify the venue's delegation/CPI/account-ownership model.

The guarantee can cover **app-managed custody/positions**, never every transaction in the owner's external wallet. Venue program upgrades, oracle risk, chain/RPC availability and owner's administrative authority remain explicit trust boundaries.

## Outcome integrity

Store and display policy decision, chain submission/commitment and venue lifecycle independently. Failed transactions may include logs but do not commit their state; do not index them as successful debits. A denied successful authorization adds no spend within the window; a reset may occur before denial. A current approved authorization remains counted when the subsequent paper venue throws.

## Verification priorities

[Unit cases U01–U28](unit-testing.md) and [E2E cases E01–E21](e2e-testing.md) include bypass, precision, replay, equity trust, concurrency, privacy and recovery. Missing tests or missing execution mechanisms are blockers, not successful security proof.

Never publish private keys, secret RPC credentials, participant PII or raw local paths. The historical local demo and three planned human sessions are different forms of evidence; neither is a verified real-devnet venue test today.
