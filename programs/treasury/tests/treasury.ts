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

/**
 * Serialize a transaction that declares two signers but carries only one
 * signature — exactly what an old client (built against the pre-fix IDL,
 * where `agent` was not a signer) puts on the wire.
 *
 * `tx.sign()` refuses to build that, because it checks that every declared
 * signer signed. That check is client-side, which is exactly the guard we
 * must bypass in order to test the runtime. `partialSign` records a signature
 * without that validation, and `serialize({ requireAllSignatures: false })`
 * allows the short signature block out.
 */
function serializeWithSingleSignature(
  tx: anchor.web3.Transaction,
  signer: anchor.web3.Keypair,
): Buffer {
  tx.partialSign(signer);
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
}

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
    signAgent?: boolean;
    agentKeypair?: anchor.web3.Keypair;
    txOwner?: anchor.web3.Keypair;
  } = {}) {
    const agent = opts.agentKeypair ?? anchor.web3.Keypair.generate();
    const vendor = anchor.web3.Keypair.generate();
    const pda = policyPdaFor(agent.publicKey);
    // Default: sign with BOTH the agent and the owner. The agent is the key
    // being governed, so create_policy requires its consent.
    const shouldSignAgent = opts.signAgent ?? true;
    let builder = program.methods
      .createPolicy(
        [vendor.publicKey],
        new BN(opts.perTx ?? 1_000_000), // 1 USDC
        new BN(opts.perDay ?? 10_000_000), // 10 USDC
        new BN(opts.ttlSlots ?? 1_000_000),
        opts.maxLeverageBps ?? 0,
        opts.killPct ?? 0,
      )
      .accounts({
        policy: pda,
        agent: agent.publicKey,
        owner: (opts.txOwner ?? owner).publicKey,
      });
    const extra: anchor.web3.Keypair[] = [];
    if (shouldSignAgent) extra.push(agent);
    if (opts.txOwner) extra.push(opts.txOwner);
    if (extra.length > 0) builder = builder.signers(extra);
    const sig = await builder.rpc(RPC_OPTS);
    return { agent, vendor, pda, signature: sig };
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
        // D9: the default is 1x, the minimum the chain now accepts. The old
        // default of 0 is no longer a well-formed request.
        opts.leverageBps ?? 100,
        new BN(opts.equity ?? 0),
      )
      .accounts({ policy: pda, authority });
    if (opts.signer) builder = builder.signers([opts.signer]);
    const sig = await builder.rpc(RPC_OPTS);
    const audits = await auditsOf(sig);
    assert.equal(audits.length, 1, "authorize_spend must emit exactly one AuditEvent");
    return audits[0];
  }

  /**
   * Sends a malformed request and returns the thrown error string. D9
   * well-formedness failures are `Err!`, so no AuditEvent is emitted and no
   * transaction is recorded.
   */
  async function authorizeExpectingThrow(
    pda: anchor.web3.PublicKey,
    vendor: anchor.web3.PublicKey,
    amount: number,
    opts: { nonce?: number; leverageBps?: number; equity?: number } = {},
  ): Promise<string> {
    let err = "";
    try {
      await program.methods
        .authorizeSpend(
          vendor,
          new BN(amount),
          new BN(opts.nonce ?? 1),
          opts.leverageBps ?? 100,
          new BN(opts.equity ?? 0),
        )
        .accounts({ policy: pda, authority: owner.publicKey })
        .rpc(RPC_OPTS);
    } catch (e) {
      err = String(e);
    }
    assert.notEqual(err, "", "expected authorize_spend to fail");
    return err;
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

  it("approves leverage at max_leverage_bps and denies leverage above it", async () => {
    const { vendor, pda } = await createPolicy({ maxLeverageBps: 3000 });
    const atCap = await authorize(pda, vendor.publicKey, 500_000, { nonce: 1, leverageBps: 3000 });
    assert.isTrue(atCap.approved, "leverage exactly at the cap should approve");
    assert.equal(atCap.reasonCode, 0, "REASON_OK = 0");

    const aboveCap = await authorize(pda, vendor.publicKey, 500_000, { nonce: 2, leverageBps: 3001 });
    assert.isFalse(aboveCap.approved, "leverage above the cap should deny");
    assert.equal(aboveCap.reasonCode, 6, "REASON_LEVERAGE_CAP = 6");

    const after = await program.account.policy.fetch(pda);
    assert.equal(after.daySpentUsdc.toString(), "500000", "only the approved trade should consume the daily cap");
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

  // ---------- D9: request well-formedness ----------

  it("rejects leverage below 1x with InvalidLeverage (leverage_bps = 0)", async () => {
    const { vendor, pda } = await createPolicy();

    const err = await authorizeExpectingThrow(pda, vendor.publicKey, 500_000, { leverageBps: 0 });
    assert.include(err, "InvalidLeverage");

    const after = await program.account.policy.fetch(pda);
    assert.equal(after.daySpentUsdc.toString(), "0", "a malformed request must not consume budget");
  });

  it("accepts the 1x floor and rejects just under it", async () => {
    const { vendor, pda } = await createPolicy();

    const at1x = await authorize(pda, vendor.publicKey, 500_000, { nonce: 1, leverageBps: 100 });
    assert.isTrue(at1x.approved, "exactly 1x is well-formed");
    assert.equal(at1x.reasonCode, 0);

    const under = await authorizeExpectingThrow(pda, vendor.publicKey, 500_000, { nonce: 2, leverageBps: 99 });
    assert.include(under, "InvalidLeverage", "99 bps is sub-1x and must be rejected");

    const after = await program.account.policy.fetch(pda);
    assert.equal(after.daySpentUsdc.toString(), "500000", "only the well-formed trade consumed budget");
  });

  it("rejects amount_usdc == 0 with InvalidAmount (no approved audit, no budget burned)", async () => {
    const { vendor, pda } = await createPolicy();

    const err = await authorizeExpectingThrow(pda, vendor.publicKey, 0, { leverageBps: 100 });
    assert.include(err, "InvalidAmount");

    const after = await program.account.policy.fetch(pda);
    assert.equal(after.daySpentUsdc.toString(), "0");

    // The policy must still be usable afterwards — this is a bad argument,
    // not a spent or poisoned policy.
    const ok = await authorize(pda, vendor.publicKey, 500_000, { nonce: 1, leverageBps: 100 });
    assert.isTrue(ok.approved);
  });

  it("leverage above u16 range stays uncapped when max_leverage_bps == 0", async () => {
    // D9 decision: `max_leverage_bps == 0` means "no leverage cap" and keeps
    // its documented meaning. A 655.35x request is APPROVED, because this
    // instruction does not open a position and the spend it bounds stays
    // bounded by the per-tx / daily caps. Setting a real cap is the user's
    // explicit choice at create_policy time.
    const { vendor, pda } = await createPolicy({ maxLeverageBps: 0, perTx: 1_000_000, perDay: 2_000_000 });

    const uncapped = await authorize(pda, vendor.publicKey, 500_000, { nonce: 1, leverageBps: 65_535 });
    assert.isTrue(uncapped.approved, "an uncapped policy does not gain a hidden ceiling");
    assert.equal(uncapped.reasonCode, 0);

    // The spend caps still bite regardless of leverage.
    const overCap = await authorize(pda, vendor.publicKey, 1_500_000, { nonce: 2, leverageBps: 65_535 });
    assert.isFalse(overCap.approved, "per-tx cap still applies at 655x");
    assert.equal(overCap.reasonCode, 2, "REASON_PER_TX_CAP = 2");

    // Contrast: the same huge request against a policy that DID set a cap.
    const capped = await createPolicy({ maxLeverageBps: 3000 });
    const denied = await authorize(capped.pda, capped.vendor.publicKey, 500_000, {
      nonce: 1,
      leverageBps: 65_535,
    });
    assert.isFalse(denied.approved, "a real cap is still enforced at the top of the u16 range");
    assert.equal(denied.reasonCode, 6, "REASON_LEVERAGE_CAP = 6");
  });

  // ---------- R8: PDA squatting / rules-inheritance ----------

  /**
   * The runtime reports a missing signer as "Signature verification failed"
   * (web3.js) or "SignatureFailure" (Anchor's SendTransactionError). Both mean
   * the same thing; accept either so the test asserts the security property
   * rather than an error-string format.
   */
  function assertSignerFailure(err: string, context: string) {
    assert.notEqual(err, "", `${context}: transaction must fail`);
    assert.match(
      err,
      /Signature verification failed|SignatureFailure|Missing signature/i,
      `${context}: expected a missing-signature failure, got: ${err}`,
    );
  }

  it("rejects create_policy when the agent does not sign (PDA squatting)", async () => {
    // The vulnerability: `agent` used to be an UncheckedAccount, so anybody
    // could init the policy PDA for a victim's agent key and pick the caps.
    const victimAgent = anchor.web3.Keypair.generate();
    const attacker = anchor.web3.Keypair.generate();
    const victimPda = policyPdaFor(victimAgent.publicKey);

    // Attacker pays and names the victim's agent key, but cannot sign as it.
    let err = "";
    try {
      await program.methods
        .createPolicy(
          [attacker.publicKey],
          new BN(10_000_000_000), // $10,000 per tx — absurd
          new BN(10_000_000_000),
          new BN(1_000_000),
          10_000, // 100x leverage
          100, // kill-switch at 100% drawdown = effectively off
        )
        .accounts({
          policy: victimPda,
          agent: victimAgent.publicKey,
          owner: attacker.publicKey,
        })
        .signers([attacker])
        .rpc(RPC_OPTS);
    } catch (e) {
      err = String(e);
    }

    assertSignerFailure(err, "attacker squatting a victim agent PDA");

    // The decisive assertion: no policy was created, so the victim is not
    // silently inheriting the attacker's rules.
    const after = await provider.connection.getAccountInfo(victimPda, "confirmed");
    assert.isNull(after, "the policy PDA must NOT exist after a failed squat");
  });

  it("records the failure in the ledger when a legacy client strips the agent signer", async () => {
    // A "legacy client" is one built against the OLD idl, where `agent` was not
    // a signer. It emits a transaction whose message header demands the agent's
    // signature but whose signature block does not contain one.
    //
    // `skipPreflight: true` bypasses the client-side simulation, so this also
    // covers the "stripped the signer meta" case that a careful SDK would
    // otherwise have caught locally. The property under test is that the
    // *runtime* rejects it and the *ledger* records the failure — not merely
    // that Anchor's client-side validation notices.
    const victimAgent = anchor.web3.Keypair.generate();
    const attacker = anchor.web3.Keypair.generate();
    const victimPda = policyPdaFor(victimAgent.publicKey);

    const ix = await program.methods
      .createPolicy(
        [attacker.publicKey],
        new BN(10_000_000_000),
        new BN(10_000_000_000),
        new BN(1_000_000),
        10_000,
        100,
      )
      .accounts({
        policy: victimPda,
        agent: victimAgent.publicKey,
        owner: attacker.publicKey,
      })
      .instruction();

    // Declare the agent as a required signer (so the runtime demands it) but
    // supply only the attacker's signature.
    const forged = new anchor.web3.Transaction().add(
      new anchor.web3.TransactionInstruction({
        programId: ix.programId,
        keys: ix.keys.map((k) =>
          k.pubkey.equals(victimAgent.publicKey) ? { ...k, isSigner: true } : k,
        ),
        data: ix.data,
      }),
    );
    forged.feePayer = attacker.publicKey;
    forged.recentBlockhash = (await provider.connection.getLatestBlockhash("confirmed")).blockhash;
    const required = forged.compileMessage().header.numRequiredSignatures;
    assert.isAbove(required, 1, "test setup: the message must demand more than one signature");

    const raw = serializeWithSingleSignature(forged, attacker);

    // With skipPreflight the RPC returns a signature optimistically; the bank
    // rejects it a moment later. So the assertion is on the recorded outcome,
    // not on whether the send call threw.
    let signature: string | null = null;
    let sendError = "";
    try {
      signature = await provider.connection.sendRawTransaction(raw, {
        preflightCommitment: "confirmed",
        skipPreflight: true,
      });
    } catch (e) {
      sendError = String(e);
    }

    if (signature !== null) {
      // The transaction reached the bank. It must be recorded as failed.
      const status = await provider.connection.getSignatureStatus(signature);
      for (let i = 0; i < 50 && status.value?.confirmationStatus !== "finalized"; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const s = await provider.connection.getSignatureStatus(signature);
        if (s.value?.err) {
          assert.match(
            JSON.stringify(s.value.err),
            /SignatureFailure|Missing signature/i,
            `the bank must record a missing-signature failure, got: ${JSON.stringify(s.value.err)}`,
          );
          break;
        }
      }
      const final = await provider.connection.getSignatureStatus(signature);
      assert.isNotNull(
        final.value?.err,
        "a skipped-preflight create_policy without the agent signature must be recorded as failed",
      );
    } else {
      // Some RPCs still reject up front; that is an equally good outcome.
      assert.match(
        sendError,
        /Signature verification failed|SignatureFailure|Missing signature/i,
        `a rejected send must be a signature failure, got: ${sendError}`,
      );
    }

    // The decisive assertion, and the one that matches the vulnerability:
    // the squat did not create anything the victim would later inherit.
    await new Promise((r) => setTimeout(r, 1000));
    const after = await provider.connection.getAccountInfo(victimPda, "confirmed");
    assert.isNull(after, "no policy PDA may exist for the victim agent key");
  });

  it("a third party's failed squat does not block the real owner", async () => {
    // After the attacker's attempt fails, the legitimate owner + agent pair
    // must still be able to create the policy on the same PDA. This guards
    // against an "init then fail" partial state poisoning the address.
    const victimAgent = anchor.web3.Keypair.generate();
    const attacker = anchor.web3.Keypair.generate();
    const victimPda = policyPdaFor(victimAgent.publicKey);

    let threw = false;
    try {
      await program.methods
        .createPolicy([attacker.publicKey], new BN(10_000_000_000), new BN(10_000_000_000), new BN(1_000_000), 10_000, 100)
        .accounts({ policy: victimPda, agent: victimAgent.publicKey, owner: attacker.publicKey })
        .signers([attacker])
        .rpc(RPC_OPTS);
    } catch (_e) {
      threw = true;
    }
    assert.isTrue(threw);

    // The real owner creates the policy WITH the agent's consent.
    const created = await program.methods
      .createPolicy([attacker.publicKey], new BN(1_000_000), new BN(10_000_000), new BN(1_000_000), 3000, 25)
      .accounts({ policy: victimPda, agent: victimAgent.publicKey, owner: owner.publicKey })
      .signers([victimAgent])
      .rpc(RPC_OPTS);
    assert.ok(created);

    const p = await program.account.policy.fetch(victimPda);
    assert.ok(p.owner.equals(owner.publicKey), "the victim's own owner key is in charge");
    assert.equal(p.perTxCapUsdc.toString(), "1000000", "the victim's own caps, not the attacker's");
    assert.equal(p.maxLeverageBps, 3000);
  });

  it("create_policy requires the agent signer even when owner and attacker agree", async () => {
    // Both the owner key and the attacker co-sign; only the agent withholds.
    // This isolates the agent-consent requirement from ordinary authz: no
    // combination of other signers can manufacture consent from the agent.
    const agent = anchor.web3.Keypair.generate();
    const pda = policyPdaFor(agent.publicKey);

    let err = "";
    try {
      await program.methods
        .createPolicy([owner.publicKey], new BN(1_000_000), new BN(10_000_000), new BN(1_000_000), 0, 0)
        .accounts({ policy: pda, agent: agent.publicKey, owner: owner.publicKey })
        .rpc(RPC_OPTS); // provider signs only the owner
    } catch (e) {
      err = String(e);
    }
    assertSignerFailure(err, "owner signature alone, agent silent");
    assert.isNull(await provider.connection.getAccountInfo(pda, "confirmed"));
  });
});
