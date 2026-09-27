# SDK API — `@trade-on-my-behalf/sdk`

> Frozen for D6 (sketch only). Production code lands D7-D8 against the
> IDL at `programs/treasury/target/idl/treasury.json`.

The SDK is the *one* npm package a developer installs to give their
agent a wallet with hard risk limits. It is intentionally small — five
lines of code from `pnpm add` to first authorized spend — and the rest
of the system (agent runtime, webapp control surface) is layered on
top of it. This is the wedge against the existing perps-bot landscape:
composability, not a black-box dashboard.

## Installation

```bash
pnpm add @trade-on-my-behalf/sdk
# peer deps installed by Kit 8:
pnpm add @solana/kit @solana/kit-plugin-rpc @solana/kit-plugin-signer
```

## Type surface (sketch)

```ts
// packages/sdk/src/types.ts
export type VenueId = 'jupiter-perps' | 'drift' | 'zeta';

export interface Rule {
  /** Whitelisted venues. Any spend outside is denied. */
  venues: VenueId[];
  /** Cap on notional leverage, in basis points (500 = 5x). 0 disables. */
  maxLeverage: number;
  /** Max notional per single position, in USD. */
  maxPositionUsd: number;
  /** Max realized loss per UTC day, in USD. */
  maxDailyLossUsd: number;
  /** Equity drawdown (peak-to-now) that flips the kill-switch, in percent (15 = 15%). */
  killSwitchDrawdownPct: number;
  /** Optional override for venues not on the bundled adapter list. */
  customVendors?: PublicKey[];
}

export interface TradeIntent {
  side: 'long' | 'short';
  market: string;        // e.g. 'SOL-PERP'
  sizeUsd: number;       // notional
  leverage: number;      // bps (500 = 5x)
  /** Optional override venue; defaults to the cheapest in `rules.venues`. */
  venue?: VenueId;
  /** Free-form rationale surfaced to the user in the webapp audit log. */
  rationale?: string;
}

export interface TxSig {
  /** Base58 transaction signature. */
  signature: string;
  /** Whether the on-chain `authorize_spend` was approved. */
  approved: boolean;
  /** Reason code from the AuditEvent (0 = OK, 1..7 = deny). */
  reasonCode: number;
  /** Slot the AuditEvent landed on. */
  atSlot: number;
}

export interface TradeAPI {
  /** Submit a trade; the SDK runs the off-chain check, then `authorize_spend`, then the venue tx. */
  execute(intent: TradeIntent): Promise<TxSig>;
  /** List positions across all configured venues. */
  listPositions(): Promise<Position[]>;
  /** Close a single position by its venue-local id. */
  closePosition(id: string): Promise<TxSig>;
  /** Subscribe to AuditEvent stream (off-chain mirror + on-chain tail). */
  onAudit(cb: (ev: AuditEventView) => void): () => void;
}

export interface AuditEventView {
  policy: PublicKey;
  agent: PublicKey;
  vendor: PublicKey;
  amountUsdc: number;
  approved: boolean;
  reasonCode: number;
  nonce: number;
  atSlot: number;
}
```

## Entry point

```ts
// packages/sdk/src/index.ts
export function withTrader(
  wallet: Signer,
  rules: Rule,
  rpc?: Rpc<SolanaRpcApi>,
): TradeAPI;
```

`withTrader` returns a `TradeAPI` bound to `wallet` as both payer and
identity (the standard case per `solana-dev` skill default). The
returned object builds v1 transactions (`transactionConfig.version = 1`).

## Five-line copy-paste example

```ts
import { createClient, publicKey, lamports } from '@solana/kit';
import { solanaDevnetRpc } from '@solana/kit-plugin-rpc';
import { generatedSigner, signer } from '@solana/kit-plugin-signer';
import { airdropSigner } from '@solana/kit-plugin-rpc';
import { withTrader } from '@trade-on-my-behalf/sdk';

const wallet = await generatedSigner();
const client = createClient().use(signer(wallet)).use(solanaDevnetRpc());
await airdropSigner(client, wallet, lamports(1_000_000_000n));

const trade = withTrader(wallet, {
  venues: ['jupiter-perps', 'drift'],
  maxLeverage: 500,
  maxPositionUsd: 200,
  maxDailyLossUsd: 60,
  killSwitchDrawdownPct: 15,
}, client.rpc);

const sig = await trade.execute({
  side: 'long',
  market: 'SOL-PERP',
  sizeUsd: 150,
  leverage: 300,
  rationale: '15m RSI 27 + 1h trend up, stop -1.5%, target +3%',
});

console.log(sig);
```

If `sig.approved` is `true`, the venue transaction has been submitted
and `sig.signature` is the venue tx signature; the on-chain
`authorize_spend` AuditEvent is its own signature, retrievable from the
`onAudit` subscription by matching `atSlot`. If `approved` is `false`,
`sig.reasonCode` is the matching `REASON_*` code from `state/mod.rs`,
and no venue transaction was sent.

## Off-chain vs on-chain checks

`withTrader(...).execute(intent)` runs the rule evaluation twice:

1. **Off-chain (fast path).** The SDK reads the local `Policy` PDA and
   mirrors the on-chain checks in TypeScript. If any rule fails here,
   no transaction is built; `execute` resolves with `approved: false`
   and the right `reasonCode` from the off-chain mirror. This is the
   happy path for 99% of denies — free, instant, no fee.
2. **On-chain (canonical).** For approves, the SDK builds a v1
   transaction containing a single `authorize_spend` instruction, signs
   it with `wallet`, and submits. The resulting `AuditEvent` is the
   canonical proof of the decision. Even on the happy path the SDK
   reads the event back to confirm the on-chain reason code matches
   the off-chain one (defends against stale state).

The runtime (`packages/agent`) wires these together; the SDK alone is
enough for a developer who wants to call `execute` from their own code
without the agent runtime in the loop.

## Versioning

`@trade-on-my-behalf/sdk` follows the IDL. Whenever `treasury.json`
regenerates, the SDK bumps minor (additive) or major (breaking) and
the CHANGELOG points at the IDL commit hash. The dashboard pins to
an exact version.

## Errors thrown by `execute`

| Error | Cause |
|---|---|
| `SdkRuleDeniedError` | Off-chain mirror rejected. Carries `reasonCode`. |
| `SdkSimulationError` | On-chain `simulateTransaction` failed. Carries the Anchor error code. |
| `SdkVenueError` | Venue adapter rejected (price moved, market halted, leverage > venue max). |
| `SdkTimeoutError` | No confirmation within the configured `confirmTimeoutMs` (default 30 s). |

All four extend `SdkError`, which carries `atSlot` and a correlation
id that matches the corresponding `AuditEvent.nonce`.