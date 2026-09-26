# Venues — Supported Solana Perps Adapters

> Frozen for D6. Status column reflects what has shipped as of D5 +
> what is planned for the D6-D17 roadmap. "Not started" means: spec
> done, no code yet.

Trade On My Behalf routes orders through one of three perps venues.
The user whitelists venues in their `Rule.venues` array; the runtime
picks the cheapest available for each intent. The Anchor program does
not care which venue — it only sees a `vendor: Pubkey` from the
`policy.vendors` whitelist. The mapping from `VenueId` to `vendor`
pubkey is owned by the runtime.

## Per-venue comparison

| Venue | API style | Account model | Leverage range | Oracle source | Integration status |
|---|---|---|---|---|---|
| Jupiter Perps | REST + on-chain CPI | Program-owned sub-account per user | 1x–100x (configurable per market) | Pyth + Switchboard composite | **Planned primary (D7-D9)** |
| Drift | TypeScript SDK + on-chain CPI | User deposits collateral into a Drift account | 1x–20x spot, 1x–50x perps | Pyth (primary), L2 fallback | **Planned secondary (D9-D10)** |
| Zeta | REST + TypeScript SDK | Program-owned per-market position accounts | 1x–20x (per market) | Pyth | **Stretch (D14-D16)** |
| Infinity / Infty.Trade | Pool-Rate AMM, no SDK on file | AMM pool | up to 200x | Pyth | **Not started** (D5 deep dive flagged as adjacent precedent only; not in v1 wedge) |

### Notes per row

**Jupiter Perps.** Primary because the cluster v1-c9 ("Solana DEX and
Trading Infrastructure", 323 projects, 23 winners) already routes
most Solana flow through Jupiter, and the REST surface is the most
stable contract in the perps space. We treat it as the default for
the devnet demo. The runtime builds the position via the Jupiter
Perps CPI, then submits a v1 transaction containing
`authorize_spend` first, the Jupiter CPI second, and (optionally) a
SPL memo last. The tx is simulated before signing.

**Drift.** Secondary because Drift's TypeScript SDK is the public
anchor for `drift.protocol`'s program and the user base for a
`@drift-labs/sdk`-shaped adapter already exists. Useful as the
fallback if Jupiter Perps raises fees or halts a market.

**Zeta.** Stretch. Zeta is a viable third venue but the priority is
shipping two adapters well, not three adapters shallow. If time
permits D14-D16 the runtime gains the third `VenueId`.

**Infinity / Infty.Trade.** D5 deep-dive surfaced Infty.Trade as the
nearest precedent in the "AI-powered perpetual DEX" slot — but it is
itself a venue, not a personal-trading client with on-chain policy.
Adding Infinity as a fourth adapter does not change the wedge; we
park it for v2.

## Gaps and known unknowns

- **Jupiter Perps auth.** As of D5 the exact SDK shape for opening
  a position is in flux; we plan to read the open-source examples
  in `@jup-ag/api` and `jupiter-perps-anchor` rather than guess.
- **Drift on devnet.** Drift mainnet-beta has the live product; the
  devnet program ID sometimes lags. We will fall back to mainnet-beta
  with a small capped keypair if devnet is stale during D10 integration.
- **Position reconciliation.** Drift and Jupiter Perps each store
  positions in their own sub-account model. The runtime reconciles
  by calling `listPositions()` on every boot and on every fill, and
  refuses to submit a new open if it would push total exposure above
  the rule cap.
- **Oracle parity.** All three venues use Pyth as the primary feed.
  Mark-price divergence across venues is the biggest source of
  unexpected fills. The runtime records `venue.markPrice` on every
  fill and surfaces it on the dashboard so the user can see when
  fills happened on stale prices.

## Adapter contract

The runtime speaks to every venue through one interface:

```ts
// packages/agent/src/venue/index.ts
export interface Venue {
  readonly name: 'jupiter-perps' | 'drift' | 'zeta';
  openPosition(p: { side: 'long'|'short'; sizeUsd:number; leverage:number; market:string }): Promise<{ signature:string; venuePositionId:string }>;
  closePosition(id: string): Promise<{ signature: string }>;
  listPositions(): Promise<Position[]>;
  quote(p: { market:string; side:'long'|'short'; sizeUsd:number }): Promise<{ priceUsd:number; feeBps:number; available:boolean }>;
}
```

Per-venue implementations live under
`packages/agent/src/venue/{jupiter-perps,drift,zeta}.ts` and are bound
at boot from the `Rule.venues` whitelist.

## Vendor pubkey mapping

The runtime owns the mapping from `VenueId` to the `Pubkey` that the
Anchor program whitelists in `Policy.vendors`. The expected pubkeys:

| Venue | Vendor pubkey (placeholder until D7) |
|---|---|
| Jupiter Perps | TBD — read from Jupiter CPI program ID at boot |
| Drift | TBD — read from Drift config account |
| Zeta | TBD — read from Zeta program ID |

The bootstrap script `scripts/devnet-demo.sh` (D9) prints the
resolved pubkeys so the user can copy them into their `create_policy`
call.