'use client';

import type { PolicyLike } from '@trade-on-my-behalf/sdk';

import { fmtSlots, microToUsd } from '@/lib/format';

/**
 * Policy state — the honest vocabulary (design pass 2, stage 2).
 *
 * WHY THIS EXISTS. The first design pass decided what each *colour* could
 * claim. It never asked what the *policy account* is doing, so a fresh policy
 * rendered as an ordinary field grid and a tester who then tripped the
 * kill-switch test concluded the switch was broken. It was not broken: it was
 * never armed.
 *
 * The program creates a policy with `peak_equity_usdc = 0`, and the
 * drawdown check compares current equity against peak equity
 * (`authorize_spend.rs`, reason `REASON_DRAWDOWN_KILLSWITCH`). With no peak
 * recorded, there is nothing to draw down *from*, so the switch cannot fire
 * until the first `record_pnl` writes one. That is a real, inspectable
 * property of the account — not an error, and not health.
 *
 * So `unarmed` is a first-class state here, distinct from both `live` and
 * anything that looks like a fault. All five states are neutral: none of them
 * wears --ok/--no/--warn, because the kernel made no decision about any of
 * them. Guard R3b is the reason this is enforced rather than merely intended.
 */
export type PolicyState = 'live' | 'unarmed' | 'expired' | 'unowned' | 'none';

const GLYPH: Record<PolicyState, string> = {
  live: '●',
  unarmed: '◌',
  expired: '○',
  unowned: '○',
  none: '·',
};

const LABEL: Record<PolicyState, string> = {
  live: 'LIVE',
  unarmed: 'UNARMED',
  expired: 'EXPIRED',
  unowned: 'READ-ONLY',
  none: 'NO POLICY',
};

const NOTE: Record<PolicyState, string> = {
  live: 'the account is open, unexpired, and you are its owner — you are the only key that can change it',
  unarmed:
    'peak equity is 0, so the drawdown switch has nothing to compare against. It arms on the first record_pnl.',
  expired: 'created_at_slot + ttl_slots has passed. The chain would answer REASON_EXPIRED.',
  unowned: 'this account exists but the connected wallet is not its owner, so it is read-only here',
  none: 'no account at [b"policy", wallet]',
};

/** The explanation text, exported so a panel can place it however it likes. */
export function policyStateNote(state: PolicyState): string {
  return NOTE[state];
}

/** Current slot, or null when it is not known yet. */
export interface PolicyStateInput {
  policy: PolicyLike | null;
  /** False while loading; keeps the chip from flashing "NO POLICY" at a live account. */
  loaded: boolean;
  isOwner: boolean;
  /** Wall clock seconds from the RPC block time, or null if unavailable. */
  nowUnix: number | null;
}

/**
 * Derive the state.
 *
 * `nowUnix` comes from the RPC's block time rather than `Date.now()`: the TTL
 * is counted in slots by the program, so a client whose clock is a day off
 * must not decide the policy has expired. Where the RPC gave us no block
 * time we deliberately fall back to "not expired" — inventing an expiry from
 * a local clock is the same class of error as drawing an invented price line.
 */
export function derivePolicyState(i: PolicyStateInput): PolicyState {
  if (i.policy === null) return 'none';
  if (!i.isOwner) return 'unowned';
  if (i.nowUnix !== null) {
    // ~0.4 s/slot on Solana. The tolerance below is one slot; the point is
    // to not flicker at the boundary, not to be exact.
    const ageSlots = (i.nowUnix * 1000) / 400;
    if (ageSlots - Number(i.policy.created_at_slot.toString()) > Number(i.policy.ttl_slots.toString())) {
      return 'expired';
    }
  }
  if (i.policy.peak_equity_usdc.toString() === '0') return 'unarmed';
  return 'live';
}

export function PolicyStateChip({
  state,
  note = true,
}: {
  state: PolicyState;
  note?: boolean;
}) {
  return (
    <span className="state-wrap">
      <span className={`state state-${state}`} role="status">
        <span className="glyph" aria-hidden="true">
          {GLYPH[state]}
        </span>{' '}
        <b>{LABEL[state]}</b>
      </span>
      {note ? <div className="state-note">{NOTE[state]}</div> : null}
    </span>
  );
}

/**
 * A compact armed/unarmed readout for the kill-switch field itself.
 *
 * Kept separate from the chip because the field's job is to answer "is this
 * switch doing anything right now?", which is a different question from "is
 * my policy live?" — a policy can be live and still have a disarmed switch.
 */
export function KillSwitchNote({ policy }: { policy: PolicyLike }) {
  const pct = policy.kill_switch_drawdown_pct;
  const peak = microToUsd(policy.peak_equity_usdc);

  if (pct === 0) {
    return (
      <span className="state-note">
        disabled — drawdown pct is 0, which the program reads as &ldquo;off&rdquo;
      </span>
    );
  }
  if (peak === 0) {
    return (
      <span className="state-note">
        configured at {pct}% but <b>not armed</b> — peak equity is still 0. It arms on the first record_pnl.
      </span>
    );
  }
  return (
    <span className="state-note">
      armed — fires {pct}% below the recorded peak of ${peak.toFixed(2)} (created {fmtSlots(Number(policy.created_at_slot.toString()))})
    </span>
  );
}
