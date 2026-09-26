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
    ) -> Result<()> {
        instructions::create_policy::handler(
            ctx,
            vendors,
            per_tx_cap_usdc,
            per_day_cap_usdc,
            ttl_slots,
        )
    }

    /// Authorize a single spend. Emits an `AuditEvent` either way.
    pub fn authorize_spend(
        ctx: Context<AuthorizeSpend>,
        vendor: Pubkey,
        amount_usdc: u64,
        nonce: u64,
    ) -> Result<()> {
        instructions::authorize_spend::handler(ctx, vendor, amount_usdc, nonce)
    }
}
