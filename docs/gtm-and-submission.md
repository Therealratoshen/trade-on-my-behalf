# GTM and Submission — Crypto World's Fair 2026

> Frozen for D6. Submission form mirror updated on D16 with the
> outside-person link check; final submit on D17 before 11:59 pm PT.

This document is the single source of truth for the submission
package. `SUBMISSION.md` mirrors the form fields; `GTM.md` mirrors
the strategy; this document explains how the two are produced and
what the founder checks before pressing submit.

## 1. Project name and tagline

- **Project:** Trade On My Behalf
- **One-liner:** "An on-chain risk-gated perps agent for time-poor
  Solana traders. The user writes the rules once; the Anchor
  program enforces them at the wallet's signing layer."

The one-liner is the answer to the form's "What's your project in
one sentence?" field and the slide-1 title of the pitch video.

## 2. Registration on colosseum.com

Steps the founder runs once on D7 (after docs land):

1. Sign in to colosseum.com with the GitHub handle that owns this
   repo.
2. Click **Create Project** on the World's Fair dashboard.
3. Paste the one-liner above into the project description.
4. Set **GitHub repo URL** to `https://github.com/<handle>/<repo>`
   (private repo is fine; colosseum.com's grader uses a read-only
   PAT to clone).
5. Set **Demo URL** to the unlisted YouTube link (see §6) once the
   demo is recorded on D14.
6. Set **Pitch URL** to the unlisted YouTube link for the pitch
   recorded on D13.
7. Set **Team location** to the founder's primary city (see §8).
8. Set **Team size** to `1` (solo).
9. Submit. Colosseum creates a dashboard at
   `https://colosseum.com/projects/explore/trade-on-my-behalf` (slug
   may differ if taken; pick the next-best).

## 3. Tracks to claim

The form lets a project claim one primary track and any number of
secondary tracks. Trade On My Behalf claims:

- **Primary: Solana.** This is the funded track.
- **Secondary: DeFi** (because the product is perps, which lives in
  the DeFi track). DeFi is unfunded in this hackathon but is the
  category the judges will look under when reading.
- **Secondary: AI Agents** (because the runtime classifies signals
  via an LLM-shaped abstraction even though v1 does not generate
  them). Stretch.

We do **not** claim the Stablecoins track (Litecoin bridge was
removed at D3'). We do **not** claim the Consumer Apps track
(perps is not consumer-y; the wedge is the founder's pain, not
the casual retail user).

## 4. Prior-work disclosure

Per the official rules (§6 of the hackathon spec), work done inside
the window (Sep 14 – Oct 12, 2026) is judged. Pre-window skills /
MCP / template installation is **not** counted.

What was installed pre-window:

- `npx skills add ColosseumOrg/colosseum-copilot` (research skill)
- `npx skills add https://github.com/solana-foundation/solana-dev-skill`
- `npx skills add helius-labs/core-ai --skill {build,jupiter,phantom,svm}`
- `npx skills add <birdeye>` (truncated in skills-lock.json; verify
  on D16)

None of those skills contain functional on-chain code shipped as
part of this project. The Solana dev skill is a *reference* skill
inside `.agents/skills/`. It is not vendored into `programs/treasury`.

The form's prior-work disclosure field gets this exact paragraph:

> Pre-window: skills installed (Copilot research skill, Solana dev
> skill, Helius core-ai skills, Birdeye skill). No on-chain code
> shipped prior to Sep 14. The Treasury Anchor program was first
> compiled on D4 (Sep 26, 2026), well inside the window.

What was authored **inside** the window:

- D3' pivot decision (Sep 16) and SPEC.md freeze.
- D4 Anchor `treasury` program (compiles, IDL generated, Tier 1
  test scaffold).
- D5 Perps-agent Deep Dive (verdict: PARTIAL GAP in v1-c9).
- D6 documentation-first scaffold (this set of 12 docs + GTM).
- D7-D17: SDK, agent runtime, venue adapters, user tests, pitch,
  demo, final submit.

## 5. Pitch video (2-3 min)

Format: unlisted YouTube, recorded on D13. Slide budget: 8 slides.

| Slide | Title | Body |
|---|---|---|
| 1 | "Trade On My Behalf." | One-liner: *"I cannot break your rules — within the as-stored caps."* |
| 2 | "I'm the user." | Founder persona. Time-poor, recognizes setups, can't watch charts. |
| 3 | "Existing bots solve the wrong problem." | 24/7 signal executors. They run whatever signals come in. They don't know the user's *own* rules. |
| 4 | "What I want is one sentence." | "When my conditions fire, take *this* trade, with *these* constraints. If a trade would break a rule, don't take it — even if the signal says to." |
| 5 | "The rules are on-chain." | Anchor program + Policy PDA + AuditEvent. Diagram from [docs/architecture.md](architecture.md). |
| 6 | "The rule fires while I sleep." | Webapp audit-log row lights up red within 2 s. No human approve/deny button — the kernel decides. |
| 7 | "Two precedents, neither solves it." | Infty.trade (AI venue, not personal client). Armor Wallet (AI agent, no perps, no policy). Competitor TG/chat bots (no policy layer). |
| 8 | "DEMO (link). Submit by Oct 12." | |

**Honest security framing in the pitch:** the on-screen headline
on slides 1, 5, 6 reads *"I cannot break your rules — within the
as-stored caps."* The qualifier is load-bearing and short enough to
stay on the slide. The full honest read — including the two carve-
outs (stolen-key loosening, hostile-venue CPI) — lives in
[docs/security-model.md](security-model.md) and is referenced on
slide 5 via QR-style link to the doc, not in the spoken pitch.

Each slide is <40 words. Each title is the takeaway in 4-6 words.
The deck is readable in 15 seconds per slide.

## 6. Demo video (≤3 min)

Format: unlisted YouTube, recorded on D14. Two-screen capture:

1. **Setup** (60 s): `pnpm install && anchor build && anchor deploy
   --provider.cluster devnet && pnpm --filter @trade-on-my-behalf/agent dev`.
   Founder narrates over the screen.
2. **Live trade** (90 s): paste a `TradeIntent`, watch the runtime
   evaluate it, see the webapp's audit-log row light up red (deny)
   or green (approve) within 2 s, show the venue position open on
   Solana Explorer.
3. **Deny + audit** (30 s): paste an over-leverage intent, watch
   the kernel deny on-chain, see the `AuditEvent { approved: false,
   reason_code: 6 }` row land on the dashboard. Solscan link visible
   for the receipt.

**Receipt-backed proof:** every claim in the demo video is paired
with a Solscan-verifiable receipt in [docs/demo-receipts.md](demo-receipts.md).
The receipts are filled D10–D14. Until they land, the demo video
records against placeholder state and is re-cut once real
transactions are available.

Both videos are uploaded as **unlisted** YouTube. The submission
form gets the share URL, not the public URL.

## 7. Repo link

The repo is at `https://github.com/<handle>/<repo>`. The README
points judges at `docs/architecture.md`, `docs/onboarding.md`, and
`docs/roadmap.md` as the canonical reading paths. The judge does
not need to clone; the docs are the entry.

## 8. Team location field

The founder's primary city. Single-person team. The location is
used by Colosseum for timezone-aware events and is the field that
shows up on the public project page. Filled D1, confirmed D16.

## 9. The unlisted-YouTube pattern

Both videos are unlisted for two reasons:

1. The submission form's link is share-only; we don't want the
   videos to surface to search engines while we iterate.
2. The pitch is a low-stakes internal artefact for judges; we want
   to be able to swap it without breaking the form's URL.

We **also** paste the unlisted links into the project README on
D14, behind a spoiler-style section, so a curious judge can click
through from the repo instead of from the form.

## 10. The outside-person link-check pattern

On D16 the founder asks one outside person (a friend, a co-organizer,
or a previous Colosseum participant) to:

1. Open the submission form preview.
2. Click every link in it (project URL, repo URL, pitch URL, demo URL).
3. Open the repo, follow `docs/architecture.md` -> `docs/onboarding.md`
   -> `docs/roadmap.md`, and confirm each link resolves.
4. Click the `programs/treasury/target/deploy/treasury.so` link in
   the README; confirm it downloads.

This is the cheapest possible QA. If a link is broken, we fix it
the same day. Outside-person link check is the last thing the founder
does before pressing submit.

## 11. Where the actual submit happens

The submit button on the project dashboard at
`https://colosseum.com/projects/explore/<slug>/edit` on D17, before
11:59 pm PT. There is no undo. The outside-person link check is the
last gate.