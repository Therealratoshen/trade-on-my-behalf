# Skills, Algorithms, Sampling — the SAS model

> Generated 2026-09-27 15:15 WIB. Founder insight: real trading edges
> come from specialist research, not AI inference. This document
> defines the three layers and how Trade On My Behalf serves them
> without pretending AI replaces the specialist.

---

## Definitions

**Algorithm** = the policy gate. The on-chain rules the wallet
enforces. Examples: vendor whitelist, per-tx size cap, per-day
loss cap, leverage cap, drawdown kill-switch. The algorithm
**cannot trade for you**. It can only refuse to trade when the
skill's intent would breach a rule. The algorithm is the
*envelope* the specialist chooses to operate inside.

**Skill** = the trader's edge. The pattern they recognize (RSI dip,
funding-rate play, news-driven move), the size they trust, the
discretion they bring. A skill is private — it's the trader's
research, their hours at the screen, their pattern recognition,
their journal entries. **The kernel cannot create skills. The user
writes them.** This is the non-negotiable part: research is effort,
and no AI agent can replace it.

**Sampling** = the data the skill operates on. Market prices,
orderbook depth, funding rates, RSI values, news events, whale
wallet moves, on-chain metrics. The runtime samples this data and
feeds it to the skill. The skill decides whether to fire an intent.
The kernel decides whether the intent is allowed.

**Specialist** = the user. A trader who has done the work — hours
of research, pattern study, news-flow curation, journal review,
P&L tracking. Their edge is real because they put in the effort.
The product serves them. It does not replace them.

---

## How a specialist uses Trade On My Behalf

The flow has four steps:

1. **Write the setup once.** RSI dip below 30 + 1h trend up →
   long with 3x leverage. Coded as a `Skill` in the runtime.
   This is private code the specialist writes and maintains.

2. **Configure the algorithm once.** "Max 3 trades/day, max
   $200/position, max $60 daily loss, kill-switch at 15%
   drawdown." Stored on-chain in the `Policy` PDA. This is the
   envelope the specialist chooses.

3. **Walk away.** The runtime samples the market (Helius webhooks,
   RSI calculations, funding rates), feeds data to the skill,
   the skill produces a TradeIntent, the runtime calls
   `authorize_spend`, the kernel enforces the algorithm. The
   specialist doesn't need to be at the screen.

4. **Audit log.** Every approve/deny is recorded on-chain. The
   specialist reviews what fired, what was denied, what the
   equity curve looks like. The specialist improves their skill
   the way they always have — by studying the data.

The specialist's edge is preserved. The specialist's discipline
is enforced. The specialist doesn't need to be at the screen.

---

## Why this framing is stronger than "AI agent"

Most perps-bot pitches go: *"Our AI trades for you."* This framing
has three credibility problems the SAS framing avoids:

| Claim | "AI agent" framing | SAS framing |
|---|---|---|
| Who has the edge? | The AI | The specialist |
| What does the product do? | Generate signals | Enforce the specialist's rules |
| What's the win condition? | Algorithm beats the market | Specialist's setup runs 24/7 without breaking rules |
| What if it fails? | "AI is improving" (vague) | "Adjust the rules; the kernel didn't lie" (concrete) |
| Who is the user? | Someone who wants AI to figure it out | Someone with a setup they trust |
| How do we market? | "Just trust the bot" (red flag) | "Your rules, enforced" (honest) |

The SAS framing is what prop-firm operators and serious retail
traders actually buy. It is what real trading businesses sell —
"disciplined execution of a tested setup" — not "AI magic."

---

## What the product does NOT do

- **Does NOT generate skills.** Skills come from the specialist's
  research, hours of work, pattern study. The product doesn't
  pretend to generate skills from no input.
- **Does NOT improve skills over time via ML.** v1 has no LLM
  signal generation. v2 may add an "explain this trade" feature
  for journal purposes. v3+ may add ML-assisted pattern discovery.
- **Does NOT promise to make the user money.** It promises to
  enforce the user's rules. Whether those rules produce positive
  P&L is the specialist's work, not the product's claim.
- **Does NOT replace the specialist.** The specialist still has to
  do the research. The product gives the specialist discipline
  + 24/7 monitoring + audit.

---

## What's in v1

- **Algorithm** (policy gate): vendor whitelist, per-tx cap,
  per-day cap, TTL, leverage cap, drawdown kill. Already built
  (D7-D8). 6/6 LiteSVM tests passing.
- **Runtime** (the sampler's bridge): signals → skill → intent →
  `authorize_spend` → venue. Already specced (D6); not yet
  built (D9+).
- **Webapp** (control surface): Phantom Connect or Trust Wallet,
  five panels (Connect / View Policy / View Audit Log / View
  Positions / Edit Policy). Already specced (D8.5+); not yet
  built (D9+).

The user writes the skill. The kernel enforces the algorithm.
The runtime samples. The webapp shows the receipts.

## What's NOT in v1 (and why)

- **Skill marketplace.** No AgentBazaar MCP integration in v1.
  Specialists write their own skills; no buying/selling happens
  on-chain in v1. The "paid signal marketplace" was AI-hype
  framing — reframe as "specialist skill marketplace" in v3 if
  demand emerges. Drop from v1 tech stack.
- **LLM signal generation.** No "ask GPT to find setups." That's
  v3+. v1 is for specialists who already have a setup.
- **Auto-improvement.** No ML loop on the user's skill. The user
  improves their own skill the way they always have.

---

## What this changes in the rest of the docs

| File | Change |
|---|---|
| `SPEC.md` | Drop AgentBazaar MCP from tech stack (defer to v3). Reframe "AI agent runtime" as "specialist signal handler." Update "Not an AI signal generator" line. |
| `docs/agent-runtime.md` | Reframe "Signal sources" as "Skill inputs (sampler)." Update the runtime flow. |
| `design-thinking/README.md` | Founder persona sharpened: "I have a setup. I want it to run without breaking my rules." |
| `design-thinking/five-stages.md` | Empathize updated: Persona A is a specialist, not an "AI trades for you" user. Ideate cut list: AgentBazaar dropped. |
| `design-thinking/pitch-script.md` | Slide 2-3 adjusted: "I have a setup. I tried two AI bots — they traded things I never would." Slide 4 sharpens: "The algorithm enforces. The skill decides. The runtime samples." |
| `GTM.md` | Reframe wedge narrative: "for specialists who want their rules deployed," not "AI agent." |

---

## Pitch line, updated

> *"Trade On My Behalf is for specialists who have a setup. The
> algorithm enforces your rules. The skill decides what to trade.
> The runtime samples the market. No AI agent invents signals for
> you — because no AI can replace your research. What it can do is
> run your setup 24/7 without breaking your rules."*

That's the pitch. Honest. Specialist-respecting. Doesn't promise
AI magic. Judges will read it and recognize: this team understands
how professional trading actually works.
