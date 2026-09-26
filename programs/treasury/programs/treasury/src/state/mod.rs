use anchor_lang::prelude::*;

#[account]
pub struct Policy {
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub vendors: Vec<Pubkey>,
    pub per_tx_cap_usdc: u64,
    pub per_day_cap_usdc: u64,
    pub day_spent_usdc: u64,
    pub ttl_slots: u64,
    pub created_at_slot: u64,
    pub last_reset_slot: u64,
    pub max_leverage_bps: u16, // 0 = no leverage cap; else 100..=10000 (1x..=100x in bps)
    pub peak_equity_usdc: u64, // 0 = uninitialized; used for drawdown calc
    pub bump: u8,
}

impl Policy {
    pub fn space(max_vendors: usize) -> usize {
        8 + 32 + 32 + (4 + max_vendors * 32) + 8 + 8 + 8 + 8 + 8 + 8 + 2 + 8 + 1
    }
}

#[event]
pub struct AuditEvent {
    pub policy: Pubkey,
    pub agent: Pubkey,
    pub vendor: Pubkey,
    pub amount_usdc: u64,
    pub approved: bool,
    pub reason_code: u8,
    pub nonce: u64,
    pub at_slot: u64,
}

pub const REASON_OK: u8 = 0;
pub const REASON_VENDOR_DENIED: u8 = 1;
pub const REASON_PER_TX_CAP: u8 = 2;
pub const REASON_DAILY_CAP: u8 = 3;
pub const REASON_EXPIRED: u8 = 4;
pub const REASON_UNKNOWN_VENDOR: u8 = 5;
pub const REASON_LEVERAGE_CAP: u8 = 6;
pub const REASON_DRAWDOWN_KILLSWITCH: u8 = 7;

#[error_code]
pub enum TreasuryError {
    #[msg("max 16 vendors per policy")]
    TooManyVendors,
    #[msg("vendor not whitelisted")]
    VendorNotWhitelisted,
    #[msg("amount exceeds per-tx cap")]
    ExceedsPerTxCap,
    #[msg("amount exceeds per-day cap")]
    ExceedsDailyCap,
    #[msg("policy expired (TTL slots elapsed)")]
    PolicyExpired,
    #[msg("unauthorized signer for this policy")]
    Unauthorized,
    #[msg("leverage cap exceeded")]
    LeverageCapExceeded,
    #[msg("drawdown kill-switch tripped")]
    DrawdownKillSwitchTripped,
}
