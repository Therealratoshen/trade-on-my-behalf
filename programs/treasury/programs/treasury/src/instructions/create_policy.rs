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
    /// The agent wallet this policy governs — the hot key the runtime holds.
    ///
    /// This is a `Signer`, not a plain pubkey, and that is load-bearing.
    /// The PDA is seeded on `[b"policy", agent.key()]`, so the agent key is a
    /// *naming* input while the owner picks every rule: vendor whitelist,
    /// per-tx cap, per-day cap, TTL, leverage cap, kill-switch. With `agent`
    /// as a plain account anyone could `init` the PDA for somebody else's
    /// agent key and pick all of those. The victim's own `ensure_policy` then
    /// sees a policy already exists and would silently adopt the attacker's
    /// rules — a user who asked for "$50/trade, 3x" quietly gets somebody
    /// else's limits, with no error to notice.
    ///
    /// Requiring the agent to sign is what makes "I cannot break your rules"
    /// mean anything: the agent consents to being governed, so a policy
    /// bearing agent's signature is one the agent actually accepted. This
    /// mirrors `authorize_spend` / `record_pnl`, which already accept either
    /// the owner or the agent as `authority`.
    ///
    /// Ergonomics: the agent must be a local hot key at provision time (that
    /// is what a runtime holds anyway — `tomb init-policy --owner <file>
    /// --agent <file>`), or the owner must be able to bring the agent online
    /// for the one create transaction. A hardware-wallet *policy* owner that
    /// has no custody of the agent keypair can no longer create the policy
    /// itself; it must delegate agent custody at bootstrap. That is a real
    /// cost, accepted because the alternative is unsettable policy.
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
