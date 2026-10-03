# 04 — Prototype

> **Historical record / planning background — labelled 2026-10-03.** Preserved original contents, not current implementation, runnable instructions, test-pass evidence or a freshly verified venue/event claim. Current product requirements: [PRD](../../../PRD.md); technical contracts: [TRD](../../../TRD.md); test status: [testing plan](../../../docs/testing-plan.md).


> Stage 4 of the design-thinking pass.
> Three artifacts in this stage:
> (a) the pitch-video **script** (screen-by-screen storyboard with
>     the user feeling-shift arc per slide),
> (b) a **wireframe ASCII sketch** of the Telegram control surface
>     for the "risk-flag auto-skip" interaction,
> (c) one **passage** for the demo video's *"the thing runs"*
>     scene.
> Fidelity chosen: flow / service / sequence → storyboard script
> (per skill rule §"Stage 4: Prototype" — choose fidelity by the
> question being asked).
> Research mode: **assumption** (declared in `00-challenge-brief.md`).

---

## (a) Pitch video script — 2 minutes 30 seconds

> Format: slide title is the takeaway, 4–6 words (per
> `GTM.md` §"Pitch-deck rules"). Each slide names the *feeling-shift
> arc* it delivers. Target audience: a Solana-track judge who has
> seen 30 pitches before yours.

### Slide 0 — "I see it. I'm not there." *(0:00–0:08)*

- **Visual:** founder on phone, chart up, RSI dipping, alarm buzzes,
  fade out before they tap.
- **Feeling arc:** **Frustration** (persona's pain, Stage 1). The
  setup is visible and unreachable.
- **Words on screen:** "I see it. I'm not there."

### Slide 1 — "Every bot is a black box." *(0:08–0:20)*

- **Visual:** montage of three dashboards — a Telegram bot that
  oversizes, a Discord bot that ignores a cap, a SaaS bot that
  goes offline.
- **Feeling arc:** **Distrust** (the dominant pain row across both
  personas).
- **Words on screen:** "Every bot is a black box."

### Slide 2 — "I want a wallet with rules." *(0:20–0:35)*

- **Visual:** simple 5-line `withTrader(wallet, rules)` block,
  monospaced, plain.
- **Feeling arc:** pivot — **Anticipation** (the desired after-
  feeling begins here).
- **Words on screen:** "I want a wallet with rules."

### Slide 3 — "Rules live on-chain. Always." *(0:35–0:55)*

- **Visual:** the Anchor `Policy` PDA seed derivation; an
  `AuditEvent` row emitting from the program; cursor on the
  `reason_code` field.
- **Feeling arc:** **Trust** building (mirroring Distrust). The
  rules are not on a vendor's server.
- **Words on screen:** "Rules live on-chain. Always."

### Slide 4 — "TG DM. 60 seconds. Approve." *(0:55–1:15)*

- **Visual:** the TG DM template from `docs/control-surface.md`,
  with the inline `[Approve] [Deny]` buttons. Cursor on Approve.
- **Feeling arc:** **Joy** (mirrors Frustration from Slide 0).
- **Words on screen:** "TG DM. 60 seconds. Approve."

### Slide 5 — "RiskFlag DM. The rules fired." *(1:15–1:40)*

- **Visual:** a denied trade DM: "Skipped — `maxLeverage` would
  be 5.0x, cap is 3.0x. Reason code 12. Slot 284_113_001." Same
  on-chain `AuditEvent` row visible in the dashboard.
- **Feeling arc:** **Anticipation** peaking (mirrors Distrust).
  This is the **demonstration moment** — see Riskiest Assumption
  in `03-ideation.md`.
- **Words on screen:** "RiskFlag DM. The rules fired."

### Slide 6 — "Three testers. Three feeling shifts." *(1:40–2:00)*

- **Visual:** three short tester quotes (D10–D11); the semantic-
  pair deltas from `05-test.md` (Stage 5 output).
- **Feeling arc:** **Trust** crystallized (the social proof).
- **Words on screen:** "Three testers. Three feeling shifts."

### Slide 7 — "I trade for you. I cannot break your rules." *(2:00–2:20)*

- **Visual:** black screen, the SPEC quote, slow fade-in.
- **Feeling arc:** the entire arc resolves — Distrust → Trust;
  Frustration → Joy; Anxiety → Anticipation.
- **Words on screen:** "I trade for you. I cannot break your rules."

### Slide 8 — "Top-10 Solana track. That's the bar." *(2:20–2:30)*

- **Visual:** "agent-arc, 3rd Place — AI, Breakout 2025-04"
  one-liner; submit date; the wedge one-liner.
- **Words on screen:** "Top-10 Solana track. That's the bar."

---

## (b) TG control-surface wireframe — "risk-flag auto-skip"

> ASCII sketch of the **deny / auto-skip** interaction. Per the
> ideation pass, the proposal DM carries the would-be reason code
> inline so the founder *sees* the rule firing before it does.

```
┌──────────────────────────────────────────────────────────────┐
│ Trade On My Behalf                          14:02  ✓✓        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Trade proposal — expires in 60s                              │
│                                                              │
│  Long  SOL-PERP   0.10 @ 5.0x                                │
│  Notional: $500  (cap $200)                                  │
│  Risk:    $100  (loss cap today: $60 remaining)              │
│                                                              │
│  Rationale:  15m RSI 27 + 1h trend up                        │
│              stop -1.5%, target +3%                          │
│                                                              │
│  ⚠ Rule preview: WOULD SKIP                                  │
│    ↳ maxLeverage 5.0x > cap 3.0x  (reason code 12)          │
│    ↳ maxPositionUsd $500 > cap $200  (reason code 11)        │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐            │
│  │  Approve   │  │   Deny     │  │  Edit rules  │            │
│  └────────────┘  └────────────┘  └──────────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐
│ 60s ticks…   │  │ AuditEvent:  │  │ Opens dashboard rule   │
│ no tap       │  │ approved:fal │  │ editor in TG Mini-App  │
│              │  │ se           │  │ (D12 stretch).         │
│ ▼            │  │ reason_code: │  │                        │
│ AuditEvent:  │  │ 0 (user deny)│  │ Or returns to chat.    │
│ approved:fal │  │              │  │                        │
│ se           │  │ "Skipped:    │  │                        │
│ reason_code: │  │  you denied" │  │                        │
│ 99 (timeout) │  │              │  │                        │
│              │  │              │  │                        │
│ "Skipped:    │  │              │  │                        │
│  timeout"    │  │              │  │                        │
└──────────────┘  └──────────────┘  └────────────────────────┘
```

Notes on the wireframe (not on screen — for the team's reference):

- The `Rule preview` block is the **HMW-A5 deliverable** (per
  ideation): the user *sees* the deny reason before tapping,
  making the on-chain gate a felt event, not an abstraction.
- The `Edit rules` button is a v2 affordance; v1 buttons are
  `Approve` / `Deny` only.
- The 60-second TTL is enforced by `Promise.race` in
  `packages/agent/telegram/notify.ts` (per
  `docs/control-surface.md` §"What happens on timeout").
- Three terminal states (Approve, Deny, Timeout) each emit a
  distinct `AuditEvent` with a distinct `reason_code` so the
  dashboard can render a clean red/green/amber column.

---

## (c) Demo video passage — *"the thing runs"* scene

> Scene runs ~25 seconds inside the 3-min demo budget. The
> scene's job: prove the on-chain gate *actually fires* in the
> user's own hands, not in a narration.

> VOICEOVER (solo, recorded D14): *"So here's what happens when a
> trade would break a rule. I'm going to push the signal — long
> SOL at five-times leverage. My cap is three-times. Watch the
> Telegram."*
>
> [SCREEN] live terminal, devnet. `pnpm trade --signal long --size
> 0.10 --lev 5`. The runtime fires.
>
> [SCREEN] Telegram on the founder's phone. The proposal DM lands
> with the inline `⚠ Rule preview: WOULD SKIP` block. The two
> reason codes are visible — `maxLeverage 5.0x > cap 3.0x` and
> `maxPositionUsd $500 > cap $200`.
>
> VOICEOVER: *"The bot already knows. I haven't tapped anything.
> The reason codes are inline. If I do nothing — and I do nothing
> — it auto-skips in sixty seconds and emits an on-chain audit
> event."*
>
> [SCREEN] Cursor on the `Deny` button. Tap. Dashboard row lights
> up red: `approved: false, reason_code: 0, slot: 284_113_001`.
>
> VOICEOVER: *"It never tried to sign. The rule fired before the
> venue. That's the wedge. That's the thing that's empty in the
> dimension map."*
>
> [SCREEN] The Anchor program logs: `AuditEvent { policy:
> 9X...Y, approved: false, reason_code: 12, vendor: jupiter-perps,
> amount_usdc: 500_000_000 }`. Cursor holds on `approved: false`
> for one beat.

> Why this scene lands (per the skill's feeling-currency rule):
> it is **the single moment the founder persona stops feeling
> Distrust and starts feeling Trust**. The on-chain gate is no
> longer a paragraph in SPEC.md — it is a red row in the
> dashboard they can point to.

> Research-mode reminder: the script, the wireframe, and the
> scene are all prototype. The feeling-shift claims are
> assumption; the Stage 5 test rubric on D10–D11 measures them.
