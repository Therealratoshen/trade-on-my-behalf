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
 * anything that looks like a fault. All six states are neutral: none of them
 * wears --ok/--no/--warn, because the kernel made no decision about any of
 * them. Guard R3b is the reason this is enforced rather than merely intended.
 *
 * `loading` is the same distinction one level up. Before the first read
 * completes we do not know whether an account exists, and "we have not looked
 * yet" is not the claim "there is nothing there" — that is why `none` is
 * reserved for a completed read that found no account.
 */
export type PolicyState = 'live' | 'unarmed' | 'expired' | 'unowned' | 'none' | 'loading';

const GLYPH: Record<PolicyState, string> = {
  live: '●',
  unarmed: '◌',
  expired: '○',
  unowned: '○',
  none: '·',
  loading: '…',
};

const LABEL: Record<PolicyState, string> = {
  live: 'LIVE',
  unarmed: 'UNARMED',
  expired: 'EXPIRED',
  unowned: 'READ-ONLY',
  none: 'NO POLICY',
  loading: 'READING',
};

const NOTE: Record<PolicyState, string> = {
  live: 'the account is open, unexpired, and you are its owner — you are the only key that can change it',
  unarmed:
    'peak equity is 0, so the drawdown switch has nothing to compare against. It arms on the first record_pnl.',
  expired: 'created_at_slot + ttl_slots has passed. The chain would answer REASON_EXPIRED.',
  unowned: 'this account exists but the connected wallet is not its owner, so it is read-only here',
  none: 'no account at [b"policy", wallet]',
  loading:
    'the account has not been read yet. "NO POLICY" would be a claim about a read this page has not made.',
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
  /**
   * The chain's current slot, from `connection.getSlot()`. Null when the RPC
   * did not answer.
   *
   * This is a SLOT, not a unix timestamp, and the difference is the whole
   * point — see `derivePolicyState`.
   */
  currentSlot: number | null;
}

/**
 * Derive the state.
 *
 * ## Why `currentSlot` and not a wall clock
 *
 * The program counts TTL in slots and compares it against `Clock::get().slot`
 * (`authorize_spend.rs`: `clock.slot - created_at_slot > ttl_slots`). The only
 * quantity that is comparable to a slot is a slot.
 *
 * The obvious conversion — `(unixSeconds * 1000) / 400`, i.e. "slots elapsed
 * since the unix epoch" — silently assumes the chain's slot 0 sat at 1970-01-01.
 * It did not, and the resulting error is not small: mainnet is around slot
 * 453,000,000, while the unix epoch conversion yields about 4,477,000,000. The
 * derived "age" therefore exceeds any plausible `ttl_slots` (7 days is
 * 1,512,000) by three orders of magnitude, and every policy reads `expired`
 * the moment a block time is available. The chip would have claimed the chain
 * would answer `REASON_EXPIRED` on accounts the chain is actively honouring.
 *
 * A wall clock is also the wrong source for a different reason: slot height is
 * what the kernel reads, so only the node can tell us the slot, and only the
 * slot can be compared to `created_at_slot`.
 *
 * ## The fallback
 *
 * `currentSlot === null` — the RPC gave us nothing — declines to assert
 * expiry, exactly as this component has always claimed to. The policy still
 * reads `unarmed`/`live`, and the note under the chip says the TTL was not
 * judged. Inventing an expiry is the same class of error as drawing an
 * invented price line, and the asymmetry matters: reporting a live policy as
 * expired sends a tester to debug a kill-switch that is working.
 */
export function derivePolicyState(i: PolicyStateInput): PolicyState {
  // A loading read has not established that the account is absent, so it must
  // not answer "none". `loaded` is checked before the null policy because
  // "we have not looked" and "there is nothing there" are different claims.
  if (!i.loaded) return 'loading';
  if (i.policy === null) return 'none';
  if (!i.isOwner) return 'unowned';
  if (i.currentSlot !== null) {
    const ageSlots = i.currentSlot - Number(i.policy.created_at_slot.toString());
    // Mirrors the on-chain predicate exactly: `>` and not `>=`, so a policy
    // is unexpired on its final slot, which is what the kernel does.
    if (ageSlots > Number(i.policy.ttl_slots.toString())) {
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
