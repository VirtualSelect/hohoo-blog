---
title: "Embodied AI VIII: what should the gripper do after a drop alarm?"
description: "Fifteen fixed-scene rollouts compare hold, open and open-then-retreat after identical alarms."
slug: "/embodied-ai/mujoco-exit-actions"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:exit-actions", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-recovery-budget", "doc:embodied-ai/mujoco-release-verification"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/experiments/vl01_exit_release_budget) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/evidence/exit-release-budget-20261003) · [Experiment record](/labs/exit-actions)

The [phase-contract experiment](/docs/embodied-ai/mujoco-phase-contracts) eliminated a false stop during normal lowering but exposed a later failure: after a correct late-drop alarm, the cube still touched both fingers and the tray. More monitoring predicates cannot directly fix the post-alarm action.

This study holds the alarm logic fixed and changes actuator targets after stopping. The scene remains an educational Cartesian gripper, not a physical robot.

## 1. Holding a target is not a hardware stop

Position actuators continue acting on their targets. Holding the last command neither freezes physics nor zeros velocity or force. After a forced-opening fault ends, the hold policy restores the saved closed-finger target, leaving residual contact. That is not a designed regrasp.

Only actuator targets are changed; no `qpos` teleport moves the cube. See [MuJoCo simulation documentation](https://mujoco.readthedocs.io/en/stable/programming/simulation.html) for the stepping model.

## 2. Three exit actions

The E7 monitor is unchanged: bilateral contact and a distance below 5 cm, plus height above 12 cm during transfer only. Bad captures spanning 40 ms or capture age reaching 60 ms latch a stop.

| Policy | Next control step | Later action |
|---|---|---|
| hold | Retain all targets | No recovery |
| open | Retain XYZ, set fingers to 0 | Stay open |
| open-retreat | Same opening | After 200 ms, raise Z target 100 mm over 600 ms |

Five conditions × three actions produce 15 deterministic rollouts, each with 2 ms physics steps and 20 ms observations. All run for 12 s, with the final 0.5 s checked for placement. This is not a randomized success-rate estimate.

## 3. Complete outcomes

| Condition | Alarm | Hold | Open | Open-retreat |
|---|---:|---|---|---|
| Clean | None | Pass | Pass | Pass |
| Transfer opening 4.8–5.04 s | 4.842 s | Fail | Fail | Fail |
| Early lowering opening 5.6–5.84 s | 5.642 s | Pass | Pass | Pass |
| Late lowering opening 6.2–6.44 s | 6.242 s | Fail | Pass | Pass |
| Lowering silence 5.6–5.84 s | 5.642 s | Fail | Pass | Pass |

Fifteen pairwise pre-alarm state prefixes were independently checked and match within each condition.

<img src="/media/practice/exit-actions.png" alt="Cube height after the same late-lowering alarm with three exit actions" width="1500" height="600" loading="lazy" />

## 4. Interpret passes carefully

Late-drop hold ends with `bin_floor|left_pad|right_pad`, whereas both opening policies end with only `bin_floor`. Cube heights are approximately 25.920 mm and 25.980 mm; contact separation, rather than that small height difference, explains the acceptance change.

Opening during observation silence also passes because the cube is already above the tray. This does not establish that opening with unreliable observations is generally safe. The scene has a known support surface and no fragile objects, people or force limits.

All transfer-drop runs fail on the floor. No policy regrasped or relocated the object. Early-drop passes likewise do not prove that planned release was executed correctly.

## 5. Did retreat add value?

Opening and opening-then-retreat have identical final acceptance across these five conditions. The extra motion changes the hand path, but no improvement in success, force or collision margin is established. Those require separate measurements.

The test contains no recovery gate, vision regrasp or force-peak analysis. A complete exit policy needs spatial and support context, not merely an alarm boolean.

## 6. Reproduce

```sh
python -m unittest discover -s experiments/vl01_exit_release_budget -p "test_*.py"
python experiments/vl01_exit_release_budget/run.py --out evidence/my-exit-series
python experiments/vl01_exit_release_budget/audit.py evidence/my-exit-series
```

The runner executes all 32 E8–E10 rollouts. Each retains 2 ms control logs,20 ms state snapshots and summaries. Recorded versions are Python 3.12.14, MuJoCo 3.3.7 and NumPy 2.2.6. Auditing checks recorded state projections and decisions, not independently recomputed contact forces.

Next, distinguish issuing an opening command from [verified placement](/docs/embodied-ai/mujoco-release-verification).

## Read this series

- [Embodied AI IX: a release command is not verified placement](/docs/embodied-ai/mujoco-release-verification)
- [Embodied AI X: why can a recovery budget stop a recoverable task?](/docs/embodied-ai/mujoco-recovery-budget)
