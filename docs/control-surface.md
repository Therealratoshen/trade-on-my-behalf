# Control Surface — Webapp

> **Pivot from Telegram bot to webapp.** D8.5+ (2026-09-27 14:51 WIB).
> Telegram bot was specified in D6; the founder revised the v1 control
> surface to a standard trading-webapp UX with Phantom Connect wallet
> auth. Telegram bot is **v3, never** (per founder chat, not v2 as
> previously scheduled). Phantom Connect is back to **v1** (was cut
> to v2).

The product's control surface is **a webapp**, not a chat bot and
not a CLI. The kernel still decides — there is no human approve/deny
button. The webapp is a **viewer + rule editor**, not an
action-requester. It reads from on-chain and shows the user what
the kernel decided.

## Why webapp, not chat

| Surface | Trade-off | Verdict |
|---|---|---|
| Telegram DM | Push-driven, 60s timeout, FOMO-pressure risk, requires TG account | **v3, never** |
| CLI | No UI; rules visible only in shell history | Internal tool, not user-facing |
| Webapp | Persistent dashboard, real audit log viewer, Phantom Connect for wallet auth | **v1 control surface** |

The founder persona *was* "doesn't want a dashboard, wants a ping."
That guess was wrong. The actual founder builds for users who want
the same UX as every other Solana trading webapp — wallet connect,
view policy, view audit log, view positions. **The kernel does the
work; the webapp shows the receipts.**

The wedge line still holds: *"I trade for you, and I cannot break
your rules."* The kernel doesn't care that the transport changed.

## What the webapp does (v1 scope)

Five panels:

1. **Connect wallet.** Phantom Connect button. Reads the user's wallet
   pubkey. Derives the `Policy` PDA at `[b"policy", wallet_pubkey]`.
   Reads the policy from chain.
2. **View policy.** Shows the active rules: `maxLeverage`,
   `maxPositionUsd`, `maxDailyLossUsd`, `killSwitchDrawdownPct`,
   `ttl_slots`, vendor whitelist. Read-only by default; edit
   controls available.
3. **View audit log.** Lists every `AuditEvent` for this policy:
   timestamp (slot → time), vendor, amount, approved/denied,
   reason code, nonce. Filterable by reason code, by approved/denied,
   by time range. Cursor-based pagination via `(policy, slot)`.
4. **View positions.** Calls each venue adapter's `listPositions()`
   and renders the union. PnL, leverage, notional, mark price,
   opened-at. Read-only — the venue adapter closes positions.
5. **Edit policy.** Form fields for the mutable policy parameters
   (`maxLeverage`, `maxPositionUsd`, `maxDailyLossUsd`,
   `killSwitchDrawdownPct`, `ttl_slots`). Submit triggers an
   `update_policy` instruction signed by the connected wallet.
   Includes a confirm modal showing the deltas before signing.

That's it. **No approve/deny buttons. No intent-push UI. No "tap to
skip" race.** The kernel decides; the webapp shows what it decided.

## What the webapp does NOT do

- **Does not push intents.** The runtime pushes intents to the
  kernel, not to the webapp. The webapp is a downstream viewer.
- **Does not hold signing keys.** Phantom Connect handles wallet
  signing for the `update_policy` instruction. The webapp never sees
  the user's private key.
- **Does not hold funds.** The agent's wallet (separate from the
  user's wallet) holds the USDC. The webapp displays balances but
  never custody them.
- **Does not do trade execution.** Trade execution is the venue
  adapter's job. The webapp has no `openPosition` button.

## Tech stack

- **Framework:** Next.js 15 (App Router) — already in
  `apps/dashboard/` (currently empty).
- **Wallet adapters:** Phantom Connect **or** Trust Wallet, via the
  Solana Wallet Adapter standard (`@solana/wallet-adapter-react`).
  Both expose the same interface, so adding Trust Wallet support is
  one import + one adapter entry. Trust Wallet is bundled with most
  mobile-Solana setups, so listing both means the demo works
  whether the judge uses a desktop browser extension or a phone.
- **Data sources:**
  - Solana RPC (`getProgramAccounts`, `getAccountInfo`) for the
    Policy PDA + on-demand transaction reads.
  - Helius DAS for indexed `AuditEvent` history (cursor-based,
    `(policy, slot)` keyset). Falls back to direct RPC if Helius
    unavailable.
  - Venue adapter `listPositions()` calls for open positions.
- **State:** Client-side React state + SWR for periodic refresh.
  No server-side state.
- **Deploy:** Vercel (matches the project's deploy target).

## Data flow

```
User connects Phantom wallet
        │
        ▼
Webapp reads Policy PDA at [b"policy", wallet_pubkey]
        │
        ▼
Webapp renders rules, audit log, positions
        │
        ▼
User edits rule → submit → update_policy instruction
                                     │
                                     ▼
                       Anchor program validates owner signature
                                     │
                                     ▼
                       Policy PDA mutated; AuditEvent emitted
                                     │
                                     ▼
                       Webapp SWR refresh picks up the new event
```

For the trade flow (not initiated by the user):

```
Signal source (RSI webhook, copy-trade, manual CLI)
        │
        ▼
Runtime builds TradeIntent, calls authorize_spend
        │
        ▼
Anchor program checks rules → APPROVE or DENY → AuditEvent
        │
                                     │
                                     ▼
       (if approve) Venue adapter opens position
                                     │
                                     ▼
       Fill event lands → AuditEvent → runtime updates P&L ledger
                                     │
                                     ▼
       Webapp picks up new AuditEvent + position via SWR refresh
```

The user **never** has to push a button for a trade to fire.
The user **does** push a button to change rules.

## Security model

- The webapp is **read-mostly**. Every write action (`update_policy`)
  triggers a Phantom Connect signature. No server-side key. No
  custodial role.
- The webapp never sees the agent's wallet (the wallet that holds
  USDC and signs venue CPIs). The user only sees the policy PDA
  state and the audit log.
- An attacker who compromises the webapp cannot move funds or
  change rules — they can display fake data, but the chain is the
  truth.
- The webapp's Helius API key (read-only) is the only secret it
  holds. Compromising it lets an attacker fake the audit log
  display, but the on-chain state is unaffected.

## What's deferred

| Feature | Status |
|---|---|
| Telegram bot | **v3, never** (per founder call) |
| Discord / Slack bot | v3, never |
| Mobile app | v3, never |
| Email digest of audit events | v2 |
| Push notification on deny | v2 |
| Multi-policy view (prop-firm: per-strategy) | v2 |

## D11 test rubric implications

The D11 testers will evaluate the webapp UX, not the kernel. Three
specific things to verify:

1. **Connect wallet** — Phantom Connect flow works on devnet.
2. **View audit log** — AuditEvents appear within ~2s of a CLI
   push to the runtime (SWR refresh interval).
3. **Edit policy + see effect** — Submitting a new rule, then
   pushing an intent that violates the new rule, shows the deny
   in the audit log with the new threshold.

If any of those three things don't work, the v1 control surface
isn't ready.

## What needs to change in other docs

The following docs reference Telegram and need a one-pass update
to match this webapp-first model:

| File | Currently says | Action |
|---|---|---|
| `design-thinking/README.md` | "Telegram DM as control surface" | rewrite to webapp-first |
| `design-thinking/pitch-script.md` | slide 4: "TG DM. 60s. Approve." | rewrite |
| `design-thinking/five-stages.md` | 60s TG timeout risk | drop (risk gone) |
| `docs/agent-runtime.md` | Telegram references throughout | sweep |
| `docs/security-model.md` | Scenario 4 (Telegram compromise) | rewrite to webapp-compromise |
| `PM-LOG.md` §4 Q3 | "Telegram control surface — open-source bot vs AgentBazaar" | rewrite as webapp question |

## Pitch line update

> *"The kernel decides. The webapp shows you what it decided. No
> approve button — the rule fires anyway."*

This replaces the previous TG-DM framing and is sharper: it
emphasizes that the kernel's authority does not depend on the
user's attention. The user can be asleep, offline, or doing
something else. The rule fires.
