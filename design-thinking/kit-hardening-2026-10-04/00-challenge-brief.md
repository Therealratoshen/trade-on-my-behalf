# 00 — Challenge Brief

> **Kit-hardening design pass — 2026-10-04.** Research mode: **assumption**
> for user research, with one explicitly carved-out body of **evidence**.
> Read the distinction below before reading anything else in this folder.

## Research mode, stated precisely

This pass is **not** uniform in its evidence, and flattening it would be the
exact failure this repository exists to avoid. So, three tiers:

| Tier | What it covers | Label used in these files |
|---|---|---|
| **Evidence** | The competitive landscape, verified 2026-10-03 from primary sources: MetaMask Agent Wallet markets the same pitch but enforces via TEE + 2FA; Hypernova markets "enforced on-chain" but its own docs say *anchored*; every venue offers **delegation, not constrained delegation**. | `[EVIDENCE]` — cited, dated, primary-source |
| **Evidence (self-reported, single source)** | The founder's own words in `design-thinking/README.md`. One person, quoted verbatim, not corroborated. | `[TESTIMONY]` — one person, quoted |
| **Assumption** | Everything about user behaviour, judge behaviour, comprehension, and feeling. No human has evaluated any of this design. | `[ASSUMPTION]` |

The competitive evidence is **not** downgraded to assumption because it shares
a file with assumptions. It was checked against primary sources on a date I can
name, and it is labelled as evidence throughout.

The user research is **assumption** mode. Nobody — no user, no judge, no
outside tester — has seen this design or the previous one. Stage 5 says so at
the top of the file, and the iteration decisions there are made without
pretending otherwise.

## The challenge (as stated)

The pitch was overclaiming and has been corrected. Correcting the *documents*
was necessary and not sufficient, because the **surface** still overclaimed in
six places, and the design kit — the thing that governs how the surface is
allowed to look — had no vocabulary for the one question the corrected claim
raises.

So the challenge for this pass:

> **Make the design kit able to carry an honest, narrower claim — and make a
> judge able to *see* the difference between "the program refuses" and "the
> program asks" in ninety seconds, without running anything.**

## What changed in the world since the first pass

The first pass (`terading-2026-10-04/`) was a UI-semantics pass: it decided that
a colour may only claim what happened, and built a `--viz` family plus guard
rules R3b/R5 so verdicts could not be reused for other meanings. It was
correct, and it is preserved unchanged as the audit record.

What it did not anticipate is that the *product claim itself* would be
corrected. Verified: `programs/treasury/src/` contains **no CPI, no custody,
no transfer**. The program holds no keys. It cannot bind a venue action. Six
false claims were removed across `GTM.md`, `design-thinking/README.md` and
`design-thinking/five-stages.md`.

The surviving true claim is narrow:

> Caps live on chain and only the owner can change them; every decision is an
> unfalsifiable record.

**The first pass's design system was built to defend a claim the project no
longer makes.** `--ok`/`--no` guard "did the kernel decide this?" — and the
corrected answer is that the kernel decides *records*, not trades. The kit
needed a way to say that in pixels.

## Who

| Persona | Source | Standing in this pass |
|---|---|---|
| **Owner-trader** (primary) | `[TESTIMONY]` — founder's own words, quoted in `01` | The only direct testimony in the repo |
| **Judge at the fair** (added this pass) | `[ASSUMPTION]` for behaviour; `[EVIDENCE]` for what the competitors claim | 90 seconds, no wallet, will ask "how is this different from MetaMask Agent Wallet?" |
| **Outside tester** (D11, Tester 3) | `[ASSUMPTION]` | the persona that will hit the unarmed kill-switch and think it is broken |

## In scope

- The design kit's ability to express a *narrowed* claim without new overclaiming
- The state of the policy account as a visual concept
- One new primitive, chosen against named alternatives
- The judge-facing artifact, and whether it carries the argument
- Accessibility of everything added

## Out of scope

- The program, the SDK, the agent CLI — another agent is editing those files
  concurrently and this pass does not go near them
- Anything that would make the product *sound* better at the cost of being
  accurate
- Anchor program tests, deployment, airdrops

## Success

1. No element in the UI implies the program is enforced or bound.
2. A tester can distinguish "kill-switch armed" from "kill-switch not armed yet".
3. The kit's rules are enforced by a guard that has been fault-injected, not by
   memory.
4. The judge-facing artifact is generated from source and states its own
   provenance.

## Constraints

- **The sandbox browser reaches no port.** Every port returns `chrome-error://`;
  `file://` is blocked by policy. **Nothing in this pass has been seen painted.**
  This is the single biggest gap and it is restated at the top of
  `05-test-results.md`.
- Solo, four days to the fair.
- The previous pass must survive unchanged. It is the record of what was true
  then.
