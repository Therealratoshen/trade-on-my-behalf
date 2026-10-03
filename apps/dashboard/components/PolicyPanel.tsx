'use client';

import type { PolicyLike } from '@trade-on-my-behalf/sdk';

import { CLUSTER, explorerTxUrl, explorerIsIndexed } from '@/lib/cluster';
import {
  fmtLeverageBps,
  fmtSlots,
  fmtSlotsAsDuration,
  fmtUsd,
  microToUsd,
  shortAddress,
} from '@/lib/format';

import { Field, Panel } from './ui';

/** Panel 2 — the active rules, read straight off the chain. Read-only. */
export function PolicyPanel({ policy }: { policy: PolicyLike }) {
  const dailySpendBudget = microToUsd(policy.per_day_spend_budget_usdc);
  const daySpent = microToUsd(policy.day_spent_usdc);
  const pctUsed = dailySpendBudget > 0 ? Math.min(100, (daySpent / dailySpendBudget) * 100) : 0;

  const ttlSlots = Number(policy.ttl_slots.toString());

  return (
    <Panel n={2} title="Policy (read-only)">
      <div className="grid">
        <Field
          k="max leverage"
          v={fmtLeverageBps(policy.max_leverage_bps)}
          sub={`${policy.max_leverage_bps} bps`}
        />
        <Field
          k="per-tx cap"
          v={fmtUsd(microToUsd(policy.per_tx_cap_usdc))}
          sub={`${policy.per_tx_cap_usdc.toString()} µUSDC`}
        />
        <Field
          k="daily spend budget"
          v={fmtUsd(dailySpendBudget)}
          sub="approved collateral per rolling 24h window"
        />
        <Field
          k="kill-switch drawdown"
          v={policy.kill_switch_drawdown_pct === 0 ? 'disabled' : `${policy.kill_switch_drawdown_pct}%`}
          sub={policy.kill_switch_drawdown_pct === 0 ? '0 = off' : 'from peak equity'}
        />
        <Field k="ttl" v={`${fmtSlots(ttlSlots)} slots`} sub={`≈ ${fmtSlotsAsDuration(ttlSlots)}`} />
        <Field k="budget used" v={fmtUsd(daySpent)} sub={`${pctUsed.toFixed(0)}% of the daily spend budget`} />
        <Field
          k="peak equity"
          v={fmtUsd(microToUsd(policy.peak_equity_usdc))}
          sub="drives the kill-switch"
        />
        <Field k="vendors" v={String(policy.vendors.length)} sub="whitelisted venues (≤ 16)" />
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="k faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          vendor whitelist
        </div>
        {policy.vendors.length === 0 ? (
          <div className="dim" style={{ marginTop: 6 }}>
            Empty — every vendor will be denied with <span className="mono">REASON_VENDOR_DENIED</span>.
          </div>
        ) : (
          <table style={{ marginTop: 6 }}>
            <thead>
              <tr>
                <th>program id</th>
                {explorerIsIndexed(CLUSTER) ? <th>explorer</th> : null}
              </tr>
            </thead>
            <tbody>
              {policy.vendors.map((v) => (
                <tr key={v.toBase58()}>
                  <td>{v.toBase58()}</td>
                  {explorerIsIndexed(CLUSTER) ? (
                    <td>
                      <a href={explorerTxUrl(v.toBase58(), CLUSTER)} target="_blank" rel="noreferrer">
                        {shortAddress(v.toBase58(), 6, 6)} ↗
                      </a>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 16 }} className="grid">
        <Field k="owner" v={shortAddress(policy.owner.toBase58(), 6, 6)} sub="signs every update" />
        <Field k="agent" v={shortAddress(policy.agent.toBase58(), 6, 6)} sub="PDA seed" />
        <Field k="created at slot" v={fmtSlots(Number(policy.created_at_slot.toString()))} />
        <Field k="daily reset slot" v={fmtSlots(Number(policy.last_reset_slot.toString()))} />
      </div>
    </Panel>
  );
}
