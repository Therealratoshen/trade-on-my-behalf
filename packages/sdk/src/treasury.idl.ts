/**
 * Treasury IDL (TypeScript const).
 *
 * GENERATED from programs/treasury/target/idl/treasury.json by
 * `pnpm --filter @trade-on-my-behalf/sdk run sync-idl`. Do not edit by hand;
 * run `anchor build` then the sync script after changing the program.
 */

export const IDL = {
  "address": "4TdJre5rGrGT3Zo5aEfmJmT6wu65BbjFjyLFjrMeJXph",
  "metadata": {
    "name": "treasury",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "authorize_spend",
      "docs": [
        "Authorize a single spend. Emits an `AuditEvent` either way.",
        "Signer must be the policy's agent or owner.",
        "",
        "`implied_current_equity_usdc` is a best-effort runtime-reported",
        "value derived off-chain from venue position reconciliation. It",
        "drives the drawdown kill-switch (D8) but cannot widen the",
        "kill-switch by itself — only `record_pnl` can raise",
        "`peak_equity_usdc`."
      ],
      "discriminator": [
        142,
        194,
        48,
        42,
        7,
        177,
        198,
        23
      ],
      "accounts": [
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "policy.agent",
                "account": "Policy"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "The agent's hot key (normal path) or the policy owner."
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "vendor",
          "type": "pubkey"
        },
        {
          "name": "amount_usdc",
          "type": "u64"
        },
        {
          "name": "nonce",
          "type": "u64"
        },
        {
          "name": "leverage_bps",
          "type": "u16"
        },
        {
          "name": "implied_current_equity_usdc",
          "type": "u64"
        }
      ]
    },
    {
      "name": "create_policy",
      "docs": [
        "Create a policy PDA for an agent wallet."
      ],
      "discriminator": [
        27,
        81,
        33,
        27,
        196,
        103,
        246,
        53
      ],
      "accounts": [
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "agent",
          "docs": [
            "The agent wallet this policy governs — the hot key the runtime holds.",
            "",
            "This is a `Signer`, not a plain pubkey, and that is load-bearing.",
            "The PDA is seeded on `[b\"policy\", agent.key()]`, so the agent key is a",
            "*naming* input while the owner picks every rule: vendor whitelist,",
            "per-tx cap, per-day cap, TTL, leverage cap, kill-switch. With `agent`",
            "as a plain account anyone could `init` the PDA for somebody else's",
            "agent key and pick all of those. The victim's own `ensure_policy` then",
            "sees a policy already exists and would silently adopt the attacker's",
            "rules — a user who asked for \"$50/trade, 3x\" quietly gets somebody",
            "else's limits, with no error to notice.",
            "",
            "Requiring the agent to sign is what makes \"I cannot break your rules\"",
            "mean anything: the agent consents to being governed, so a policy",
            "bearing agent's signature is one the agent actually accepted. This",
            "mirrors `authorize_spend` / `record_pnl`, which already accept either",
            "the owner or the agent as `authority`.",
            "",
            "Ergonomics: the agent must be a local hot key at provision time (that",
            "is what a runtime holds anyway — `tomb init-policy --owner <file>",
            "--agent <file>`), or the owner must be able to bring the agent online",
            "for the one create transaction. A hardware-wallet *policy* owner that",
            "has no custody of the agent keypair can no longer create the policy",
            "itself; it must delegate agent custody at bootstrap. That is a real",
            "cost, accepted because the alternative is unsettable policy."
          ],
          "signer": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "vendors",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "per_tx_cap_usdc",
          "type": "u64"
        },
        {
          "name": "per_day_cap_usdc",
          "type": "u64"
        },
        {
          "name": "ttl_slots",
          "type": "u64"
        },
        {
          "name": "max_leverage_bps",
          "type": "u16"
        },
        {
          "name": "kill_switch_drawdown_pct",
          "type": "u8"
        }
      ]
    },
    {
      "name": "record_pnl",
      "docs": [
        "D8: Record PnL after a venue fill. The **only** on-chain path that",
        "mutates `peak_equity_usdc`. Updates the peak-equity watermark",
        "monotonically (`max(peak, new_equity)`) so the drawdown math has a",
        "stable reference. Agent or owner."
      ],
      "discriminator": [
        98,
        235,
        215,
        253,
        46,
        94,
        140,
        14
      ],
      "accounts": [
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "policy.agent",
                "account": "Policy"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "new_equity_usdc",
          "type": "u64"
        }
      ]
    },
    {
      "name": "update_policy",
      "docs": [
        "Update mutable fields on an existing policy. Owner-only."
      ],
      "discriminator": [
        212,
        245,
        246,
        7,
        163,
        151,
        18,
        57
      ],
      "accounts": [
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "policy.agent",
                "account": "Policy"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "max_leverage_bps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "per_tx_cap_usdc",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "per_day_cap_usdc",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "ttl_slots",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "kill_switch_drawdown_pct",
          "type": {
            "option": "u8"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Policy",
      "discriminator": [
        222,
        135,
        7,
        163,
        235,
        177,
        33,
        68
      ]
    }
  ],
  "events": [
    {
      "name": "AuditEvent",
      "discriminator": [
        241,
        242,
        94,
        109,
        175,
        205,
        78,
        0
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "TooManyVendors",
      "msg": "max 16 vendors per policy"
    },
    {
      "code": 6001,
      "name": "VendorNotWhitelisted",
      "msg": "vendor not whitelisted"
    },
    {
      "code": 6002,
      "name": "ExceedsPerTxCap",
      "msg": "amount exceeds per-tx cap"
    },
    {
      "code": 6003,
      "name": "ExceedsDailyCap",
      "msg": "amount exceeds per-day cap"
    },
    {
      "code": 6004,
      "name": "PolicyExpired",
      "msg": "policy expired (TTL slots elapsed)"
    },
    {
      "code": 6005,
      "name": "Unauthorized",
      "msg": "unauthorized signer for this policy"
    },
    {
      "code": 6006,
      "name": "LeverageCapExceeded",
      "msg": "leverage cap exceeded"
    },
    {
      "code": 6007,
      "name": "DrawdownKillSwitchTripped",
      "msg": "drawdown kill-switch tripped"
    },
    {
      "code": 6008,
      "name": "InvalidLeverage",
      "msg": "leverage must be >= 100 bps (1x)"
    },
    {
      "code": 6009,
      "name": "InvalidAmount",
      "msg": "amount must be > 0"
    }
  ],
  "types": [
    {
      "name": "AuditEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "vendor",
            "type": "pubkey"
          },
          {
            "name": "amount_usdc",
            "type": "u64"
          },
          {
            "name": "approved",
            "type": "bool"
          },
          {
            "name": "reason_code",
            "type": "u8"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "at_slot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "Policy",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "vendors",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "per_tx_cap_usdc",
            "type": "u64"
          },
          {
            "name": "per_day_cap_usdc",
            "type": "u64"
          },
          {
            "name": "day_spent_usdc",
            "type": "u64"
          },
          {
            "name": "ttl_slots",
            "type": "u64"
          },
          {
            "name": "created_at_slot",
            "type": "u64"
          },
          {
            "name": "last_reset_slot",
            "type": "u64"
          },
          {
            "name": "max_leverage_bps",
            "type": "u16"
          },
          {
            "name": "peak_equity_usdc",
            "type": "u64"
          },
          {
            "name": "kill_switch_drawdown_pct",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
} as const;
