# PRD — Trade On My Behalf

Updated 2026-10-03. **Product requirements, not a claim that the target is implemented.**

## Product and scope

A focused Solana perpetual-trading terminal: connect a wallet, inspect a selected market chart, preview a trade against risk rules, submit through the supported execution path, and track positions and receipts.

Default market: **SOL-PERP**. Additional markets must be explicitly supported by the selected venue. No arbitrary token can be treated as a perpetual market merely because a spot chart exists.

**Network requirement:** all account creation, deposits, trading, policy changes and withdrawals in this product use **Solana devnet** and test assets. A local validator is permitted for isolated automated tests. Solana's separate public `testnet` cluster is not a substitute for a devnet venue. Mainnet is out of scope; a mainnet-derived reference-price feed is market data, not permission to submit a mainnet transaction.

Keep the existing name **Trade On My Behalf**. Trading-oriented branding uses the existing dark terminal language and clear typography. No unconfirmed alternate brand name is adopted.

## Current implementation versus target

| Area | Source-backed current state | Required target |
|---|---|---|
| Policy kernel | Anchor create, authorize, update and record-PnL instructions | Validated, devnet-deployed policy and execution boundary |
| SDK/runtime | Keypair-based SDK, local evaluator, CLI, authorize-then-paper-fill | Durable intent/order lifecycle with reconciliation |
| Venue | Jupiter paper adapter only; no Jupiter order is submitted | One independently verified devnet-compatible execution adapter |
| Webapp | Next.js wallet/policy/audit viewer, paper positions, owner policy editor; Phantom adapter configured; uncommitted work-in-progress adds a spot chart, a preview-only trade ticket and a quote route | One market terminal with chart, trade ticket, positions and receipts |
| Wallet identity | Dashboard derives policy from connected wallet; separate owner/agent lookup is unresolved | Explicit owner, agent and app-managed trading account |
| Chart and ticket | Not implemented | Source-labelled market chart and validated preview/submit flow |
| Safety | Gate checks caller-supplied authorization fields; it cannot constrain a separate venue call | Venue action bound to checked intent and app-controlled authority |
| Test evidence | Existing test source and historical local-demo report; no rerun in this documentation update | Recorded results tied to source revision, cluster and artifacts |
| Devnet/human demo | Treasury address not found in the read-only devnet observation; outside sessions NOT RUN | Deployment, public receipts and three actual outside-developer sessions |

Current behavior is described in [TRD.md](TRD.md). Deployment observation and venue-selection gate are in [docs/devnet-readiness.md](docs/devnet-readiness.md).

## Users and roles

- **Owner:** connects a wallet, configures policy, approves wallet signatures and manages the app-controlled account.
- **Agent/executor:** processes authorized intents; cannot edit the owner's policy.
- **Viewer/non-owner:** may inspect public policy/audit data but cannot sign owner-only changes or read another user's private paper ledger.
- Owner and agent can be distinct keys. Wallet connection is not proof that the wallet owns every policy or position shown.

## Requirements and acceptance

"Exists in the working tree" is source-verified presence, not delivery. Uncommitted, unbuilt or untested work stays below `Not implemented` in effect: it may be named as in progress, never counted as satisfied, and never used to soften the release gate.

| ID | Requirement | Acceptance condition | Current status |
|---|---|---|---|
| P01 | Devnet-only signing | Verify RPC genesis/network and deployed program identities before signatures; reject mainnet, mismatched RPC and non-executable programs | Not enforced end to end |
| P02 | Wallet/account identity | Distinguish disconnected, switched, owner, non-owner and agent; clear old previews/data on switch | Partial; separate-agent lookup missing |
| P03 | Chart and market selection | Default SOL-PERP; supported-market selector; timestamped data with source, timeframe and stale/unavailable state | In-progress unverified: spot chart with source/stale labelling exists in the working tree; no market selector, no timeframe, no committed or test evidence |
| P04 | Trade ticket | Validate side, collateral, leverage and supported market; show notional, quote asset, modeled costs, price source and freshness | In-progress unverified: preview-only ticket with validation and modelled cost exists in the working tree; no submit path, no committed or test evidence |
| P05 | Truthful policy verdict | Local preview is an estimate; only a verified committed AuditEvent is an on-chain decision; no human override of a denial | Gate exists; complete terminal flow missing |
| P06 | Bound execution | Denied, altered, replayed or unauthorized intents cannot open an app-managed venue position; approval alone never means filled | Missing |
| P07 | Budget and lifetime | Explain approved-collateral budget, used/remaining amount and slot-window reset; edits preserve usage; expiry is not silently renewed | Kernel behavior exists; visibility incomplete |
| P08 | Position management | Show correct account/market position; distinguish order states; provide supported cancel/reduce/close flows without increasing exposure | Paper CLI open/close only |
| P09 | Recovery and receipts | Separate policy, chain and venue outcomes; reconcile unknown status before retry; expose provenance and receipt completeness | Partial; durable reconciliation missing |
| P10 | Privacy, consent and test truth | Isolate paper ledgers; no server path/key disclosure; a policy may only be created with the named agent's own consent; separate planned tests from recorded results | Consent clause met: policy creation now requires the named agent's own signature (`create_policy.rs`:39) and is covered by regression tests. Shared demo route unresolved; evidence docs corrected |
| P11 | Accessible terminal design | Keyboard-operable forms and focus; readable chart/table alternatives; responsive layout; decision colors never imply a fill or profit | Partial: chart has an SVG role/label plus a data table alternative in the working tree; keyboard focus, responsive behavior and the unbuilt terminal remain unverified |
| P12 | Drawdown disclosure | Show unarmed/disabled/stale risk state; never describe supplied equity as verified venue equity | Soft check exists; verified equity missing |

## Budget semantics — do not call this a maximum-loss guarantee

- `amount_usdc` currently means **authorized collateral**, in six-decimal quote units.
- Per-trade and daily caps do not independently cap notional, fees, funding, realized PnL, old positions' losses or aggregate account exposure.
- Approved collateral consumes the budget. In the current two-step runtime, a subsequent paper/venue failure does not refund that authorization.
- The window is a lazy **216,000-slot interval** from `last_reset_slot`, approximately a day, not a midnight reset or exact rolling 24-hour lookback.
- Owner edits preserve spent amount, reset slot, peak and creation slot. Changing TTL does not renew the creation timestamp.
- Closures currently do not refund authorized spend. A target reduce-only operation must demonstrably reduce risk; it must not provide a hidden opening path.

## Core user journey

1. See explicit `Policy: devnet/local` and `Positions: paper` labels for today's implementation.
2. Connect wallet and select the actual agent/trading account.
3. Load the real policy, including absence, expiration, read failure and risk initialization.
4. Select a supported market and inspect timestamped reference data.
5. Draft a trade; refresh policy and executable estimate before confirmation.
6. Sign only the declared devnet operation. Paper fills remain clearly simulated, even when a policy signature is real.
7. Show policy verdict, transaction status and venue lifecycle separately.
8. Inspect scoped positions and receipts; reconcile uncertain submissions before retry or close.

## Explicit non-goals

Mainnet orders, real-money deposits, an invented Jupiter devnet venue, silent cross-venue fallback, profit guarantees, arbitrary-token perps, Telegram/chat control, paid signals, social/copy trading and autonomous AI strategy generation are not this release.

## Release gates

Do not label the app a functioning devnet perps terminal until P01–P12 are verified for the selected execution mode. If execution remains paper, release wording must remain **devnet policy demo with simulated positions**. A paper demo cannot pass the real-venue release gate.

[Unit testing](docs/unit-testing.md), [E2E testing](docs/e2e-testing.md), [testing status](docs/testing-plan.md) and [user sessions](docs/user-tests.md) define the evidence needed. Business framing, market context and the open founder questions are in [BRD.md](BRD.md); where the two disagree, this document wins.
