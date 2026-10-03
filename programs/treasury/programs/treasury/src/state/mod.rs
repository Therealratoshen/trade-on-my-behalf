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
    pub kill_switch_drawdown_pct: u8, // 0 = kill-switch disabled; else 1..=100 (percent)
    pub bump: u8,
}

impl Policy {
    pub fn space(max_vendors: usize) -> usize {
        8 + 32 + 32 + (4 + max_vendors * 32) + 8 + 8 + 8 + 8 + 8 + 8 + 2 + 8 + 1 + 1
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

/// Length of the `per_day_cap_usdc` window: 24h at ~0.4 s/slot. The window
/// is rolling from `last_reset_slot`, not aligned to midnight UTC.
pub const SLOTS_PER_DAY: u64 = 216_000;

/// Deny overflow, including when the configured cap is u64::MAX.
/// A valid approval must charge the entire amount, never a saturated fraction.
pub fn checked_daily_spend(spent: u64, amount: u64, cap: u64) -> Option<u64> {
    spent.checked_add(amount).filter(|total| *total <= cap)
}

#[cfg(test)]
mod accounting_tests {
    use super::checked_daily_spend;

    #[test]
    fn exact_cap_is_allowed_and_fully_charged() {
        assert_eq!(checked_daily_spend(5, 5, 10), Some(10));
        assert_eq!(checked_daily_spend(u64::MAX - 5, 5, u64::MAX), Some(u64::MAX));
    }

    #[test]
    fn overflow_is_denied_even_with_maximum_cap() {
        assert_eq!(checked_daily_spend(u64::MAX - 5, 6, u64::MAX), None);
        assert_eq!(checked_daily_spend(u64::MAX, 1, u64::MAX), None);
    }

    #[test]
    fn over_cap_and_lowered_cap_are_denied() {
        assert_eq!(checked_daily_spend(5, 6, 10), None);
        assert_eq!(checked_daily_spend(11, 0, 10), None);
    }

    #[test]
    fn zero_and_reset_accounting_preserve_existing_semantics() {
        assert_eq!(checked_daily_spend(0, 0, 0), Some(0));
        assert_eq!(checked_daily_spend(0, 5, 10), Some(5));
    }
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
