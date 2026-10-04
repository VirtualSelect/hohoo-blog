---
title: "Embodied AI practice (13): where should recovery resume after interrupted lowering?"
description: "18 MuJoCo rollouts and synchronized replay connect phase contracts to recovery budgets, separating false holds, physical placement and controller abort."
slug: "/embodied-ai/mujoco-phase-recovery"
status: "published"
published_at: "2026-10-04"
updated: "2026-10-04"
reading_minutes: 13
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:phase-recovery", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-abort-exit", "doc:embodied-ai/mujoco-phase-contracts", "doc:embodied-ai/mujoco-completion-lifecycle"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/ad2e33523e8e5580da90ae914e1cccf765c8d1b1/experiments/vl01_phase_recovery) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/ad2e33523e8e5580da90ae914e1cccf765c8d1b1/evidence/phase-recovery-20261004) · [Experiment record](/labs/phase-recovery)

The previous study exposed a blind spot: `transfer-only` monitoring ignores observation loss during lowering. Extending the same grasp check to lowering sounds straightforward, but transfer requires height while lowering deliberately reduces it. Copying that condition makes normal movement look like failure.

This experiment combines phase contracts, recovery evidence and trajectory resumption: **when to pause, what permits recovery, and which stage to resume**.

## Watch the same interruption under three policies

The video renders archived MuJoCo states at matching sample ticks. It does not rerun physics to create a better outcome. From left to right: transfer-only, copied transfer rules, and phase-aware recovery.

<video src="/media/practice/phase-recovery-replay.mp4" controls preload="none" width="1440" height="384" poster="/media/practice/phase-recovery-poster.png" aria-label="Synchronized three-policy replay during a late lowering observation gap">Use the trajectory figure and archived states if video is unavailable.</video>

The gap occurs at 6.10–6.34 seconds. The middle controller has already stopped incorrectly before the gap starts. The left controller ignores it. The right pauses, collects new evidence and resumes lowering.

## Frozen conditions

The scene, gripper, cube and target bin are unchanged. Each rollout lasts twelve seconds at a 2ms physics step. There is no learned policy, ROS2 connection or hardware experiment.

| Condition | Intervention |
| --- | --- |
| Clean | None |
| Transfer gap | Withhold packets at 4.60–4.84s |
| Early lowering gap | Withhold packets at 5.60–5.84s |
| Late lowering gap | Withhold packets at 6.10–6.34s |
| Permanent lowering gap | Withhold packets from 5.60s onward |
| Lowering drop | Force gripper open at 5.60–5.84s; observations continue |

Six conditions × three policies gives eighteen rollouts. Interventions use absolute simulation time. Once policies alter trajectories, the same interval need not encounter the same phase; interpretation must include `scheduled_phase` and event records.

All policies retain a two-resume budget, 400ms minimum hold and 800ms revalidation deadline. Terminal exit is fixed to holding the current target, avoiding a second exit-policy variable.

## Assign evidence to its phase

| Policy | Transfer predicate | Lowering predicate |
| --- | --- | --- |
| transfer-only | Both finger contacts, grasp error below 5cm, cube above 12cm | Inactive |
| reuse-transfer | Same | Same transfer predicate |
| phase-aware | Same | Both contacts and grasp error below 5cm |

Removing the height floor during lowering does not remove contact, relative-position or freshness checks. Final placement is independently evaluated from the last 500ms of physical records.

<img src="/media/practice/phase-recovery.png" width="1500" height="600" loading="lazy" alt="Clean and late-gap trajectories reveal false stops caused by transfer height rules" />

## HOLD must preserve the interrupted phase

Execution state (`running`, `hold`, `aborted`) and task phase (`transfer`, `lower`, `release`) are separate dimensions. Entering HOLD during lowering saves `interrupted_phase=lower`. Replacing it with `hold` would lose the context needed to evaluate observations and rebuild the path.

```python
if self.state == 'running' and phase != self.context:
    self.context = phase
    self.bad_since = None
```

Context changes only while running. A later `hold` or `release` label cannot restart the hold deadline. Recovery still requires a fresh, contiguous window of acceptable observations captured after HOLD; acceptability now depends on the interrupted phase.

## Resume lowering without lifting back up

The old recovery path always returned to the 18cm transfer destination. The new path uses the saved phase:

```text
Interrupted transfer: measured hand → transfer destination → lower → release → retreat
Interrupted lowering: measured hand → lowering destination → release → retreat
```

The first connection lasts 0.5s and starts from the measured gripper position. This is fixed-target trajectory stitching, not obstacle avoidance, regrasping or optimal control.

## A measured 400ms hold

The phase-aware late-gap rollout records:

| Event | Tick | Simulation time |
| --- | ---: | ---: |
| Stale observation causes HOLD | 3071 | 6.142s |
| New valid window begins | 3171 | 6.342s |
| Minimum hold satisfied; resume lower | 3271 | 6.542s |

It resumes lowering directly and satisfies the unchanged final placement predicate, with cube center around 25.98mm and bin-floor contact.

By contrast, `reuse-transfer` holds at **6.002s** because normal lowering violates its height floor, then aborts at 6.802s. This precedes the injected gap at 6.10s. The clean rollout stops at the same time, so the failure cannot be attributed to the gap.

## Physical placement is not controller completion

The table reports physical acceptance, not an estimated success rate. There is one fixed rollout per cell, no randomized initial conditions or confidence interval.

| Condition | transfer-only | reuse-transfer | phase-aware |
| --- | --- | --- | --- |
| Clean | Accepted | Rejected; false hold | Accepted |
| Transfer gap | Accepted; one resume | Rejected during lowering | Accepted; one resume |
| Early lowering gap | Accepted; unmonitored | Rejected after resuming | Accepted; one resume |
| Late lowering gap | Accepted; unmonitored | Rejected before intervention | Accepted; one resume |
| Permanent lowering gap | Accepted; unmonitored | Rejected; terminal hold | Rejected; terminal hold |
| Lowering drop | Accepted | Accepted, but aborted | Accepted, but aborted |

Two distinctions matter. First, transfer-only completes the fixed trajectory despite permanently missing observations. That shows this scene's open-loop path happened to suffice, not that ignoring observations is safer. Phase-aware recovery holds at 5.642s, aborts at 6.442s and leaves the cube around 157.81mm above the world origin.

Second, the forced release occurs directly above the bin. Both policies monitoring lowering detect contact failure and abort, but the cube falls into the target and eventually passes physical acceptance. This is neither successful recovery nor a designed release strategy.

Twelve of eighteen rollouts meet physical acceptance; two of those twelve have an aborted controller. Future evaluation should retain physical outcome, observation compliance and controller lifecycle separately rather than collapse them into an undefined success score.

## Evidence and audit

The archive contains 108,000 control/observation rows, 10,800 replayable states and 54 raw files. The audit recomputes placement, checks packet gaps and actuator interventions, validates recovery windows and budgets, and compares eighteen policy pairs for identical physical prefixes up to their first divergent decision.

Eight contract tests cover low-height lowering, low-height transfer, frozen hold context, absolute deadlines, inactive release monitoring, contact failure, recovery routing and exhausted budgets.

Replay calls `mj_forward` on stored `qpos/qvel`, not `mj_step` to create a new trajectory. The [MuJoCo simulation documentation](https://mujoco.readthedocs.io/en/stable/programming/simulation.html) describes their different roles. Replays do not add experimental samples.

## Reproduce and respect the scope

From `hohoo-embodied-agent`:

```text
python -m unittest discover -s experiments/vl01_phase_recovery -p test_gate.py
python experiments/vl01_phase_recovery/run.py --out evidence/my-run
python experiments/vl01_phase_recovery/audit.py evidence/my-run
python experiments/vl01_phase_recovery/replay.py --evidence evidence/my-run
```

The run used MuJoCo 3.3.7, NumPy 2.2.6 and Python 3.12.14. Replay also needs the existing imageio/FFmpeg and rendering environment.

Results cover only this fixed simulation and the stated interventions. They do not certify hardware safety, safe retreat under permanent observation loss or regrasping. Full VL01 and later milestones remain incomplete.

A useful next study would connect completion contracts to this recovery chain: when completion may be declared, how an accidental post-abort placement is recorded, and how later invalid evidence revokes completion. This round establishes an auditable separation between recovery phase and physical outcome.
