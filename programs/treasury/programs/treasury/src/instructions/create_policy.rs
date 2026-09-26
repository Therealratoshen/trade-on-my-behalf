use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreatePolicy<'info> {
    #[account(
        init,
        payer = owner,
        space = Policy::space(16),
        seeds = [b"policy", agent.key().as_ref()],
        bump,
    )]
    pub policy: Account<'info, Policy>,
    /// CHECK: this is the agent's wallet pubkey. Not deserialized.
    pub agent: UncheckedAccount<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreatePolicy>,
    vendors: Vec<Pubkey>,
    per_tx_cap_usdc: u64,
    per_day_cap_usdc: u64,
    ttl_slots: u64,
) -> Result<()> {
    require!(vendors.len() <= 16, TreasuryError::TooManyVendors);

    let p = &mut ctx.accounts.policy;
    p.owner = ctx.accounts.owner.key();
    p.agent = ctx.accounts.agent.key();
    p.vendors = vendors;
    p.per_tx_cap_usdc = per_tx_cap_usdc;
    p.per_day_cap_usdc = per_day_cap_usdc;
    p.day_spent_usdc = 0;
    p.ttl_slots = ttl_slots;
    p.created_at_slot = Clock::get()?.slot;
    p.last_reset_slot = Clock::get()?.slot;
    p.bump = ctx.bumps.policy;

    Ok(())
}
