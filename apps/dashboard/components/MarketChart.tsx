'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Market workspace — a real spot price, accumulated honestly.
 *
 * THE HONESTY RULE, and the reason this component is shaped the way it is:
 *
 * The only price source in this repo returns ONE current price. There is no
 * candles/ohlc endpoint here, and this project does not invent a history it
 * does not have. So:
 *
 *  - Every point drawn below is a price Jupiter actually returned, at a
 *    moment this browser actually fetched it. Nothing is interpolated,
 *    simulated, seeded, smoothed or back-filled.
 *  - With fewer than two observations there is no line, and the panel says
 *    so. It does not draw a flat line to fill the space.
 *  - When the feed fails, the last good price is kept but explicitly marked
 *    stale with its age. It is never replaced with a placeholder number.
 *
 * Colour rule: prices use --viz-up/--viz-down only. A green candle would
 * borrow the kernel-approval colour and imply a decision that did not happen.
 * And because --viz-up and --viz-down collapse to dE 2.8 under achromatopsia
 * (scripts/check-cvd.mjs), every direction carries a glyph as well as a colour
 * — WCAG 1.4.1.
 */

export interface QuotePayload {
  ok: boolean;
  market: string;
  priceUsd: number | null;
  fetchedAtMs: number | null;
  source?: string;
  kind?: 'spot';
  suggestedRefreshMs?: number;
  reason?: string;
}

export interface PricePoint {
  /** unix ms — the moment this browser received the price. */
  t: number;
  px: number;
}

const W = 720;
const H = 220;
const PAD = { top: 12, right: 60, bottom: 22, left: 10 };
/** Above this age the price is shown as stale rather than current. */
const STALE_AFTER_MS = 45_000;
/** How many real observations to keep. */
const MAX_POINTS = 180;

function fmtPx(px: number): string {
  if (!Number.isFinite(px)) return '—';
  if (Math.abs(px) >= 1000) return px.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (Math.abs(px) >= 1) return px.toFixed(2);
  return px.toPrecision(4);
}

function fmtAge(ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

/**
 * Polls /api/quote and accumulates the real observations it returns.
 *
 * Sampling here is a side effect of *asking* for a price, not a price history
 * retrieved from somewhere — so the UI must never present the series as a
 * market record. It is what this tab saw while it was open.
 */
export function useSpotSeries(market: string, refreshMs = 15_000) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    seen.current = new Set();
    setPoints([]);

    async function poll() {
      try {
        const res = await fetch('/api/quote?market=' + encodeURIComponent(market), {
          cache: 'no-store',
        });
        if (cancelled) return;
        const body = (await res.json()) as QuotePayload;
        if (body.ok && typeof body.priceUsd === 'number' && body.fetchedAtMs) {
          setError(null);
          const t = body.fetchedAtMs as number;
          setPoints((prev) => {
            // A repeated price at the same instant is not a new observation.
            if (seen.current.has(t)) return prev;
            seen.current.add(t);
            const next = [...prev, { t, px: body.priceUsd as number }];
            return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
          });
        } else {
          setError(body.reason ?? 'quote unavailable');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void poll();
    const id = setInterval(poll, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [market, refreshMs]);

  // Drives the "as of Xs ago" label without re-fetching.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const last = points.length > 0 ? points[points.length - 1] : null;
  const stale = last !== null && now - last.t > STALE_AFTER_MS;

  return { points, last, error, loading, stale, now };
}

export function MarketChart({
  market,
  series,
}: {
  market: string;
  series: ReturnType<typeof useSpotSeries>;
}) {
  const { points, last, error, loading, stale, now } = series;
  const [hover, setHover] = useState<number | null>(null);

  const view = useMemo(() => {
    if (points.length < 2) return null;
    const lo = Math.min(...points.map((p) => p.px));
    const hi = Math.max(...points.map((p) => p.px));
    // A flat series divides by zero; pad so the line renders mid-height.
    const span = hi - lo || Math.abs(hi) || 1;
    const y0 = lo - span * 0.08;
    const y1 = hi + span * 0.08;

    const x = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
    const y = (px: number) => PAD.top + (1 - (px - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);

    const line = points
      .map((p, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(p.px).toFixed(1))
      .join(' ');
    const area =
      line +
      ' L' + x(points.length - 1).toFixed(1) + ' ' + (H - PAD.bottom) +
      ' L' + PAD.left + ' ' + (H - PAD.bottom) + ' Z';

    const step = Math.max(1, Math.ceil(points.length / 5));
    const ticks = points
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => i % step === 0 || i === points.length - 1)
      .slice(0, 6)
      .map(({ p, i }) => ({ px: p.px, y: y(p.px), label: fmtPx(p.px), i }));

    return { line, area, ticks, y };
  }, [points]);

  // A single point has no direction, so there is deliberately no change value.
  const change = points.length >= 2 && last !== null ? last.px - points[0].px : null;
  const changePct = change !== null && points[0].px !== 0 ? (change / points[0].px) * 100 : null;
  const up = change === null ? null : change >= 0;

  return (
    <div>
      <div className="workspace-head">
        <div className="market-id">
          <span className="sym">{market}</span>
          <span className="venue">Jupiter perps · reference spot</span>
        </div>
        <div className="price-readout">
          <span className="px">{last !== null ? fmtPx(last.px) : '—'}</span>
          {change !== null && changePct !== null ? (
            <span className={'chg ' + (up ? 'up' : 'down')}>
              {/* Glyph + sign, so direction survives achromatopsia where
                  --viz-up and --viz-down collapse to dE 2.8. */}
              <span aria-hidden="true">{up ? '▲' : '▼'}</span>{' '}
              {up ? '+' : '−'}
              {fmtPx(Math.abs(change))} ({up ? '+' : '−'}
              {Math.abs(changePct).toFixed(2)}%)
            </span>
          ) : (
            <span className="chg dim">spot · no change yet</span>
          )}
        </div>
      </div>

      <div className="provenance">
        <span>source jupiter lite-api v3</span>
        <span className="sep" />
        <span>spot price · not a fill</span>
        <span className="sep" />
        <span>{points.length} obs this session</span>
        <span className="sep" />
        {error !== null ? (
          <span className="stale">feed error — {error}</span>
        ) : last === null ? (
          <span className="stale">{loading ? 'fetching…' : 'no quote yet'}</span>
        ) : stale ? (
          <span className="stale">stale · {fmtAge(last.t, now)}</span>
        ) : (
          <span className="fresh">as of {fmtAge(last.t, now)}</span>
        )}
      </div>

      {view === null ? (
        <div className="chart-frame" style={{ marginTop: 'var(--s3)' }}>
          <div className="empty">
            <strong>
              {loading ? 'Waiting for the first price…' : 'One observation so far.'}
            </strong>
            A line needs two. This surface draws only prices Jupiter actually
            returned to this tab — it never invents history to fill the space.
            {error !== null ? (
              <>
                <br />
                <span className="mono">feed error: {error}</span>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="chart-frame" style={{ marginTop: 'var(--s3)' }}>
          <svg
            viewBox={'0 0 ' + W + ' ' + H}
            role="img"
            aria-label={
              market +
              ' reference spot, ' + points.length + ' observations this session, currently ' +
              (last !== null ? fmtPx(last.px) : 'unknown') +
              '. The same values are in the table below.'
            }
            onMouseLeave={() => setHover(null)}
          >
            <g className="chart-grid">
              {view.ticks.map((t) => (
                <line key={'g' + t.i} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} />
              ))}
            </g>
            <path className="chart-area" d={view.area} />
            <path className="chart-line" d={view.line} />
            <g className="chart-axis">
              {view.ticks.map((t) => (
                <text key={'t' + t.i} x={W - PAD.right + 6} y={t.y + 3} textAnchor="end">
                  {t.label}
                </text>
              ))}
            </g>
            {hover !== null && points[hover] !== undefined ? (
              <>
                <line
                  className="chart-crosshair"
                  x1={PAD.left}
                  y1={PAD.top}
                  x2={PAD.left + (hover / (points.length - 1)) * (W - PAD.left - PAD.right)}
                  y2={H - PAD.bottom}
                />
                <circle
                  className="chart-candle up"
                  cx={PAD.left + (hover / (points.length - 1)) * (W - PAD.left - PAD.right)}
                  cy={view.y(points[hover].px)}
                  r={3}
                />
              </>
            ) : null}
            <rect
              x={0}
              y={0}
              width={W}
              height={H}
              fill="transparent"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const rel = (e.clientX - rect.left) / rect.width;
                const i = Math.round(rel * (points.length - 1));
                setHover(Math.max(0, Math.min(points.length - 1, i)));
              }}
            />
          </svg>
        </div>
      )}

      {points.length > 0 ? (
        <table className="chart-alt">
          <caption>
            {market} — {points.length} reference observations this tab fetched. The same
            numbers the line above uses, readable without it.
          </caption>
          <thead>
            <tr>
              <th scope="col">Observed</th>
              <th scope="col">Spot</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(-12).map((p, i, arr) => {
              const prev = i > 0 ? arr[i - 1] : undefined;
              const d = prev !== undefined ? p.px - prev.px : null;
              return (
                <tr key={p.t}>
                  <td>{new Date(p.t).toLocaleTimeString()}</td>
                  <td>{fmtPx(p.px)}</td>
                  <td
                    className="dir"
                    style={{
                      color:
                        d === null
                          ? 'var(--fg-faint)'
                          : d >= 0
                            ? 'var(--viz-up)'
                            : 'var(--viz-down)',
                    }}
                  >
                    {d === null ? (
                      '—'
                    ) : (
                      <>
                        <span aria-hidden="true">{d >= 0 ? '▲' : '▼'}</span>{' '}
                        {d >= 0 ? '+' : '−'}
                        {fmtPx(Math.abs(d))}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
