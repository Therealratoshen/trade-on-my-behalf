'use client';

import { useMemo, useState } from 'react';

/**
 * Trade ticket.
 *
 * This component is a *preview and draft* surface. It does not decide
 * anything and it cannot override the kernel:
 *
 *  - Long/short use --accent, never --ok/--no, because a side is market
 *    intent, not a verdict.
 *  - The submit control is disabled with a stated reason whenever required
 *    data is missing. A disabled button with no explanation reads as a
 *    broken app; a disabled button that names its blocker is a feature.
 *  - There is deliberately no "approve" affordance. The kernel's answer
 *    arrives as an AuditEvent and is rendered in the audit panel, never
 *    synthesised here.
 */

export type Side = 'long' | 'short';

export interface TicketInput {
  side: Side;
  collateralUsd: string;
  leverageBps: number;
  markPriceUsd: number;
  perTxCapUsd: number;
  maxLeverageBps: number;
  quoteFresh: boolean;
  policyLoaded: boolean;
  walletConnected: boolean;
}

const usd = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

export function TradeTicket({
  input,
  onPreview,
}: {
  /** Real values from the loaded policy and the live quote. */
  input: Omit<TicketInput, 'side' | 'collateralUsd' | 'leverageBps'>;
  onPreview?: (side: Side, collateralUsd: number, leverageBps: number) => void;
}) {
  const [side, setSide] = useState<Side>('long');
  const [collateral, setCollateral] = useState('40');
  const [leverage, setLeverage] = useState('3');

  const value: TicketInput = {
    ...input,
    side,
    collateralUsd: collateral,
    leverageBps: Math.round(Number(leverage) * 100),
  };

  const view = useMemo(() => buildPreview(value), [value]);

  return (
    <section className="ticket" aria-label="Trade ticket">
      <header>
        <h2>Trade ticket</h2>
        <div className="spacer" />
        <span className="pill">preview only</span>
      </header>

      <div className="body">
        <div className="side-toggle" role="group" aria-label="Side">
          <button
            type="button"
            aria-pressed={side === 'long'}
            onClick={() => setSide('long')}
          >
            <span aria-hidden="true">▲</span> Long
          </button>
          <button
            type="button"
            aria-pressed={side === 'short'}
            onClick={() => setSide('short')}
          >
            <span aria-hidden="true">▼</span> Short
          </button>
        </div>

        <div className="formgrid">
          <div>
            <label htmlFor="tk-collateral">Collateral (USD)</label>
            <input
              id="tk-collateral"
              inputMode="decimal"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="tk-leverage">Leverage (x)</label>
            <input
              id="tk-leverage"
              inputMode="decimal"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
            />
          </div>
        </div>

        <div className="quote-lines">
          <div className="quote-line">
            <span className="k">Side</span>
            <span className="v">
              <span aria-hidden="true">{side === 'long' ? '▲' : '▼'}</span> {side}
            </span>
          </div>
          <div className="quote-line">
            <span className="k">Collateral</span>
            <span className="v">{usd(view.collateralUsd)}</span>
          </div>
          <div className="quote-line">
            <span className="k">Leverage</span>
            <span className="v">{view.leverageX.toFixed(2)}x</span>
          </div>
          <div className="quote-line">
            <span className="k">Modelled notional</span>
            <span className="v">{usd(view.notionalUsd)}</span>
          </div>
          <div className="quote-line">
            <span className="k">Policy cap / trade</span>
            <span className="v">{input.perTxCapUsd > 0 ? usd(input.perTxCapUsd) : '—'}</span>
          </div>
          <div className="quote-line">
            <span className="k">Policy max leverage</span>
            <span className="v">
              {input.maxLeverageBps > 0 ? (input.maxLeverageBps / 100).toFixed(2) + 'x' : 'no cap'}
            </span>
          </div>
          <div className="quote-line total">
            <span className="k">Modelled cost</span>
            <span className="v">{usd(view.feeUsd)}</span>
          </div>
        </div>

        {view.clampNote !== null ? (
          <p className="ticket-blocked" role="status">
            <span aria-hidden="true">▲</span>
            <span>{view.clampNote}</span>
          </p>
        ) : view.blockedReason !== null ? (
          <p className="ticket-blocked" role="status">
            <span aria-hidden="true">▲</span>
            <span>{view.blockedReason}</span>
          </p>
        ) : (
          <button
            type="button"
            className="btn primary"
            style={{ marginTop: 'var(--s3)', width: '100%' }}
            onClick={() => onPreview?.(side, view.collateralUsd, view.leverageBps)}
          >
            Preview against the kernel
          </button>
        )}

        <p className="provenance" style={{ marginTop: 'var(--s3)' }}>
          <span>estimate only</span>
          <span className="sep" />
          <span>not a fill</span>
          <span className="sep" />
          <span>venue: paper</span>
        </p>
      </div>
    </section>
  );
}

export interface TicketPreview {
  collateralUsd: number;
  leverageBps: number;
  leverageX: number;
  notionalUsd: number;
  feeUsd: number;
  /** Non-null when submission must be blocked, with the reason to show. */
  blockedReason: string | null;
  /** Non-null when the draft exceeds a cap the chain will record a denial for. */
  clampNote: string | null;
}

/**
 * Pure, testable preview math. Kept out of the component so the numbers can
 * be unit tested without a DOM. Deliberately conservative: unknown inputs
 * block rather than guess.
 */
export function buildPreview(i: TicketInput): TicketPreview {
  const collateralUsd = Number(i.collateralUsd);
  const leverageX = i.leverageBps / 100;
  const notionalUsd = Number.isFinite(collateralUsd) ? collateralUsd * leverageX : 0;
  // Same 0.1% taker assumption the paper venue uses; labelled as modelled.
  const feeUsd = notionalUsd * 0.001;

  let blockedReason: string | null = null;
  if (!i.walletConnected) blockedReason = 'Connect a wallet to draft a trade.';
  else if (!i.policyLoaded) blockedReason = 'Policy not loaded — the cap is unknown, so nothing can be previewed.';
  else if (!i.quoteFresh) blockedReason = 'Reference price is stale. Refresh the quote before submitting.';
  else if (!Number.isFinite(collateralUsd) || collateralUsd <= 0)
    blockedReason = 'Collateral must be a number greater than zero.';
  else if (!Number.isFinite(leverageX) || leverageX < 1)
    blockedReason = 'Leverage must be at least 1x.';

  let clampNote: string | null = null;
  if (blockedReason === null && i.perTxCapUsd > 0 && collateralUsd > i.perTxCapUsd) {
    clampNote = `Over the per-trade cap (${usd(i.perTxCapUsd)}). The runtime clamps to the cap; anything the chain is asked about above it is recorded as REASON_PER_TX_CAP.`;
  }
  if (clampNote === null && i.maxLeverageBps > 0 && i.leverageBps > i.maxLeverageBps) {
    clampNote = `Over the policy leverage cap (${(i.maxLeverageBps / 100).toFixed(2)}x). The chain returns REASON_LEVERAGE_CAP.`;
  }

  return { collateralUsd, leverageBps: i.leverageBps, leverageX, notionalUsd, feeUsd, blockedReason, clampNote };
}
