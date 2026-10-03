# SDK API — `@trade-on-my-behalf/sdk`

> Updated 2026-09-27 (D10) to match the shipped code in `packages/sdk/src/`.
> The earlier D6 sketch (a `@solana/kit`-based `TradeAPI.execute()`) was never
> built; this page describes what exists.

The SDK is a thin, typed wrapper over the Anchor `treasury` program. It
hides IDL loading, PDA derivation, USD ⇄ USDC-micro conversion, and
AuditEvent decoding. It does **not** talk to any venue — that is the
agent runtime's job (`packages/agent`, see [agent-runtime.md](agent-runtime.md)).

Built on `@coral-xyz/anchor` 0.31 and `@solana/web3.js` 1.x.

## Two keys, two handles

| Key | Who holds it | What it signs |
|---|---|---|
| **Owner** | The user's wallet | `create_policy`, `update_policy` (and may also sign the agent's calls) |
| **Agent** | A hot key on the runtime host | `authorize_spend` for every trade, `record_pnl` after fills |

The policy PDA is keyed by the agent pubkey (`seeds = ["policy", agent]`),
so both handles point at the same account:

```ts
import { Connection } from '@solana/web3.js';
import { withTrader, reasonCodeName } from '@trade-on-my-behalf/sdk';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const JUPITER_PERPS = new PublicKey('PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu');

// Owner, once.
const owner = withTrader({ connection, wallet: ownerKeypair, policy: agentKeypair.publicKey });
await owner.ensurePolicy({
  agent: agentKeypair.publicKey,
  vendors: [JUPITER_PERPS],
  perTxCapUsd: 50,
  perDaySpendBudgetUsd: 150,
  maxLeverageBps: 500,        // 5x
  killSwitchDrawdownPct: 25,  // percent (1..=100), NOT bps
});

// Agent, per trade.
const agent = withTrader({ connection, wallet: agentKeypair, policy: agentKeypair.publicKey });
const { audit, signature } = await agent.authorizeSpend({
  agent: agentKeypair.publicKey,
  vendor: JUPITER_PERPS,
  amountUsd: 40,
  leverageBps: 300,
  impliedCurrentEquityUsd: 1000,
});
if (!audit.approved) console.log(`denied: ${reasonCodeName(audit.reasonCode)}`);
```

## `withTrader(opts)` → handle

| Option | Type | Notes |
|---|---|---|
| `connection` | `Connection` | |
| `wallet` | `Keypair` | Signs and pays fees. Owner for admin, agent for trades. |
| `policy` | `PublicKey` | The **agent** pubkey (PDA seed). |
| `commitment` | `Commitment` | Default `'confirmed'`. Used for both preflight and confirmation. |

| Method | Signer must be | Returns |
|---|---|---|
| `ensurePolicy(input)` | owner | `{ signature, createdNew }`. No-op if the PDA exists. |
| `authorizeSpend(input)` | agent or owner | `{ signature, audit }` — see below. |
| `recordPnl({ agent, newEquityUsd })` | agent or owner | `{ signature }`. Raises `peak_equity_usdc` if higher. |
| `updatePolicy(input)` | owner | `{ signature }`. Only the fields you pass change. |
| `fetchPolicy()` | — | Decoded `PolicyLike` or `null`. |
| `subscribeAudit(handler)` | — | Listener id. Decoded AuditEvents for **this** policy only. |
| `unsubscribeAudit(id)` | — | |
| `replaceVendors(input)` | — | **Throws.** The v1 program cannot change `vendors`; use a new agent key. |

### `authorizeSpend` and the deny path

`authorize_spend` returns `Ok` on a deny so the denial is recorded
on-chain instead of reverting. Transaction success therefore says
nothing about the decision. The SDK fetches the confirmed transaction,
decodes the `AuditEvent` from its `Program data:` logs, and returns it:

```ts
interface AuditEvent {
  policy: PublicKey;
  agent: PublicKey;
  vendor: PublicKey;
  amountUsdc: BN;      // micro-USDC
  approved: boolean;
  reasonCode: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  nonce: BN;
  slot: number;        // on-chain at_slot
  signature: string;
  observedAt: number;  // ms, when the SDK decoded it
}
```

If the logs do not contain exactly one AuditEvent the call **throws**
rather than guessing. `nonce` defaults to a per-process strictly
increasing value; the v1 program records it but does not check it.

Signer errors (`Unauthorized`, 6005) are real transaction failures and
surface as thrown `AnchorError`s.

### Reason codes

| Code | Name | Rule |
|---|---|---|
| 0 | `REASON_OK` | approved |
| 1 | `REASON_VENDOR_DENIED` | vendor not in `policy.vendors` |
| 2 | `REASON_PER_TX_CAP` | `amount > per_tx_cap` |
| 3 | `REASON_DAILY_CAP` | `day_spent + amount > per_day_cap` (rolling 216 000-slot window) |
| 4 | `REASON_EXPIRED` | `slot - created_at > ttl_slots` |
| 5 | reserved | not emitted in v1 |
| 6 | `REASON_LEVERAGE_CAP` | `leverage_bps > max_leverage_bps` (0 = no cap) |
| 7 | `REASON_DRAWDOWN_KILLSWITCH` | `equity < peak × (1 − pct/100)`; checked first |

## Other exports

`derivePolicyPda(agent)`, `decodePolicy(buffer)`, `parseAuditEvents(program, logs, sig)`,
`micro(usd)`, `reasonCodeName(code)`, `REASON_CODES`, `TREASURY_PROGRAM_ID`,
`TREASURY_IDL`, `MAX_VENDORS` (16), `SLOTS_PER_DAY` (216 000), and the
`DEFAULT_*` constants.

## Keeping the IDL in sync

`src/treasury.idl.ts` is generated. After changing the program:

```bash
cd programs/treasury && anchor build
pnpm --filter @trade-on-my-behalf/sdk run sync-idl
pnpm --filter @trade-on-my-behalf/sdk test
```

## Tests

- `packages/sdk/tests/*.test.ts` — offline: PDA derivation, reason codes,
  Policy decoding (little-endian u64s), AuditEvent log parsing incl. the
  deny-with-successful-tx case. `pnpm --filter @trade-on-my-behalf/sdk test`.
- End-to-end against a real validator: `pnpm demo` (see README).
