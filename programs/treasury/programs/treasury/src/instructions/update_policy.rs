use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    #[account(
        mut,
        seeds = [b"policy", policy.agent.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, Policy>,
    pub owner: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdatePolicy>,
    max_leverage_bps: Option<u16>,
    per_tx_cap_usdc: Option<u64>,
    per_day_cap_usdc: Option<u64>,
    ttl_slots: Option<u64>,
) -> Result<()> {
    let p = &mut ctx.accounts.policy;
    let clock = Clock::get()?;

    require!(
        ctx.accounts.owner.key() == p.owner,
        TreasuryError::Unauthorized
    );

    let next_max_leverage = max_leverage_bps.unwrap_or(p.max_leverage_bps);
    require!(
        next_max_leverage == 0 || (100..=10_000).contains(&next_max_leverage),
        TreasuryError::LeverageCapExceeded
    );

    if let Some(v) = max_leverage_bps {
        p.max_leverage_bps = v;
    }
    if let Some(v) = per_tx_cap_usdc {
        p.per_tx_cap_usdc = v;
    }
    if let Some(v) = per_day_cap_usdc {
        p.per_day_cap_usdc = v;
    }
    if let Some(v) = ttl_slots {
        p.ttl_slots = v;
    }

    emit!(AuditEvent {
        policy: p.key(),
        agent: p.agent,
        vendor: system_program::ID,
        amount_usdc: 0,
        approved: true,
        reason_code: REASON_OK,
        nonce: clock.slot,
        at_slot: clock.slot,
    });

    Ok(())
}
