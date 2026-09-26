use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AuthorizeSpend<'info> {
    #[account(mut, seeds = [b"policy", policy.agent.as_ref()], bump = policy.bump)]
    pub policy: Account<'info, Policy>,
    pub owner: Signer<'info>,
}

pub fn handler(
    ctx: Context<AuthorizeSpend>,
    vendor: Pubkey,
    amount_usdc: u64,
    nonce: u64,
) -> Result<()> {
    let p = &mut ctx.accounts.policy;
    let clock = Clock::get()?;

    let mut reason_code = REASON_OK;
    let mut approved = true;

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
