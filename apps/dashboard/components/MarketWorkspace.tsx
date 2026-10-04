'use client';

import { useMemo, useState } from 'react';

import { microToUsd } from '@/lib/format';
import type { PolicyLike } from '@trade-on-my-behalf/sdk';

import { MarketChart, useSpotSeries } from './MarketChart';
import { TradeTicket, buildPreview, type Side } from './TradeTicket';
import { Panel } from './ui';

/**
 * The market workspace: reference price on the left, trade ticket on the right.
 *
 * Scope note, because it matters: this is a **preview surface**. It reads the
 * on-chain policy and a live reference price, and it models what a request
 * would look like. It does NOT call `authorizeSpend`, does NOT open a venue
 * position, and has no approve control — the kernel's decision arrives as an
 * AuditEvent in the audit panel below, never synthesised here.
 *
 * The preview verdict shown below is the **off-chain evaluator** (the same
 * check ladder the program runs, mirrored in packages/agent). It is an
 * estimate. The chain is authoritative and may disagree — a stale policy
 * snapshot or a bug in the mirror is exactly how that would happen. When the
 * two differ, the chain wins, and this panel says so rather than hiding it.
 */

const DEFAULT_MARKET = 'SOL-PERP';

export function MarketWorkspace({
  policy,
  walletConnected,
}: {
  policy: PolicyLike | null;
  walletConnected: boolean;
}) {
  const series = useSpotSeries(DEFAULT_MARKET);
  const [draft, setDraft] = useState<{ side: Side; collateralUsd: number; leverageBps: number } | null>(
    null,
  );

  const caps = useMemo(() => {
    if (!policy) return { perTxCapUsd: 0, maxLeverageBps: 0 };
    return {
      perTxCapUsd: microToUsd(policy.per_tx_cap_usdc),
      maxLeverageBps: policy.max_leverage_bps,
    };
  }, [policy]);

  const quoteFresh = series.last !== null && !series.stale && series.error === null;

  const preview = useMemo(() => {
    if (!draft) return null;
    return buildPreview({
      side: draft.side,
      collateralUsd: String(draft.collateralUsd),
      leverageBps: draft.leverageBps,
      markPriceUsd: series.last?.px ?? 0,
      perTxCapUsd: caps.perTxCapUsd,
      maxLeverageBps: caps.maxLeverageBps,
      quoteFresh,
      policyLoaded: policy !== null,
      walletConnected,
    });
  }, [draft, series.last, caps, quoteFresh, policy, walletConnected]);

  return (
    <Panel
      n={0}
      title="Market workspace"
      tier="exposure"
      aside={<span className="n">preview · never submits</span>}
      bare
    >
      <div className="body">
        <div className="ticket-grid">
          <MarketChart market={DEFAULT_MARKET} series={series} />
          <TradeTicket
            input={{
              markPriceUsd: series.last?.px ?? 0,
              perTxCapUsd: caps.perTxCapUsd,
              maxLeverageBps: caps.maxLeverageBps,
              quoteFresh,
              policyLoaded: policy !== null,
              walletConnected,
            }}
            onPreview={(side, collateralUsd, leverageBps) =>
              setDraft({ side, collateralUsd, leverageBps })
            }
          />
        </div>

        {draft !== null && preview !== null ? (
          <div className="lifecycle" style={{ marginTop: 'var(--s4)' }}>
            <span className="step done">draft</span>
            <span className="arrow">→</span>
            <span className="step current">local estimate</span>
            <span className="arrow">→</span>
            <span className="step">authorize_spend</span>
            <span className="arrow">→</span>
            <span className="step">AuditEvent</span>
            <span className="step dim" style={{ marginLeft: 'var(--s3)' }}>
              this page stops at the estimate
            </span>
          </div>
        ) : null}

        {preview !== null ? (
          <div className="quote-lines" style={{ marginTop: 'var(--s3)' }}>
            <div className="quote-line">
              <span className="k">Local estimate</span>
              <span className="v dim">
                {preview.blockedReason !== null
                  ? preview.blockedReason
                  : 'within the caps the policy snapshot allows'}
              </span>
            </div>
            <div className="quote-line">
              <span className="k">Authoritative answer</span>
              <span className="v dim">
                the kernel decides — see the audit log for the committed event
              </span>
            </div>
          </div>
        ) : (
          <p className="note" style={{ marginTop: 'var(--s4)' }}>
            Nothing is submitted from this page. The ticket models a request
            against the policy the chain holds; the program decides how it will
            record that request, and the result lands in the audit log as an
            on-chain event. There is no override here, and no way to stop a
            trade placed elsewhere, by design.
          </p>
        )}
      </div>
    </Panel>
  );
}
