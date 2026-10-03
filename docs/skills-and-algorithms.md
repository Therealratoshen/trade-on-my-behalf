# Signals, Strategies and Runtime Scope

Updated 2026-10-03. Current product scope: [PRD](../PRD.md).

## Implemented versus proposed

Implemented: typed CLI signal input, market/side/size classification, optional clamping, diagnostic rule evaluation, policy authorization, paper execution and basic paper-equity reporting.

Not implemented: autonomous RSI/funding/news/LLM samplers, paid specialist skill marketplace, Helius-triggered strategy service, copy-trade relay, cross-venue routing or real venue orders.

## Responsibility boundary

Strategies may propose an intent, but do not set final policy verdict, bypass authority, invent risk data or convert a chart observation into a confirmed fill. Local clamping is convenience, not security.

The current gate checks supplied fields. Required custody-bound execution and verified risk are described in [TRD](../TRD.md); no “skill” or model prompt can replace that enforcement mechanism.

## Input requirements

Supported perp market and side, exact collateral/quote units, requested leverage, timestamp/source and rationale where applicable. Validate all numeric/schema/network/account inputs. Strategy text must never be interpreted as instructions to expose keys or ignore policy.

For this release, prioritize the user's chart/wallet/manual-ticket terminal and one verified devnet adapter. Further autonomous strategies require independent data-quality, replay/rate-limit, failure/recovery and exposure tests.
