# Venues — Supported Solana Perps Adapters

> **Status:** Updated 2026-09-27 15:40 WIB. Mainnet program IDs
> resolved from public docs + Solscan. Devnet values resolved
> at boot by the runtime from the published IDL/config account,
> not hardcoded (see [§"Vendor pubkey mapping"](#vendor-pubkey-mapping)
> below).
>
> **v1 ships with Jupiter Perps only.** Drift is a v2 fallback
> candidate. Zeta was discontinued in May 2025 (pivoted to Bullet)
> and is removed from the v1 cut — see [§"Removed from v1"](#removed-from-v1).

Trade On My Behalf routes orders through one of three perps venues.
The user whitelists venues in their `Rule.venues` array; the runtime
picks the cheapest available for each intent. The Anchor program does
not care which venue — it only sees a `vendor: Pubkey` from the
`policy.vendors` whitelist. The mapping from `VenueId` to `vendor`
pubkey is owned by the runtime and resolved at boot.

## Per-venue comparison

| Venue | API style | Account model | Leverage range | Oracle source | Integration status |
|---|---|---|---|---|---|
| Jupiter Perps | REST + on-chain CPI | Program-owned sub-account per user (`PositionRequest` PDA) | 1×–100× retail, up to 250× in some markets | Pyth + Switchboard composite | **v1 primary (D9, ship gate)** |
| Drift v2 | TypeScript SDK + on-chain CPI | User deposits collateral into a Drift account | 1×–20× spot, 1×–50× perps | Pyth (primary), L2 fallback | **v2 fallback (deferred)** |
| Bullet (formerly Zeta) | REST + TS SDK | Network-extension L2 per-market position | 1×–100× | Pyth | **v3 stretch (deferred)** |

### Notes per row

**Jupiter Perps.** Primary because the cluster v1-c9 ("Solana DEX and
Trading Infrastructure", 323 projects, 23 winners) already routes
most Solana perps flow through Jupiter, and the REST surface + IDL
is the most stable contract in the perps space. We treat it as the
default for the devnet demo. The runtime builds the position via
the Jupiter Perps CPI, then submits a v1 transaction containing
`authorize_spend` first, the Jupiter Perps CPI second, and
(optionally) an SPL memo last. The tx is simulated before signing.

Mainnet program id: `PERPHjGBqRHArX4DySjwM6UJHiR3sSCatuycCChK1as`
(verified via [Solscan program page](https://solscan.io/account/PERPHjGBqRHArX4DySjwM6UJHiR3sSCatuycCChK1as#programIdl)).
Devnet program id is resolved at runtime from the published IDL — see
[§"Vendor pubkey mapping"](#vendor-pubkey-mapping).

**Drift v2.** Secondary / v2 fallback because Drift's TypeScript SDK
is the public anchor for `drift-labs/protocol-v2` and the user base
for an `@drift-labs/sdk`-shaped adapter already exists. Drift on
mainnet + devnet share the same program id
(`dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH`) which simplifies
testing. Useful as the fallback if Jupiter Perps raises fees or halts
a market, but **not v1** — shipping two adapters shallow loses to
shipping one adapter deep on the wedge. Deferred to v2 unless the
v1 Jupiter integration hits a blocking bug during D9.

**Bullet (formerly Zeta Markets).** Stretch only. Zeta Markets
discontinued operations in May 2025 and the team pivoted to Bullet
(a Solana L2 network extension). The v1 `Bullet` program id is not
yet stable. Parked for v3.

### Removed from v1

**Zeta Markets** — discontinued May 2025, pivoted to Bullet. The
v1 plan referenced Zeta as a stretch adapter. With Zeta gone and
Bullet still maturing, **no v1 stretch adapter** exists. The slot
is held open for v2 once Bullet's mainnet program id stabilizes.

**Infinity / Infty.Trade** — D5 deep-dive surfaced Infty.Trade as the
nearest precedent in the "AI-powered perpetual DEX" slot — but it is
itself a venue, not a personal-trading client with on-chain policy.
Adding Infinity as a fourth adapter does not change the wedge; we
park it for v2.

## Gaps and known unknowns

- **Jupiter Perps auth.** As of D5 the exact SDK shape for opening
  a position is in flux; we plan to read the open-source examples
  in `@jup-ag/api` and `jupiter-perps-anchor` rather than guess.
  Confirmed: the IDL is published on-chain at the mainnet program id
  above and can be fetched by `solana account <PROGRAM_ID> --url
  devnet` (devnet program id is different but follows the same
  IDL format).
- **Drift on devnet.** Same program id as mainnet (`dRiftyHA39...`).
  No fallback needed.
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
  readonly name: 'jupiter-perps' | 'drift' | 'bullet';
  openPosition(p: { side: 'long'|'short'; sizeUsd:number; leverage:number; market:string }): Promise<{ signature:string; venuePositionId:string }>;
  closePosition(id: string): Promise<{ signature: string }>;
  listPositions(): Promise<Position[]>;
  quote(p: { market:string; side:'long'|'short'; sizeUsd:number }): Promise<{ priceUsd:number; feeBps:number; available:boolean }>;
  /** Resolved at boot from on-chain IDL/config account. */
  readonly programId: PublicKey;
}
```

Per-venue implementations live under
`packages/agent/src/venue/{jupiter-perps,drift,bullet}.ts` and are bound
at boot from the `Rule.venues` whitelist. The `programId` field is
populated from the on-chain IDL fetch, never hardcoded.

## Vendor pubkey mapping

The runtime owns the mapping from `VenueId` to the `Pubkey` that the
Anchor program whitelists in `Policy.vendors`. The mapping is
**resolved at boot from the published on-chain IDL**, not hardcoded
— this is important because devnet program ids change more often
than mainnet ones.

### Mainnet program ids (verified)

| Venue | Mainnet program id | Source |
|---|---|---|
| Jupiter Perps | `PERPHjGBqRHArX4DySjwM6UJHiR3sSCatuycCChK1as` | [Solscan](https://solscan.io/account/PERPHjGBqRHArX4DySjwM6UJHiR3sSCatuycCChK1as#programIdl) |
| Drift v2 | `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH` | [Solana docs](https://solana.com/docs/programs/verified-builds) + Drift SDK |
| Bullet | _unstable as of D8.5 — re-resolve at D14 if stretch_ | — |

### Devnet program ids

Resolved at boot by `packages/agent/src/venue/jupiter-perps.ts`:

```bash
# Bootstrap script: print the resolved devnet program id for paste into create_policy
JUPITER_PERPS_ID=$(pnpm --filter @trade-on-my-behalf/agent run resolve-venue -- jupiter-perps --url devnet)
echo "Resolved Jupiter Perps devnet program id: $JUPITER_PERPS_ID"
# Paste this into the create_policy call's `vendors` array.
```

The bootstrap is wired into `scripts/devnet-demo.sh` (D9) — the
script prints the resolved pubkey so the user can copy it into their
`create_policy` call.

### Vendor whitelist (Policy.vendors)

The on-chain whitelist is set via `create_policy`:

```rust
policy.vendors = [
    Pubkey::from_str(JUPITER_PERPS_DEVNET_ID),  // resolved at boot
]
.max_len(16)  // hard cap; see state/mod.rs
```

A vendor can be added or removed via `update_policy` (owner only,
D7+). To rotate to a different Jupiter Perps program id (e.g.
after a devnet reset), the user submits a new `update_policy`
instruction with the replacement pubkey. See
[security-model.md §"Scenario 1"](security-model.md) for the
carve-out: today, the same `owner` key that can rotate the
vendor can also loosen every cap. The D10+ tighten-timelock
(PM-LOG §5 R14) will split those two capabilities.

## Why this matters

- **For judges:** the venue pubkeys are public on-chain. The
  devnet demo will print the resolved ids at boot so a judge can
  verify them against Solscan.
- **For users:** rotating a venue (e.g. switching from Jupiter Perps
  to Drift after v2 ships) is one `update_policy` call, not a
  redeploy.
- **For the founder:** the resolution-at-boot pattern means the
  runtime does not break when Jupiter Perps redeploys to a new
  program id — the runtime re-fetches and re-binds at boot.