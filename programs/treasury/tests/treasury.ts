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

    // Authorize a small spend below cap
    await program.methods
      .authorizeSpend(
        vendor.publicKey,
        new anchor.BN(500_000), // 0.5 USDC
        new anchor.BN(1),
        0,                       // leverage_bps
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
      )
      .accounts({ policy: policyPda, agent: agent.publicKey, owner: owner.publicKey })
      .rpc();

    // Capture audit events for both calls
    const listener = (await import("@coral-xyz/anchor")).Event;
    let approvedSeen = false;
    let deniedSeen = false;

    const sub = program.addEventListener("auditEvent", (ev: any) => {
      if (ev.approved && ev.amountUsdc.toString() === "500000") approvedSeen = true;
      if (!ev.approved && ev.reasonCode === 3 && ev.amountUsdc.toString() === "1500000") deniedSeen = true;
    });

    await program.methods
      .authorizeSpend(vendor.publicKey, new anchor.BN(500_000), new anchor.BN(1), 0)
      .accounts({ policy: policyPda, owner: owner.publicKey })
      .rpc();

    await program.methods
      .authorizeSpend(vendor.publicKey, new anchor.BN(1_500_000), new anchor.BN(2), 0)
      .accounts({ policy: policyPda, owner: owner.publicKey })
      .rpc();

    // Give the listener a tick
    await new Promise((r) => setTimeout(r, 500));
    await program.removeEventListener(sub);

    assert.isTrue(approvedSeen, "approve event missing");
    assert.isTrue(deniedSeen, "deny event missing (reason_code=3 = REASON_PER_TX_CAP)");
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
      .authorizeSpend(vendor.publicKey, new anchor.BN(500_000), new anchor.BN(1), 5000)
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
      )
      .accounts({ policy: pda, agent: agent.publicKey, owner: owner.publicKey })
      .rpc();

    // Update max_leverage_bps to 10000 (100x cap).
    await program.methods
      .updatePolicy(10000, null, null, null)
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
      .authorizeSpend(vendor.publicKey, new anchor.BN(500_000), new anchor.BN(1), 8000)
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
        .updatePolicy(10000, null, null, null)
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
});

let policyPda: anchor.web3.PublicKey;
