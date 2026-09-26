# User Tests — D11 Outside-Dev Run

> Filled by actual testers on D10-D11. The founder does not edit the
> entries; judges read this verbatim.

This file is the **template** for the D11 outside-dev user tests.
Three testers, none of whom are on the team, will run
`scripts/devnet-demo.sh` end-to-end against devnet and fill in the
sections below. Each test must produce:

- the rule the tester configured,
- the trade they attempted (or tried to),
- the outcome (approve / deny / timeout / error),
- the `AuditEvent` they observed (or the off-chain `AuditEventView`
  if the chain was not reached).

Each tester also writes a short paragraph on what surprised them —
the unexpected part is more valuable than the happy-path.

The fields below are the canonical recording shape. The tester
copies the slot, signature, and `reasonCode` from the dashboard
or from the Telegram DM; the founder does not pre-fill any of it.

---

## Test 1

**Tester background.** *(Who is this person, what do they trade,
have they used a perps venue before? One paragraph.)*

**Rule they configured.**

```ts
{
  venues: ['jupiter-perps'],
  maxLeverage: ____,         // bps (e.g. 500 = 5x)
  maxPositionUsd: ____,      // dollars
  maxDailyLossUsd: ____,     // dollars
  killSwitchDrawdownPct: ____ // percent
}
```

**Trade they attempted.**

- side: long / short
- market: ____
- sizeUsd: ____
- leverage: ____

**Outcome.** *(approve / deny / timeout / error, and which reason
code if deny.)*

**Observed AuditEvent.**

```text
policy:        ___________________________________
agent:         ___________________________________
vendor:        ___________________________________
amount_usdc:   __________
approved:      true | false
reason_code:   __
nonce:         __________
at_slot:       __________
```

**What surprised them.** *(One paragraph.)*

---

## Test 2

**Tester background.** *(One paragraph.)*

**Rule they configured.**

```ts
{
  venues: ['drift', 'jupiter-perps'],
  maxLeverage: ____,
  maxPositionUsd: ____,
  maxDailyLossUsd: ____,
  killSwitchDrawdownPct: ____
}
```

**Trade they attempted.**

- side: long / short
- market: ____
- sizeUsd: ____
- leverage: ____

**Outcome.** *(approve / deny / timeout / error, reason code if deny.)*

**Observed AuditEvent.**

```text
policy:        ___________________________________
agent:         ___________________________________
vendor:        ___________________________________
amount_usdc:   __________
approved:      true | false
reason_code:   __
nonce:         __________
at_slot:       __________
```

**What surprised them.** *(One paragraph.)*

---

## Test 3

**Tester background.** *(One paragraph.)*

**Rule they configured.**

```ts
{
  venues: ['drift'],
  maxLeverage: ____,
  maxPositionUsd: ____,
  maxDailyLossUsd: ____,
  killSwitchDrawdownPct: ____
}
```

**Trade they attempted.**

- side: long / short
- market: ____
- sizeUsd: ____
- leverage: ____

**Outcome.** *(approve / deny / timeout / error, reason code if deny.)*

**Observed AuditEvent.**

```text
policy:        ___________________________________
agent:         ___________________________________
vendor:        ___________________________________
amount_usdc:   __________
approved:      true | false
reason_code:   __
nonce:         __________
at_slot:       __________
```

**What surprised them.** *(One paragraph.)*

---

## Notes for judges

- A "deny" outcome is *not* a failure of the product. It is the
  product working as designed. The interesting reads are the reason
  codes and whether the tester agrees with the deny.
- A "timeout" means the tester's phone was not reachable within 60
  seconds. That is also working as designed.
- The `nonce` is whatever the runtime assigned at decision time; it
  is not the venue tx signature. The venue signature is a separate
  field surfaced on the dashboard once the position opens.