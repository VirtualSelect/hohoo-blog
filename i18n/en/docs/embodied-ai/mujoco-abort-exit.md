---
title: "Embodied AI practice (12): what should the gripper do after recovery is exhausted?"
description: "12 MuJoCo rollouts and synchronized three-view replay compare hold, open and open-retreat, separating terminal decisions from physical consequences."
slug: "/embodied-ai/mujoco-abort-exit"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 12
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:abort-exit", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-recovery-budget", "doc:embodied-ai/mujoco-exit-actions", "doc:embodied-ai/mujoco-completion-lifecycle"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/2cf78a9afce618ea8ce35a882f0db203b2a74f57/experiments/vl01_abort_exit) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/2cf78a9afce618ea8ce35a882f0db203b2a74f57/evidence/abort-exit-20261003) · [Experiment record](/labs/abort-exit)

The recovery budget is exhausted and the state machine enters `aborted`. What should the gripper do next: keep holding, open immediately, or open and retreat?

E8 compared exit actions and E10 bounded recovery attempts, but their combination remained untested. This study keeps E10's monitoring and recovery decisions fixed and changes only the action **after terminal abort**. Twelve MuJoCo rollouts show that none of the three exits completes placement under the two transfer-interruption conditions. Their physical consequences differ.

## Three consequences of the same abort

The video replays recorded `repeated-gap` states, not illustrative animation. Each trajectory stores `qpos/qvel/ctrl` every 20ms. Rendering calls `mj_forward` without advancing physics and takes every second state for synchronized 25fps playback.

<video src="/media/practice/abort-exit-replay.mp4" controls preload="none" width="1440" height="384" poster="/media/practice/abort-exit-poster.png" aria-label="Synchronized replay of hold, open and open-retreat under repeated observation gaps">If video is unavailable, open the MP4 in the raw experiment archive.</video>

Holding leaves the cube suspended; opening drops it onto the floor outside the bin; opening and retreating raises the gripper but leaves the cube on the floor. Before abort, all three trajectories were checked for exact prefix identity. This is a scripted simulated Cartesian gripper, not a physical arm, vision policy or learned controller.

## Separate the terminal decision from its execution

| Layer | Input | Output |
| --- | --- | --- |
| Recovery gate | Observation age, grasp evidence, revalidation window, attempt count | Run, hold or abort |
| Exit execution | Held target, elapsed time, exit policy | Gripper and position targets |

The gate actively monitors only `transfer`. Captures arrive every 20ms; age reaching 60ms causes a hold. Resuming requires fresh post-hold good evidence spanning at least 100ms and a minimum 400ms hold. At most two resumes are allowed; an 800ms revalidation deadline terminates an unresolved hold.

Budget exhaustion is checked before cooldown. Once two resumes have been consumed, the next qualifying recovery opportunity aborts immediately rather than waiting for another 400ms cooldown. This is inherited E10 behavior, not a threshold adjusted after inspecting results.

There is no regrasp or budget reset after abort. The state never returns to running, but physics continues so we can observe the exit's consequences.

## Frozen matrix: four conditions and three exits

The scene, actuators, nominal path and final placement criteria are unchanged. Physics steps at 2ms for 12 seconds per rollout. There is one deterministic run per cell, not a randomized success-rate estimate.

| Condition | Injected observation fault | Purpose |
| --- | --- | --- |
| clean | None | Normal-path regression |
| repeated-gap | Suppress the first 140ms of each 440ms period from 4.3 to 6.94s | Consume recovery budget |
| permanent-gap | No observations from 4.3s onward | Reach revalidation deadline |
| lower-silence | No observations during 5.6–5.84s | Preserve an out-of-phase coverage control |

Faults remove observation packets; they do not teleport the cube or forge its physical position. They follow absolute simulation time. Pausing changes phase timing, so results should not be interpreted as equal fault exposure in every task phase.

An exit starts on the physics tick after abort. `hold` preserves the saved target. `open` sets grip to zero without changing position. `open-retreat` opens, waits 200ms, then raises the height target by 100mm over 600ms using smoothstep. Holding is active actuator control, not power-off; thermal load, forces and energy were not measured.

## Recorded outcomes

| Condition | Abort time | Resumes | Final hold outcome | Final open / open-retreat outcome | Placement |
| --- | ---: | ---: | --- | --- | --- |
| clean | None | 0 | Bin-floor contact | Bin-floor contact | All three pass |
| repeated-gap | 5.422s | 2 | Both fingers, cube z ≈165.00mm | Floor, cube z ≈19.99mm | All three fail |
| permanent-gap | 5.142s | 0 | Both fingers, cube z ≈165.48mm | Floor, cube z ≈19.99mm | All three fail |
| lower-silence | None | 0 | Bin-floor contact | Bin-floor contact | All three pass |

Clean and lower-silence runs end at approximately 25.98mm cube-center height. Placement checks the final 500ms of position, speed and absence of finger contact, plus prior lift. It is not a judgment based on a final screenshot. None of the twelve rollouts produces a MuJoCo numerical warning.

Repeated gaps produce this event chain:

```text
4.342s HOLD → 4.742s RESUME
4.782s HOLD → 5.182s RESUME
5.222s HOLD → 5.422s ABORT (budget)
```

Permanent silence holds at 4.342s and aborts 800ms later at 5.142s. Logs distinguish `budget` from `revalidation_deadline`; these are different reasons requiring different diagnosis.

## A retreat is not recovered placement

<img src="/media/practice/abort-exit.png" width="1500" height="600" loading="lazy" alt="Cube and gripper heights after repeated gaps: abort at 5.422s; both opening policies drop the cube while retreat changes only gripper height." />

Opening and retreating looks tidier because the gripper moves away. It does not supply support to the released cube. The two opening policies end at the same cube height; their gripper heights differ.

Holding preserves contact but leaves the object suspended outside the bin. Selecting a real exit requires constraints such as permitted support areas, collision clearance, force limits, joint limits and nearby people. This scene cannot establish which action is safest. There is no winning policy in this matrix.

## Why retain the lower-silence control?

Lower-silence completes placement without a hold or abort because the inherited gate monitors transfer only. It does not show that observation loss during lowering is harmless.

This bounds the claim: E12 isolates actions after the same abort decision. It has not fully combined E7 phase monitoring with E10 recovery budgets. A complete phase/recovery/exit controller needs a separately frozen protocol and matrix; silently omitting the blind spot would overstate the implementation.

## Reproduce and audit the evidence

Every rollout saves 6,000 rows in `control.csv.gz`, 600 replay states in `states.jsonl.gz`, and a `summary.json`. Totals are 72,000 control rows, 7,200 states and 36 raw files.

The independent audit checks hashes, reconstructs the observation fault schedule, exit targets, final placement and state projections. It also compares policy trajectories before abort: twelve pairwise comparisons across four conditions match exactly. Conditions without abort are compared over the full rollout. This does not exhaustively verify every possible gate input.

```sh
python -m unittest discover -s experiments/vl01_abort_exit -p "test_*.py"
python experiments/vl01_abort_exit/run.py --out evidence/abort-exit-MY-RUN
python experiments/vl01_abort_exit/audit.py evidence/abort-exit-MY-RUN
python experiments/vl01_abort_exit/replay.py --evidence evidence/abort-exit-MY-RUN
```

The archive records Python 3.12.14, NumPy 2.2.6 and MuJoCo 3.3.7. Plotting uses Matplotlib; replay uses existing imageio/FFmpeg and Pillow dependencies. Physics runs do not need rendering, while video generation requires a working graphics environment. See [MuJoCo's simulation documentation](https://mujoco.readthedocs.io/en/stable/programming/simulation.html) for stepping and derived-state updates.

## The useful next constraint

The missing component is not a fourth fixed movement. It is evidence and constraints available at abort: a confirmed support area, permitted motion under stale observations, and rules preventing a new closure after a drop. Those must become testable conditions before choosing an exit.

These findings remain limited to a fixed simulation. There is no ROS2 bridge, physical robot, learned policy or regrasp, and this study does not complete VL01 or milestones M4/M5.
