use crate::state::*;
use anchor_lang::prelude::*;

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
