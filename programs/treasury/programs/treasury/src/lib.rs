//! Agent Treasury - on-chain spending policy program.
//!
//! Frozen SPEC: SPEC.md (D3). See docs/copilot-verdict.md for evidence.

use anchor_lang::prelude::*;

declare_id!("4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph");

pub mod state;
pub mod instructions;

// Anchor's `#[program]` macro generates `use crate::__client_accounts_*`
// references, so the `#[derive(Accounts)]` structs must be reachable from the
// crate root.
pub use instructions::create_policy::*;
pub use instructions::authorize_spend::*;
pub use instructions::update_policy::*;
pub use instructions::record_pnl::*;
pub use state::*;

#[program]
pub mod treasury {
    use super::*;

    /// Create a policy PDA for an agent wallet.
    pub fn create_policy(
        ctx: Context<CreatePolicy>,
        vendors: Vec<Pubkey>,
        per_tx_cap_usdc: u64,
        per_day_cap_usdc: u64,
        ttl_slots: u64,
        max_leverage_bps: u16,
        kill_switch_drawdown_pct: u8,
    ) -> Result<()> {
        instructions::create_policy::handler(
            ctx,
            vendors,
            per_tx_cap_usdc,
            per_day_cap_usdc,
            ttl_slots,
            max_leverage_bps,
            kill_switch_drawdown_pct,
        )
    }

    /// Authorize a single spend. Emits an `AuditEvent` either way.
    /// Signer must be the policy's agent or owner.
    ///
    /// `implied_current_equity_usdc` is a best-effort runtime-reported
    /// value derived off-chain from venue position reconciliation. It
    /// drives a soft drawdown signal, not a guaranteed maximum loss.
    /// Current equity and peak observations are not oracle-authenticated.
    pub fn authorize_spend(
        ctx: Context<AuthorizeSpend>,
        vendor: Pubkey,
        amount_usdc: u64,
        nonce: u64,
        leverage_bps: u16,
        implied_current_equity_usdc: u64,
    ) -> Result<()> {
        instructions::authorize_spend::handler(
            ctx,
            vendor,
            amount_usdc,
            nonce,
            leverage_bps,
            implied_current_equity_usdc,
        )
    }

    /// Update mutable fields on an existing policy. Owner-only.
    pub fn update_policy(
        ctx: Context<UpdatePolicy>,
        max_leverage_bps: Option<u16>,
        per_tx_cap_usdc: Option<u64>,
        per_day_cap_usdc: Option<u64>,
        ttl_slots: Option<u64>,
        kill_switch_drawdown_pct: Option<u8>,
    ) -> Result<()> {
        instructions::update_policy::handler(
            ctx,
            max_leverage_bps,
            per_tx_cap_usdc,
            per_day_cap_usdc,
            ttl_slots,
            kill_switch_drawdown_pct,
        )
    }

    /// D8: Record PnL after a venue fill. The **only** on-chain path that
    /// mutates `peak_equity_usdc`. Updates the peak-equity watermark
    /// monotonically (`max(peak, new_equity)`) so the drawdown math has a
    /// stable reference. Agent or owner.
    pub fn record_pnl(
        ctx: Context<RecordPnl>,
        new_equity_usdc: u64,
    ) -> Result<()> {
        instructions::record_pnl::handler(ctx, new_equity_usdc)
    }
}
