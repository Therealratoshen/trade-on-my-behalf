'use client';

import { CLUSTER } from '@/lib/cluster';

import { PolicyStateChip, type PolicyState } from './PolicyState';

/**
 * Mode strip — the honesty strip.
 *
 * Three facts, always on screen, never inferred by the reader:
 *   Policy: which cluster the account lives on, and its lifecycle state.
 *   Positions: whether fills are paper or live.
 *   Fills: whether anything is simulated.
 *
 * PAPER is rendered in --warn on purpose. A paper fill is not a failure,
 * but it is not a trade either, and it must never be visually adjacent to
 * an approval green. The design system's rule is that a colour may only
 * claim what it actually means.
 *
 * The policy-state chip added in the second pass is the harder case, and it
 * is the reason this component is no longer just three labels. Before it, a
 * reader had no way to tell a *live* policy from one whose kill-switch was
 * never armed. Those are different facts about different things — the
 * account, and the switch inside it — and conflating them is how a tester
 * concludes the kill-switch is broken. Note the chip is NOT green when live:
 * "live" is not a verdict the kernel issued, so it must not wear a verdict
 * colour.
 */
export function ModeStrip({
  executionMode = 'paper',
  policyState = 'none',
}: {
  executionMode?: 'paper' | 'live';
  policyState?: PolicyState;
}) {
  return (
    <div className="mode-strip" role="status" aria-label="Execution modes">
      <span className="mode">
        <span className="dot" aria-hidden="true" />
        Policy <b>{CLUSTER}</b>
      </span>
      <PolicyStateChip state={policyState} note={false} />
      <span className={`mode ${executionMode === 'paper' ? 'paper' : ''}`}>
        <span className="dot" aria-hidden="true" />
        Positions <b>{executionMode === 'paper' ? 'PAPER' : 'LIVE'}</b>
      </span>
      <span className="mode">
        Fills <b>simulated</b>
      </span>
    </div>
  );
}
