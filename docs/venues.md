# Venues — Supported Solana Perps Adapters

> **Status:** Updated 2026-09-27 23:00 WIB (D10).
>
> **v1 ships Jupiter Perps in paper mode.** The adapter
> (`packages/agent/src/venue/jupiter-perps.ts`) simulates fills at the
> live Jupiter oracle price with Jupiter Perps' 6 bps fee. Every fill is
> gated by a real on-chain `authorize_spend`. Live order placement is
> **not built**. Drift is a v2 candidate. Zeta was discontinued in May
> 2025 (pivoted to Bullet) and is removed from v1.
>
> **Program-id correction (D10):** earlier revisions of this repo used
> `PERPHjGBqRHArX4DySjwM6UJHiR3sSCatuycCChK1as`, which has **no account on
> mainnet**. The correct id, confirmed executable via mainnet
> `getAccountInfo` on 2026-09-27 and matching Jupiter's docs and the
> `jupiter-perps-sdk` crate, is `PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu`.

The Anchor program does not care which venue a trade goes to — it only
checks that the `vendor: Pubkey` passed to `authorize_spend` is in the
`policy.vendors` whitelist. The runtime owns the mapping from venue to
vendor pubkey. v1 has one venue.

## Per-venue comparison

| Venue | API style | Account model | Leverage range | Oracle source | Integration status |
|---|---|---|---|---|---|
| Jupiter Perps | REST + on-chain CPI | Program-owned sub-account per user (`PositionRequest` PDA) | 1×–100× retail, up to 250× in some markets | Pyth + Switchboard composite | **v1 primary — paper mode (D10)** |
| Drift v2 | TypeScript SDK + on-chain CPI | User deposits collateral into a Drift account | 1×–20× spot, 1×–50× perps | Pyth (primary), L2 fallback | **v2 fallback (deferred)** |
| Bullet (formerly Zeta) | REST + TS SDK | Network-extension L2 per-market position | 1×–100× | Pyth | **v3 stretch (deferred)** |

### Notes per row

**Jupiter Perps.** Primary because the cluster v1-c9 ("Solana DEX and
Trading Infrastructure", 323 projects, 23 winners) already routes
most Solana perps flow through Jupiter, and the REST surface + IDL
is the most stable contract in the perps space. We treat it as the
default for the devnet demo. **Shipped (paper):** the runtime sends
`authorize_spend`, and on approve simulates the fill. **Planned (live):**
build the Jupiter Perps `createIncreasePositionMarketRequest` and submit
it in the same transaction as `authorize_spend` (see
[security-model.md](security-model.md) Scenario 4 for why atomicity matters).

Mainnet program id: `PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu`
(verified executable on mainnet 2026-09-27; [Solscan](https://solscan.io/account/PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu)).
Jupiter Perps is not known to be deployed on devnet; `tomb resolve-venue`
checks any cluster.

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

The runtime speaks to every venue through one interface
(`packages/agent/src/venue/index.ts`):

```ts
export interface Venue {
  readonly name: 'jupiter-perps';
  readonly mode: 'paper' | 'live';
  /** Pubkey the on-chain policy whitelists as the `vendor`. */
  readonly programId: PublicKey;
  openPosition(p: { market: Market; side: Side; collateralUsd: number; leverageBps: number }): Promise<Fill>;
  closePosition(venuePositionId: string): Promise<Fill & { realizedPnlUsd: number }>;
  listPositions(): Promise<Position[]>;
  /** Cash + unrealized PnL; feeds the drawdown kill-switch. */
  equityUsd(): Promise<number>;
}
```

`collateralUsd` is what the policy caps (`amount_usdc`); notional is
collateral × leverage. Markets in v1: `SOL-PERP`, `ETH-PERP`, `BTC-PERP`
(Jupiter Perps' three custodies). `Fill.simulated` is `true` in paper mode
and every CLI receipt says so.

## Vendor pubkey mapping

The runtime owns the mapping from venue to the `Pubkey` that the Anchor
program whitelists in `Policy.vendors`. In v1 it is a constant,
`JUPITER_PERPS_PROGRAM_ID` in `packages/agent/src/venue/jupiter-perps.ts`.

### Mainnet program ids (verified)

| Venue | Mainnet program id | Source |
|---|---|---|
| Jupiter Perps | `PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu` | mainnet `getAccountInfo` → executable (2026-09-27); Jupiter docs; `jupiter-perps-sdk` crate |
| Drift v2 | `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH` | mainnet `getAccountInfo` → executable (2026-09-27); Drift SDK |
| Bullet | _unstable as of D8.5 — re-resolve at D14 if stretch_ | — |

### Checking a cluster

```bash
pnpm --filter @trade-on-my-behalf/agent resolve-venue -- --url https://api.devnet.solana.com
# prints the vendor pubkey on stdout, and on stderr whether the program is deployed there
```

In paper mode the policy whitelists the mainnet Jupiter Perps id on every
cluster: the vendor field is an identity for "this venue", and the demo
never sends an instruction to it. `tomb init-policy` does this by default.

### Vendor whitelist (Policy.vendors)

Set once by `create_policy` (max 16). **The v1 program cannot change it
afterwards**: `update_policy` has no vendors argument and there is no
close instruction. Rotating venues means a new agent key, which gives a
new policy PDA. This also means a stolen owner key cannot add a drain
address to the whitelist (see [security-model.md](security-model.md)
Scenario 1).

## Why this matters

- **For judges:** the vendor pubkey is public and printed by
  `tomb status` and `tomb resolve-venue`; verify it on Solscan.
- **For users:** the whitelist is fixed for the life of a policy, so
  nobody — including a thief holding the owner key — can quietly point
  the agent at a new venue.
- **For the founder:** a wrong vendor id silently makes every policy
  whitelist a dead address. The D10 correction above is why ids are now
  checked against mainnet before they go into docs.
