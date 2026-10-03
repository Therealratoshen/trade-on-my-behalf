# Audit and Receipts — Provenance and Recovery Contract

Updated 2026-10-03. Current source uses program logs/RPC subscriptions and dashboard RPC polling, not a shipped Helius DAS audit index.

## Current event

`AuditEvent`: policy, agent, vendor, amount_usdc, approved, reason_code, nonce, at_slot. SDK adds signature and observation time.

It proves only the committed program decision about supplied authorization fields. It does not prove a venue order/fill, actual market/side/leverage, verified equity or an unbypassable execution path. Policy update/PnL events must be identified as administration, not trade approvals.

## Required receipt types

| Receipt | Minimum evidence |
|---|---|
| Policy decision | Cluster/program, policy, signature, committed slot/meta.err, validated event/verdict/reason |
| Paper simulation | Explicit simulated flag, paper position ID, source/time/reference price and modeled costs; no blockchain explorer fill link |
| Venue order | Verified devnet venue/account/market, execution signature/order ID, requested size, actual lifecycle |
| Venue fill/close | Filled quantity/fees, linked order/signature and reconciled account/position state |
| Human test | Privacy-safe tester ID, actual steps/policy/observations, signatures/slots where available, measured latency/reaction |

## Current gaps and required query behavior

SDK's one-shot log retrieval can fail after a committed authorization. Dashboard caches missing/error transactions as empty events, uses a bounded recent-signature scan and does not check `meta.err`. These are incomplete reads, not proof of “no decisions.”

Required: retry transient absence, verify transaction success/program identity, paginate/backfill, persist checkpoints, distinguish observed/submitted/confirmed/finalized and label completeness/last-refresh. Deduplicate by environment+signature+event index; nonce alone is insufficient.

## Privacy and latency

No keys, participant names/handles, signed secret URLs or filesystem state paths in public receipts. Measure broadcast-to-confirmation and confirmation-to-visible-audit separately; show actual measurement method and RPC commitment. Planned latency targets are not observations.

Public-devnet signatures remain **NOT CAPTURED** in [demo-receipts.md](demo-receipts.md); three sessions remain **NOT RUN** in [user-tests.md](user-tests.md). No x402/per-fill billing receiver or receipt-export integration is implemented.
