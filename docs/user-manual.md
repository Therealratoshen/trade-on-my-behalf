# Terading — User Manual

For someone evaluating the project who has never seen it.

**Read this first.** The `treasury` program *authorizes and records* trade permissions. It holds
no keys, custodies nothing, contains no `invoke`/`invoke_signed`/`transfer`, and cannot execute a
venue trade. Positions in this repository are **paper fills priced from a live Jupiter reference
feed** — no order reaches Jupiter, and no order reaches any other venue either. An approved
authorization is **not** a fill. See [What this does not do](#what-this-does-not-do).

Every command below was executed on a macOS checkout, and its output is quoted as observed. Where
a check was not run, it says so. Verified 2026-10-04 against commit `d8d0d3d`.

---

## 1. Prerequisites

Versions verified on the machine that produced this manual:

| Tool | Required | Verified here |
|---|---|---|
| Node | `>=20` (`engines` in `package.json`) | `v25.6.1` |
| pnpm | `packageManager: pnpm@9.0.0` | `9.0.0` |
| Anchor | `0.31.1` (pinned in `.github/workflows/ci.yml`) | `anchor-cli 0.31.1` |
| Solana CLI | `3.1.1` in CI; newer works | `solana-cli 4.2.0` |
| Rust | `stable` | `rustc 1.92.0` |

Observed output:

```console
$ anchor --version
anchor-cli 0.31.1
$ solana --version
solana-cli 4.2.0 (src:ac82b5d4; feat:21b0d33a, client:Agave)
$ node --version
v25.6.1
$ pnpm --version
9.0.0
```

**On pnpm versions.** The repo pins `packageManager: pnpm@9.0.0` in `package.json`, and CI
installs via `pnpm/action-setup@v4` with no explicit `version`, so the `packageManager` field is the
single source of truth. If your local pnpm is a different major, the install in `programs/treasury`
can fail with `ERR_PNPM_IGNORED_BUILDS` naming `bufferutil` and `utf-8-validate`. That is a pnpm-major
behavior change, **not a repository bug** — do not "fix" the repo for it. See
[Troubleshooting](#6-troubleshooting).

`programs/treasury` sits **outside** the root workspace (`pnpm-workspace.yaml` globs only
`apps/*` and `packages/*`), so it installs standalone:

```bash
(cd programs/treasury && pnpm install --frozen-lockfile --ignore-workspace)
```

`--ignore-workspace` is required, not cosmetic: that directory ships a scaffolded
`pnpm-workspace.yaml` with no `packages:` key, and without the flag pnpm aborts with
`ERR_PNPM_INVALID_WORKSPACE_CONFIGURATION`.

Full workspace install and build, both verified:

```bash
pnpm install --frozen-lockfile   # → "Already up to date" / exit 0
pnpm build                       # → exit 0 (sdk, agent, dashboard)
```

---

## 2. The one-command demo

```bash
OWNER_KEY="$(mktemp -d)/owner.json"
solana-keygen new --no-bip39-passphrase --silent --force -o "$OWNER_KEY"
OWNER_KEY="$OWNER_KEY" pnpm demo
```

**Use a throwaway key.** `scripts/demo.sh` defaults `OWNER_KEY` to
`~/.config/solana/id.json`. Local mode needs no real SOL — the script airdrops test SOL to the
local validator — so a throwaway key is always the right choice and keeps your real wallet
untouched.

`pnpm demo` runs `bash scripts/demo.sh local` and does, in order:

1. **Build** — `anchor build` if `target/deploy/treasury.so` is missing (or `REBUILD=1`), then
   `pnpm install` and an SDK build.
2. **Start a throwaway `solana-test-validator`** on `http://127.0.0.1:8899` with the program
   preloaded via `--bpf-program`, into a temp ledger that is deleted on exit. Airdrops 10 test SOL
   to the owner key.
3. **Mint a fresh agent key** — the hot key the runtime holds — and fund it 1 SOL for tx fees only.
4. **Run nine steps** of real on-chain `authorize_spend` transactions (below), printing an
   explorer receipt link for each.
5. **Print the final on-chain policy.**

### Verified result

This demo **works**. It was run end-to-end on 2026-10-04 and every step produced its documented
outcome. Observed output, trimmed to the load-bearing lines:

```console
$ OWNER_KEY=/tmp/terading-manual-Rk2htL/owner.json pnpm demo

== Build
  program + SDK built

== Start local validator with the program preloaded
  validator up at http://127.0.0.1:8899

== Fresh agent key (the hot key the runtime holds; owner key stays with the user)
  agent CMZcyPpsGvrcHq8Z4jWPhcypTpWjvAGTy4zTMH2gCJJh (funded for tx fees only)

== 1. Owner sets the rules on-chain: $50/trade, $150/day, max 5x, 25% drawdown kill-switch
policy created  6sZwMs7ncK5pVev1nSf1NPxvCfkPrSXcdqWDJh8P8XkX
receipt  https://explorer.solana.com/tx/417jTkRh...aY8hQG3tb3MT8?cluster=custom&customUrl=...

== 2. In-policy trade: long SOL, $40 at 3x  → expect APPROVED + paper fill
intent   long SOL-PERP  collateral $40.00  leverage 3x
peak     new equity high recorded on-chain  https://explorer.solana.com/tx/5QDJppra...
equity   $1000.00 (paper account)
chain    APPROVED REASON_OK  slot 15
receipt  https://explorer.solana.com/tx/4xuLA6ER...v2Z7tKeB?cluster=custom&customUrl=...
fill     paper-75785a5a @ $121.35  fee $0.07  (paper — simulated at live Jupiter price)

== 3. Oversized signal ($500 at 20x), well-behaved agent clamps it → expect APPROVED at $50 / 5x
intent   short ETH-PERP  collateral $50.00  leverage 5x
clamped  collateral 500 -> 50 (per-trade cap)
clamped  leverage 20x -> 5x (leverage cap)
chain    APPROVED REASON_OK  slot 20
fill     paper-54484e6b @ $2697.80  fee $0.15  (paper — simulated at live Jupiter price)

== 4. Misbehaving agent sends 20x unclamped → expect DENIED REASON_LEVERAGE_CAP
intent   long SOL-PERP  collateral $30.00  leverage 20x
chain    DENIED   REASON_LEVERAGE_CAP  slot 24

== 5. Misbehaving agent sends $80 unclamped → expect DENIED REASON_PER_TX_CAP
intent   long SOL-PERP  collateral $80.00  leverage 2x
chain    DENIED   REASON_PER_TX_CAP  slot 27

== 6. Owner tightens the kill-switch to 5%
policy updated  6sZwMs7ncK5pVev1nSf1NPxvCfkPrSXcdqWDJh8P8XkX

== 7. Market crash (simulated prices): both open positions lose their collateral
paper-75785a5a  long SOL-PERP  collateral $40.00 x3  entry $121.35  mark $1.00  uPnL $-40.00
paper-54484e6b  short ETH-PERP  collateral $50.00 x5  entry $2697.80  mark $1000000.00  uPnL $-50.00
equity $909.78

== 8. Next trade after the crash → expect DENIED REASON_DRAWDOWN_KILLSWITCH
chain    DENIED   REASON_DRAWDOWN_KILLSWITCH  slot 37

== 9. Compromised agent key tries to loosen its own policy → expect Unauthorized
error: AnchorError thrown in programs/treasury/src/instructions/update_policy.rs:27. Error Code: Unauthorized. Error Number: 6005. Error Message: unauthorized signer for this policy.

== Final on-chain policy
policy                 6sZwMs7ncK5pVev1nSf1NPxvCfkPrSXcdqWDJh8P8XkX
owner                  AyeqiQT6pKjTg8ybCcVD22br6p17Xanqoq9gFUZJLg9c
agent                  CMZcyPpsGvrcHq8Z4jWPhcypTpWjvAGTy4zTMH2gCJJh
vendors                PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu
perTxCapUsd            50
perDayCapUsd           150
daySpentUsd            90
maxLeverage            5
killSwitchDrawdownPct  5
peakEquityUsd          1000
paperEquityUsd         999.78
venue                  jupiter-perps (paper)

Done. Every "receipt" link above is an on-chain transaction on local.
```

Read the receipts as **local-validator** transactions. The explorer links use
`?cluster=custom&customUrl=...`, which is not a public cluster.

Note step 7: the `mark` prices ($1.00, $1000000.00) are the **simulated crash** from
`--price`, not real market prices. The paper venue is being told a price, and obeying it.

### A bug this manual fixed

On the reviewed revision, `pnpm demo` **failed at step 1**:

```console
== 1. Owner sets the rules on-chain: $50/trade, $150/day, max 5x, 25% drawdown kill-switch
error: SDK signing requires Solana devnet, or an explicitly enabled loopback test validator. This connection reported genesis hash "uknp9PszhdX5aAKdShbz7adz7e7s6vdiUtwQnuLDL1A", which is neither. Public mainnet/testnet signing is blocked.
```

Cause: the SDK's devnet guard (`packages/sdk/src/registration.ts`, `assertDevnetWrite`, added in
`01940a2`) refuses to sign anywhere but devnet. `scripts/demo.sh` predates that guard (`b95ce73`) and
never passed `--local-validator`, so local mode could not write at all. Fixed in `scripts/demo.sh` by
appending the flag for local mode only.

**The append matters.** A first attempt that *prepended* `--local-validator` failed differently —
every step printed the CLI usage banner instead of running. `cli.ts` `parseArgs()` has no valueless
boolean: for any `--flag` it reads the next token as that flag's value unless it is undefined or
itself starts with `--`. Placing the flag before the subcommand made it swallow the subcommand
name. **Any `--flag` in this CLI must be followed by a value or by another `--flag`, and a
subcommand must never follow a flag.**

---

## 3. CLI walkthrough

The CLI is `tomb`, in `packages/agent/src/cli.ts`. Run it through pnpm:

```bash
cd packages/agent && pnpm -s tomb <command> [flags]
```

### Global flags

| Flag | Meaning |
|---|---|
| `--url <rpc>` | RPC endpoint. Default `$RPC_URL`, else `http://127.0.0.1:8899`. |
| `--local-validator` | Permit writes to a loopback test validator. Off by default. Required for local mode. |
| `--paper-state <file>` | Paper account file. Default `~/.tomb/paper-<agent>.json`. |
| `--paper-cash <usd>` | Starting paper cash for a **new** account. Default `1000`. |
| `--price M=P[,M=P]` | Override oracle prices, e.g. `SOL-PERP=90`. Simulates a crash. |
| `--json` | Machine-readable output. |

`--local-validator` does **not** blanket-allow local writes. `assertDevnetWrite` still refuses a
mainnet node reached over loopback, and still refuses a public chain over a remote host — the opt-in
must be a genuine loopback validator. That behavior is covered by the SDK suite: 15 of its 31 cases
test this guard alone (devnet accepted, mainnet/testnet/unknown chains refused, loopback refused
without opt-in, and three cases proving opt-in cannot launder a mainnet endpoint).

### `init-policy`

```bash
cd packages/agent && pnpm -s tomb init-policy \
  --owner "$OWNER" --agent "$AGENT" --url http://127.0.0.1:8899 --local-validator \
  --per-tx 50 --per-day 150 --max-leverage 5 --kill-pct 25
```

Observed:

```console
policy created  5w5in6XwnmnW4cApq6rZ9KcXHmMneeqSSVgCeAn9VhQn
receipt  https://explorer.solana.com/tx/4hHUm8tuWdPWRr6J1SffAscPqeBikq9ty...MqvgHf?cluster=custom&customUrl=...
```

Flags: `--per-tx` (default 50), `--per-day` (150), `--max-leverage` (5), `--kill-pct` (25),
`--ttl-days` (7). Re-running when a policy exists prints
`policy already exists <pda> (unchanged)`.

The owner and agent must co-sign this one provisioning transaction — `create_policy` uses `init`,
so a third party cannot pre-create the PDA ahead of you. After this, the owner no longer needs
custody of the agent key.

### `update-policy`

Changes only the flags you pass.

```console
$ pnpm -s tomb update-policy --owner "$OWNER" --agent "$AGENT" \
    --url http://127.0.0.1:8899 --local-validator --kill-pct 5
policy updated  5w5in6XwnmnW4cApq6rZ9KcXHmMneeqSSVgCeAn9VhQn
receipt  https://explorer.solana.com/tx/2sUBk7WR7xCmBaEin8NX1UdfQrrSoyso7...QMQy?cluster=custom&customUrl=...
```

### `status`

```console
$ pnpm -s tomb status --agent "$AGENT" --url http://127.0.0.1:8899 --local-validator --json
{
  "policy": "5w5in6XwnmnW4cApq6rZ9KcXHmMneeqSSVgCeAn9VhQn",
  "owner": "HU5ynR7iJ6EQxVeqZtyv5FmbxDAdw5BhoqiyhRpSQnfa",
  "agent": "49gVpZw1PQrJt7b7ndXtGx8oEnLXKMNBKBjcuuR7xjeW",
  "vendors": [ "PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu" ],
  "perTxCapUsd": 50,
  "perDayCapUsd": 150,
  "daySpentUsd": 0,
  "maxLeverage": 5,
  "killSwitchDrawdownPct": 25,
  "peakEquityUsd": 0,
  "paperEquityUsd": 1000,
  "venue": "jupiter-perps (paper)"
}
```

`peakEquityUsd` is **on-chain**; `paperEquityUsd` is **local JSON**. They are different systems and
are expected to differ. `venue` always reads `(paper)`.

### `trade`

```console
$ pnpm -s tomb trade --market SOL-PERP --side long --collateral 40 --leverage 3 \
    --rationale "walkthrough" --agent "$AGENT" --url http://127.0.0.1:8899 --local-validator
intent   long SOL-PERP  collateral $40.00  leverage 3x
peak     new equity high recorded on-chain  https://explorer.solana.com/tx/2ouAvbfg...
equity   $1000.00 (paper account)
chain    APPROVED REASON_OK  slot 37
receipt  https://explorer.solana.com/tx/5WYHjJ1L9J2MH98MJHfAC4J91h...W8759n?cluster=custom&customUrl=...
fill     paper-831c870f @ $121.46  fee $0.07  (paper — simulated at live Jupiter price)
```

Line by line:

- `intent` — the *resolved* intent after clamping, not what you asked for.
- `clamped ...` — one line per cap that bound, and only when clamping actually happened.
- `peak` — a `record_pnl` transaction raised because this was a new equity high.
- `equity` — the **local paper** account. Caller-reported, not venue-verified.
- `chain APPROVED|DENIED <reason> slot <n>` — the on-chain kernel verdict. This is the real result.
- `fill` — a **paper** fill. Note the literal string `(paper — simulated at live Jupiter price)`.
- `VENUE ERROR` — spend already counted on-chain but the venue step failed.

**Use `--raw` to see the chain catch a bad agent.** By default the runtime clamps an oversized
signal down to your caps before sending it, so a well-behaved agent always lands in policy and you
never see a denial. `--raw` sends the intent as-is, so you can watch the program refuse it:

```console
$ pnpm -s tomb trade --market SOL-PERP --side long --collateral 80 --leverage 2 --raw ...
intent   long SOL-PERP  collateral $80.00  leverage 2x
equity   $999.93 (paper account)
chain    DENIED   REASON_PER_TX_CAP  slot 46
receipt  https://explorer.solana.com/tx/5dfLZwMeEQgWnigkpaGT7Yp3fBK7Y8Lo...
$ echo $?
1
```

Exit codes (verified): `0` when approved, `1` when denied, `2` if the chain approved but the venue
step failed. An **unparseable** input never reaches the chain and exits `1`:

```console
$ pnpm -s tomb trade --market NOPE-PERP --side long --collateral 10 --leverage 2 ...
DROPPED  unknown market NOPE-PERP
```

The demo's step 3 and step 4 are the two halves of this: step 3 shows clamping to
`$50 / 5x` then approval; step 4 sends `20x` with `--raw` and gets
`DENIED REASON_LEVERAGE_CAP`.

### `positions`

```console
$ pnpm -s tomb positions --agent "$AGENT" --url http://127.0.0.1:8899 --local-validator
paper-831c870f  long SOL-PERP  collateral $40.00 x3  entry $121.46  mark $121.46  uPnL $-0.00
equity $999.93
```

After closing, `no open positions`. Position IDs are `paper-<hex>` and pass to `close --id`.

### `close`

```console
$ pnpm -s tomb close --id paper-831c870f --agent "$AGENT" --url http://127.0.0.1:8899 --local-validator
closed   paper-831c870f @ $121.47  realized $0.01  fee $0.07
```

No `peak` line here because $999.93 was below the recorded $1000 high. Closing is **local paper
bookkeeping** — it moves the JSON file and does not touch the chain. The on-chain `day_spent_usd`
counter is **not** decremented on close.

### `watch`

Streams decoded `AuditEvent`s for one policy. Verified output (run against a local validator, with
an approve and a deny made while it ran):

```console
$ pnpm -s tomb watch --agent "$AGENT" --url http://127.0.0.1:8899 --local-validator
watching AuditEvents for policy H6i5BQ92ST5yk3Lka4XmbjXvFzAeU5aTMCj1RrmDbaHM (Ctrl-C to stop)
2026-10-04T13:19:48.649Z  admin   REASON_OK                    $     0.00  64yzCiukne6YAUpqU68k...
2026-10-04T13:19:49.068Z  APPROVE REASON_OK                    $    40.00  5HSEEi4MQateGoxANsuMRk8k...
2026-10-04T13:19:51.581Z  DENY    REASON_PER_TX_CAP            $    90.00  4dsVpwbH95UptauvKstET1D9w...
```

The three kinds are `admin` (a system-program event such as `update_policy` or `record_pnl`, which
carries the all-zero vendor pubkey), `APPROVE`, and `DENY`. `--json` emits raw events.

Two operational notes, both observed: the `--url` must be **`http://`/`https://`**, not
`ws://` — passing a `ws://` URL fails with
`error: Endpoint URL must start with 'http:' or 'https:'`. And the subscription takes a few seconds
to establish; events emitted immediately after launch may be missed.

### `resolve-venue`

```console
$ pnpm -s tomb resolve-venue jupiter-perps --url http://127.0.0.1:8899
PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu
jupiter-perps program is NOT deployed on http://127.0.0.1:8899; the runtime uses paper mode. The pubkey above is still the vendor to whitelist.
```

The note goes to **stderr**, the pubkey to stdout, exit `0`. Read this as: *the venue program does
not exist on this cluster, so the runtime is in paper mode.* The pubkey is still the vendor entry
you whitelist on-chain — the policy is written against a real venue identity whether or not that
venue is live. It exits `0` either way, so do not read exit status as "venue available."

---

## 4. Reading the output

### Reason codes

From `programs/treasury/programs/treasury/src/state/mod.rs`, mapped through
`reasonCodeName()` in `packages/sdk/src/types.ts`:

| Code | SDK name | Meaning |
|---|---|---|
| 0 | `REASON_OK` | Approved. |
| 1 | `REASON_VENDOR_DENIED` | Vendor not in the policy's whitelist. |
| 2 | `REASON_PER_TX_CAP` | Amount above `per_tx_cap_usdc`. |
| 3 | `REASON_DAILY_CAP` | `day_spent_usdc` would exceed `per_day_cap_usdc`. |
| 4 | `REASON_EXPIRED` | More than `ttl_slots` since `created_at_slot`. |
| 5 | `RESERVED_5` | **Reserved and unused.** The program declares `REASON_UNKNOWN_VENDOR = 5` but never emits it; the SDK deliberately labels it `RESERVED_5`. Vendor rejection is code 1. |
| 6 | `REASON_LEVERAGE_CAP` | `leverage_bps` above `max_leverage_bps` (0 = uncapped). |
| 7 | `REASON_DRAWDOWN_KILLSWITCH` | Equity below the drawdown floor. |

**A denial is not an error.** `authorize_spend` returns `Ok(())` and emits an `AuditEvent` with
`approved: false` plus the reason code. The transaction succeeds. Separately, *malformed* input is
a genuine transaction error (`InvalidAmount`, `InvalidLeverage`) that fails the transaction outright
and never consumes a reason code.

### Two numbers that are not the same thing

`day_spent_usd` is an **approved-collateral budget** over a lazy 216,000-slot interval
(~24h at 0.4 s/slot), rolling from `last_reset_slot` — not aligned to midnight UTC, and not a
guaranteed maximum loss. An approved authorization consumes budget **even if the later venue step
fails**.

### Kill-switch honesty

`REASON_DRAWDOWN_KILLSWITCH` compares the **caller-supplied** `implied_current_equity_usd` against
the on-chain `peak_equity_usdc`. It is not independent venue proof: an agent that misreports its
equity can evade it. In the demo the trigger is the local paper account's equity, which is why
step 8's crash is simulated.

---

## 5. The dashboard

```bash
pnpm --filter @trade-on-my-behalf/dashboard dev
```

Verified: starts on `http://localhost:3000` and serves **HTTP 200** at both `/` and
`/paper-practice`. Next.js 15.5.26, `✓ Ready in 1893ms`.

**Visual confirmation: I could not confirm it visually.** The sandboxed browser I drove could not
reach `localhost` — it returned a `chrome-error://chromewebdata/` page. I verified the served HTML
over `curl` instead, and confirmed these strings are present in the response:
`Recorded, not enforced`, `Your trades are bound by them`, and
`holds no keys and custodies nothing`. **I have not seen this page render.**

### Two colour families, and the line between them

Defined in `apps/dashboard/app/globals.css`, enforced by `scripts/check-tokens.mjs`.

**Decision colours — `--ok` / `--no` / `--warn`.** These may appear **only** where the on-chain
kernel returned a verdict:

- `--ok` `#3ddc97` — approved (`REASON_OK`)
- `--no` `#ff5c72` — denied
- `--warn` `#ffc857` — clamped to a cap before sending

**Visualisation colours — `--viz-up` / `--viz-down`.** Price direction and nothing else:

- `--viz-up` `#3fc9bd` — price rose
- `--viz-down` `#e8834f` — price fell

The families are kept separate on purpose: a chart that coloured a rising candle `--ok` would read
as "the kernel approved this." `--viz-up` is green-teal, `--ok` is green — they are different
hues for a reason.

### Why glyphs are mandatory

`node scripts/check-cvd.mjs` (exit 0) simulates four colour-vision deficiencies. The
`--viz-up` / `--viz-down` pair, under **achromatopsia**, measures **ΔE 2.8 at 1.04:1** — a
**COLLIDE**, meaning those two colours become indistinguishable for a real reader. The check exits
0 because it is *advisory*: it reports collisions and requires a redundant non-colour cue, it does
not fail the build.

So every meaning-bearing element carries a second channel — a glyph, sign, word, or position.
`check-tokens.mjs` rule **R5** enforces this mechanically: it matches verdict badges, P&L cells,
price-change readouts and position-side badges, and fails if a sign or glyph is not present within
the following 220 characters. Four of the five decision/viz pairs are `weak` or `COLLIDE` under
some deficiency, which is why the rule exists rather than an assumption that colour suffices.

Both guards, verified:

```console
$ node scripts/check-tokens.mjs; echo "exit=$?"
token guard — 29 colour tokens in :root
  --fg        #e6e9ef  16.37:1  AA ok
  --fg-dim    #8b93a4  6.45:1  AA ok
  --fg-faint  #767e90  4.89:1  AA ok

clean — colours are tokens, spacing is on scale, verdicts stay verdicts.
exit=0

$ node scripts/check-cvd.mjs > /dev/null; echo "exit=$?"
exit=0
```

---

## 6. Troubleshooting

### `pnpm demo` dies at step 1 with "SDK signing requires Solana devnet"

The devnet guard. A local validator's genesis hash is not devnet's, so every write needs
`--local-validator`. If you are running `tomb` by hand against a local validator, add it. (Fixed
in `scripts/demo.sh` — see §2.)

### A stale `programs/treasury/target/` causes a misleading `Access violation` crash

A `target/` directory left over from a different build can make tests die with an `Access violation`
at 17 of 20 cases. It looks like a program bug and is not. Fix:

```bash
(cd programs/treasury && rm -rf target && anchor build)
```

This is the exact sequence used for the 20-test run recorded in §7, and it passed from a cleaned
`target/`.

### `ERR_PNPM_IGNORED_BUILDS` for `bufferutil` / `utf-8-validate`

A **pnpm-major artifact**, not a repo bug. Newer pnpm majors refuse to run package build scripts
until they are allow-listed, and those two optional native deps ship them. Use the pinned
`pnpm@9.0.0` (e.g. via corepack) rather than editing the repo:

```bash
corepack pnpm install --frozen-lockfile
(cd programs/treasury && corepack pnpm install --frozen-lockfile --ignore-workspace)
```

**I did not reproduce this error** on the machine used here, because local pnpm is already 9.0.0.
The entry is a known-issue note from the CI-pinned major, not an observation from my run.

### `anchor test` tries to deploy to devnet

`programs/treasury/Anchor.toml` commits `provider.cluster = "devnet"`, and `anchor test` reads that
field to decide where to deploy. Running it would attempt a **devnet deploy**. Do not edit the file
— run the suite directly against a preloaded local validator instead, with a throwaway wallet:

```bash
(cd programs/treasury && pnpm exec ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts)
```

with `ANCHOR_PROVIDER_URL=http://127.0.0.1:8899` and `ANCHOR_WALLET` pointing at a throwaway
keypair in a temp directory. **Never point `ANCHOR_WALLET` at `~/.config/solana/id.json`.**

### A `treasury.so` that does not exist

`pnpm demo` builds it on demand. If `anchor` is not on `PATH` and the `.so` is missing, the script
fails with `anchor CLI not on PATH and $SO missing`. Set `REBUILD=1` to force a rebuild.

### A noisy `Ignoring extra certs ... trustasia.pem` warning

Local environment noise from a corporate TLS cert, printed by the Node TLS stack on every CLI call.
Harmless; it is not a repo error. It appears in raw transcripts below because that is what actually
printed.

---

## 7. Verifying it yourself

Every check below was run, with the stated result.

```console
$ pnpm --filter @trade-on-my-behalf/sdk test
ℹ tests 31
ℹ pass 31
ℹ fail 0                      → exit 0

$ pnpm --filter @trade-on-my-behalf/agent test
ℹ tests 37
ℹ pass 37
ℹ fail 0                      → exit 0

$ node scripts/check-tokens.mjs            → exit 0
$ node scripts/check-cvd.mjs               → exit 0
$ pnpm build                               → exit 0
```

**20 Anchor/validator tests**, from a cleaned `target/`, throwaway wallet, local validator with the
program preloaded, `Anchor.toml` untouched at `cluster = "devnet"`:

```console
  treasury
    ✔ creates a policy and authorizes a spend below cap (1130ms)
    ✔ rejects over-cap spend but still emits a denied audit (1385ms)
    ✔ denies a vendor that is not whitelisted (REASON_VENDOR_DENIED=1) (944ms)
    ✔ denies once the daily cap is used up (REASON_DAILY_CAP=3) (1554ms)
    ✔ denies after the policy TTL elapses (REASON_EXPIRED=4) (2478ms)
    ✔ approves leverage at max_leverage_bps and denies leverage above it (1545ms)
    ✔ owner can update_policy max_leverage_bps; subsequent leverage within cap approves (1586ms)
    ✔ rejects update_policy when called by a non-owner signer (393ms)
    ✔ rejects authorize_spend signed by a key that is neither agent nor owner (493ms)
    ✔ agent key can authorize_spend and record_pnl on its own policy (1437ms)
    ✔ agent key cannot loosen the policy via update_policy (530ms)
    ✔ trips on-chain kill-switch when implied equity falls below threshold (REASON_DRAWDOWN_KILLSWITCH=7) (1646ms)
    ✔ rejects leverage below 1x with InvalidLeverage (leverage_bps = 0) (533ms)
    ✔ accepts the 1x floor and rejects just under it (1029ms)
    ✔ rejects amount_usdc == 0 with InvalidAmount (no approved audit, no budget burned) (1028ms)
    ✔ leverage above u16 range stays uncapped when max_leverage_bps == 0 (2808ms)
    ✔ rejects create_policy when the agent does not sign (PDA squatting) (59ms)
    ✔ records the failure in the ledger when a legacy client strips the agent signer (12154ms)
    ✔ a third party's failed squat does not block the real owner (303ms)
    ✔ create_policy requires the agent signer even when owner and attacker agree

  20 passing (33s)
```

**88 cases total** (20 + 31 + 37).

### CI

`.github/workflows/ci.yml` runs two required jobs on every push and pull request to `main`:
`SDK + agent tests` and `Anchor program tests`. A merge ruleset requires both before merge.

Inspected 2026-10-04 via `gh run list --branch main --limit 3`, then confirmed at job level:

```console
$ gh run view 37203451979
✓ main CI · 37203451979
JOBS
✓ Anchor program tests in 5m56s (ID 111439654046)
✓ SDK + agent tests in 48s (ID 111439654145)

$ gh api repos/Therealratoshen/trade-on-my-behalf/actions/runs/37203451979/jobs \
    --jq '.jobs[] | {name, conclusion, head_sha: .head_sha[0:7]}'
{"conclusion":"success","head_sha":"d293398","name":"Anchor program tests"}
{"conclusion":"success","head_sha":"d293398","name":"SDK + agent tests"}
```

<https://github.com/Therealratoshen/trade-on-my-behalf/actions/runs/37203451979>

Both jobs report `success` on `d293398`.

### Not verified

Stated plainly rather than implied:

- **No devnet or mainnet deployment was performed.** `pnpm devnet:demo` was **not** run; it deploys
  and needs ~4 devnet SOL. No public-devnet receipt exists for this work.
- **No browser E2E suite exists** and none was run. There is no checked-in browser harness.
- **The dashboard was not visually confirmed** (see §5).
- **No real venue order was ever placed.** There is no implemented venue adapter. There is no
  Aster integration: `docs/superpowers/specs/2026-10-04-aster-long-short-design.md` is a *design
  document*, and a search of `packages/` and `apps/` returns no Aster code.
- **No outside-developer sessions have been run** — see [user-journey.md](user-journey.md) and
  [user-tests.md](user-tests.md). No real user reactions exist.

---

## 8. What this does not do

The dashboard states this in its `ClaimBoundary` panel, above the fold, on purpose. It is worth
repeating in the same words:

> **Recorded, not enforced.** The program holds no keys and custodies nothing — it cannot call a
> venue. Anyone with a key can still trade without ever asking it, and would leave no row in the
> audit log. What the log proves is that a decision was *made and recorded*, not that a trade was
> *prevented*.

Concretely:

1. **It cannot trade.** No `invoke`, no `invoke_signed`, no `transfer`. Execution authority is the
   gap that is still open.
2. **A `treasury` account is a policy, not a vault.** It is seeded `[b"policy", agent.key()]` and
   holds caps and counters. It holds no token accounts.
3. **Approved ≠ executed.** An approval is a recorded decision. The paper fill that follows is local
   bookkeeping in a JSON file.
4. **Positions are simulated.** `JupiterPerpsPaperVenue` has `mode = 'paper'` as a literal, returns
   `simulated: true`, and its signatures are the pseudo-signature strings `paper:<id>` and
   `paper:close:<id>`. They are not Solana transaction signatures.
5. **The kill-switch trusts the caller.** Equity is caller-reported, not venue-verified.
6. **The daily cap is a budget, not a loss limit.** It bounds approved collateral, and approved
   spend is consumed even if the venue step then fails.
7. **The only venue is the paper Jupiter one.** `resolve-venue` tells you whether the real program
   exists on a cluster; it never switches the runtime out of paper mode.
8. **Vendors are fixed at creation.** There is no `replace_vendors` instruction; rotating venues
   means minting a new agent key, because the PDA seeds on the agent key.

---

## Where to go next

- [user-journey.md](user-journey.md) — three personas through the product.
- [onchain-program.md](onchain-program.md) — the program and its instructions.
- [security-model.md](security-model.md) — what the gate does and does not protect.
- [testing-plan.md](testing-plan.md) — the executed-run record behind every count here.
- [SUBMISSION.md](../SUBMISSION.md) — permitted claims.
