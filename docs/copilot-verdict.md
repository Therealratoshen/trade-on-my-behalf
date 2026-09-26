# Copilot Deep Dive Verdict — D2 (HISTORICAL — superseded by D3' pivot)

> **READ ME FIRST.** This document is the **D2** research verdict
> captured on 2026-09-26. It described the **pre-pivot** idea
> (*"open-source policy SDK + Web2 bridge via Litecoin"*) and
> the cluster map that supported it.
>
> **It was superseded on D3' (same day, 16:07 PT) by the pivot
> to "Trade On My Behalf" (perps agent + on-chain policy gate,
> Solana-only).** See [`SPEC.md`](../SPEC.md) §"Pivot effective
> Sep 26 16:07 PT" and [`PM-LOG.md`](../PM-LOG.md) decision #2
> ("Drop LTC bridge").
>
> **Every reference to LTC, USDC→LTC bridge, Web2-via-LTC-pay,
> and SideShift/Trocador/ChangeNow in this file refers to the
> abandoned pre-pivot idea.** None of it is forward-looking.
> The D2 text is preserved *only* as the audit trail that
> explains why D3' happened.
>
> Do not act on this document. Use `SPEC.md` and `PM-LOG.md`
> as the source of truth.

---

## Original D2 input (preserved for the audit trail)

> Generated Sat Sep 26 2026 via Colosseum Copilot PAT authenticated
> against `https://copilot.colosseum.com/api/v1` (scope:
> `colosseum_copilot:read`, expires 2026-12-25).

## Prompt (verbatim, as run)

> Vet this idea: an on-on-chain spending-policy engine for AI agent wallets on
> Solana (per-vendor limits, per-category caps, time-bounded budgets, audit log,
> anomaly detection), with an opt-in Web2 bridge that converts USDC to Litecoin
> to pay non-x402 endpoints. Single-person team, first Solana hackathon, deadline
> Oct 12, 2026.

> **Note:** the prompt above is the *pre-pivot* input. The LTC bridge
> half of this verdict was *not* the source of the surviving decision;
> D3' replaced the entire wedge with the perps-agent + on-chain-policy-
> gate story. The cluster map below is still useful historical context
> for *why* the pivot happened (it proved the pre-pivot idea sat in a
> crowded cluster: v1-c14, 325 projects). What it did *not* prove was
> the post-pivot story; that verdict landed on D5.

## Verdict: PIVOT — narrow the wedge or change the surface

The direct thesis ("on-chain spending-policy engine for AI agent wallets") is
**PARTIAL — Cluster (v1-c14 "Solana AI Agent Infrastructure", crowdedness 325)**.

### Closest incumbents (named, with evidence floors met)

| Project (slug) | Hackathon | Track prize | What they shipped | Limit they left |
| --- | --- | --- | --- | --- |
| **mercantill** | cypherpunk 2025-09 | 4th-Stablecoins $10K | "Agent banking infrastructure: policy-based spending safeguards, multi-sig team controls, verifiable audit logging." Uses Squads Grid for multisig. | No LTC bridge; enterprise-focused; not a per-developer SDK. |
| **MCPay** | cypherpunk 2025-09 | 1st-Stablecoins $25K + C4 accelerator | "Monetize MCP tools via HTTP 402 micro-payments, x402 on Solana." Single-person team (microchipgnu). | No policy engine — budget management delegated to the developer in code. |
| **CORBITS.DEV** | cypherpunk 2025-09 | 2nd-Infrastructure $20K | "API reverse proxy for x402 + merchant revops dashboard." | Has a dashboard, but no SDK / no webhook / no enforcement layer. |
| **Armor Wallet** | breakout 2025-04 | Honorable Mention - AI | "AI-powered crypto wallet, autonomous agents, multi-chain trading." | Trading wallet, not a policy engine for agent wallets. |

### Cluster density

- v1-c14 "Solana AI Agent Infrastructure": **325 projects** (densest cluster).
- v1-c22 "AI-Powered Solana DeFi Assistants": 270.
- v1-c16 "Stablecoin Payment Rails and Infrastructure": 202.

A search for "agent spending policy budget limits audit AI wallet" returns 11
matches with low (0.04–0.09) similarity scores, meaning the policy-engine
sub-vertical inside v1-c14 is sparse, but the broader cluster is not.

### Why a direct build is risky

1. **Mercantill already exists.** 4th place Stablecoins at Cypherpunk means the
   judges saw the thesis already. A new project would have to explicitly beat
   it on UX, price, or scope within 17 days — hard for a first-time Solana
   builder.
2. **Cluster v1-c14 is the most crowded.** Judges see 325 entries in it. A
   "policy engine" alone will land as "another AI agent wallet."
3. **Open-source / composability criterion (5/6 weight):** Mercantill uses
   Squads Grid. Anything I build that doesn't extend a *different*
   primitive risks looking redundant.

### What was genuinely open (Full gap opportunities inside Partial gap)

These four sub-gaps were the surviving candidate inputs to the
*post-pivot* wedge. **All four landed in the D3''' product spec.**
Listed here only to keep the audit trail.

| Sub-gap | Status | Why it's the wedge |
| --- | --- | --- |
| Per-developer SDK (not enterprise dashboard) | Partial - Segment | Mercantill targets enterprises. A drop-in `npm i` for indie devs/MCP server authors is the empty seat. |
| Web2 bridge via Litecoin rail | Full | Only "BlindPay" (Renaissance) and ~5 no-prize ideas have touched it. No project ships USDC→LTC→Web2 endpoint. |
| Anomaly detection / risk scoring on-chain | Full | No project in v1-c14 ships ML-driven anomaly flagging. Closest is Mercantill's "verifiable audit logging" (off-chain). |
| Composability with MCPay/Latinum (open-source) | Full | All incumbents are closed-source; an *open* SDK that integrates with MCPay + Latinum + CORBITS is a wedge on the composability criterion. |

## Recommended pivot for D3 (pre-D3')

**Keep the policy engine; narrow the wedge and lean on composition.**
The D3' pivot replaced this whole section with the perps-agent story.
The four sub-gaps above drove that pivot:

> The D3' project that emerged — **"Trade On My Behalf"**, a perps agent
> with on-chain policy gates — is the surviving shape. The "open-source
> SDK that integrates with MCPay + Latinum + CORBITS" became the kernel.
> The "anomaly detection / risk scoring on-chain" became the on-chain
> AuditEvent + drawdown kill-switch (D7/D8). The "Web2 bridge via
> Litecoin" was *killed* — see PM-LOG decision #2 — because forced
> integration is a common loss-pattern and LTC isn't a funded track.

## Original D3 spec draft (also pre-pivot, killed by D3')

> Build an open-source SDK + Anchor program that lets any agent
> wallet opt in to programmable, on-chain-enforced spending rules:
> vendor whitelists, per-tx caps, per-day budgets, time-bounded
> limits, and a public `RiskFlag` event stream. Adds the LTC
> bridge as the only Web2 endpoint in this category.
>
> **(The bridge half is dead. The kernel half survives.)**

**Four non-negotiable differentiators (pre-D3'):**

1. **Open-source from day 7.** Mercantill, MCPay, CORBITS are public GitHub
   repos; we ship under MIT, with a programmatic adapter for MCPay, Latinum, and
   CORBITS. *(still true post-pivot)*
2. **Drop-in SDK, not a dashboard.** `treasury.authorize(...)` /
   `treasury.spend(...)` / `treasury.audit()` — five lines of code. *(renamed
   to `withTrader(wallet, rules).execute(intent)` post-pivot)*
3. **USDC → LTC Web2 bridge.** Off-ramp to LTC for non-x402 endpoints. This is
   the only Web2-bridge use of LTC inside v1-c14. Triple use of LTC: (a)
   funding source, (b) settlement rail, (c) micropayment denomination for
   Web2-via-LTC-pay providers. **(KILLED at D3'.)**
4. **On-chain anomaly events** (not off-chain logs). Every over-limit or
   anomaly-flagged spend emits a `RiskFlag` event with a risk score.
   Off-chain indexer reads events. *(still true post-pivot; landed
   in D7's AuditEvent + D8's drawdown kill-switch.)*

### What we are NOT doing (cuts)

- Enterprise dashboard UI. Use Mercantill if you need that. *(still true)*
- Our own payment rail. We compose with MCPay/Latinum/CORBITS. *(still true;
  perps venues too)*
- KYC/AML features. Out of scope. *(still true)*
- Agent identity / reputation. Composes with AgentBazaar only. *(still true)*
- LTC bridge. **(EXPLICITLY KILLED at D3'. Decision #2 in PM-LOG.md.)**

## Decision gate answer at D2: PROCEED with the pivot

| Copilot result        | Action taken                            |
| --------------------- | --------------------------------------- |
| Confirms Partial-Seg | Lock the pivot. Update SPEC for D3.     |
| Cluster risks        | Documented above; weekly updates mitigate. |
| Genuine open sub-gaps | 4 named above; SDK + LTC + anomaly + open-source. |

## Evidence floors satisfied (at D2)

- Builder project data: 4 direct predecessors named with slugs, prizes,
  hackathons, tags.
- Archive / market signal: cluster density from `/filters`, prize placement
  proves judge validation.
- Landscape: lightweight web check deferred; will run on D8 when picking the
  LTC bridge provider. **(N/A after D3'.)**

## Source citations

> (preserved verbatim for traceability, but only the cluster-density
> evidence — not the LTC bridge claim — informed the post-pivot D3' wedge.)

- mercantill: https://colosseum.com/projects/explore/mercantill
- MCPay: https://colosseum.com/projects/explore/mcpay
- CORBITS.DEV: https://colosseum.com/projects/explore/corbits.dev
- Armor Wallet: https://colosseum.com/projects/explore/armor-wallet
- Colosseum cluster v1-c14 density: Copilot `/filters` endpoint.

---
D2 verdict preserved at this path. **For post-pivot evidence,
read `SPEC.md` §"Perps-agent deep dive (D5 — DONE)".
For the LTC kill, read `PM-LOG.md` decision #2.**
