'use client';

import { useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import type { PolicyLike, UpdatePolicyInput } from '@trade-on-my-behalf/sdk';

import { CLUSTER, explorerIsIndexed, explorerTxUrl } from '@/lib/cluster';
import { fmtLeverageBps, fmtSlots, fmtSlotsAsDuration, fmtUsd, microToUsd } from '@/lib/format';
import { updatePolicy, type AdapterWallet } from '@/lib/trader';
import type { Program } from '@coral-xyz/anchor';

import { Err, Panel } from './ui';

interface Draft {
  maxLeverageBps: string;
  perTxCapUsd: string;
  perDayCapUsd: string;
  ttlSlots: string;
  killSwitchDrawdownPct: string;
}

function draftFrom(p: PolicyLike): Draft {
  return {
    maxLeverageBps: String(p.max_leverage_bps),
    perTxCapUsd: String(microToUsd(p.per_tx_cap_usdc)),
    perDayCapUsd: String(microToUsd(p.per_day_cap_usdc)),
    ttlSlots: String(Number(p.ttl_slots.toString())),
    killSwitchDrawdownPct: String(p.kill_switch_drawdown_pct),
  };
}

type DiffRow = {
  key: keyof Draft;
  label: string;
  current: string;
  next: string;
  hint: string;
};

/**
 * Panel 5 — edit the mutable rules.
 *
 * The only thing in this app that writes to the chain, and the only thing that
 * asks for a signature. Nothing here can move a trade: `update_policy` touches
 * five rule fields and the program emits an `AuditEvent` for it.
 */
export function EditPolicyPanel({
  policy,
  policyPda,
  program,
  anchorWallet,
  isOwner,
  onSubmitted,
}: {
  policy: PolicyLike;
  policyPda: PublicKey;
  program: Program;
  anchorWallet: AdapterWallet | null;
  isOwner: boolean;
  onSubmitted: () => void;
}) {
  const { publicKey } = useWallet();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(policy));
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  // Re-seed whenever a different policy lands (wallet switch, first load).
  useEffect(() => {
    setDraft(draftFrom(policy));
  }, [policy]);

  const diffs: DiffRow[] = useMemo(() => {
    const current: Record<keyof Draft, string> = {
      maxLeverageBps: String(policy.max_leverage_bps),
      perTxCapUsd: String(microToUsd(policy.per_tx_cap_usdc)),
      perDayCapUsd: String(microToUsd(policy.per_day_cap_usdc)),
      ttlSlots: String(Number(policy.ttl_slots.toString())),
      killSwitchDrawdownPct: String(policy.kill_switch_drawdown_pct),
    };

    const changed = (d: DiffRow) => d.current !== d.next;

    return [
      {
        key: 'maxLeverageBps',
        label: 'max leverage (bps)',
        current: current.maxLeverageBps,
        next: draft.maxLeverageBps.trim(),
        hint: `0 = no cap · now ${fmtLeverageBps(policy.max_leverage_bps)}`,
      },
      {
        key: 'perTxCapUsd',
        label: 'per-tx cap (USD)',
        current: current.perTxCapUsd,
        next: draft.perTxCapUsd.trim(),
        hint: `now ${fmtUsd(microToUsd(policy.per_tx_cap_usdc))}`,
      },
      {
        key: 'perDayCapUsd',
        label: 'per-day cap (USD)',
        current: current.perDayCapUsd,
        next: draft.perDayCapUsd.trim(),
        hint: `now ${fmtUsd(microToUsd(policy.per_day_cap_usdc))}`,
      },
      {
        key: 'ttlSlots',
        label: 'TTL (slots)',
        current: current.ttlSlots,
        next: draft.ttlSlots.trim(),
        hint: `now ≈ ${fmtSlotsAsDuration(Number(policy.ttl_slots.toString()))}`,
      },
      {
        key: 'killSwitchDrawdownPct',
        label: 'kill-switch drawdown (%)',
        current: current.killSwitchDrawdownPct,
        next: draft.killSwitchDrawdownPct.trim(),
        hint: '0 = disabled · 1–100',
      },
    ].filter((d) => d.current !== d.next.trim()) as DiffRow[];
  }, [draft, policy]);

  function buildInput(rows: DiffRow[]): UpdatePolicyInput {
    const out: UpdatePolicyInput = { agent: policy.agent };
    for (const row of rows) {
      const v = Number(row.next);
      if (!Number.isFinite(v)) throw new Error(`${row.label}: "${row.next}" is not a number`);
      switch (row.key) {
        case 'maxLeverageBps':
          if (v < 0 || v > 65535) throw new Error('max leverage must be 0–65535 bps');
          out.maxLeverageBps = Math.trunc(v);
          break;
        case 'perTxCapUsd':
          if (v < 0) throw new Error('per-tx cap cannot be negative');
          out.perTxCapUsd = v;
          break;
        case 'perDayCapUsd':
          if (v < 0) throw new Error('per-day cap cannot be negative');
          out.perDayCapUsd = v;
          break;
        case 'ttlSlots':
          if (!Number.isInteger(v) || v <= 0) throw new Error('TTL must be a whole number of slots > 0');
          out.ttlSlots = v;
          break;
        case 'killSwitchDrawdownPct':
          if (!Number.isInteger(v) || v < 0 || v > 100) {
            throw new Error('kill-switch must be a whole percent 0–100');
          }
          out.killSwitchDrawdownPct = v;
          break;
      }
    }
    return out;
  }

  async function sign() {
    if (!publicKey || !anchorWallet) return;
    setSubmitting(true);
    setError(null);
    setTxSignature(null);
    try {
      const { signature } = await updatePolicy(program, policyPda, publicKey, buildInput(diffs));
      setTxSignature(signature);
      setConfirming(false);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setTxSignature(null);
    setDraft((d) => ({ ...d, [k]: e.target.value }));
  };

  const dirty = new Set(diffs.map((d) => d.key));

  return (
    <Panel
      n={5}
      title="Edit policy"
      aside={<span className="n">owner-signed · update_policy</span>}
    >
      {!isOwner ? (
        <div className="note" style={{ marginBottom: 14 }}>
          The connected wallet is not this policy&rsquo;s owner, so the form below is read-only. Switch to the
          owner wallet to change the rules — the program rejects the signature otherwise.
        </div>
      ) : null}

      <div className="formgrid">
        {(
          [
            ['maxLeverageBps', 'Max leverage (bps)'],
            ['perTxCapUsd', 'Per-tx cap (USD)'],
            ['perDayCapUsd', 'Per-day cap (USD)'],
            ['ttlSlots', 'TTL (slots)'],
            ['killSwitchDrawdownPct', 'Kill-switch drawdown (%)'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className={dirty.has(key) ? 'changed' : ''}>
            <label htmlFor={`f-${key}`}>{label}</label>
            <input
              id={`f-${key}`}
              type="number"
              inputMode="numeric"
              value={draft[key]}
              onChange={set(key)}
              disabled={!isOwner}
            />
            <div className="hint">
              {key === 'maxLeverageBps'
                ? `on-chain ${policy.max_leverage_bps} · ${fmtLeverageBps(policy.max_leverage_bps)}`
                : key === 'perTxCapUsd'
                  ? `on-chain ${fmtUsd(microToUsd(policy.per_tx_cap_usdc))}`
                  : key === 'perDayCapUsd'
                    ? `on-chain ${fmtUsd(microToUsd(policy.per_day_cap_usdc))}`
                    : key === 'ttlSlots'
                      ? `on-chain ${fmtSlots(Number(policy.ttl_slots.toString()))}`
                      : `on-chain ${policy.kill_switch_drawdown_pct}`}
            </div>
          </div>
        ))}
      </div>

      <div className="topbar" style={{ marginTop: 16, marginBottom: 0 }}>
        <button
          type="button"
          className="btn primary"
          disabled={!isOwner || diffs.length === 0 || submitting}
          onClick={() => setConfirming(true)}
        >
          {submitting ? 'signing…' : `Review ${diffs.length || ''} change${diffs.length === 1 ? '' : 's'}`}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={diffs.length === 0 || submitting}
          onClick={() => setDraft(draftFrom(policy))}
        >
          discard edits
        </button>
        <div className="spacer" />
        <span className="pill">
          owner <b>{isOwner ? 'connected ✓' : 'not connected'}</b>
        </span>
      </div>

      {txSignature ? (
        <div className="ok-note">
          update_policy confirmed:{' '}
          {explorerIsIndexed(CLUSTER) ? (
            <a href={explorerTxUrl(txSignature, CLUSTER)} target="_blank" rel="noreferrer">
              {txSignature} ↗
            </a>
          ) : (
            txSignature
          )}
        </div>
      ) : null}
      <Err>{error}</Err>

      {confirming ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => !submitting && setConfirming(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3>Confirm rule change</h3>
            </header>
            <div className="body">
              <p className="dim" style={{ marginTop: 0 }}>
                These values become enforceable by the kernel the moment this transaction lands. The next
                intent the runtime submits is checked against them — tighter rules deny sooner, looser rules
                let more through.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>field</th>
                    <th className="num">on-chain now</th>
                    <th className="num">new</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d) => (
                    <tr key={d.key}>
                      <td>
                        {d.label}
                        <div className="faint" style={{ fontSize: 11 }}>
                          {d.hint}
                        </div>
                      </td>
                      <td className="num delta-old">{d.current}</td>
                      <td className="num delta-new">{d.next}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="faint" style={{ fontSize: 11, marginBottom: 0 }}>
                policy PDA <span className="mono">{policyPda.toBase58()}</span>
              </p>
            </div>
            <footer>
              <button type="button" className="btn ghost" disabled={submitting} onClick={() => setConfirming(false)}>
                cancel
              </button>
              <button type="button" className="btn primary" disabled={submitting} onClick={() => void sign()}>
                {submitting ? 'waiting for Phantom…' : 'Sign update_policy'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
