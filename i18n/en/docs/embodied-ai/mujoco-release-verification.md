---
title: "Embodied AI IX: a release command is not verified placement"
description: "Apply single-capture and sustained-window checks to five actual trajectories, including forged observations and post-completion disturbance."
slug: "/embodied-ai/mujoco-release-verification"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:release-verification", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-exit-actions", "doc:embodied-ai/mujoco-recovery-budget"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/experiments/vl01_exit_release_budget) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/evidence/exit-release-budget-20261003) · [Experiment record](/labs/release-verification)

After issuing an opening target, when may a controller report that placement is complete? A returned command proves neither finger separation nor a settled object. This experiment adds an observer that checks completion without changing the physical controller.

## 1. Compare observers on the same trajectory

The fixed script enters release at 6.5 s. Physics steps every 2 ms and observations arrive every 20 ms. One rule accepts the first qualifying fresh capture; the other requires consecutive qualifying captures spanning at least 250 ms. Missing, stale or bad observations break the window.

Both completion events latch. They mean that a condition held at a particular time, not that it will remain true forever. Two observers on five trajectories are not ten independent physical runs.

## 2. State the predicate

The release phase must have started and the cube must previously have risen above 100 mm. Qualifying observations require:

| Field | Constraint |
|---|---|
| XY | Each axis within 45 mm of(0.24, 0.12)m |
| Z | Within 6 mm of 26 mm |
| Linear speed | Below 0.02 m/s |
| Support | Contact with `bin_floor` |
| Separation | No left/right finger contact |
| Freshness | Increasing captures younger than 60 ms |
| Continuity | No capture gap above 20 ms |

These are privileged simulation observations, not vision estimates or verified support forces. With 20 ms sampling, a 250 ms span threshold requires 260 ms between the first and accepting captures.

## 3. Recorded results

| Condition | Single capture | Sustained window | Final placement at 12 s |
|---|---:|---:|---|
| Clean | 6.842 s | 7.102 s | Pass |
| Fingers stay closed | None | None | Fail |
| Opening delayed until 7.0 s | 7.042 s | 7.302 s | Pass |
| One forged good capture while closed | 6.602 s | None | Fail |
| External force after 8.0 s | 6.842 s | 7.102 s | Fail |

<img src="/media/practice/release-verification.png" alt="Completion declarations from two observers and final placement on the same trajectories" width="1500" height="600" loading="lazy" />

## 4. What the window rejects—and cannot guarantee

The forged-capture condition keeps fingers physically closed but reports a centred, stationary cube touching only the tray at 6.602 s. Physical truth is archived separately. This deliberately injected observation fault is not a claim about a real sensor's noise distribution.

The single-capture observer accepts it. The sustained window breaks on the next genuine bad capture and never declares completion. This supports resistance to this isolated error, not persistent corruption or systematic bias.

In the force condition, both observers correctly accept an actually settled state before a later disturbance. A 1 N external +X force during 8.0–8.08 s invalidates final placement. Calling the earlier report automatically false would confuse a past event with an ongoing guarantee.

## 5. Event versus continuing validity

A placement stage can emit a completion event and hand responsibility onward. If the task must keep the object in place afterward, monitoring must continue and current validity may need revocation. An interface could separate `completedAt`, `currentlyValid` and `invalidatedAt`; this experiment implements only the first.

A sustained window is not a calibrated confidence score. Neighboring physics captures are correlated, not independent proofs.

## 6. Reproduce and inspect

```sh
python experiments/vl01_exit_release_budget/run.py --out evidence/my-release-series
python experiments/vl01_exit_release_budget/audit.py evidence/my-release-series
```

Compare the E9 `received` field with physical contacts and coordinates to locate the forged capture. The archive separates single/window completion from final placement. The independent auditor recalculates window acceptance row by row.

Continue with [recovery budgets](/docs/embodied-ai/mujoco-recovery-budget), which likewise distinguish rule compliance from task completion.

## Read this series

- [Embodied AI VIII: what should the gripper do after a drop alarm?](/docs/embodied-ai/mujoco-exit-actions)
- [Embodied AI X: why can a recovery budget stop a recoverable task?](/docs/embodied-ai/mujoco-recovery-budget)
