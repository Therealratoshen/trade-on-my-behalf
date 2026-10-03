# Control Surface — Current Viewer and Target Trading Terminal

Updated 2026-10-03. [PRD](../PRD.md) is authoritative for scope.

## Current UI

`apps/dashboard` is a read-mostly Next.js control surface with Phantom wallet connection, policy/audit RPC reads, a paper-position projection and owner-signed rule edits. It has no browser trade ticket, market chart, policy-creation form, real venue order lifecycle or implemented real order/cancel/close flow.

The connected wallet is currently used as the agent PDA seed; an owner with a different agent key cannot reliably select that policy. The positions endpoint reads shared server demo state rather than wallet-owned positions.

## Required single-terminal layout — not implemented

1. Header: product, **Solana Devnet**, policy/position modes, selected wallet, owner/agent/account and venue.
2. Primary workspace: supported market selector, default SOL-PERP, timeframe and timestamped source-labelled chart.
3. Ticket: side, exact collateral/quote token, leverage, implied notional, executable estimate and modeled/unmodeled costs.
4. Adjacent policy/risk view: fresh local estimate versus committed on-chain verdict, caps/remaining budget/reset, expiry and drawdown armed/stale state.
5. Positions/orders and receipts: scoped account, actual lifecycle and provenance; partial/unfilled only when backend data exists.

## State requirements

| Situation | Required behavior |
|---|---|
| Disconnected | Explain connect action; not “policy missing” |
| Wallet/account switched | Clear/re-key old data and pending preview; ignore stale responses |
| Non-owner | Read-only policy admin; no owner-only signing action |
| Missing/expired/unreadable policy | Separate states; no permissive defaults |
| Invalid network/program | Block before signature with network error |
| Stale market/risk data | Timestamp/warning; block new risk until required data is fresh |
| Signature rejected | Preserve draft; say nothing submitted only if proven |
| Submitted/unknown | Show signature and status; reconcile before retry |
| Policy denied | Show reason and confirmed decision; not transaction transport failure |
| Approved, subsequent venue failure | Show authorization and failure separately; budget may already be consumed |
| Paper position | Label simulated; no Jupiter execution or real-venue receipt claim |
| Audit read incomplete | Show last successful refresh/completeness, not “no decisions” |

No manual approve/deny override is added. An owner can request a trade and approve a wallet signature; that is not permission to override a kernel denial. Safe reduction/close must be backed by a supported risk-reducing execution path, not invented buttons.

## Design and verification

Maintain existing neutral/dark surfaces, green on-chain approval, red denial, amber clamping, and textual labels. A wallet connection, bullish candle or trade button is not “approved.” Charts need accessible numeric/table alternatives. Responsive behavior must keep the mode, account, cost and confirm controls visible.

[Design system](design-system.md), [E2E plan](e2e-testing.md) and [TRD](../TRD.md) define the implementation and acceptance obligations.
