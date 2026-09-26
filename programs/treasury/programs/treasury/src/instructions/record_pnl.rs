use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

/// D8: `record_pnl` — the **only** on-chain path that mutates
/// `peak_equity_usdc`. Called by the runtime after a venue fill to
/// reflect reconciled PnL into the policy's peak-equity watermark.
///
/// Monotonic: `peak_equity_usdc = max(peak_equity_usdc, new_equity_usdc)`.
/// day_spent_usdc is intentionally left untouched; it is already managed
/// by the existing `authorize_spend` per-day counter logic.
#[derive(Accounts)]
pub struct RecordPnl<'info> {
    #[account(mut, seeds = [b"policy", policy.agent.as_ref()], bump = policy.bump)]
    pub policy: Account<'info, Policy>,
    pub owner: Signer<'info>,
}

pub fn handler(
    ctx: Context<RecordPnl>,
    new_equity_usdc: u64,
) -> Result<()> {
    let p = &mut ctx.accounts.policy;
    let clock = Clock::get()?;

    require!(
        ctx.accounts.owner.key() == p.owner,
        TreasuryError::Unauthorized
    );

    // Monotonic peak-equity watermark. Gains raise the watermark; losses do
    // not lower it (the drawdown math uses peak as the reference).
    if new_equity_usdc > p.peak_equity_usdc {
        p.peak_equity_usdc = new_equity_usdc;
    }

    // Emit an AuditEvent with REASON_OK so the on-chain trail reflects the
    // peak-equity update alongside spend authorizations. Same pattern as
    // update_policy: vendor = system program, amount = 0, nonce = slot.
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
