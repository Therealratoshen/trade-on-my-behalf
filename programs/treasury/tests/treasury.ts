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
      .authorizeSpend(vendor.publicKey, new anchor.BN(500_000), new anchor.BN(1))
      .accounts({ policy: policyPda, owner: owner.publicKey })
      .rpc();

    await program.methods
      .authorizeSpend(vendor.publicKey, new anchor.BN(1_500_000), new anchor.BN(2))
      .accounts({ policy: policyPda, owner: owner.publicKey })
      .rpc();

    // Give the listener a tick
    await new Promise((r) => setTimeout(r, 500));
    await program.removeEventListener(sub);

    assert.isTrue(approvedSeen, "approve event missing");
    assert.isTrue(deniedSeen, "deny event missing (reason_code=3 = REASON_PER_TX_CAP)");
  });
});

let policyPda: anchor.web3.PublicKey;
