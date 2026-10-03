# Perps Deep Dive — log

> **Historical record / planning background — labelled 2026-10-03.** Preserved original contents, not current implementation, runnable instructions, test-pass evidence or a freshly verified venue/event claim. Current product requirements: [PRD](../../PRD.md); technical contracts: [TRD](../../TRD.md); test status: [testing plan](../../docs/testing-plan.md).


> Last run: 2026-09-26 16:36 WIB (10 min after user said "it can be used").

## What ran

`scripts/research/perps-deepsafe.sh` invoked:

1. `GET /status` → **UNAUTHORIZED** (5x retry, all hard-fail)
2. `POST /search/projects` with `{"query":"perpetual futures agent trading bot AI signal leverage on-chain","limit":15,"filters":{"winnersOnly":true}}` → **UNAUTHORIZED** (5x retry, all hard-fail, total ~150s of backoff)
3. `GET /clusters/v1-c9` → not reached (status failed first)
4. `POST /search/projects` full corpus → not reached
5. `POST /search/archives` → not reached

## Pattern across the session

| Time (WIB) | Call | Result |
|---|---|---|
| 15:50 | `/status` (D1) | `authenticated:true` |
| 15:53 | `/search/projects` (wedge check) | `authenticated:true`, results returned |
| 16:00 | 4x `/search/projects` (D2 Deep Dive) | all 200, results returned |
| 16:04 | `/search/projects` (pieverse check, batch) | first call 200, follow-up batch 401 |
| 16:05–16:34 | repeated single + batched calls | intermittent 200 / 401 |
| 16:34–16:36 | retry-script after 10 min wait | **all 401, no 200 in 150s of backoff** |

The PAT transitioned from "intermittent 200" to "hard 401" sometime between 16:05 and 16:34.
This is server-side session invalidation, not an edge flap the script can ride out.

## Files saved (proof of failure)

- `/tmp/copilot-perp-deepsafe/status.json` — last `/status` response
- `/tmp/copilot-perp-deepsafe/q1-winners-perps.json.err` — last search attempt

## What this blocks

Until PAT is rotated on colosseum.com/arena/copilot:

- D5 Copilot Deep Dive cannot complete.
- Wedge validation against the 5,400-project corpus is not possible.
- Per the SPEC, the build proceeds on prior evidence (cluster density +
  the mercantill/MCPay analogs already retrieved). It does not pivot.

## Recommended next action

User rotates PAT at colosseum.com/arena/copilot, pastes the new token,
then re-runs:

```
bash scripts/research/perps-deepsafe.sh
```

When that returns authenticated responses, append findings to
`SPEC.md` "Perps-agent deep dive" section.
