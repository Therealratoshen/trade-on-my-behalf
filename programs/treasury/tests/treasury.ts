import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import { Treasury } from "../target/types/treasury";

describe("treasury", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.treasury as Program<Treasury>;
  const owner = provider.wallet as anchor.Wallet;

  it("creates a policy and authorizes a spend below cap", async () => {
    const agent = anchor.web3.Keypair.generate();
    const vendor = anchor.web3.Keypair.generate();

    [policyPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), agent.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .createPolicy(
        [vendor.publicKey],
        new anchor.BN(1_000_000), // per-tx cap: 1 USDC
        new anchor.BN(10_000_000), // per-day cap: 10 USDC
        new anchor.BN(1_000_000),  // TTL slots
        0,                         // max_leverage_bps (no leverage cap)
        0,                         // kill_switch_drawdown_pct (disabled)
      )
      .accounts({
        policy: policyPda,
        agent: agent.publicKey,
        owner: owner.publicKey,
      })
      .rpc();

    const policy = await program.account.policy.fetch(policyPda);
    assert.ok(policy.owner.equals(owner.publicKey));
    assert.equal(policy.vendors.length, 1);
    assert.equal(policy.killSwitchDrawdownPct, 0);

    // Authorize a small spend below cap. peak_equity_usdc=0 so drawdown
    // check is a no-op; pass implied_current=0 to match.
    await program.methods
      .authorizeSpend(
        vendor.publicKey,
        new anchor.BN(500_000), // 0.5 USDC
        new anchor.BN(1),
        0,                       // leverage_bps
        new anchor.BN(0),        // implied_current_equity_usdc
      )
      .accounts({
        policy: policyPda,
        owner: owner.publicKey,
      })
      .rpc();

    const policyAfter = await program.account.policy.fetch(policyPda);
    assert.equal(policyAfter.daySpentUsdc.toString(), "500000");
  });

  it("rejects over-cap spend but still emits a denied audit", async () => {
    const agent = anchor.web3.Keypair.generate();
    const vendor = anchor.web3.Keypair.generate();

    [policyPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), agent.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .createPolicy(
        [vendor.publicKey],
        new anchor.BN(1_000_000),
        new anchor.BN(10_000_000),
        new anchor.BN(1_000_000),
        0,
        0, // kill_switch_drawdown_pct disabled
      )
      .accounts({ policy: policyPda, agent: agent.publicKey, owner: owner.publicKey })
      .rpc();

    // Capture audit events for both calls.
    let approvedSeen = false;
    let deniedSeen = false;

    const sub = program.addEventListener("auditEvent", (ev: any) => {
      if (ev.approved && ev.amountUsdc.toString() === "500000") approvedSeen = true;
      // REASON_PER_TX_CAP = 2 (not 3; 3 is REASON_DAILY_CAP).
      if (!ev.approved && ev.reasonCode === 2 && ev.amountUsdc.toString() === "1500000") deniedSeen = true;
    });

    await program.methods
      .authorizeSpend(vendor.publicKey, new anchor.BN(500_000), new anchor.BN(1), 0, new anchor.BN(0))
      .accounts({ policy: policyPda, owner: owner.publicKey })
      .rpc();

    await program.methods
      .authorizeSpend(vendor.publicKey, new anchor.BN(1_500_000), new anchor.BN(2), 0, new anchor.BN(0))
      .accounts({ policy: policyPda, owner: owner.publicKey })
      .rpc();

    // Give the listener a tick to surface the events.
    await new Promise((r) => setTimeout(r, 1500));
    await program.removeEventListener(sub);

    assert.isTrue(approvedSeen, "approve event missing");
    assert.isTrue(deniedSeen, "deny event missing (reason_code=2 = REASON_PER_TX_CAP)");

    // day_spent_usdc must reflect only the approved 500_000 spend; the
    // 1_500_000 attempt must NOT have mutated state.
    const policyAfter = await program.account.policy.fetch(policyPda);
    assert.equal(policyAfter.daySpentUsdc.toString(), "500000",
      "day_spent_usdc was mutated by the rejected over-cap spend");
  });

  // ---------- D7: leverage cap + UpdatePolicy tests ----------

  it("denies authorize_spend when leverage_bps exceeds max_leverage_bps", async () => {
    const agent = anchor.web3.Keypair.generate();
    const vendor = anchor.web3.Keypair.generate();

    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), agent.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .createPolicy(
        [vendor.publicKey],
        new anchor.BN(1_000_000),
        new anchor.BN(10_000_000),
        new anchor.BN(1_000_000),
        3000, // max_leverage_bps = 3x cap
        0,    // kill_switch_drawdown_pct disabled
      )
      .accounts({ policy: pda, agent: agent.publicKey, owner: owner.publicKey })
      .rpc();

    let leverageDeniedSeen = false;
    const sub = program.addEventListener("auditEvent", (ev: any) => {
      // REASON_LEVERAGE_CAP = 6
      if (!ev.approved && ev.reasonCode === 6 && ev.amountUsdc.toString() === "500000") {
        leverageDeniedSeen = true;
      }
    });

    // leverage_bps=5000 (5x) > cap=3000 (3x) → must emit a denied AuditEvent
    await program.methods
      .authorizeSpend(vendor.publicKey, new anchor.BN(500_000), new anchor.BN(1), 5000, new anchor.BN(0))
      .accounts({ policy: pda, owner: owner.publicKey })
      .rpc();

    await new Promise((r) => setTimeout(r, 500));
    await program.removeEventListener(sub);

    assert.isTrue(
      leverageDeniedSeen,
      "denied AuditEvent with reason_code=6 (REASON_LEVERAGE_CAP) missing",
    );
  });

  it("owner can update_policy max_leverage_bps; subsequent leverage within cap approves", async () => {
    const agent = anchor.web3.Keypair.generate();
    const vendor = anchor.web3.Keypair.generate();

    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), agent.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .createPolicy(
        [vendor.publicKey],
        new anchor.BN(1_000_000),
        new anchor.BN(10_000_000),
        new anchor.BN(1_000_000),
        3000, // start at 3x cap
        0,    // kill_switch_drawdown_pct disabled
      )
      .accounts({ policy: pda, agent: agent.publicKey, owner: owner.publicKey })
      .rpc();

    // Update max_leverage_bps to 10000 (100x cap).
    await program.methods
      .updatePolicy(10000, null, null, null, null)
      .accounts({ policy: pda, owner: owner.publicKey })
      .rpc();

    const policyAfterUpdate = await program.account.policy.fetch(pda);
    assert.equal(policyAfterUpdate.maxLeverageBps, 10000);

    let approveSeen = false;
    const sub = program.addEventListener("auditEvent", (ev: any) => {
      if (ev.approved && ev.reasonCode === 0 && ev.amountUsdc.toString() === "500000") {
        approveSeen = true;
      }
    });

    // leverage_bps=8000 (8x) ≤ new cap=10000 → must approve
    await program.methods
      .authorizeSpend(vendor.publicKey, new anchor.BN(500_000), new anchor.BN(1), 8000, new anchor.BN(0))
      .accounts({ policy: pda, owner: owner.publicKey })
      .rpc();

    await new Promise((r) => setTimeout(r, 500));
    await program.removeEventListener(sub);

    assert.isTrue(approveSeen, "approve event missing after raising leverage cap");
  });

  it("rejects update_policy when called by a non-owner signer", async () => {
    const agent = anchor.web3.Keypair.generate();
    const vendor = anchor.web3.Keypair.generate();
    const nonOwner = anchor.web3.Keypair.generate();

    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), agent.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .createPolicy(
        [vendor.publicKey],
        new anchor.BN(1_000_000),
        new anchor.BN(10_000_000),
        new anchor.BN(1_000_000),
        3000,
        0, // kill_switch_drawdown_pct disabled
      )
      .accounts({ policy: pda, agent: agent.publicKey, owner: owner.publicKey })
      .rpc();

    // Airdrop some SOL to nonOwner so it can pay fees / be a signer.
    const sig = await provider.connection.requestAirdrop(
      nonOwner.publicKey,
      1_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);

    let threw = false;
    try {
      await program.methods
        .updatePolicy(10000, null, null, null, null)
        .accounts({
          policy: pda,
          owner: nonOwner.publicKey,
        })
        .signers([nonOwner])
        .rpc();
    } catch (_e) {
      threw = true;
    }
    assert.isTrue(threw, "non-owner update_policy should have failed");

    // Confirm policy state did not change.
    const policyAfter = await program.account.policy.fetch(pda);
    assert.equal(policyAfter.maxLeverageBps, 3000);
  });

  // ---------- D8: drawdown kill-switch tests ----------

  it("trips on-chain kill-switch when implied equity falls below threshold (REASON_DRAWDOWN_KILLSWITCH=7)", async () => {
    const agent = anchor.web3.Keypair.generate();
    const vendor = anchor.web3.Keypair.generate();

    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), agent.publicKey.toBuffer()],
      program.programId,
    );

    // Create with kill_switch_drawdown_pct = 25%.
    await program.methods
      .createPolicy(
        [vendor.publicKey],
        new anchor.BN(1_000_000),
        new anchor.BN(10_000_000),
        new anchor.BN(1_000_000),
        0,  // max_leverage_bps
        25, // kill_switch_drawdown_pct = 25%
      )
      .accounts({ policy: pda, agent: agent.publicKey, owner: owner.publicKey })
      .rpc();

    // record_pnl: peak_equity_usdc = 1000 (USDC microunits)
    await program.methods
      .recordPnl(new anchor.BN(1_000))
      .accounts({ policy: pda, owner: owner.publicKey })
      .rpc();

    let killDeniedSeen = false;
    const sub = program.addEventListener("auditEvent", (ev: any) => {
      // REASON_DRAWDOWN_KILLSWITCH = 7
      if (
        !ev.approved &&
        ev.reasonCode === 7 &&
        ev.amountUsdc.toString() === "500000"
      ) {
        killDeniedSeen = true;
      }
    });

    // threshold = 1000 * (10000 - 2500) / 10000 = 750
    // implied_current = 700 < 750 → KILL fires.
    await program.methods
      .authorizeSpend(
        vendor.publicKey,
        new anchor.BN(500_000),  // 0.5 USDC
        new anchor.BN(1),
        0,                       // leverage_bps
        new anchor.BN(700),      // implied_current_equity_usdc = 700 (< 750 threshold)
      )
      .accounts({ policy: pda, owner: owner.publicKey })
      .rpc();

    await new Promise((r) => setTimeout(r, 500));
    await program.removeEventListener(sub);

    assert.isTrue(
      killDeniedSeen,
      "denied AuditEvent with reason_code=7 (REASON_DRAWDOWN_KILLSWITCH) missing — " +
        "threshold=750 but implied_current=700 should have tripped the kill-switch",
    );

    // Verify day_spent_usdc was NOT incremented (kill-switch denies before
    // the existing check ladder, before the day-counter mutation).
    const policyAfter = await program.account.policy.fetch(pda);
    assert.equal(policyAfter.daySpentUsdc.toString(), "0");
    // peak_equity_usdc was set by record_pnl and should remain unchanged.
    assert.equal(policyAfter.peakEquityUsdc.toString(), "1000");
  });
});

let policyPda: anchor.web3.PublicKey;
