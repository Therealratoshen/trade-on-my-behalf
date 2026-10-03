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
    /// Agent consents to registration; owner also signs and pays.
    pub agent: Signer<'info>,
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
    max_leverage_bps: u16,
    kill_switch_drawdown_pct: u8,
) -> Result<()> {
    require!(vendors.len() <= 16, TreasuryError::TooManyVendors);
    // 0 means "no leverage cap"; otherwise 100..=10000 bps (1x..=100x).
    require!(
        max_leverage_bps == 0 || (100..=10_000).contains(&max_leverage_bps),
        TreasuryError::LeverageCapExceeded
    );
    // kill_switch_drawdown_pct: 0 disables, else 1..=100 percent.
    require!(
        kill_switch_drawdown_pct <= 100,
        TreasuryError::DrawdownKillSwitchTripped
    );

    let p = &mut ctx.accounts.policy;
    let clock = Clock::get()?;
    p.owner = ctx.accounts.owner.key();
    p.agent = ctx.accounts.agent.key();
    p.vendors = vendors;
    p.per_tx_cap_usdc = per_tx_cap_usdc;
    p.per_day_cap_usdc = per_day_cap_usdc;
    p.day_spent_usdc = 0;
    p.ttl_slots = ttl_slots;
    p.created_at_slot = clock.slot;
    p.last_reset_slot = clock.slot;
    p.max_leverage_bps = max_leverage_bps;
    p.peak_equity_usdc = 0;
    p.kill_switch_drawdown_pct = kill_switch_drawdown_pct;
    p.bump = ctx.bumps.policy;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // This compile-time assertion fails if the field regresses to UncheckedAccount.
    fn agent_signer_field<'a, 'info>(accounts: &'a CreatePolicy<'info>) -> &'a Signer<'info> {
        &accounts.agent
    }

    #[test]
    fn registration_requires_a_real_agent_signature() {
        let _ = agent_signer_field;
        let key = Pubkey::new_unique();
        let owner = anchor_lang::system_program::ID;
        let mut lamports = 1;
        let mut data = [];
        let unsigned = AccountInfo::new(&key, false, false, &mut lamports, &mut data, &owner, false, 0);
        assert!(Signer::try_from(&unsigned).is_err());
        let mut lamports = 1;
        let mut data = [];
        let signed = AccountInfo::new(&key, true, false, &mut lamports, &mut data, &owner, false, 0);
        assert!(Signer::try_from(&signed).is_ok());
    }
}
