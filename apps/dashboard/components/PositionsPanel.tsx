'use client';

import { CLUSTER, explorerAddressUrl, explorerIsIndexed } from '@/lib/cluster';
import { fmtLeverageBps, fmtUsd, fmtUsdSigned, fmtUnixTime, shortAddress } from '@/lib/format';
import type { PositionsResponse } from '@/app/api/positions/route';

import { Empty, Field, Panel } from './ui';

type Payload =
  | (PositionsResponse & { ok: true })
  | { ok: false; reason: string; positions: [] };

/**
 * Panel 4 — open positions at the venue.
 *
 * Read-only by construction. The venue adapter is the only thing that can
 * open or close a position, and the webapp has no instruction to the venue at
 * all — the kernel's verdict is what let the runtime open these.
 */
export function PositionsPanel({
  data,
  loading,
  error,
}: {
  data: Payload | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Panel
      n={4}
      title="Positions (read-only)"
      tier="exposure"
      aside={<span className="n">jupiter-perps · paper</span>}
    >
      {error ? (
        <div className="err">Could not read positions: {error}</div>
      ) : loading && !data ? (
        <div className="empty">
          <span className="spin" /> reading the paper venue…
        </div>
      ) : !data || data.ok === false ? (
        <Empty
          title="No paper venue state found."
          command="pnpm demo"
        >
          {data && data.ok === false ? data.reason : 'Waiting for the first response…'}
          <br />
          The positions panel reads the runtime&rsquo;s paper state file through{' '}
          <code className="mono">/api/positions</code>; the on-chain panels above work without it.
        </Empty>
      ) : data.positions.length === 0 ? (
        <Empty title="No open positions.">
          The kernel approved nothing yet, or the venue has closed everything. Approved trades open here
          automatically — there is no button anywhere in this app to open one.
          {data.statePath ? (
            <div style={{ marginTop: 'var(--s3)' }}>
              <span className="faint" style={{ fontSize: 'var(--t-sm)' }}>
                state: <span className="mono">{data.statePath}</span>
              </span>
            </div>
          ) : null}
        </Empty>
      ) : (
        <>
          {data.pricesStale ? (
            <div className="note" style={{ marginBottom: 'var(--s3)' }}>
              <span className="badge mute">marks stale</span>{' '}
              Live price feed unavailable ({data.priceError}); every position is marked at its entry price, so
              PnL reads $0. On-chain state below is unaffected.
            </div>
          ) : null}

          <div className="grid" style={{ marginBottom: 'var(--s4)' }}>
            <Field k="equity" v={fmtUsd(data.equityUsd)} sub="cash + unrealized PnL" />
            <Field k="free cash" v={fmtUsd(data.cashUsd)} />
            <Field k="open positions" v={String(data.positions.length)} />
            <Field k="venue program" v={shortAddress(data.programId, 6, 6)} />
          </div>

          <table>
            <thead>
              <tr>
                <th>market</th>
                <th>side</th>
                <th className="num">collateral</th>
                <th className="num">leverage</th>
                <th className="num">notional</th>
                <th className="num">entry</th>
                <th className="num">mark</th>
                <th className="num">unrealized PnL</th>
                <th>opened</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((p) => (
                <tr key={p.venuePositionId}>
                  <td>{p.market}</td>
                <td>
                  {/* Side is market intent, never a verdict. It used to reuse
                      the `yes` badge, which rendered LONG in the same green as
                      APPROVED in the audit log — two different meanings, one
                      colour. `.side-long` / `.side-short` are neutral, and the
                      arrow glyph carries the meaning without colour at all
                      (WCAG 1.4.1: colour must never be the only cue). */}
                  <span className={`badge side-${p.side}`}>
                    <span aria-hidden="true">{p.side === 'long' ? '▲' : '▼'}</span> {p.side.toUpperCase()}
                  </span>
                </td>
                  <td className="num">{fmtUsd(p.collateralUsd)}</td>
                  <td className="num">{fmtLeverageBps(p.leverageBps)}</td>
                  <td className="num">{fmtUsd(p.notionalUsd)}</td>
                  <td className="num">{fmtUsd(p.entryPriceUsd, { maxDigits: 4 })}</td>
                  <td className="num">{fmtUsd(p.markPriceUsd, { maxDigits: 4 })}</td>
                  <td className={`num ${p.unrealizedPnlUsd >= 0 ? 'pos' : 'neg'}`}>
                    {/* Sign + arrow, not colour. --viz-up and --viz-down sit at
                        dE 2.8 under achromatopsia — indistinguishable without
                        this glyph. */}
                    <span aria-hidden="true">{p.unrealizedPnlUsd >= 0 ? '▲' : '▼'}</span>{' '}
                    {fmtUsdSigned(p.unrealizedPnlUsd)}
                  </td>
                  <td>{fmtUnixTime(p.openedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="faint" style={{ marginTop: 'var(--s3)', fontSize: 'var(--t-sm)' }}>
            source: <span className="mono">{data.statePath}</span>
            {explorerIsIndexed(CLUSTER) ? (
              <>
                {' · '}
                <a href={explorerAddressUrl(data.programId, CLUSTER)} target="_blank" rel="noreferrer">
                  venue program ↗
                </a>
              </>
            ) : null}
          </div>
        </>
      )}
    </Panel>
  );
}
