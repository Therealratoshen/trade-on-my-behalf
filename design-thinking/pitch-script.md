# Pitch script — 2:30, recorded D13

> Rewritten 2026-09-30 against the **actual** shipped build, not the D6
> theory. Every number below is a real on-chain value from
> `artifacts/demo-run.txt` (13-step `pnpm demo` capture, 2026-09-30 02:01 WIB).
> Voice is the founder's; timings are for the read, not a hard cut.
>
> Previous version was the D6 8-slide plan in this file. It assumed a
> terminal-only demo and a policy that could not be edited. Both changed.

## The one line

> **"Trade on your own signals, with your own rules, on-chain — even when
> you're not watching. And I can show you the kernel enforcing it."**

Lead with the *kernel enforcing it*. That is the thing nobody else in the
cluster has, and it is the thing a judge can verify in nine steps.

---

## 0:00–0:18 — The problem

> Every perps bot on Solana takes whatever signal it gets. Twenty-four
> seven. No exceptions. The problem isn't that they're wrong — it's that
> they don't know *your* rules. Mine is: fifty dollars a trade, five times
> leverage, twenty-five percent drawdown and I'm done. No bot knows that.
> So I either watch the screen or I don't run the bot.

**Visual:** terminal, one line of `tomb` help text. Nothing else.

**Do not** open with architecture. The problem is 18 seconds.

---

## 0:18–0:45 — The wedge

> So I put the rules on chain. There's an Anchor program. You set your
> limits once, and then every single trade has to pass through it before it
> touches a position. The agent can ask. The program decides. And whatever
> it decides — allow *or* deny — it writes an audit event on chain that I
> can point at afterwards.

**Visual:** the Policy PDA diagram, `docs/architecture.md`.

**The line that matters:** the deny receipt *is* the product. Most bots
have no deny, because there's nothing to deny against.

---

## 0:45–1:50 — The demo (this is the body)

Cut to the terminal. `artifacts/demo-receipts.png` is the exact output.

**0:45 — policy created.** *$50/trade, $150/day, 5× max, 25% kill-switch.*

> The owner sets the rules. That's one transaction.

**0:52 — a good trade goes through.** *$40 at 3×, approved.*

> A trade inside the rules. It passes, and the venue fills it.

**1:02 — the agent tries something stupid, politely.** *$500 at 20×.*

> Here's the interesting part. My own agent asked for five hundred dollars
> at twenty times. But the runtime is well-behaved — it clamps to my caps
> before it ever hits the chain. Fifty dollars, five times. Approved.

**1:14 — the agent tries something stupid, not politely.** *20× raw.*

> Now what happens if the runtime is compromised, or buggy, or just wrong?
> I send it twenty times, unclamped. It doesn't matter. The chain says no.

> `DENIED  REASON_LEVERAGE_CAP  slot 17`

**1:24 — the size cap, same way.** *$80 raw.*

> Same story on size. Eighty dollars against a fifty dollar cap.

> `DENIED  REASON_PER_TX_CAP  slot 20`

**1:34 — the kill-switch.** *Prices crash, equity 1000 → 909.78.*

> I simulate a crash. Both positions lose their collateral. Equity drops
> to nine hundred and ten. And the next trade — a small, innocent ten
> dollar one —

> `DENIED  REASON_DRAWDOWN_KILLSWITCH  slot 25`

**1:45 — the one that should worry you most.** *Compromised agent key.*

> Last one. What if the agent's own key is stolen? It tries to loosen my
> policy. It can't.

> `Unauthorized. Error Number: 6005.`

**Beat.** Let that sit for one second. This is the answer to "what if the
thing you're trusting turns against you".

---

## 1:50–2:12 — The webapp

Cut to `artifacts/dashboard.png`. Scroll the four panels.

> That's the terminal. Here's the part you'd actually use. Connect a
> wallet, see the rules it's bound by, see every decision the kernel has
> made, see the positions. And change the rules — that goes through the
> same program.

**Point out, out loud:**
- "There's no approve button. Not by omission — by design. The kernel
  decides. The webapp shows you what it decided."
- "The only thing it can write is the policy, and the program checks the
  signature on that."

---

## 2:12–2:30 — The honest claim + close

> Here's the claim, and I want to be precise about it. **"I cannot break
> your rules — within the as-stored caps."**
>
> The qualifier is real. If someone steals the *owner* key, they can
> currently loosen the caps. That's a known gap and it's the first thing
> on my hardening list. What the program does defend, right now, is the
> envelope at the values you stored — and it defends it on chain, not in
> my runtime, which I can turn off and the rules still hold.
>
> Everything you just saw is reproducible with `pnpm demo`. No devnet SOL,
> no setup. It's in the repo. I'm solo. Thanks.

**Do not** claim more than that sentence. The honest version is more
persuasive than the over-promise — an engineer judging this cluster will
check, and the two carve-outs are already written up in
`docs/security-model.md`.

---

## Cut list (if you're over time)

| Cut | Saves | Cost |
|---|---|---|
| Step 3 (the polite clamp) | 12 s | Small — it's a nice beat but not load-bearing |
| The webapp segment | 22 s | **Do not cut.** It's the only visual break from a terminal |
| The honest-claim qualifier | 12 s | **Do not cut.** Cutting it turns a precise claim into a lie |

**Never cut:** steps 4, 5, 8, 9. Those four are the proof.

---

## Recording checklist

- [ ] Terminal font size bumped so `reason_code` is legible on a phone
- [ ] Paste the policy PDA on screen during step 1 so it's verifiable later
- [ ] `artifacts/demo-receipts.png` open in a second tab for the still frames
- [ ] Export audio separately — the terminal audio is noise, cut it
- [ ] Unlisted YouTube, not public
- [ ] Check the claim slide reads the qualifier out loud, not just on screen
