'use client';

import { useMemo, useState } from 'react';
import { REASON_CODES, reasonCodeName } from '@trade-on-my-behalf/sdk';

import { CLUSTER, explorerIsIndexed, explorerTxUrl } from '@/lib/cluster';
import { fmtSlots, fmtUnixTime, fmtUsd, microToUsd, shortAddress } from '@/lib/format';
import type { AuditRow } from '@/lib/trader';

import { Empty, Panel } from './ui';

type Outcome = 'all' | 'approved' | 'denied';
/** `all` is a sentinel, not a reason code. */
type Window = 'all' | '10m' | '1h' | '24h';

const WINDOW_SECONDS: Record<Window, number> = {
  all: Infinity,
  '10m': 600,
  '1h': 3_600,
  '24h': 86_400,
};

const REASON_LIST = Object.values(REASON_CODES)
  .map((code) => ({ code, name: reasonCodeName(code) }))
  .sort((a, b) => a.code - b.code);

/**
 * Panel 3 — every decision the kernel has made for this policy.
 *
 * This is the receipts panel. `authorize_spend` returns Ok on a deny, so the
 * transaction succeeding tells you nothing; the emitted `AuditEvent` is the
 * only place the verdict lives. Nothing here can change a verdict.
 */
export function AuditPanel({
  events,
  loading,
  error,
  isValidating,
}: {
  events: AuditRow[];
  loading: boolean;
  error: string | null;
  isValidating: boolean;
}) {
  const [outcome, setOutcome] = useState<Outcome>('all');
  const [reason, setReason] = useState<number | 'all'>('all');
  const [windowKey, setWindowKey] = useState<Window>('all');

  const filtered = useMemo(() => {
    const cutoff =
      windowKey === 'all' ? 0 : Date.now() / 1000 - WINDOW_SECONDS[windowKey];
    return events.filter((e) => {
      if (outcome === 'approved' && !e.approved) return false;
      if (outcome === 'denied' && e.approved) return false;
      if (reason !== 'all' && e.reasonCode !== reason) return false;
      const when = e.blockTime ?? e.observedAt / 1000;
      return when >= cutoff;
    });
  }, [events, outcome, reason, windowKey]);

  const denied = filtered.filter((e) => !e.approved).length;

  return (
    <Panel
      n={3}
      title="Audit log"
      tier="verdict"
      bare
      aside={
        <>
          {isValidating ? <span className="spin" /> : null}
          <span className="n">
            {filtered.length} shown · {denied} denied · polling 2s
          </span>
        </>
      }
    >
      <div className="toolbar">
        <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)} aria-label="Filter by outcome">
          <option value="all">all outcomes</option>
          <option value="approved">approved only</option>
          <option value="denied">denied only</option>
        </select>

        <select
          value={String(reason)}
          onChange={(e) => setReason(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          aria-label="Filter by reason code"
        >
          <option value="all">all reason codes</option>
          {REASON_LIST.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={windowKey}
          onChange={(e) => setWindowKey(e.target.value as Window)}
          aria-label="Filter by time range"
        >
          <option value="all">all time</option>
          <option value="10m">last 10 min</option>
          <option value="1h">last hour</option>
          <option value="24h">last 24h</option>
        </select>

        <div className="sep" />
        <button type="button" className="btn ghost" onClick={() => { setOutcome('all'); setReason('all'); setWindowKey('all'); }}>
          reset filters
        </button>
      </div>

      {error ? (
        <div className="body">
          <div className="err">Could not read the audit log: {error}</div>
        </div>
      ) : loading && events.length === 0 ? (
        <div className="empty">
          <span className="spin" /> reading the program…
        </div>
      ) : filtered.length === 0 ? (
        events.length === 0 ? (
          <Empty
            title="No decisions recorded yet."
            command="pnpm demo        # or: pnpm --filter @trade-on-my-behalf/agent tomb push-intent"
          >
            Run the demo, or push an intent from the CLI, and every verdict the kernel makes for this policy
            lands here within a couple of seconds.
          </Empty>
        ) : (
          <Empty title="No events match these filters.">
            <button type="button" className="btn ghost" style={{ marginTop: 'var(--s3)' }} onClick={() => { setOutcome('all'); setReason('all'); setWindowKey('all'); }}>
              reset filters
            </button>
          </Empty>
        )
      ) : (
        <table>
          <thead>
            <tr>
              <th>slot</th>
              <th>time</th>
              <th>vendor</th>
              <th className="num">amount</th>
              <th>outcome</th>
              <th>reason</th>
              <th className="num">nonce</th>
              <th>receipt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={`${e.signature}-${e.slot}-${e.nonce.toString()}`}>
                <td>{fmtSlots(e.slot)}</td>
                <td>{fmtUnixTime(e.blockTime ?? Math.floor(e.observedAt / 1000))}</td>
                <td title={e.vendor.toBase58()}>{shortAddress(e.vendor.toBase58(), 4, 4)}</td>
                <td className="num">{fmtUsd(microToUsd(e.amountUsdc))}</td>
                <td>
                  {/* Glyph + text, not colour alone. Under protanopia and
                      deuteranopia --ok and --no separate only by luminance, and
                      achromatopsia collapses them entirely (scripts/check-cvd.mjs).
                      The ▲/▼ and the word carry the meaning without hue. */}
                  <span className={`badge ${e.approved ? 'yes' : 'no'}`}>
                    <span aria-hidden="true">{e.approved ? '▲' : '■'}</span>{' '}
                    {e.approved ? 'APPROVED' : 'DENIED'}
                  </span>
                </td>
                <td>
                  <span className="badge reason">{reasonCodeName(e.reasonCode)}</span>
                </td>
                <td className="num">{e.nonce.toString().slice(-9)}</td>
                <td>
                  {explorerIsIndexed(CLUSTER) ? (
                    <a href={explorerTxUrl(e.signature, CLUSTER)} target="_blank" rel="noreferrer">
                      {shortAddress(e.signature, 4, 4)} ↗
                    </a>
                  ) : (
                    <span className="faint" title="Local validator blocks are not indexed by the public explorer">
                      {shortAddress(e.signature, 4, 4)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
