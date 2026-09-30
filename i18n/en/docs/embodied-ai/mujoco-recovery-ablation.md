---
title: "Embodied AI VI: what do recovery gating and replanning each solve?"
description: "A 30-rollout ablation reduces first target jumps from 50–97 mm to about 0.25 mm, without improving placement outcomes in this fixed matrix. Separate recovery evidence, command continuity and task success."
slug: /embodied-ai/mujoco-recovery-ablation
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 14
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
related: ["doc:embodied-ai/mujoco-recovery-gate", "doc:embodied-ai/mujoco-observation-freshness", "lab:recovery-ablation", "project:hohoo-embodied-agent"]
---

[The previous experiment](/docs/embodied-ai/mujoco-recovery-gate) added fresh grasp confirmation and remaining-path replanning together. A comparison of policy bundles cannot tell us which change produced which effect.

This experiment separates the two switches. Across four fixed pairs, replanning reduced the first post-resume target jump from **50.285–97.055 mm** to **0.245–0.263 mm**. Yet all four active-recovery combinations placed the object in all five non-drop conditions. **No improvement in placement success was observed in this matrix.**

These findings concern different questions: whether to resume, what target to command after resuming, and whether the task eventually succeeds.

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/31166a333a51e9ca580c6c2dff9edcfca1dacb90/experiments/vl01_recovery_ablation) · [30 raw rollouts](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/31166a333a51e9ca580c6c2dff9edcfca1dacb90/evidence/recovery-ablation-20260930/e6-final) · [Independent metrics](https://github.com/VirtualSelect/hohoo-embodied-agent/blob/31166a333a51e9ca580c6c2dff9edcfca1dacb90/evidence/recovery-ablation-20260930/e6-final/metrics.json)

## 1. Separate evidence from the next command

After communication returns, an old packet may be mistaken for evidence that the cube is still held. Alternatively, the grasp may be valid, but resuming the old absolute-time trajectory skips the portion that was not executed during the hold. A gate addresses the first problem; path handling addresses the second.

| Gate | `wallclock` | `replan` |
|---|---|---|
| `receipt` | Resume the original schedule on any valid delivery | Regenerate the remaining path on any valid delivery |
| `revalidate` | Resume the original schedule after fresh evidence persists | Regenerate the path after fresh evidence persists |

A fifth variant, `latched/wallclock`, never resumes. A second path variant would add nothing to that reference. Here `wallclock` means the **original trajectory's absolute simulation time**, not the computer's physical clock.

## 2. What the 30 rollouts control

Five combinations × six conditions produce 30 deterministic cells, each run once without a random seed. A separate set of 18 E5 regression rollouts checks compatibility with the earlier experiment; those are not additional E6 samples.

| Item | Frozen setting |
|---|---|
| Scene | Same Cartesian gripper, cube, tray and initial state |
| Physics/control interval | 2 ms |
| Observation interval | 20 ms |
| Fault onset | 4.8 s, during transfer |
| Delivery gap | [4.8, 5.04), 240 ms |
| Stale threshold | Capture age reaches 60 ms |
| Recovery confirmation | At least 100 ms of valid captures, gaps ≤20 ms |
| Maximum hold | 600 ms; deadline wins over same-tick recovery |
| Regenerated transfer | 1.5 s, then lower/release/retreat/settle |
| Episode horizon | 10.8 s |

Conditions are clean, constant 40 ms delay, every third packet delayed 80 ms to cause reordering, a delivery gap, old-good-packet replay after the gap, and a gap with forced gripper opening. Opening changes actuator commands; contact and gravity move the cube. Its position is never teleported.

The supplied simulations ran on Linux with Python 3.12.14, MuJoCo 3.3.7 and NumPy 2.2.6. Source, logs and tests were independently checked on Windows during integration. That audit is not another physical simulation batch.

## 3. A target jump is not a gripper teleport

The resume decision occurs after the physics step at tick `r`. That row still uses the held target; tick `r+1` applies the first command from the resumed path.

```text
J = || target[r+1] - target[r] ||₂
E = || target[r+1] - measured_hand[r] ||₂
```

`J` measures the change in the commanded target. `E` measures its distance from the actual gripper position at the decision. Both use XYZ only, excluding finger opening. Actual movement depends on actuator tracking and physics; a target jump does not imply instantaneous movement of the same distance. Logged hand speed is a 2 ms finite difference, not a complete velocity, acceleration or impact safety assessment.

The relevant implementation is small:

```python
if path_mode == "wallclock":
    return path, None

previous = np.array([*hand, float(grip)])
rest = [("transfer", 1.5, [.24, .12, .18, .033])] + base.schedule(0)[5:]
return segments(rest, tick * DT, previous), previous
```

Replanning starts at the measured position and resets the remaining schedule. It is neither obstacle avoidance nor inverse kinematics. It changes timing as well as geometry.

## 4. Same gate, different recovery path

These comparisons hold the condition and gate fixed and examine the first resume only. The audit verifies matching state/control histories through the decision.

| Condition | Gate | Original schedule J/mm | Replanned J/mm |
|---|---|---:|---:|
| Gap | Receipt | 50.285 | 0.263 |
| Gap | Revalidate | 71.433 | 0.245 |
| Stale replay | Receipt | 50.285 | 0.263 |
| Stale replay | Revalidate | 97.055 | 0.245 |

The replanned/original ratios are 0.25%–0.52%, below the preregistered one-half threshold in all four pairs. These are descriptive deterministic comparisons, without a confidence interval or a claim about other robots.

![Four matched target-jump pairs; original schedule on the left and replanning on the right, with different horizontal scales](/media/practice/ablation-jumps.png)

The panels use different horizontal ranges to keep small values readable. Compare the printed values, not bar lengths across panels. Both the figure and table come from `metrics.json`.

Why does revalidation produce a larger jump when paired with the old schedule? It waits longer while the original trajectory clock keeps advancing. Under stale replay, revalidation resumes at 5.302 s and targets a later point on the old path. Better evidence does not automatically produce continuous commands.

![Stale-replay logs showing target x, measured gripper x and packet age for each gate and path variant](/media/practice/ablation-stale-replay.png)

This is a log plot, not camera footage. The upper panels show world x; the lower panels show latest capture age. `target` and `measured` refer to commanded and actual positions.

## 5. A fresh good packet is not a full confirmation window

The legacy `unsupported_resumes` field counts a stale latest packet (age ≥60 ms) or an invalid grasp predicate. It does not include every requirement of the 100 ms window.

At the end of a gap, receipt-based recovery sees a fresh good packet, making that count zero. But one packet spans zero milliseconds. `missing_full_window_resumes` records the missing confirmation separately.

| Condition/gate | Resumes per path | Stale/bad resumes | Missing full window |
|---|---:|---:|---:|
| Gap / receipt | 1 | 0 | 1 |
| Replay / receipt | 9 | 8 | 9 |
| Gap / revalidate | 1 | 0 | 0 |
| Replay / revalidate | 1 | 0 | 0 |

Revalidation requires captures after the current hold, strictly increasing capture order, fresh arrival, gaps ≤20 ms and a span ≥100 ms. The latest packet must still be fresh and support the grasp at resume. The grasp predicate requires bilateral contact, cube height >0.12 m and gripper-center distance <0.05 m. Zero in one failure counter does not establish every other prerequisite.

## 6. Replanning does not recover a dropped cube

| Gap-and-drop combination | Resumes | Stale/bad resumes | Placement |
|---|---:|---:|---|
| Receipt + original schedule | 6 | 6 | Not completed |
| Receipt + replan | 72 | 72 | Not completed |
| Revalidate + original schedule | 0 | 0 | Not completed; abort at deadline |
| Revalidate + replan | 0 | 0 | Not completed; abort at deadline |

It is tempting to interpret 72 versus 6 as a pure penalty from replanning. However, the inherited gate monitors only `transfer`. The original schedule reaches `lower` sooner, after which transfer monitoring no longer triggers holds. Every replan resets the transfer segment and keeps the system exposed to that loop longer.

The totals therefore combine monitoring scope, phase duration and closed-loop feedback. They reveal a real limitation—monitoring one phase is not whole-task protection—but cannot isolate a geometric effect. Both revalidation variants abort after the 600 ms hold deadline without resuming. A protocol-compliant abort is neither placement success nor regrasping.

## 7. Full matrix and timing cost

| Condition | Latched | Receipt/original | Receipt/replan | Revalidate/original | Revalidate/replan |
|---|---|---|---|---|---|
| Clean | Placed | Placed | Placed | Placed | Placed |
| 40 ms delay | Placed | Placed | Placed | Placed | Placed |
| Reordering | Placed | Placed | Placed | Placed | Placed |
| Gap | Aborted | Placed | Placed | Placed | Placed |
| Stale replay | Aborted | Placed | Placed | Placed | Placed |
| Gap and opening | Aborted | Not placed | Not placed | Aborted | Aborted |

Placement checks the final 0.5 s against the original tray-position and height tolerances, speed <0.02 m/s, no finger contact and a previous lift. Reaching the neighborhood of the target is insufficient.

All four active combinations placed the cube in all five non-drop conditions: this matrix shows no placement-rate improvement. Replanning also delayed some completions. For stale replay with revalidation, the endpoint of the first sustained placement window moved from 7.322 s to 8.622 s. This estimate has 20 ms sampling resolution.

## 8. Audit and reproduction

The independent audit does not import `Gate`. It recalculates packet, state and command evidence: 30 cells, 180 raw episode files, 12 source/protocol fingerprints, 24 latched-reference prefixes and 12 same-gate path prefixes. Maximum prefix difference is zero. It checks 102 resume records; all four actual revalidation resumes have valid confirmation windows.

The 18 E5 regression episodes match the old discrete outcomes. Maximum qpos/qvel/ctrl difference is approximately 1.09×10⁻¹⁴, below the 1×10⁻¹⁰ threshold. Artifact validity is separate from hypothesis support: valid negative results must be retained.

From the repository root, audit saved evidence first. The portable wrapper restores only line endings that match known hashes, in a temporary copy:

```bash
.venv/Scripts/python -m unittest discover -s experiments/vl01_recovery_ablation -p 'test_*.py'
.venv/Scripts/python experiments/vl01_recovery_ablation/portable-audit.py evidence/recovery-ablation-20260930/e6-final
```

All 30 local tests passed. To simulate again, choose an output directory that does not exist:

```bash
.venv/Scripts/python experiments/vl01_recovery_ablation/run.py --out runs/e6-my-run
.venv/Scripts/python experiments/vl01_recovery_ablation/audit.py runs/e6-my-run
.venv/Scripts/python experiments/vl01_recovery_ablation/render.py runs/e6-my-run
```

On Linux use `.venv/bin/python`. `control.csv` records every 2 ms; `trajectory.csv` and `states.jsonl` every 20 ms. Inspect decisions in `events.json` and new path starts in `replans.json`. The archive commit pins the delivered artifacts; manifests retain the original baseline commit and dirty status rather than rewriting their provenance.

## 9. What should change next?

Define monitoring and recovery rules for lowering and release, then test a resume limit or cooldown and different fault phases under a frozen protocol. These are open questions, not implemented protections.

The experiment still uses one scene, privileged simulator observations, one clock and fixed faults. It does not validate vision, ROS2, clock skew, regrasping, learned policies or physical robots. M4/M5 remain incomplete. Gating determines whether continuation is supported; replanning improves command continuity in these records. Neither alone establishes safe task completion.
