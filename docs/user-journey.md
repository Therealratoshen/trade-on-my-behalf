# Terading — User Journey

Three personas, each with a goal, a path through the product, and the moment they abandon.

> **These journeys are designed expectations, not observed reactions.**
> [user-tests.md](user-tests.md) records all three outside-developer sessions as **NOT RUN** and the
> outcome register as `NOT OBSERVED / NOT COLLECTED`. **Zero outside-developer sessions have been
> performed.** No participant has used this product, so no real user reaction, quote, or timing
> exists. Every line about what a persona "sees," "concludes," or "abandons" is my inference from
> the code and the observed run outputs, labelled as such. Nothing here is evidence of user
> satisfaction. Real session data is owed — see [What would convert an assumption into evidence](#6-what-would-convert-an-assumption-into-evidence).

Every *verifiable* detail — commands, exit codes, output strings, reason codes — is marked
**[verified]** and can be traced to the executed-run record in
[testing-plan.md](testing-plan.md) and [user-manual.md](user-manual.md). Everything else is marked
**[assumption]**.

**Framing all three personas share.** The program authorizes and records trade permissions against
an owner's policy. It holds no keys, custodies nothing, and cannot execute a venue trade. Positions
are paper fills at live Jupiter reference prices. This boundary is stated in the dashboard's
`ClaimBoundary` panel and is non-negotiable in every journey below.

---

## 1. The cautious retail trader

> *"I handed a bot my key once and it drained me. I don't want to hand over my key again. I want
> caps I can check myself."*

**Goal:** trade with a hard, independently verifiable ceiling on what an agent can do — without
giving up custody, and without trusting the agent to behave.

### What they try first

They will not read a TRD. They will look for one command, and they will want to see a number they
can verify themselves.

```bash
OWNER_KEY="$(mktemp -d)/owner.json"
solana-keygen new --no-bip39-passphrase --silent --force -o "$OWNER_KEY"
OWNER_KEY="$OWNER_KEY" pnpm demo
```

### What they see — [verified]

The nine steps run, and the two that matter for this persona are exact:

- **Step 1** creates the policy on chain and prints the PDA and a receipt.
- **Step 4** — a misbehaving agent sends 20x unclamped and gets `chain DENIED REASON_LEVERAGE_CAP`.
- **Step 5** — an $80 signal against a $50 cap gets `chain DENIED REASON_PER_TX_CAP`.
- **Step 9** — the agent key tries to loosen its own policy and gets
  `Error Code: Unauthorized. Error Number: 6005. Error Message: unauthorized signer for this policy.`

Final state **[verified]**:

```console
perTxCapUsd            50
perDayCapUsd           150
killSwitchDrawdownPct  5
venue                  jupiter-perps (paper)
```

### Why this lands for them — [assumption, but grounded in verified output]

The reassurance is structural, not rhetorical. Three things this persona wants are all present:
the agent **cannot** raise its own caps (step 9 is a real on-chain rejection, not a UI hint); the
caps are **readable from the chain** rather than from a settings page; and each verdict carries a
**receipt link**. Step 9 is the load-bearing moment — it is the direct answer to "what if the bot
lies to me," and it is enforced by the program, not the client.

Their self-verification loop is also already documented **[verified]**: `tomb status` reads the
policy from the chain, and `tomb watch` streams the audit log:

```console
2026-10-04T13:19:49.068Z  APPROVE REASON_OK                    $    40.00  5HSEEi4M...
2026-10-04T13:19:51.581Z  DENY    REASON_PER_TX_CAP            $    90.00  4dsVpwbH...
```

### What confuses them — [assumption]

1. **"approved" and "bought" look like the same event.** Step 2 prints `chain APPROVED` and then
   `fill paper-75785a5a @ $121.35` on adjacent lines. To a non-technical reader that reads as a
   completed purchase. It is a paper fill in a local JSON file **[verified]** — the CLI's own
   output says `(paper — simulated at live Jupiter price)` — but the two lines are visually one
   event. This is the single most likely misunderstanding.
2. **`paper-75785a5a` looks like a transaction ID.** It is a paper position ID. The real
   signature is on the `receipt` line above it, and the two look interchangeable.
3. **The daily cap is not a loss limit, and the copy does not say so.** The manual has to say it
   explicitly; the CLI does not **[verified]**.
4. **What happens after the demo ends.** The validator is torn down and the policy is gone, because
   the ledger lived in a temp dir **[verified]**. Nothing is persisted anywhere durable, and the
   first-time user is not told that at the point they would want to know.
5. **[assumption]** A cautious trader may also balk at step 3. Their $500/20x request is silently
   rewritten to $50/5x and approved. Clamping is safe, but it is a *different trade from the one
   they asked for*, and nothing at that moment says "this is not what you requested" beyond the
   `clamped` lines.

### Where they'd abandon — [assumption]

Most likely: after step 2, when the paper fill suggests the whole thing works, and they go looking
for the dashboard or a real trade — and find neither. A cautious retail user is precisely the person
for whom "simulated" is disqualifying, and the simulation is the only thing that exists.

Second most likely: at provisioning. `init-policy` requires the owner and agent to co-sign, and
both keyfiles must be on the same host **[verified]**. The realistic production shape — you keep
your key on hardware and give the agent a hot key — is exactly the shape this does not yet
support, because the agent key is what the PDA seeds on.

### What would convert them

1. **Say "approved" ≠ "bought" on the same screen**, not in a docs page. A denied approval and a
   paper fill must not be rendered adjacently as if sequential.
2. **Persist the policy somewhere durable and reachable** so a cautious user can go back and check
   it tomorrow without rerunning the demo.
3. **Label the paper venue at the moment of the fill**, in the receipt itself, with the venue's
   state — `mode='paper'` is already a literal in `JupiterPerpsPaperVenue` **[verified]**, so this
   is available.
4. **Support a remote owner signer** (hardware wallet, or a two-step signature) so the
   provisioning flow matches the custody model they actually want.

---

## 2. The quant developer

> *"Is the policy model technically sound? Is the off-chain evaluator consistent with the on-chain
> kernel? Are the caps enforced where they claim to be?"*

**Goal:** assess whether the risk model is correct, and whether the boundary between off-chain
preflight and on-chain enforcement is drawn in the right place.

### What they try first

They will not run the demo. They will read the tests, because the tests are the actual claim.

```bash
pnpm --filter @trade-on-my-behalf/sdk test    # 31 passing
pnpm --filter @trade-on-my-behalf/agent test  # 37 passing
```

### What they see — [verified]

88 defined cases, and — unusually for a project at this stage — they mostly test the *hard* parts
rather than the happy path. Examples read straight from the run:

- `off-chain preflight said REASON_... ; chain answer used` and
  `chain answer wins over the off-chain preflight and the mismatch is flagged` — the SDK/agent
  treat the chain as authoritative and flag disagreement, rather than trusting local logic.
- `REGRESSION: the old wall-clock conversion overshoots by billions of slots` — a real bug they
  found, pinned by a test.
- `REGRESSION: a realistic current slot does NOT read expired` — a false-positive TTL bug, pinned.
- `peak equity is compared numerically, not by string formatting` — a class of bug that would have
  silently inverted the kill-switch.
- 15 of the 31 SDK cases cover the devnet-write guard alone, including
  `opting in still refuses a mainnet node reached over loopback`.

And the 20 Anchor cases **[verified]**, which include the adversarial ones:

```console
✔ rejects create_policy when the agent does not sign (PDA squatting)
✔ records the failure in the ledger when a legacy client strips the agent signer
✔ a third party's failed squat does not block the real owner
✔ agent key cannot loosen the policy via update_policy
```

### Why this lands — [verified, with a caveat they will find themselves]

The parts that will genuinely hold their attention:

- **Denial is not an error.** `authorize_spend` returns `Ok(())` and emits a denied `AuditEvent`
  **[verified]**, while *malformed* input is a separate `InvalidAmount` / `InvalidLeverage` that
  fails the transaction and never burns a reason code. That separation is unusual and correct.
- **Integer semantics throughout.** Cap fields are `u64` micro-USDC; leverage is `u16` bps with a
  1x floor, and `leverage_bps == 0` means uncapped **[verified]**.
- **Expiry is in slots, not wall-clock**, with a regression test that the old conversion
  overshot by billions **[verified]**.

The caveat they will find in under ten minutes, and it is the most important thing this
document has to say: **the policy model is sound, and it is soundly enforced, at the layer it
operates. It is not an execution sandbox.** The program contains no `invoke`/`invoke_signed`/
`transfer` **[verified]**. A quant will read `REASON_DRAWDOWN_KILLSWITCH` and then ask the next
question — "compared against whose equity?" — and the answer is the caller's own reported number
**[verified]**. A misreporting agent evades the kill-switch. Any evaluation that reads the caps as
"risk controls" is reading them too generously; they are **budget and reporting controls**.

### What confuses them — [assumption]

1. **Two equity numbers that both look authoritative.** `tomb status` prints `peakEquityUsd` (on
   chain) next to `paperEquityUsd` (a local JSON file) **[verified]** with no indication they come
   from different systems. A quant will read the pair as a reconciliation and find it is not one.
2. **Budget semantics.** `daySpentUsd` is an approved-collateral budget over a lazy 216,000-slot
   window, not a P&L bound, and it is consumed even when the venue step fails **[verified]**. The
   field name invites the wrong mental model.
3. **The kill-switch's trust boundary is not in the type system.** `implied_current_equity_usd` is
   a `u64` parameter on the instruction. Nothing at the call site marks it as untrusted, and there
   is no test asserting a misreporting agent's behaviour, because no test can — the program has no
   way to tell.
4. **No fuzzing, no property tests.** `tests/litesvm.rs` and `tests/surfpool/*.spec.ts` appear in
   historical documents as *plans*; the [testing plan](testing-plan.md) says explicitly they were
   plans, not implemented evidence. A quant who reads an old doc will look for them **[verified as
   absent]**.

### Where they'd abandon — [assumption]

At the vendor-membership question, and it is a sharp one. The policy checks that the *supplied*
vendor pubkey is in the whitelist. It does not bind that pubkey to any instruction the program
calls, because it calls nothing. `user-tests.md` states this in its own Session 2 notes: *"This
proves membership checking of supplied labels, **not** atomic venue destination enforcement."*
A quant who is evaluating "is this risk infrastructure" will find that the enforcement story ends
at a `Vec<Pubkey>` membership test, and there is no second half yet.

### What would convert them

1. **A stated trust model as a first-class artifact** — what the program trusts, what it does not,
   and what "safe" means given the missing execution link. Half of this exists in
   `docs/security-model.md` **[verified to exist]**; what is missing is the honest admission that
   "caller-reported equity" is an accepted residual risk, not a bug to be fixed later.
2. **A campaign-fuzz or property test** on the cap/TTL/reset boundaries, comparing evaluator against
   kernel at exact integer edges. [testing-plan.md](testing-plan.md) already proposes it.
3. **Make the untrusted-equity boundary structural** — a separate account or an oracle-signed
   equity source — so it is greppable rather than a comment.

---

## 3. The hackathon judge

> *"Two minutes. Does it actually work, or is it a mockup?"*

**Goal:** decide, fast, whether this is a working system.

### What they try first

The single command, then — if it is still interesting — the dashboard. They will not read
[TRD.md](../TRD.md). They will watch the terminal.

### What they see — [verified]

`pnpm demo` runs. Nine steps, each with a plain-language claim, each producing the stated outcome,
each printing a receipt **[verified end-to-end]**. The judge sees, in about a minute:

```console
== 1. Owner sets the rules on-chain: $50/trade, $150/day, max 5x, 25% drawdown kill-switch
policy created  6sZwMs7ncK5pVev1nSf1NPxvCfkPrSXcdqWDJh8P8XkX

== 2. In-policy trade: long SOL, $40 at 3x  → expect APPROVED + paper fill
chain    APPROVED REASON_OK  slot 15
fill     paper-75785a5a @ $121.35  fee $0.07  (paper — simulated at live Jupiter price)

== 4. Misbehaving agent sends 20x unclamped → expect DENIED REASON_LEVERAGE_CAP
chain    DENIED   REASON_LEVERAGE_CAP  slot 24

== 9. Compromised agent key tries to loosen its own policy → expect Unauthorized
error: Error Code: Unauthorized. Error Number: 6005. Error Message: unauthorized signer for this policy.
```

Every step **announces its expected outcome before showing it**. That is the right instinct for
this format, and it is verified to match. A judge can confirm the system does what it said it
would do without reading anything.

They will also hit the CLI help, which is self-documenting **[verified]**:

```console
tomb — Trade On My Behalf agent CLI
Usage: tomb <command> [flags]
```

### What confuses them — [assumption, but grounded in verified output]

1. **"The receipts point to solana.com, so it's mainnet."** No — they are
   `?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899` **[verified]**, i.e. a local
   validator. A judge who clicks will get a broken explorer page. The script does print
   `Done. Every "receipt" link above is an on-chain transaction on local.` **[verified]**, but only
   at the very end, after the links have already flashed past.
2. **"Approved, and it bought SOL at $121.35. It works!"** This is the dangerous misread, and it is
   the one the honesty rules exist to prevent. The fill is paper, priced from a live Jupiter
   reference feed, in a JSON file. The `paper-<hex>` ID is the tell **[verified]**; almost nobody
   will read it.
3. **The dashboard is a policy viewer, not a trading terminal** **[verified]**. A judge expecting a
   chart and a ticket will find neither — the README already states chart/ticket, a real devnet
   adapter, and enforced execution authority are **not implemented**.
4. **[assumption]** The demo takes ~30s of setup (build check, validator start, key generation). If
   a judge's first `pnpm demo` hits a cold `target/`, the `anchor build` adds ~1m45s **[verified
   from the Anchor suite run]**. That is survivable but it is a long time to wait before anything
   happens, and it is a real risk with a hard two-minute clock.
5. **[assumption]** On the reviewed revision the demo *failed outright* at step 1 with an
   unreadable error about genesis hashes. Any judge who cloned before this fix saw a wall of text
   and no demo. This is now fixed and verified working, but it is worth knowing it was real.

### Where they'd abandon — [assumption]

At the moment they realise nothing trades. The honest answer to "does it actually work" is
"the authorization and recording half works, completely, on chain; the trading half does not exist."
A judge who wants a trading product finds none, and one who wants an authorization primitive finds
a good one.

There is a worse failure mode than abandonment, and the docs should fear it more: a judge who
concludes "it trades," leaves a positive impression, and is wrong. Every surface in this repo
exists to prevent that, which is the right priority — but the prevention is a burden the *judge*
has to be willing to carry.

### What would convert them

1. **A single `pnpm demo` line at the top of the README that says what the demo is and is not**, in
   the first sentence rather than after the product description. The README's own framing line is
   currently good **[verified]** — *"an existing on-chain policy demo and **simulated** Jupiter
   positions"* — but it is a subtitle; a judge skimming sees "Jupiter" first.
2. **Make the local cluster visible at the moment of each receipt**, e.g.
   `local validator (not mainnet, not devnet)` on the same line, rather than only in the closing
   sentence.
3. **Show the enforcement limit in the demo itself.** Steps 1-9 show the program *denying bad
   requests*. What is missing is the step that shows the program is **bypassed** by a key that never
   asks it — the "recorded, not enforced" point — currently a docs panel, not a demo beat. This is
   the single highest-value addition: it converts the project's main weakness from something a
   judge discovers into something the project demonstrates.
4. **A prebuilt-artifact path** so the demo starts in seconds without `anchor build`.

---

## 4. Where the three journeys converge

All three meet the same wall, and it is the same wall:

| Persona | The wall |
|---|---|
| Cautious retail trader | "Approved is not bought. There is nothing here to buy." |
| Quant developer | "The caps are a budget, not a risk control, because equity is caller-reported." |
| Hackathon judge | "It records decisions. It does not execute trades." |

All three are looking at one missing capability: **an execution path the program is actually
authoritative over.** The project has the authorization half complete and honest; the enforcement
half is unbuilt. Nothing in the documentation should paper over that seam, and the current
documentation largely does not.

---

## 5. Claims deliberately not made here

- **No quote, reaction, or satisfaction score from any user.** No session has been run.
- **No timing measurement** of how long any persona took. None was observed.
- **No conversion rate, drop-off rate, or funnel data.** There is no telemetry and no cohort.
- **No claim that anyone has run the dashboard successfully.** This session could not reach
  `localhost` from a sandboxed browser; the served HTML was confirmed over `curl` only, and the
  page was **not seen rendering**.
- **No claim of devnet or mainnet activity.** Nothing was deployed; `pnpm devnet:demo` was not
  run.
- **No claim about Aster.** It is a design document
  (`docs/superpowers/specs/2026-10-04-aster-long-short-design.md`) with no implementation. There is
  no Aster code in `packages/` or `apps/` **[verified absent]**.

## 6. What would convert an assumption into evidence

1. Run the three sessions in [user-tests.md](user-tests.md) and fill the outcome register — tester
   ID, typed inputs, stored policy, observed reason code, resulting state, signatures, slots, and
   the participant's own reaction.
2. A scripted first-run for a non-technical user, timed, with the **paper label visible in the
   screenshot**. That would let personas 1 and 3 move from inferred to observed.
3. A judge-facing dry run of `pnpm demo` from a cold clone, with elapsed time recorded per step.
4. The demo beat for "a key that never asks the program" — then personas 1 and 3 can be asked what
   they think of it, rather than being predicted.

Until then, treat every persona above as a **hypothesis with a stated mechanism**, not a finding.
