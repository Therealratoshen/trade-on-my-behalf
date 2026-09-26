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
    ) -> Result<()> {
        instructions::create_policy::handler(
            ctx,
            vendors,
            per_tx_cap_usdc,
            per_day_cap_usdc,
            ttl_slots,
            max_leverage_bps,
        )
    }

    /// Authorize a single spend. Emits an `AuditEvent` either way.
    pub fn authorize_spend(
        ctx: Context<AuthorizeSpend>,
        vendor: Pubkey,
        amount_usdc: u64,
        nonce: u64,
        leverage_bps: u16,
    ) -> Result<()> {
        instructions::authorize_spend::handler(ctx, vendor, amount_usdc, nonce, leverage_bps)
    }

    /// Update mutable fields on an existing policy. Owner-only.
    pub fn update_policy(
        ctx: Context<UpdatePolicy>,
        max_leverage_bps: Option<u16>,
        per_tx_cap_usdc: Option<u64>,
        per_day_cap_usdc: Option<u64>,
        ttl_slots: Option<u64>,
    ) -> Result<()> {
        instructions::update_policy::handler(
            ctx,
            max_leverage_bps,
            per_tx_cap_usdc,
            per_day_cap_usdc,
            ttl_slots,
        )
    }
}
