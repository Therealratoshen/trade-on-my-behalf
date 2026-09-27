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
///
/// Callable by the agent as well as the owner: raising the watermark can
/// only make the kill-switch trip sooner, so a compromised agent key
/// cannot use this instruction to loosen the policy.
#[derive(Accounts)]
pub struct RecordPnl<'info> {
    #[account(
        mut,
        seeds = [b"policy", policy.agent.as_ref()],
        bump = policy.bump,
        constraint = authority.key() == policy.agent || authority.key() == policy.owner
            @ TreasuryError::Unauthorized,
    )]
    pub policy: Account<'info, Policy>,
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<RecordPnl>,
    new_equity_usdc: u64,
) -> Result<()> {
    let p = &mut ctx.accounts.policy;
    let clock = Clock::get()?;

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
