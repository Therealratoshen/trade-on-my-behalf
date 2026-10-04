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

import {
  KillSwitchNote,
  PolicyStateChip,
  derivePolicyState,
  policyStateNote,
  type PolicyState,
} from './PolicyState';
import { Field, Panel } from './ui';

/** The explanation line under a state chip. */
function PolicyStateNote({ state }: { state: PolicyState }) {
  return <div className="state-note">{policyStateNote(state)}</div>;
}

/** Panel 2 — the active rules, read straight off the chain. Read-only. */
export function PolicyPanel({
  policy,
  isOwner,
  nowUnix,
}: {
  policy: PolicyLike;
  /** Drives the `unowned` state; the shell owns the wallet context. */
  isOwner: boolean;
  /** Latest block time the shell has polled, in unix seconds. */
  nowUnix: number | null;
}) {
  const perDayUsed = microToUsd(policy.per_day_cap_usdc);
  const daySpent = microToUsd(policy.day_spent_usdc);
  const pctUsed = perDayUsed > 0 ? Math.min(100, (daySpent / perDayUsed) * 100) : 0;

  const ttlSlots = Number(policy.ttl_slots.toString());

  // Panel 2 is the only surface that holds the whole account, so it is where
  // the state chip is derived. `loaded` is true by construction: this panel
  // only renders once an account has actually been decoded.
  const state = derivePolicyState({ policy, loaded: true, isOwner, nowUnix });

  return (
    <Panel
      n={2}
      title="Policy (read-only)"
      tier="reference"
      aside={<PolicyStateChip state={state} note={false} />}
    >
      <div style={{ marginBottom: 'var(--s4)' }}>
        <PolicyStateNote state={state} />
      </div>
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
          k="per-day cap"
          v={fmtUsd(perDayUsed)}
          sub={`${policy.per_day_cap_usdc.toString()} µUSDC`}
        />
        <Field
          k="kill-switch drawdown"
          v={policy.kill_switch_drawdown_pct === 0 ? 'disabled' : `${policy.kill_switch_drawdown_pct}%`}
          sub={<KillSwitchNote policy={policy} />}
        />
        <Field k="ttl" v={`${fmtSlots(ttlSlots)} slots`} sub={`≈ ${fmtSlotsAsDuration(ttlSlots)}`} />
        <Field k="day spent" v={fmtUsd(daySpent)} sub={`${pctUsed.toFixed(0)}% of the daily cap`} />
        <Field
          k="peak equity"
          v={fmtUsd(microToUsd(policy.peak_equity_usdc))}
          sub={
            policy.peak_equity_usdc.toString() === '0'
              ? '0 = not yet armed · set by record_pnl'
              : 'drives the drawdown check'
          }
        />
        <Field k="vendors" v={String(policy.vendors.length)} sub="whitelisted venues (≤ 16)" />
      </div>

      <div style={{ marginTop: 'var(--s4)' }}>
        <div className="k faint" style={{ fontSize: 'var(--t-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          vendor whitelist
        </div>
        {policy.vendors.length === 0 ? (
          <div className="dim" style={{ marginTop: 'var(--s2)' }}>
            Empty — every vendor will be denied with <span className="mono">REASON_VENDOR_DENIED</span>.
          </div>
        ) : (
          <table style={{ marginTop: 'var(--s2)' }}>
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

      <div style={{ marginTop: 'var(--s4)' }} className="grid">
        <Field k="owner" v={shortAddress(policy.owner.toBase58(), 6, 6)} sub="signs every update" />
        <Field k="agent" v={shortAddress(policy.agent.toBase58(), 6, 6)} sub="PDA seed" />
        <Field k="created at slot" v={fmtSlots(Number(policy.created_at_slot.toString()))} />
        <Field k="daily reset slot" v={fmtSlots(Number(policy.last_reset_slot.toString()))} />
      </div>
    </Panel>
  );
}
