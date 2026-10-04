use crate::state::*;
use anchor_lang::prelude::*;

/// D9: the lowest leverage a request may express, 1x in basis points.
/// Kept local to this instruction so `state::REASON_*` stays untouched.
/// Mirrors the off-chain `classify()` floor and the `100..=10_000` band that
/// `create_policy` / `update_policy` enforce on the *policy* cap.
pub const MIN_LEVERAGE_BPS: u16 = 100;

#[derive(Accounts)]
pub struct AuthorizeSpend<'info> {
    #[account(
        mut,
        seeds = [b"policy", policy.agent.as_ref()],
        bump = policy.bump,
        constraint = authority.key() == policy.agent || authority.key() == policy.owner
            @ TreasuryError::Unauthorized,
    )]
    pub policy: Account<'info, Policy>,
    /// The agent's hot key (normal path) or the policy owner.
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<AuthorizeSpend>,
    vendor: Pubkey,
    amount_usdc: u64,
    nonce: u64,
    leverage_bps: u16,
    // Best-effort runtime-reported implied current equity (in USDC microunits),
    // derived off-chain from venue position reconciliation. The runtime is
    // trusted to pass an honest value, but the security model treats this as
    // a soft signal: an attacker who controls the runtime can under-report
    // equity to suppress the kill-switch. The on-chain `record_pnl`
    // instruction is the only path that mutates `peak_equity_usdc`, so the
    // kill-switch can never widen by a runtime lie.
    implied_current_equity_usdc: u64,
) -> Result<()> {
    let p = &mut ctx.accounts.policy;
    let clock = Clock::get()?;

    // ------------------------------------------------------------------
    // D9: argument well-formedness, checked before everything else.
    //
    // These two are deliberately `Err!` (failed transaction), NOT policy
    // denials:
    //
    //  * Every existing reason code describes a *policy* decision — the
    //    policy's caps, TTL, vendor list and risk state all said "no".
    //    A policy that is perfectly valid can still yield those denies.
    //    `leverage_bps < 1x` and `amount == 0` are not that: they are
    //    malformed arguments that no valid policy could ever authorize.
    //    Overloading the reason-code ladder would make the AuditEvent lie
    //    ("this policy denied you") and would need a new REASON_* constant,
    //    breaking the stable wire format the SDK and `evaluator.ts` mirror.
    //  * The existing deny path already has a second, more serious problem
    //    for these two values. `leverage_bps` is only ever *read* by the
    //    check ladder and is never stored, and `amount_usdc == 0` makes
    //    `day_spent_usdc.saturating_add(0)` a no-op. A `Ok(())` denial would
    //    therefore approve nothing while still returning a successful
    //    transaction that emits `approved: false` — a runtime that only
    //    branches on the thrown-vs-returned outcome would treat it as a
    //    clean run. Failing loudly is the correct signal for a bug.
    //
    // Net effect: the only thing that can reject a malformed request is the
    // chain itself, not the off-chain classifier. `classify()` already
    // refuses `leverageBps < 100` and `collateralUsd <= 0`; this makes that
    // a guarantee of the kernel instead of a courtesy of the runtime.
    // ------------------------------------------------------------------
    // Minimum 1x leverage. `create_policy` / `update_policy` already bound
    // the *policy* cap to `0 | 100..=10_000`; this bounds the *request*.
    require!(leverage_bps >= MIN_LEVERAGE_BPS, TreasuryError::InvalidLeverage);
    // A $0 authorization would burn no budget yet still emit an
    // `approved: true` AuditEvent — a free, unaccounted-for approval.
    require!(amount_usdc > 0, TreasuryError::InvalidAmount);

    if clock.slot.saturating_sub(p.last_reset_slot) >= SLOTS_PER_DAY {
        p.day_spent_usdc = 0;
        p.last_reset_slot = clock.slot;
    }

    let mut reason_code = REASON_OK;
    let mut approved = true;

    // D8: drawdown kill-switch check (BEFORE the existing check ladder).
    // Formula: threshold = peak * (10_000 - kill_pct_bps) / 10_000.
    // With peak=1000, kill_pct=25 → threshold=750; current=700 → KILL.
    if p.kill_switch_drawdown_pct > 0 && p.peak_equity_usdc > 0 {
        let kill_pct = p.kill_switch_drawdown_pct as u32;
        let threshold_bps = 10_000u32.saturating_sub(kill_pct.saturating_mul(100));
        let threshold_equity: u64 = ((p.peak_equity_usdc as u128)
            .saturating_mul(threshold_bps as u128)
            / 10_000u128) as u64;
        if implied_current_equity_usdc < threshold_equity {
            // Per SPEC: kill-switch deny returns Ok(()) but emits a denied
            // AuditEvent so the runtime can surface a RiskFlag without a
            // failed transaction. Mirrors the leverage-cap pattern (D7).
            emit!(AuditEvent {
                policy: p.key(),
                agent: p.agent,
                vendor,
                amount_usdc,
                approved: false,
                reason_code: REASON_DRAWDOWN_KILLSWITCH,
                nonce,
                at_slot: clock.slot,
            });
            return Ok(());
        }
    }

    if !p.vendors.contains(&vendor) {
        reason_code = REASON_VENDOR_DENIED;
        approved = false;
    } else if amount_usdc > p.per_tx_cap_usdc {
        reason_code = REASON_PER_TX_CAP;
        approved = false;
    } else if p.day_spent_usdc.saturating_add(amount_usdc) > p.per_day_cap_usdc {
        reason_code = REASON_DAILY_CAP;
        approved = false;
    } else if clock.slot.saturating_sub(p.created_at_slot) > p.ttl_slots {
        reason_code = REASON_EXPIRED;
        approved = false;
    } else if p.max_leverage_bps != 0 && leverage_bps > p.max_leverage_bps {
        // Per SPEC: leverage-cap deny returns Ok(()) but emits a denied
        // AuditEvent so the runtime can surface a RiskFlag without a
        // failed transaction.
        //
        // D9 — deliberate decision on the `max_leverage_bps == 0` bypass:
        // the `!= 0` guard is KEPT as-is. `0` means "no leverage cap" by
        // contract, stated in `state::Policy::max_leverage_bps`,
        // `create_policy`, `update_policy` and `REASON_CODES` docs, and it is
        // asserted by the agent test "max_leverage_bps = 0 means no leverage
        // cap". Adding a hidden ceiling here — say clamping to 10_000 — would
        // silently turn "uncapped" into "capped at 100x" for every existing
        // policy, which is exactly the silent semantic change to avoid.
        //
        // Consequence, stated plainly: with an uncapped policy a request for
        // `u16::MAX` (65535 = 655.35x) IS approved. That is accepted, because
        // this instruction does not open a position — it records an approval
        // and debits `per_tx_cap_usdc` / `per_day_cap_usdc` of *collateral*.
        // Actual leverage enforcement belongs to the venue, and the spend
        // this kernel is responsible for bounding stays bounded either way.
        // The `MIN_LEVERAGE_BPS` guard above is the part of leverage the
        // kernel genuinely owns: it rejects nonsense (0x, fractional), not
        // merely large values.
        //
        // A user who wants a bound sets a non-zero cap; one who does not is
        // making that choice explicitly at `create_policy` time.
        emit!(AuditEvent {
            policy: p.key(),
            agent: p.agent,
            vendor,
            amount_usdc,
            approved: false,
            reason_code: REASON_LEVERAGE_CAP,
            nonce,
            at_slot: clock.slot,
        });
        return Ok(());
    }

    if approved {
        p.day_spent_usdc = p.day_spent_usdc.saturating_add(amount_usdc);
    }

    emit!(AuditEvent {
        policy: p.key(),
        agent: p.agent,
        vendor,
        amount_usdc,
        approved,
        reason_code,
        nonce,
        at_slot: clock.slot,
    });

    Ok(())
}
