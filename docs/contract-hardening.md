# Prepared devnet contract hardening

This change is source preparation, not a deployment, professional audit or activation of trading.

## Changes

- `create_policy` requires the agent **and** owner to sign. The agent consents to the owner and rules in the same signed transaction. A legacy client cannot bypass this by clearing the agent's signer metadata.
- Daily usage uses checked addition. Overflow emits the existing `DAILY_CAP` denial and does not partially charge or mutate the spend counter. Exact-cap approvals still charge the full amount.
- Existing agent-keyed PDA seeds, account layouts, arguments, discriminators and reason codes are preserved. Creation signature requirements change; regenerate the IDL and update callers together.
- SDK `ensurePolicy` requires `agentSigner` when agent and owner differ. Existing policies must match the calling owner; no silent reuse of a squatted policy.
- SDK agent writes and the paper runtime require a trusted `expectedOwner` supplied independently of the account being fetched. Wrong-agent, wrong-program and wrong-owner accounts are rejected. Runtime close checks binding before changing paper positions.
- SDK writes verify the RPC genesis hash: devnet by default. An explicit `allowLocalValidator` opt-in accepts only a loopback ephemeral validator, never a public mainnet/testnet genesis. The CLI flag is `--local-validator`; this is for regression tests, not public-network execution.
- The runtime rejects live venue mode. No trading process, wallet funding or deployment is started by this change.

## Caller updates

```ts
const owner = withTrader({ connection, wallet: ownerKeypair, policy: agentKeypair.publicKey });
await owner.ensurePolicy({
  agent: agentKeypair.publicKey, agentSigner: agentKeypair,
  vendors, perTxCapUsd: 50, perDayCapUsd: 150,
});
const agent = withTrader({
  connection, wallet: agentKeypair, policy: agentKeypair.publicKey,
  expectedOwner: ownerKeypair.publicKey,
});
```

This Node SDK example assumes a trusted local initialization process. Do not upload either private key to a server or pass keys between owner and agent services. Separately hosted wallets need an offline/partial transaction signing flow; this change does not add a browser registration UI.

Paper CLI `status`, `trade`, `positions`, `close` and `watch` now require `--expected-owner <trusted-user-public-key>`. Do not fill it from the fetched policy's owner. The demo script obtains it from the configured owner wallet's public key.

Legacy incorrectly owned PDAs cannot be reclaimed by this patch. Use a fresh agent key after checking the expected owner. Existing correctly owned policies retain their addresses and data; they are not retroactively certified as consented registrations.

## Validation and rollout

Run `cargo test --locked --lib -p treasury` in `programs/treasury`, build SDK/agent, and run their Node tests. Native Anchor `idl-build` output was used to regenerate the SDK interface without deploying.

The Anchor integration suite includes real transaction tests for unsigned-agent rejection/rollback and exact-maximum charging followed by overflow denial. All 14 tests passed against an isolated local validator with the actual SBF build; see [validation evidence](local-validator-validation.md). Native unit tests do not replace these transaction tests. Do not run the demo script just to validate this PR: its devnet mode can deploy and fund accounts.

Before any devnet upgrade, obtain explicit approval, verify upgrade authority, run the full local-validator suite and review existing policy ownership. Before funded venue execution, independently audit the design.

## Remaining trust boundaries

This remains an authorization/event gate, not custody or atomic venue execution. Equity is self-reported, event nonces are not single-use permissions, and venue failure still consumes approved spend. An untrusted agent with independent venue access can bypass this gate. These issues require authenticated equity and a constrained, venue-specific executor; this patch does not claim to solve them.