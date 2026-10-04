#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { reasonCodeName, withTrader, type AuditEvent } from '@trade-on-my-behalf/sdk';

import { createRuntime, type TradeReceipt } from './runtime.js';
import { isMarket, type Market, type PriceFeed } from './venue/index.js';
import { FileStore, JUPITER_PERPS_PROGRAM_ID, JupiterPerpsPaperVenue } from './venue/jupiter-perps.js';
import { JupiterPriceFeed } from './venue/prices.js';

const USAGE = `tomb — Trade On My Behalf agent CLI

Usage: tomb <command> [flags]

Commands
  init-policy   Owner creates the on-chain policy for an agent key
                  --owner <keyfile> --agent <keyfile>
                  [--per-tx 50] [--per-day 150] [--max-leverage 5] [--kill-pct 25] [--ttl-days 7]
  update-policy Owner changes caps (only the flags given)        --owner <keyfile> --agent <keyfile>
                  [--per-tx] [--per-day] [--max-leverage] [--kill-pct] [--ttl-days]
  status        Print the on-chain policy and paper account      --agent <keyfile>
  trade         Send one intent through the policy gate          --agent <keyfile>
                  --market SOL-PERP --side long --collateral 50 --leverage 3
                  [--raw]  send as-is, no clamping to caps (shows the chain blocking a bad agent)
                  [--rationale "text"]
  positions     List open paper positions                        --agent <keyfile>
  close         Close a paper position                           --agent <keyfile> --id <positionId>
  watch         Stream decoded AuditEvents for this policy       --agent <keyfile>
  resolve-venue Check whether a venue program exists on a cluster  jupiter-perps

Global flags
  --url <rpc>            RPC endpoint (default $RPC_URL or http://127.0.0.1:8899)
  --local-validator      Allow writes to a loopback test validator. Off by
                         default: every write is gated on getGenesisHash, so
                         devnet is the only public cluster that passes. A
                         mainnet node on 127.0.0.1 is still refused.
  --paper-state <file>   Paper account file (default ~/.tomb/paper-<agent>.json)
  --paper-cash <usd>     Starting paper cash for a new account (default 1000)
  --price M=P[,M=P]      Override oracle prices, e.g. SOL-PERP=90 (simulate a crash)
  --json                 Machine-readable output
`;

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): { cmd: string | undefined; pos: string[]; flags: Flags } {
  const flags: Flags = {};
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[key] = true;
      else { flags[key] = next; i++; }
    } else pos.push(a);
  }
  return { cmd: pos.shift(), pos, flags };
}

function str(flags: Flags, key: string, fallback?: string): string {
  const v = flags[key];
  if (typeof v === 'string') return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`missing --${key}`);
}

function num(flags: Flags, key: string, fallback?: number): number {
  const v = flags[key];
  if (v === undefined && fallback !== undefined) return fallback;
  const n = Number(v);
  if (typeof v !== 'string' || !Number.isFinite(n)) throw new Error(`--${key} must be a number`);
  return n;
}

function loadKeypair(path: string): Keypair {
  const resolved = path.startsWith('~') ? join(homedir(), path.slice(1)) : path;
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(resolved, 'utf8'))));
}

function explorerTx(sig: string, url: string): string {
  if (url.includes('devnet')) return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
  if (url.includes('mainnet')) return `https://explorer.solana.com/tx/${sig}`;
  return `https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=${encodeURIComponent(url)}`;
}

class OverridePriceFeed implements PriceFeed {
  constructor(private readonly base: PriceFeed, private readonly overrides: Partial<Record<Market, number>>) {}
  async priceUsd(m: Market) {
    return this.overrides[m] ?? this.base.priceUsd(m);
  }
}

function priceFeed(flags: Flags): PriceFeed {
  const overrides: Partial<Record<Market, number>> = {};
  if (typeof flags.price === 'string') {
    for (const pair of flags.price.split(',')) {
      const [m, p] = pair.split('=');
      if (!isMarket(m) || !(Number(p) > 0)) throw new Error(`bad --price entry "${pair}"`);
      overrides[m] = Number(p);
    }
  }
  return new OverridePriceFeed(new JupiterPriceFeed(), overrides);
}

function setup(flags: Flags) {
  const url = str(flags, 'url', process.env.RPC_URL ?? 'http://127.0.0.1:8899');
  const connection = new Connection(url, 'confirmed');
  const agentKp = loadKeypair(str(flags, 'agent'));
  const trader = withTrader({ connection, wallet: agentKp, policy: agentKp.publicKey, allowLocalValidator: flags['local-validator'] === true });
  const statePath = str(flags, 'paper-state', join(homedir(), '.tomb', `paper-${agentKp.publicKey.toBase58()}.json`));
  const venue = new JupiterPerpsPaperVenue(priceFeed(flags), new FileStore(statePath), num(flags, 'paper-cash', 1000));
  const runtime = createRuntime({
    trader,
    venue,
    agent: agentKp.publicKey,
    getSlot: () => connection.getSlot('confirmed'),
    clamp: flags.raw !== true,
  });
  return { url, connection, agentKp, trader, venue, runtime };
}

const usd = (n: number) => `$${n.toFixed(2)}`;

function printReceipt(r: TradeReceipt, url: string): void {
  if (r.dropped) { console.log(`DROPPED  ${r.dropped}`); return; }
  const i = r.intent!;
  console.log(`intent   ${i.side} ${i.market}  collateral ${usd(i.collateralUsd)}  leverage ${i.leverageBps / 100}x`);
  for (const c of i.clamps) console.log(`clamped  ${c}`);
  if (r.recordPnlSignature) console.log(`peak     new equity high recorded on-chain  ${explorerTx(r.recordPnlSignature, url)}`);
  console.log(`equity   ${usd(r.equityUsd ?? 0)} (paper account)`);
  const a = r.audit!;
  const verdict = a.approved ? 'APPROVED' : 'DENIED  ';
  console.log(`chain    ${verdict} ${reasonCodeName(a.reasonCode)}  slot ${a.slot}`);
  console.log(`receipt  ${explorerTx(a.signature, url)}`);
  if (r.mismatch) {
    console.log(`WARNING  off-chain preflight said ${reasonCodeName(r.preflight!.reasonCode)}; chain answer used`);
  }
  if (r.fill) {
    console.log(`fill     ${r.fill.venuePositionId} @ ${usd(r.fill.priceUsd)}  fee ${usd(r.fill.feeUsd)}  (paper — simulated at live Jupiter price)`);
  }
  if (r.venueError) console.log(`VENUE ERROR  ${r.venueError} (spend already counted on-chain)`);
}

function auditLine(e: AuditEvent): string {
  // update_policy / record_pnl emit with vendor = system program (all-zero pubkey).
  const kind = e.vendor.equals(PublicKey.default) ? 'admin' : e.approved ? 'APPROVE' : 'DENY';
  return `${new Date(e.observedAt).toISOString()}  ${kind.padEnd(7)} ${reasonCodeName(e.reasonCode).padEnd(28)} $${(Number(e.amountUsdc.toString()) / 1e6).toFixed(2).padStart(9)}  ${e.signature}`;
}

async function main(argv: string[]): Promise<number> {
  const { cmd, pos, flags } = parseArgs(argv);
  const json = flags.json === true;

  switch (cmd) {
    case 'init-policy': {
      const url = str(flags, 'url', process.env.RPC_URL ?? 'http://127.0.0.1:8899');
      const connection = new Connection(url, 'confirmed');
      const ownerKp = loadKeypair(str(flags, 'owner'));
      const agentKp = loadKeypair(str(flags, 'agent'));
      // The agent is the key being governed, so create_policy requires the
      // agent to co-sign alongside the owner. Both keyfiles are therefore
      // needed here, and `init-policy` must run on the host holding the agent
      // key. The owner never needs custody of it in steady state — only for
      // this one provisioning transaction.
      const owner = withTrader({
        connection,
        wallet: ownerKp,
        policy: agentKp.publicKey,
        agentSigner: agentKp,
        allowLocalValidator: flags['local-validator'] === true,
      });
      const res = await owner.ensurePolicy({
        agent: agentKp.publicKey,
        vendors: [JUPITER_PERPS_PROGRAM_ID],
        perTxCapUsd: num(flags, 'per-tx', 50),
        perDayCapUsd: num(flags, 'per-day', 150),
        maxLeverageBps: Math.round(num(flags, 'max-leverage', 5) * 100),
        killSwitchDrawdownPct: num(flags, 'kill-pct', 25),
        ttlSlots: Math.round(num(flags, 'ttl-days', 7) * 216_000),
      });
      if (json) console.log(JSON.stringify({ policy: owner.policyPda.toBase58(), ...res }));
      else if (res.createdNew) console.log(`policy created  ${owner.policyPda.toBase58()}\nreceipt  ${explorerTx(res.signature, url)}`);
      else console.log(`policy already exists  ${owner.policyPda.toBase58()} (unchanged)`);
      return 0;
    }

    case 'update-policy': {
      const url = str(flags, 'url', process.env.RPC_URL ?? 'http://127.0.0.1:8899');
      const connection = new Connection(url, 'confirmed');
      const ownerKp = loadKeypair(str(flags, 'owner'));
      const agentKp = loadKeypair(str(flags, 'agent'));
      const owner = withTrader({ connection, wallet: ownerKp, policy: agentKp.publicKey, allowLocalValidator: flags['local-validator'] === true });
      const opt = (k: string) => (flags[k] === undefined ? undefined : num(flags, k));
      const lev = opt('max-leverage');
      const days = opt('ttl-days');
      const { signature } = await owner.updatePolicy({
        agent: agentKp.publicKey,
        perTxCapUsd: opt('per-tx'),
        perDayCapUsd: opt('per-day'),
        maxLeverageBps: lev === undefined ? undefined : Math.round(lev * 100),
        killSwitchDrawdownPct: opt('kill-pct'),
        ttlSlots: days === undefined ? undefined : Math.round(days * 216_000),
      });
      console.log(`policy updated  ${owner.policyPda.toBase58()}\nreceipt  ${explorerTx(signature, url)}`);
      return 0;
    }

    case 'status': {
      const { trader, venue } = setup(flags);
      const p = await trader.fetchPolicy();
      if (!p) { console.log('no policy for this agent'); return 1; }
      const m = (v: { toString(): string }) => Number(v.toString()) / 1e6;
      const status = {
        policy: trader.policyPda.toBase58(),
        owner: p.owner.toBase58(),
        agent: p.agent.toBase58(),
        vendors: p.vendors.map((v) => v.toBase58()),
        perTxCapUsd: m(p.per_tx_cap_usdc),
        perDayCapUsd: m(p.per_day_cap_usdc),
        daySpentUsd: m(p.day_spent_usdc),
        maxLeverage: p.max_leverage_bps / 100,
        killSwitchDrawdownPct: p.kill_switch_drawdown_pct,
        peakEquityUsd: m(p.peak_equity_usdc),
        paperEquityUsd: Number((await venue.equityUsd()).toFixed(2)),
        venue: `${venue.name} (${venue.mode})`,
      };
      if (json) console.log(JSON.stringify(status, null, 2));
      else for (const [k, v] of Object.entries(status)) console.log(`${k.padEnd(22)} ${Array.isArray(v) ? v.join(', ') : v}`);
      return 0;
    }

    case 'trade': {
      const { runtime, url } = setup(flags);
      const receipt = await runtime.handle({
        market: str(flags, 'market'),
        side: str(flags, 'side'),
        collateralUsd: num(flags, 'collateral'),
        leverageBps: Math.round(num(flags, 'leverage') * 100),
        rationale: typeof flags.rationale === 'string' ? flags.rationale : undefined,
        source: 'cli',
      });
      if (json) console.log(JSON.stringify(receipt, (_k, v) => (v?.toBase58 ? v.toBase58() : v?.toNumber ? v.toString() : v), 2));
      else printReceipt(receipt, url);
      return receipt.audit?.approved && !receipt.venueError ? 0 : 2;
    }

    case 'positions': {
      const { venue } = setup(flags);
      const ps = await venue.listPositions();
      if (json) { console.log(JSON.stringify(ps, null, 2)); return 0; }
      if (ps.length === 0) console.log('no open positions');
      for (const p of ps) {
        console.log(`${p.venuePositionId}  ${p.side} ${p.market}  collateral ${usd(p.collateralUsd)} x${p.leverageBps / 100}  entry ${usd(p.entryPriceUsd)}  mark ${usd(p.markPriceUsd)}  uPnL ${usd(p.unrealizedPnlUsd)}`);
      }
      console.log(`equity ${usd(await venue.equityUsd())}`);
      return 0;
    }

    case 'close': {
      const { runtime, url } = setup(flags);
      const { fill, recordPnlSignature } = await runtime.close(str(flags, 'id'));
      console.log(`closed   ${fill.venuePositionId} @ ${usd(fill.priceUsd)}  realized ${usd(fill.realizedPnlUsd)}  fee ${usd(fill.feeUsd)}`);
      if (recordPnlSignature) console.log(`peak     new equity high recorded on-chain  ${explorerTx(recordPnlSignature, url)}`);
      return 0;
    }

    case 'watch': {
      const { trader } = setup(flags);
      console.log(`watching AuditEvents for policy ${trader.policyPda.toBase58()} (Ctrl-C to stop)`);
      trader.subscribeAudit((e) => console.log(json ? JSON.stringify(e) : auditLine(e)));
      await new Promise(() => {});
      return 0;
    }

    case 'resolve-venue': {
      const venueName = pos[0] ?? 'jupiter-perps';
      if (venueName !== 'jupiter-perps') throw new Error(`unknown venue ${venueName}; v1 supports jupiter-perps`);
      const url = str(flags, 'url', process.env.RPC_URL ?? 'http://127.0.0.1:8899');
      const info = await new Connection(url, 'confirmed').getAccountInfo(JUPITER_PERPS_PROGRAM_ID);
      const live = info?.executable === true;
      console.log(JUPITER_PERPS_PROGRAM_ID.toBase58());
      console.error(live
        ? `jupiter-perps program is deployed on ${url}`
        : `jupiter-perps program is NOT deployed on ${url}; the runtime uses paper mode. The pubkey above is still the vendor to whitelist.`);
      return 0;
    }

    case undefined:
    case 'help':
    case '--help':
      console.log(USAGE);
      return 0;

    default:
      console.error(`unknown command ${cmd}\n\n${USAGE}`);
      return 1;
  }
}

main(process.argv.slice(2)).then(
  (code) => { if (process.argv[2] !== 'watch') process.exit(code); },
  (err) => { console.error(`error: ${err instanceof Error ? err.message : String(err)}`); process.exit(1); },
);
