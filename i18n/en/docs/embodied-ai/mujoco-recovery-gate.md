---
title: "Embodied practice 5: communication is back—may transfer resume?"
description: "18 MuJoCo rollouts reveal unsupported resumptions hidden by eventual success; validate fresh evidence and replan the remaining path."
slug: /embodied-ai/mujoco-recovery-gate
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 12
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
related: ["doc:embodied-ai/mujoco-observation-freshness","doc:embodied-ai/mujoco-transfer-monitor","lab:recovery-gate","project:hohoo-embodied-agent"]
---

[The previous experiment](/docs/embodied-ai/mujoco-observation-freshness) detected stale observations and stopped transfer. The next question is whether communication recovery authorizes an old action to continue.

The revealing result is a counterexample: the receipt-only policy resumed nine times while an old good packet was replayed. Eight resumptions lacked fresh grasp evidence, yet placement eventually succeeded. An endpoint-only score hides the repeated interruptions.

[Code and reproduction](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/020db41b883221afde673e33ff6f322e004f12ad/experiments/vl01_recovery_gate) · [Raw evidence and plots](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/020db41b883221afde673e33ff6f322e004f12ad/evidence/recovery-20260930) · [Independent audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/020db41b883221afde673e33ff6f322e004f12ad/evidence/recovery-20260930/audit.json)

## 1. Stopping and resuming require different evidence

A communication gap may leave the cube firmly grasped, or conceal a real drop. Transport recovery does not establish the task precondition.

We ask three questions: is this a new observation; does it continuously support a valid grasp; and is the old time-indexed path still appropriate? The first two authorize recovery. The third determines the next command.

## 2. Frozen setup

The same Cartesian gripper, cube, tray and original motion run in Python 3.12.14, MuJoCo 3.3.7 and NumPy 2.2.6. Commit `8142cdb` froze the protocol before the formal run.

| Parameter | Value |
|---|---|
| Physics and control | 2 ms |
| Capture period | 20 ms |
| Fault onset | 4.8 s, during transfer |
| Delivery gap | [4.8, 5.04), 240 ms |
| Stale threshold | Age reaches 60 ms |
| Bad-evidence threshold | Span reaches 40 ms |
| Recovery confirmation | At least 100 ms |
| Hold deadline | 600 ms after stopping |
| Shared horizon | 10.8 s |
| Matrix | Six conditions × three policies = 18 rollouts |

There is one deterministic run per cell, not 18 independent random trials or an estimate of deployment success. Observations are privileged simulator state, not visual perception.

## 3. Six conditions

| Condition | Intervention |
|---|---|
| clean | No disturbance |
| delay-40ms | Every capture arrives 40 ms late |
| reordered | Every third post-onset packet arrives 80 ms late |
| gap | Suppress delivery during the gap; resume new captures without backlog |
| stale-replay | After the gap, replay the last good old packet until 5.2 s |
| gap-and-drop | Open the gripper during the same communication gap |

Opening changes actuator commands; contact and gravity move the cube. Its position is not teleported. Delay and reordering do not force an alarm: remaining in motion is itself a result.

## 4. Three recovery policies

**Latched:** keep the held target and abort after 600 ms, without resuming.

**Receipt-only:** any valid delivered packet resumes the original wall-clock path, even when duplicate, stale or inconsistent with a grasp. This is an intentionally weak baseline.

**Revalidate:** require strictly increasing captures made after the stop; age below 60 ms; bilateral contact; cube height above 0.12 m; cube-to-gripper distance below 0.05 m; and at least 100 ms of evidence with adjacent captures no more than 20 ms apart. A failed condition resets the window.

At the 600 ms deadline, abort takes precedence over confirmation on the same tick. These thresholds belong to this teaching scene, not a universal robot safety specification.

## 5. Why replay causes repeated stop–resume cycles

The following times come from the stale-replay logs:

| Time | Event |
|---|---|
| 4.782 s | Last pre-gap good capture |
| 4.842 s | Its age reaches 60 ms and transfer stops |
| 5.042 s | Receipt-only resumes on that same capture, now 260 ms old |
| Afterwards | Staleness stops motion again; another delivery reopens it |
| 5.302 s | Revalidation first resumes after 100 ms of fresh evidence |

Receipt-only resumes nine times, eight on stale evidence. Inspect recovery events together with the final task outcome.

![Measured stop and resume decisions: repeated old packets reopen the baseline; revalidation waits for sustained fresh evidence](/media/practice/recovery-decisions.png)

This plot comes from control logs. It is neither a camera image nor a physical robot recording.

## 6. Why replan the remaining path?

Physics and the clock keep advancing while a target is held. Looking up the old path at the current wall-clock time can skip an unexecuted segment.

Revalidation creates a 1.5 s transfer from the **current measured gripper position** to the original transfer destination, followed by the original lowering, release, retreat and settling stages. Holding a target does not freeze physical state.

![Measured gripper paths after communication recovery; the dropped-object condition remains stopped](/media/practice/recovery-paths.png)

The policy changes both authorization and trajectory generation. This comparison therefore evaluates a bundle. A separate ablation would be needed to attribute differences to the 100 ms gate alone.

## 7. All 18 outcomes

| Condition | Latched | Receipt-only | Revalidate |
|---|---|---|---|
| Clean | Placement succeeds | Succeeds | Succeeds |
| Fixed 40 ms delay | Succeeds | Succeeds | Succeeds |
| Every third packet 80 ms late | Succeeds | Succeeds | Succeeds |
| 240 ms gap | Aborts, no placement | One resume, succeeds | One resume, succeeds |
| Stale good replay | Aborts, no placement | Nine resumes, eight unsupported; succeeds | One resume, succeeds |
| Gap and forced opening | Aborts, no placement | Six unsupported resumes; fails placement | No resume, aborts |

“Unsupported” means capture age at least 60 ms or a false grasp predicate at resumption. It is not a claim that a physical robot would necessarily become unsafe.

Revalidation resumes at 5.142 s for the plain gap and 5.302 s for stale replay. After forced opening, it aborts at 5.442 s. Failing placement in the latter case is compatible with correctly refusing an unjustified continuation.

## 8. Checks independent of the decision class

The audit reads saved CSV/state files without calling `Gate`:

- It recomputes endpoint outcomes for 18 rollouts.
- Twelve policy prefixes before their first decision divergence match exactly: maximum absolute qpos/qvel/ctrl error is zero.
- Both revalidation windows satisfy ordering, age, duration and grasp predicates.
- It records SHA-256 for 108 raw files and checks packet accounting and deadlines.
- Eighteen new boundary tests and 41 existing tests pass.

This checks evidence consistency and logic boundaries; it is not validation against another physics engine.

## 9. Reproduce and inspect

From the embodied repository, use a new output directory:

```bash
.venv/Scripts/python experiments/vl01_recovery_gate/test_gate.py
.venv/Scripts/python experiments/vl01_recovery_gate/run.py --out evidence/my-recovery-run
.venv/Scripts/python experiments/vl01_recovery_gate/audit.py evidence/my-recovery-run
.venv/Scripts/python experiments/vl01_recovery_gate/render.py evidence/my-recovery-run
```

Each `control.csv` records decisions every 2 ms. State and trajectory samples are saved every 20 ms. Events record stops/resumes/aborts; replans record new starting states.

For historical evidence checked out on another platform, run `portable-audit.py evidence/recovery-20260930`. It restores only an LF/CRLF representation matching the recorded hash in a temporary directory, then runs the frozen audit. Original evidence remains unchanged.

## 10. Limits and the next question

Within these fixed conditions, delivery alone is insufficient authorization. Sustained new grasp evidence plus remaining-path planning separates communication interruption from lost grasp.

Real networks, clock skew, vision error, different objects and different fault phases remain untested. This is not regrasping, a ROS2 bridge or completion of M4/M5. The next useful experiment is an ablation separating the gate from replanning.

For simulator stepping and state basics, see the [MuJoCo 3.3.7 simulation documentation](https://mujoco.readthedocs.io/en/3.3.7/programming/simulation.html). The code, frozen protocol and raw logs define the scope of this article.
