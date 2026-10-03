'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  analyzeSampleCloses,
  calculatePaperRisk,
  parseSampleCloses,
  type PaperMarket,
  type PaperRiskInput,
  type PaperRiskPlan,
  type PaperSide,
  type PatternObservation,
} from './paper-practice-model';

type EditableField = Exclude<keyof PaperRiskInput, 'side'>;
type FieldValues = Record<EditableField, string>;
type Calculation = { plan: PaperRiskPlan | null; errors: Partial<Record<EditableField, string>>; message: string };

const fieldLabels: Record<EditableField, string> = {
  equity: 'Paper equity',
  riskPercent: 'Risk budget',
  entry: 'Entry price',
  stop: 'Illustrative stop',
  target: 'Illustrative target',
  leverage: 'Leverage',
  feeBps: 'Fee per leg',
  slippageBps: 'Slippage per leg',
  perTradeCap: 'Per-trade collateral cap',
  dailyRemaining: 'Daily collateral remaining',
};
const numericFields: EditableField[] = [
  'equity', 'riskPercent', 'entry', 'stop', 'target', 'leverage', 'feeBps', 'slippageBps', 'perTradeCap', 'dailyRemaining',
];
const money = (value: number, digits = 2) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function PaperRiskWorkbench({
  market,
  samplePrice,
  side,
  stale,
  onApplyPlan,
}: {
  market: PaperMarket;
  samplePrice: number;
  side: PaperSide;
  stale: boolean;
  onApplyPlan: (plan: PaperRiskPlan) => void;
}) {
  const [values, setValues] = useState<FieldValues>(() => {
    const long = side === 'Long';
    return {
      equity: '1000',
      riskPercent: '1',
      entry: String(samplePrice),
      stop: String(samplePrice * (long ? 0.98 : 1.02)),
      target: String(samplePrice * (long ? 1.04 : 0.96)),
      leverage: '2',
      feeBps: '10',
      slippageBps: '10',
      perTradeCap: '50',
      dailyRemaining: '66',
    };
  });
  const [closesText, setClosesText] = useState('');
  const [pattern, setPattern] = useState<PatternObservation | null>(null);
  const [patternError, setPatternError] = useState('');
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const long = side === 'Long';
    setValues((current) => ({
      ...current,
      entry: String(samplePrice),
      stop: String(samplePrice * (long ? 0.98 : 1.02)),
      target: String(samplePrice * (long ? 1.04 : 0.96)),
    }));
    setApplied(false);
  }, [samplePrice, side]);

  const calculation: Calculation = useMemo(() => {
    const errors: Partial<Record<EditableField, string>> = {};
    const parsed: Partial<Record<EditableField, number>> = {};
    for (const key of numericFields) {
      const raw = values[key].trim();
      if (raw === '') {
        errors[key] = fieldLabels[key] + ' is required.';
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        errors[key] = fieldLabels[key] + ' must be a finite number.';
        continue;
      }
      parsed[key] = value;
    }
    if (Object.keys(errors).length) return { plan: null, errors, message: '' };

    try {
      const input: PaperRiskInput = {
        side: side === 'Long' ? 'long' : 'short',
        equity: parsed.equity!,
        riskPercent: parsed.riskPercent!,
        entry: parsed.entry!,
        stop: parsed.stop!,
        target: parsed.target!,
        leverage: parsed.leverage!,
        feeBps: parsed.feeBps!,
        slippageBps: parsed.slippageBps!,
        perTradeCap: parsed.perTradeCap!,
        dailyRemaining: parsed.dailyRemaining!,
      };
      return { plan: calculatePaperRisk(input), errors, message: '' };
    } catch (error) {
      return { plan: null, errors, message: error instanceof Error ? error.message : 'These sample inputs could not be calculated.' };
    }
  }, [values, side]);

  const entryMatchesSample = values.entry.trim() !== '' && Number.isFinite(Number(values.entry)) && Number(values.entry) === samplePrice;
  const canApply = !stale && entryMatchesSample && calculation.plan !== null && calculation.plan.side === side.toLowerCase();

  function updateField(field: EditableField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setApplied(false);
  }

  function analyze() {
    try {
      setPattern(analyzeSampleCloses(parseSampleCloses(closesText)));
      setPatternError('');
    } catch (error) {
      setPattern(null);
      setPatternError(error instanceof Error ? error.message : 'Could not analyze these sample closes.');
    }
  }

  const crossoverLabel = pattern?.crossover === 'up' ? 'Up crossover' : pattern?.crossover === 'down' ? 'Down crossover' : 'No crossover';
  const rangeLabel = pattern?.breakout === 'above' ? 'Above prior range' : pattern?.breakout === 'below' ? 'Below prior range' : 'Inside prior range';

  return (
    <section className="pp-workbench-root" aria-labelledby="pp-risk-title">
      <header className="pp-risk-heading">
        <div>
          <div className="pp-eyebrow">PRACTICE TOOL / RISK WORKBENCH</div>
          <h2 id="pp-risk-title">Size the idea before the ticket.</h2>
          <p>Explore an illustrative position plan against the current sample price. Nothing is sent or opened.</p>
        </div>
        <span className="pp-badge">PAPER ONLY</span>
      </header>

      <div className="pp-risk-disclaimer" role="note">
        <span aria-hidden="true">!</span>
        <p><strong>Illustrative assumptions—not verified policy or account data.</strong> Budgets limit modeled collateral, not net losses. Stop prices are not guaranteed fills; actual losses can exceed these estimates.</p>
      </div>

      <div className="pp-risk-grid">
        <section className="pp-risk-panel" aria-labelledby="pp-inputs-title">
          <div className="pp-risk-panel-head"><div><span className="pp-index">01</span><h3 id="pp-inputs-title">Scenario inputs</h3></div><span className="pp-market-label">{market} · SAMPLE</span></div>
          <div className="pp-risk-fields">
            <RiskField label="Paper equity" suffix="sample USD" value={values.equity} error={calculation.errors.equity} onChange={(value) => updateField('equity', value)} testId="input-risk-equity" />
            <RiskField label="Risk budget" suffix="%" value={values.riskPercent} error={calculation.errors.riskPercent} onChange={(value) => updateField('riskPercent', value)} testId="input-risk-percent" />
            <RiskField label="Entry price" suffix="sample USD" value={values.entry} error={calculation.errors.entry} onChange={(value) => updateField('entry', value)} testId="input-risk-entry" />
            <RiskField label="Stop · illustrative" suffix="sample USD" value={values.stop} error={calculation.errors.stop} onChange={(value) => updateField('stop', value)} testId="input-risk-stop" />
            <RiskField label="Target · illustrative" suffix="sample USD" value={values.target} error={calculation.errors.target} onChange={(value) => updateField('target', value)} testId="input-risk-target" />
            <label className="pp-risk-field" htmlFor="pp-risk-leverage"><span>Leverage</span><select id="pp-risk-leverage" value={values.leverage} onChange={(event) => updateField('leverage', event.target.value)} data-testid="select-risk-leverage">
              {[1, 2, 3, 5, 10].map((value) => <option key={value} value={value}>{value}×</option>)}
            </select></label>
            <RiskField label="Fee · each leg" suffix="bps" value={values.feeBps} error={calculation.errors.feeBps} onChange={(value) => updateField('feeBps', value)} testId="input-risk-fees" />
            <RiskField label="Slippage · each leg" suffix="bps" value={values.slippageBps} error={calculation.errors.slippageBps} onChange={(value) => updateField('slippageBps', value)} testId="input-risk-slippage" />
            <RiskField label="Per-trade collateral cap" suffix="sample USD" value={values.perTradeCap} error={calculation.errors.perTradeCap} onChange={(value) => updateField('perTradeCap', value)} testId="input-risk-trade-cap" />
            <RiskField label="Daily collateral remaining" suffix="sample USD" value={values.dailyRemaining} error={calculation.errors.dailyRemaining} onChange={(value) => updateField('dailyRemaining', value)} testId="input-risk-daily-budget" />
          </div>
          <div className="pp-risk-input-note">Side follows the paper ticket: <strong>{side}</strong>. Stop and target start at ±2% and ±4% from sample entry, then remain editable.</div>
        </section>

        <section className={'pp-risk-panel pp-risk-output' + (stale ? ' pp-is-stale' : '')} aria-labelledby="pp-output-title" aria-live="polite">
          <div className="pp-risk-panel-head"><div><span className="pp-index">02</span><h3 id="pp-output-title">Modeled plan</h3></div><span className={'pp-status ' + (stale ? 'pp-status-stale' : '')}>{stale ? 'STALE · BLOCKED' : 'LOCAL ESTIMATE'}</span></div>
          {stale ? (
            <div className="pp-blocked" role="status"><span aria-hidden="true">◷</span><strong>Planner output hidden</strong><p>The sample is marked stale. Restore the fictional fixture before reviewing calculated outputs or applying a plan.</p></div>
          ) : calculation.plan ? (
            <>
              <div className="pp-risk-highlight"><span>Risk budget · modeled</span><strong>{money(calculation.plan.riskBudget)} <small>sample USD</small></strong><i>Quantity also respects the entered collateral caps.</i></div>
              <div className="pp-risk-results">
                <Metric label="Position quantity" value={money(calculation.plan.quantity, 6) + ' ' + market.split('-')[0]} emphasis />
                <Metric label="Collateral estimate" value={money(calculation.plan.collateral) + ' sample USD'} />
                <Metric label="Cost-adjusted modeled loss" value={money(calculation.plan.modeledLoss) + ' sample USD'} tone="coral" />
                <Metric label="Cost-adjusted modeled reward" value={money(calculation.plan.modeledReward) + ' sample USD'} tone="cyan" />
                <Metric label="Actual modeled risk" value={money(calculation.plan.actualRiskPercent, 3) + '% of paper equity'} />
                <Metric label="Reward / risk" value={money(calculation.plan.rewardRisk, 3) + ' : 1'} />
                <Metric label="Theoretical break-even threshold" value={money(calculation.plan.breakEvenWinRate, 2) + '%'} />
              </div>
              <p className="pp-break-even-note">A mathematical threshold from these cost assumptions only—not a predicted win rate or performance claim.</p>
              {calculation.plan.warnings.length > 0 && <div className="pp-warnings" role="note"><strong>Model warnings</strong><ul>{calculation.plan.warnings.map((warning, index) => <li key={warning + index}>{warning}</li>)}</ul></div>}
              {!entryMatchesSample && <p className="pp-entry-mismatch" role="status">To apply, entry must exactly match the current sample price ({money(samplePrice)}). The scenario remains editable.</p>}
              <button className="pp-apply" type="button" disabled={!canApply} onClick={() => { if (calculation.plan && canApply) { onApplyPlan(calculation.plan); setApplied(true); } }} data-testid="button-apply-risk-plan">Apply quantity + leverage to paper ticket</button>
              <p className="pp-apply-note">Copies quantity and leverage only. No stop/target order, position, or execution is created.</p>
              {applied && <p className="pp-applied" role="status">Plan values copied to the paper ticket. No order was sent.</p>}
            </>
          ) : (
            <div className="pp-invalid" role="alert"><strong>Plan unavailable</strong><p>{calculation.message || 'Correct the highlighted inputs to calculate this scenario.'}</p></div>
          )}
        </section>
      </div>

      <section className="pp-risk-panel pp-pattern-panel" aria-labelledby="pp-pattern-title">
        <div className="pp-risk-panel-head"><div><span className="pp-index">03</span><h3 id="pp-pattern-title">Manual pattern observations</h3></div><span className="pp-status">NO LIVE FEED</span></div>
        <div className="pp-pattern-intro"><p>Paste 21–1,000 completed closing prices, oldest first, equally spaced in time. Commas, spaces, or new lines are accepted.</p><span>Manual input · unverified · closes only</span></div>
        <label className="pp-history-label" htmlFor="pp-closes">Chronological closing prices</label>
        <textarea id="pp-closes" value={closesText} onChange={(event) => { setClosesText(event.target.value); setPattern(null); setPatternError(''); }} placeholder="e.g. 142.1, 142.4, 141.9 …" rows={4} data-testid="input-pattern-closes" aria-describedby="pp-history-help" />
        <div className="pp-pattern-actions"><span id="pp-history-help">No history is loaded by default. Provide your own manually pasted data.</span><button type="button" className="pp-analyze" onClick={analyze} data-testid="button-analyze-patterns">Analyze closes</button></div>
        {patternError && <p className="pp-pattern-error" role="alert">{patternError}</p>}
        {pattern ? (
          <div className="pp-pattern-result" aria-live="polite" data-testid="status-pattern-results">
            <div className="pp-pattern-summary"><strong>Observations only</strong><span>{pattern.sampleCount} completed closes entered · unverified</span></div>
            <div className="pp-pattern-metrics">
              <Metric label="5 / 20 SMA crossover" value={crossoverLabel} tone={pattern.crossover === 'up' ? 'cyan' : pattern.crossover === 'down' ? 'coral' : undefined} />
              <Metric label="Latest close vs prior range" value={rangeLabel} />
              <Metric label="Latest close" value={money(pattern.lastClose)} />
              <Metric label="5-close / 20-close SMA" value={money(pattern.shortSma) + ' / ' + money(pattern.longSma)} />
              <Metric label="Prior 20-close range" value={money(pattern.priorLow) + ' – ' + money(pattern.priorHigh)} />
            </div>
            <p>These are descriptive comparisons of closes—not full candle highs/lows, buy/sell advice, win rates, or evidence of future or profitable performance.</p>
          </div>
        ) : !patternError ? <div className="pp-pattern-empty"><strong>No result yet</strong>Analysis runs only after you submit at least 21 valid closing prices.</div> : null}
      </section>

      <footer className="pp-risk-footer">
        <p>Costs, fills, funding, liquidation, and venue rules may differ. Historical patterns do not establish future performance; overfit results can mislead.</p>
        <nav aria-label="Further reading">
          <a href="https://www.cmegroup.com/education/courses/trade-and-risk-management/proper-position-size" target="_blank" rel="noreferrer">CME · Proper position size ↗</a>
          <a href="https://www.finra.org/investors/insights/stop-orders-factors-consider-during-volatile-markets" target="_blank" rel="noreferrer">FINRA · Stop-order considerations ↗</a>
          <a href="https://papers.ssrn.com/sol3/Papers.cfm?abstract_id=2326253" target="_blank" rel="noreferrer">Bailey · Backtest overfitting ↗</a>
        </nav>
      </footer>
    </section>
  );
}

function RiskField({ label, suffix, value, error, onChange, testId }: {
  label: string;
  suffix: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  testId: string;
}) {
  const id = 'pp-' + testId;
  const errorId = id + '-error';
  return (
    <label className="pp-risk-field" htmlFor={id}>
      <span>{label}</span>
      <span className="pp-risk-control"><input id={id} type="number" inputMode="decimal" step="any" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} data-testid={testId} /><i>{suffix}</i></span>
      {error && <small className="pp-field-error" id={errorId}>{error}</small>}
    </label>
  );
}

function Metric({ label, value, emphasis = false, tone }: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: 'cyan' | 'coral';
}) {
  return <div className={'pp-metric' + (emphasis ? ' pp-metric-emphasis' : '') + (tone ? ' pp-tone-' + tone : '')}><span>{label}</span><strong>{value}</strong></div>;
}
