import * as anchor from "@coral-xyz/anchor";
import { Program, BN, EventParser } from "@coral-xyz/anchor";
import { assert } from "chai";
import { Treasury } from "../target/types/treasury";

type Audit = {
  approved: boolean;
  reasonCode: number;
  amountUsdc: BN;
  nonce: BN;
};

describe("treasury", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.treasury as Program<Treasury>;
  const owner = provider.wallet as anchor.Wallet;
  const parser = new EventParser(program.programId, program.coder);
  const RPC_OPTS: anchor.web3.ConfirmOptions = { commitment: "confirmed", preflightCommitment: "confirmed" };

  function policyPdaFor(agent: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), agent.toBuffer()],
      program.programId,
    )[0];
  }

  async function createPolicy(opts: {
    perTx?: number;
    perDay?: number;
    ttlSlots?: number;
    maxLeverageBps?: number;
    killPct?: number;
  } = {}) {
    const agent = anchor.web3.Keypair.generate();
    const vendor = anchor.web3.Keypair.generate();
    const pda = policyPdaFor(agent.publicKey);
    await program.methods
      .createPolicy(
        [vendor.publicKey],
        new BN(opts.perTx ?? 1_000_000), // 1 USDC
        new BN(opts.perDay ?? 10_000_000), // 10 USDC
        new BN(opts.ttlSlots ?? 1_000_000),
        opts.maxLeverageBps ?? 0,
        opts.killPct ?? 0,
      )
      .accounts({ policy: pda, agent: agent.publicKey, owner: owner.publicKey })
      .rpc(RPC_OPTS);
    return { agent, vendor, pda };
  }

  /** Reads the AuditEvents emitted by a confirmed transaction from its logs. */
  async function auditsOf(signature: string): Promise<Audit[]> {
    const tx = await provider.connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    const logs = tx?.meta?.logMessages ?? [];
    return [...parser.parseLogs(logs)]
      .filter((e) => e.name === "auditEvent")
      .map((e) => e.data as Audit);
  }

  async function authorize(
    pda: anchor.web3.PublicKey,
    vendor: anchor.web3.PublicKey,
    amount: number,
    opts: { nonce?: number; leverageBps?: number; equity?: number; signer?: anchor.web3.Keypair } = {},
  ): Promise<Audit> {
    const authority = opts.signer?.publicKey ?? owner.publicKey;
    let builder = program.methods
      .authorizeSpend(
        vendor,
        new BN(amount),
        new BN(opts.nonce ?? 1),
        opts.leverageBps ?? 0,
        new BN(opts.equity ?? 0),
      )
      .accounts({ policy: pda, authority });
    if (opts.signer) builder = builder.signers([opts.signer]);
    const sig = await builder.rpc(RPC_OPTS);
    const audits = await auditsOf(sig);
    assert.equal(audits.length, 1, "authorize_spend must emit exactly one AuditEvent");
    return audits[0];
  }

  it("creates a policy and authorizes a spend below cap", async () => {
    const { vendor, pda } = await createPolicy();

    const policy = await program.account.policy.fetch(pda);
    assert.ok(policy.owner.equals(owner.publicKey));
    assert.equal(policy.vendors.length, 1);
    assert.equal(policy.killSwitchDrawdownPct, 0);

    const audit = await authorize(pda, vendor.publicKey, 500_000);
    assert.isTrue(audit.approved);
    assert.equal(audit.reasonCode, 0);

    const after = await program.account.policy.fetch(pda);
    assert.equal(after.daySpentUsdc.toString(), "500000");
  });

  it("rejects over-cap spend but still emits a denied audit", async () => {
    const { vendor, pda } = await createPolicy();

    const ok = await authorize(pda, vendor.publicKey, 500_000, { nonce: 1 });
    assert.isTrue(ok.approved);

    const denied = await authorize(pda, vendor.publicKey, 1_500_000, { nonce: 2 });
    assert.isFalse(denied.approved);
    assert.equal(denied.reasonCode, 2, "REASON_PER_TX_CAP = 2");

    const after = await program.account.policy.fetch(pda);
    assert.equal(after.daySpentUsdc.toString(), "500000",
      "day_spent_usdc was mutated by the rejected over-cap spend");
  });

  it("denies a vendor that is not whitelisted (REASON_VENDOR_DENIED=1)", async () => {
    const { pda } = await createPolicy();
    const stranger = anchor.web3.Keypair.generate().publicKey;
    const audit = await authorize(pda, stranger, 500_000);
    assert.isFalse(audit.approved);
    assert.equal(audit.reasonCode, 1);
  });

  it("denies once the daily cap is used up (REASON_DAILY_CAP=3)", async () => {
    const { vendor, pda } = await createPolicy({ perTx: 1_000_000, perDay: 1_500_000 });
    assert.isTrue((await authorize(pda, vendor.publicKey, 1_000_000, { nonce: 1 })).approved);
    const denied = await authorize(pda, vendor.publicKey, 1_000_000, { nonce: 2 });
    assert.isFalse(denied.approved);
    assert.equal(denied.reasonCode, 3);
  });

  it("denies after the policy TTL elapses (REASON_EXPIRED=4)", async () => {
    const { vendor, pda } = await createPolicy({ ttlSlots: 1 });
    const created = (await program.account.policy.fetch(pda)).createdAtSlot.toNumber();

    // Wait until at least 2 slots have passed.
    for (let i = 0; i < 50; i++) {
      if ((await provider.connection.getSlot("confirmed")) > created + 2) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    const audit = await authorize(pda, vendor.publicKey, 500_000);
    assert.isFalse(audit.approved);
    assert.equal(audit.reasonCode, 4);
    const after = await program.account.policy.fetch(pda);
    assert.equal(after.daySpentUsdc.toString(), "0");
  });

  // ---------- D7: leverage cap + UpdatePolicy ----------

  it("denies authorize_spend when leverage_bps exceeds max_leverage_bps", async () => {
    const { vendor, pda } = await createPolicy({ maxLeverageBps: 3000 });
    const audit = await authorize(pda, vendor.publicKey, 500_000, { leverageBps: 5000 });
    assert.isFalse(audit.approved);
    assert.equal(audit.reasonCode, 6, "REASON_LEVERAGE_CAP = 6");
  });

  it("owner can update_policy max_leverage_bps; subsequent leverage within cap approves", async () => {
    const { vendor, pda } = await createPolicy({ maxLeverageBps: 3000 });

    await program.methods
      .updatePolicy(10000, null, null, null, null)
      .accounts({ policy: pda, owner: owner.publicKey })
      .rpc(RPC_OPTS);
    assert.equal((await program.account.policy.fetch(pda)).maxLeverageBps, 10000);

    const audit = await authorize(pda, vendor.publicKey, 500_000, { leverageBps: 8000 });
    assert.isTrue(audit.approved);
    assert.equal(audit.reasonCode, 0);
  });

  it("rejects update_policy when called by a non-owner signer", async () => {
    const { pda } = await createPolicy({ maxLeverageBps: 3000 });
    const nonOwner = anchor.web3.Keypair.generate();

    let threw = false;
    try {
      await program.methods
        .updatePolicy(10000, null, null, null, null)
        .accounts({ policy: pda, owner: nonOwner.publicKey })
        .signers([nonOwner])
        .rpc(RPC_OPTS);
    } catch (_e) {
      threw = true;
    }
    assert.isTrue(threw, "non-owner update_policy should have failed");
    assert.equal((await program.account.policy.fetch(pda)).maxLeverageBps, 3000);
  });

  // ---------- Signer checks ----------

  it("rejects authorize_spend signed by a key that is neither agent nor owner", async () => {
    const { vendor, pda } = await createPolicy();
    const stranger = anchor.web3.Keypair.generate();

    let err = "";
    try {
      await authorize(pda, vendor.publicKey, 500_000, { signer: stranger });
    } catch (e) {
      err = String(e);
    }
    assert.include(err, "Unauthorized", "a stranger must not be able to spend down the daily cap");
    assert.equal((await program.account.policy.fetch(pda)).daySpentUsdc.toString(), "0");
  });

  it("agent key can authorize_spend and record_pnl on its own policy", async () => {
    const { agent, vendor, pda } = await createPolicy();

    const audit = await authorize(pda, vendor.publicKey, 500_000, { signer: agent });
    assert.isTrue(audit.approved);

    await program.methods
      .recordPnl(new BN(2_000_000))
      .accounts({ policy: pda, authority: agent.publicKey })
      .signers([agent])
      .rpc(RPC_OPTS);
    assert.equal((await program.account.policy.fetch(pda)).peakEquityUsdc.toString(), "2000000");
  });

  it("agent key cannot loosen the policy via update_policy", async () => {
    const { agent, pda } = await createPolicy({ maxLeverageBps: 3000 });
    let threw = false;
    try {
      await program.methods
        .updatePolicy(10000, null, null, null, null)
        .accounts({ policy: pda, owner: agent.publicKey })
        .signers([agent])
        .rpc(RPC_OPTS);
    } catch (_e) {
      threw = true;
    }
    assert.isTrue(threw);
    assert.equal((await program.account.policy.fetch(pda)).maxLeverageBps, 3000);
  });

  // ---------- D8: drawdown kill-switch ----------

  it("trips on-chain kill-switch when implied equity falls below threshold (REASON_DRAWDOWN_KILLSWITCH=7)", async () => {
    const { vendor, pda } = await createPolicy({ killPct: 25 });

    await program.methods
      .recordPnl(new BN(1_000))
      .accounts({ policy: pda, authority: owner.publicKey })
      .rpc(RPC_OPTS);

    // threshold = 1000 * 75% = 750; implied_current = 700 → KILL.
    const audit = await authorize(pda, vendor.publicKey, 500_000, { equity: 700 });
    assert.isFalse(audit.approved);
    assert.equal(audit.reasonCode, 7);

    const after = await program.account.policy.fetch(pda);
    assert.equal(after.daySpentUsdc.toString(), "0");
    assert.equal(after.peakEquityUsdc.toString(), "1000");
  });
});
