import type BN from 'bn.js';
import { MICRO_USDC_PER_USD } from '@trade-on-my-behalf/sdk';

import { CLUSTER, explorerIsIndexed, explorerTxUrl, type ClusterId } from './cluster';

/** micro-USDC (6dp) -> human USD. */
export function microToUsd(v: BN | number | bigint | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const micro =
    typeof v === 'number'
      ? Math.round(v)
      : typeof v === 'bigint'
        ? Number(v)
        : Number(v.toString());
  return micro / Number(MICRO_USDC_PER_USD);
}

export function fmtUsd(n: number, opts: { maxDigits?: number } = {}): string {
  const d = opts.maxDigits ?? 2;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function fmtUsdSigned(n: number): string {
  const s = fmtUsd(Math.abs(n));
  if (n > 0) return `+${s}`;
  if (n < 0) return `-${s}`;
  return s;
}

/** 500 bps -> "5x". 0 is the on-chain sentinel for "no leverage cap". */
export function fmtLeverageBps(bps: number): string {
  if (bps === 0) return 'no cap';
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}x`;
}

export function fmtSlots(n: number | bigint): string {
  const v = typeof n === 'bigint' ? Number(n) : n;
  return v.toLocaleString('en-US');
}

/** ~0.4 s/slot. 432_000 slots renders as "2d". */
export function fmtSlotsAsDuration(slots: number | bigint): string {
  const v = typeof slots === 'bigint' ? Number(slots) : slots;
  const days = (v * 0.4) / 86_400;
  if (days >= 1) return `${days.toFixed(days >= 10 ? 0 : 1)}d`;
  const hours = (v * 0.4) / 3_600;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
}

export function shortAddress(address: string, lead = 4, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** unix seconds -> local wall clock. `null` when the RPC gave us no blockTime. */
export function fmtUnixTime(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function txLink(signature: string, cluster: ClusterId = CLUSTER): string | null {
  return explorerIsIndexed(cluster) ? explorerTxUrl(signature, cluster) : null;
}

export function pct(n: number): string {
  return `${n.toFixed(n >= 10 ? 0 : 1)}%`;
}
