'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { MARKET_FIXTURES, makeSyntheticCandles, type PaperMarket, type PaperRiskPlan, type PaperSide, type PaperTimeframe } from './paper-practice-model';
import { PaperRiskWorkbench } from './PaperRiskWorkbench';

const timeframes: PaperTimeframe[] = ['5m', '15m', '1H', '4H'];
const leverageOptions = [1, 2, 3, 5, 10];
const money = (value: number, digits = 2) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function PaperPractice() {
  const [market, setMarket] = useState<PaperMarket>('SOL-PERP');
  const [timeframe, setTimeframe] = useState<PaperTimeframe>('1H');
  const [side, setSide] = useState<PaperSide>('Long');
  const [size, setSize] = useState('0.08');
  const [leverage, setLeverage] = useState('2');
  const [stale, setStale] = useState(false);
  const [preview, setPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'Positions' | 'Receipts'>('Positions');
  const quote = MARKET_FIXTURES[market];
  const asset = market.split('-')[0];
  const parsedSize = Number(size);
  const parsedLeverage = Number(leverage);
  const valid = size.trim() !== '' && Number.isFinite(parsedSize) && parsedSize > 0
    && Number.isFinite(parsedLeverage) && parsedLeverage > 0
    && Number.isFinite(parsedSize * quote.price) && Number.isFinite(parsedSize * quote.price / parsedLeverage);
  const notional = valid ? parsedSize * quote.price : 0;
  const collateral = valid ? notional / parsedLeverage : 0;
  const candles = useMemo(() => makeSyntheticCandles(market, timeframe), [market, timeframe]);
  const clearPreview = () => setPreview(false);

  function applyPlan(plan: PaperRiskPlan) {
    if (stale || plan.entry !== quote.price || plan.side !== side.toLowerCase()
        || !Number.isFinite(plan.quantity) || plan.quantity <= 0 || !leverageOptions.includes(plan.leverage)) return;
    setSize(String(plan.quantity));
    setLeverage(String(plan.leverage));
    clearPreview();
    const ticket = document.getElementById('paper-ticket');
    ticket?.focus({ preventScroll: true });
    ticket?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  return (
    <div className="pp-app">
      <a className="pp-skip" href="#pp-content">Skip to paper-practice content</a>
      <header className="pp-top">
        <Link className="pp-brand" href="/" aria-label="Terading control surface">
          <span className="pp-mark" aria-hidden="true">T/</span>
          <span>TERADING<small>AUTHORITY BEFORE ACTION</small></span>
        </Link>
        <nav className="pp-top-nav" aria-label="App navigation">
          <Link href="/">CONTROL SURFACE</Link>
          <Link href="/paper-practice" className="pp-current" aria-current="page">PAPER PRACTICE</Link>
        </nav>
        <div className="pp-top-right"><span className="pp-pill pp-pill-sample"><i aria-hidden="true"/> SAMPLE / PAPER</span><span className="pp-mainnet-note">NO MAINNET FALLBACK</span></div>
      </header>

      <div className="pp-layout">
        <aside className="pp-rail" aria-label="Paper-practice workspace">
          <div className="pp-rail-kicker">Workspace</div>
          <Link className="pp-rail-link" href="/">◈ <span>Control surface</span></Link>
          <Link className="pp-rail-link pp-rail-active" href="/paper-practice" aria-current="page">⌁ <span>Paper practice</span></Link>
          <div className="pp-rail-kicker pp-principles">Principles</div>
          <div className="pp-rail-principle"><b>01</b> Authority before action</div>
          <div className="pp-rail-principle"><b>02</b> Learn, not earn</div>
          <div className="pp-rail-principle"><b>03</b> Review privately</div>
          <div className="pp-rail-note"><strong>PAPER IS NOT EXECUTION</strong>Fictional sample fixtures only. This page never requests wallet signatures.</div>
        </aside>

        <main className="pp-main" id="pp-content">
          <div className="pp-notice"><strong>CONCEPT / PAPER PRACTICE</strong><span>·</span> All market and depth fixtures are fictional · preview is local UI state only</div>
          <div className="pp-title-row">
            <div><div className="pp-eyebrow">PAPER PRACTICE / TERMINAL</div><h1>Study the setup.<br/>Keep the boundary.</h1><p>A fictional market lab for checking a hypothetical idea. Nothing here can submit an order.</p></div>
            <div className="pp-heading-actions">
              <label className="pp-market-picker"><span>MARKET FIXTURE</span><select aria-label="Select sample market" value={market} onChange={(event) => { setMarket(event.target.value as PaperMarket); clearPreview(); }} data-testid="select-paper-market">
                {(Object.keys(MARKET_FIXTURES) as PaperMarket[]).map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
              </select></label>
              <span className="pp-pill pp-pill-sample">SYNTHETIC DATA</span>
            </div>
          </div>

          <div className="pp-stats" aria-label="Fictional sample market statistics">
            <div><label>Reference price · sample</label><strong>{quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<em>USD*</em></strong></div>
            <div><label>24h change fixture</label><strong className={quote.change.startsWith('+') ? 'pp-positive' : 'pp-negative'}>{quote.change}</strong></div>
            <div><label>High / low fixture</label><strong>{quote.high.toLocaleString('en-US')} / {quote.low.toLocaleString('en-US')}</strong></div>
            <div><label>Volume fixture</label><strong>{quote.volume}</strong></div>
            <div><label>Funding fixture</label><strong>{quote.funding}</strong></div>
          </div>

          <div className="pp-workspace">
            <div className="pp-col pp-market-col">
              <section className="pp-panel" aria-label="Synthetic sample price context">
                <div className="pp-quote-head">
                  <div><div className="pp-pair">{market}<small>PERPETUAL / SAMPLE</small></div><div className="pp-price">{money(quote.price)}<span>REFERENCE · FICTIONAL</span></div></div>
                  <button className="pp-button pp-button-secondary" type="button" onClick={() => { setStale((value) => !value); clearPreview(); }} aria-label={stale ? 'Restore fictional sample data' : 'Simulate stale sample data'} data-testid="button-toggle-stale">{stale ? '↻ Restore sample' : '↻ Test stale state'}</button>
                </div>
                <div className="pp-panel-head"><span>Price context · illustrative candles</span><div className="pp-timeframes" role="group" aria-label="Chart timeframe">
                  {timeframes.map((frame) => <button key={frame} type="button" className={timeframe === frame ? 'pp-button pp-timeframe pp-timeframe-active' : 'pp-button pp-timeframe'} aria-pressed={timeframe === frame} onClick={() => { setTimeframe(frame); clearPreview(); }} data-testid={'button-timeframe-' + frame}>{frame}</button>)}
                </div></div>
                <SyntheticChart market={market} timeframe={timeframe} stale={stale} candles={candles}/>
                <div className="pp-chart-foot"><span>Fictional OHLC fixture · no chart service</span><span className="pp-frame-note">{stale ? 'STALE SAMPLE · PREVIEW BLOCKED' : 'LOCAL FIXTURE · NOT A QUOTE'}</span></div>
              </section>

              <section className="pp-panel pp-ledger" aria-label="Paper ledger">
                <div className="pp-tabs" role="tablist" aria-label="Paper ledger views">
                  {(['Positions', 'Receipts'] as const).map((tab) => <button key={tab} type="button" role="tab" className="pp-tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} data-testid={'tab-paper-' + tab.toLowerCase()}>{tab} <span>· SAMPLE</span></button>)}
                </div>
                {activeTab === 'Positions' ? <div className="pp-empty"><strong>No paper positions recorded</strong>A local preview is not a fill. This page does not create positions, save trades, or report PnL.</div> : (
                  <div className="pp-table-wrap"><table className="pp-table"><thead><tr><th>Example</th><th>State</th><th>Provenance</th></tr></thead><tbody>
                    <tr><td>EX-014</td><td>Example only</td><td>SAMPLE / none submitted</td></tr>
                    <tr><td>EX-013</td><td>Example only</td><td>SAMPLE / no venue attempt</td></tr>
                  </tbody></table></div>
                )}
              </section>
            </div>

            <div className="pp-col pp-book-col">
              <OrderBook market={market} mid={quote.price}/>
              <section className="pp-panel pp-budget">
                <div className="pp-panel-title">Fictional collateral budget · SAMPLE</div>
                <div className="pp-budget-line"><span>SIMULATED USED</span><strong>34.000000</strong></div>
                <div className="pp-progress" role="img" aria-label="Illustration: 34 percent of fictional sample collateral cap used"><span/></div>
                <div className="pp-budget-line"><span>SIMULATED CAP</span><strong>100.000000</strong></div>
                <div className="pp-budget-line"><span>REMAINING · SAMPLE</span><strong>66.000000</strong></div>
                <p>Illustrative six-decimal units. Not wallet balance, live policy usage, or maximum loss. Example reset: after a lazy 216,000-slot interval—not midnight or an exact 24 hours.</p>
              </section>
            </div>

            <aside className="pp-col pp-ticket-col" id="paper-ticket" tabIndex={-1} aria-label="Hypothetical paper decision ticket">
              <section className="pp-panel" aria-label="Illustrative paper decision ticket">
                <div className="pp-panel-head"><span>Decision ticket / hypothetical</span><span className="pp-pill pp-pill-sample">NO ORDER</span></div>
                <div className="pp-ticket">
                  <div className="pp-side-toggle" role="group" aria-label="Hypothetical position direction">
                    {(['Long', 'Short'] as const).map((direction) => <button key={direction} className={'pp-side pp-side-' + direction.toLowerCase() + (side === direction ? ' pp-side-active' : '')} type="button" aria-pressed={side === direction} onClick={() => { setSide(direction); clearPreview(); }} data-testid={'button-paper-' + direction.toLowerCase()}>{direction === 'Long' ? '↗' : '↘'} {direction}</button>)}
                  </div>
                  <label className="pp-field">POSITION SIZE / {asset}
                    <span className="pp-input-wrap"><input type="number" inputMode="decimal" min="0" step="any" value={size} aria-label={'Hypothetical position size in ' + asset} aria-invalid={!valid} onChange={(event) => { setSize(event.target.value); clearPreview(); }} data-testid="input-paper-size"/><b>{asset}</b></span>
                  </label>
                  {!valid && <div role="alert" className="pp-caption pp-field-alert">Enter a finite, positive size and leverage to calculate this hypothetical.</div>}
                  <label className="pp-field">LEVERAGE / PREVIEW<select aria-label="Hypothetical leverage" value={leverage} onChange={(event) => { setLeverage(event.target.value); clearPreview(); }} data-testid="select-paper-leverage">
                    {leverageOptions.map((value) => <option key={value} value={value}>{value}×</option>)}
                  </select></label>
                  <div className="pp-ticket-math">
                    <div><span>Reference notional</span><strong>{valid ? money(notional) : '—'} SAMPLE USD</strong></div>
                    <div><span>Collateral estimate</span><strong>{valid ? money(collateral) : '—'} SAMPLE USD</strong></div>
                    <div><span>Input formula</span><strong>{valid ? size + ' ' + asset + ' × ' + money(quote.price) : 'size × sample price'}</strong></div>
                  </div>
                  <div className="pp-policy-note"><strong>AUTHORITY / UNKNOWN</strong>No policy verification, chain submission, venue attempt, wallet, signing, or order flow exists in this local preview.</div>
                  <button className="pp-button pp-button-primary pp-preview-button" type="button" disabled={stale || !valid} onClick={() => setPreview(true)} data-testid="button-preview-paper">Preview paper scenario only</button>
                  <button className="pp-button pp-button-secondary pp-clear-button" type="button" onClick={clearPreview} data-testid="button-clear-paper">Clear / no order</button>
                  <p className="pp-caption">Scenario only. Estimates are not loss protection. No fills, positions, or PnL are created.</p>
                  {preview && <div className="pp-preview-status" role="status" data-testid="status-paper-preview"><strong>LOCAL PAPER PREVIEW READY</strong>{side} · {size} {asset} · {leverage}× · notional {money(notional)} sample USD. No order sent; no position, fill, or PnL recorded.</div>}
                  {stale && <div className="pp-policy-note pp-stale-note" role="status"><strong>SAMPLE MARKED STALE</strong>New previews are blocked until the fictional fixture is restored.</div>}
                </div>
              </section>
            </aside>
          </div>

          <details className="pp-tools" onToggle={clearPreview} data-testid="details-paper-tools">
            <summary><span className="pp-tools-icon" aria-hidden="true">⌘</span><span><strong>Risk planner &amp; pattern observations</strong><small>Optional tools · edit assumptions, review outputs, or analyze manually supplied closes</small></span><i aria-hidden="true"/></summary>
            <div className="pp-tools-content"><PaperRiskWorkbench key={market} market={market} samplePrice={quote.price} side={side} stale={stale} onApplyPlan={applyPlan}/></div>
          </details>

          <div className="pp-footer" aria-label="Paper practice boundary"><span>Policy authority: unknown</span><span>Chain: not submitted</span><span>Venue: not attempted</span><span>Fictional sample data · no orders</span></div>
        </main>
      </div>

      <nav className="pp-mobile-nav" aria-label="Mobile navigation">
        <Link href="/">⌂<span>Control</span></Link>
        <Link className="pp-mobile-active" href="/paper-practice" aria-current="page">⌁<span>Practice</span></Link>
        <a href="#paper-ticket">↗<span>Ticket</span></a>
      </nav>
    </div>
  );
}

function SyntheticChart({ market, timeframe, stale, candles }: {
  market: PaperMarket;
  timeframe: PaperTimeframe;
  stale: boolean;
  candles: ReturnType<typeof makeSyntheticCandles>;
}) {
  return (
    <div className="pp-chart">
      <span className="pp-chart-label">SYNTHETIC OHLC · {timeframe} · SAMPLE</span>
      <svg viewBox="0 0 700 120" preserveAspectRatio="none" role="img" aria-label={market + ' synthetic illustrative sample candlesticks, not live market data'}>
        {[18, 43, 68, 93, 118].map((y) => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="#34494b" strokeWidth="1" strokeDasharray="2 5"/>)}
        <path d="M0 102 C65 94 108 83 156 86 S240 61 300 69 S382 42 445 51 S550 28 700 15 L700 120 L0 120Z" fill="#85d7ce" opacity=".045"/>
        {candles.map((candle, index) => {
          const up = candle.close < candle.open;
          const color = up ? '#85d7ce' : '#ee9a84';
          return <g key={index} stroke={color} fill={color}><line x1={candle.x} x2={candle.x} y1={candle.high} y2={candle.low} strokeWidth="1"/><rect x={candle.x - 4} y={Math.min(candle.open, candle.close)} width="8" height={Math.max(3, Math.abs(candle.close - candle.open))} opacity=".88"/></g>;
        })}
        {!stale && <line x1="0" y1="29" x2="700" y2="29" stroke="#c8e77b" strokeWidth="1" strokeDasharray="4 4" opacity=".8"/>}
      </svg>
    </div>
  );
}

function OrderBook({ mid, market }: { mid: number; market: PaperMarket }) {
  const factor = market === 'BTC-PERP' ? 470 : market === 'ETH-PERP' ? 23 : 1;
  return (
    <section className="pp-panel" aria-label="Fictional sample order book">
      <div className="pp-panel-head"><span>Illustrative order book</span><span className="pp-pill pp-pill-sample">SAMPLE</span></div>
      <div className="pp-book-heading"><span>Price</span><span>Size</span><span>Value</span><span>Source</span></div>
      {[4, 3, 2, 1, 0].map((index) => <BookRow key={'ask-' + index} index={index} price={mid + (index + 1) * 0.07 * factor} direction="ask"/>)}
      <div className="pp-spread"><span>Sample spread</span><strong>{(0.14 * factor).toFixed(2)} · fictional</strong></div>
      {[0, 1, 2, 3, 4].map((index) => <BookRow key={'bid-' + index} index={index} price={mid - (index + 1) * 0.07 * factor} direction="bid"/>)}
      <div className="pp-book-foot"><span>Size: {market.split('-')[0]} · value: sample USD</span><span>Not executable</span></div>
    </section>
  );
}

function BookRow({ index, price, direction }: { index: number; price: number; direction: 'ask' | 'bid' }) {
  const quantity = [12.4, 8.75, 17.2, 5.8, 21.1][index];
  return <div className={'pp-book-row pp-book-' + direction}><i style={{ width: (21 + ((index * 17) % 53)) + '%' }} aria-hidden="true"/><span>{money(price)}</span><span>{quantity.toFixed(2)}</span><span>{money(quantity * price, 0)}</span><span>SAMPLE</span></div>;
}
