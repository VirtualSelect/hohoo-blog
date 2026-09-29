---
title: "Embodied practice III: a confirmed grasp still needs monitoring"
description: "A 27-rollout MuJoCo comparison of transient observation loss and forced opening, with false cancellations, a 40 ms confirmation delay, code and recorded trajectories."
slug: /embodied-ai/mujoco-transfer-monitor
status: published
published_at: "2026-09-29"
updated: "2026-09-29"
reading_minutes: 14
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
provenance: experiment-result
related:
  [
    "doc:embodied-ai/mujoco-grasp-guard",
    "doc:embodied-ai/mujoco-first-pick-place",
    "project:hohoo-embodied-agent",
    "lab:transfer-monitor",
  ]
---

The [previous experiment](/docs/embodied-ai/mujoco-grasp-guard) added a gate before transfer: verify sustained lift and bilateral finger contact before proceeding.

That gate answers **“was the cube held a moment ago?”** If the grasp fails later, the original schedule still continues. A condition established at one instant is not a guarantee for the rest of the action.

This experiment actually ran 27 MuJoCo rollouts. It compares a one-time gate, immediate cancellation and cancellation after three consecutive bad observations. It separates a faulty observation from a physical opening of the gripper. The useful result is a trade-off: fast responses can interrupt a healthy task, while waiting for confirmation permits additional motion.

[Code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/experiments/vl01_transfer_monitor) · [All 27 records](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/evidence/transfer-monitor-20260929) · [Lab](/labs/transfer-monitor)

## 1. Preconditions and conditions during an action

Every rollout retains the previous gate at simulation time 4.0 s, checking the last 0.2 s of height and bilateral contact. All rollouts passed it.

The new monitor runs only during transfer, from 4.0 to 5.5 s, checking both finger pads every 20 ms. Physics still advances every 2 ms. **The observation interval is not the physics timestep.**

```text
Lift → precondition gate → transfer
                           ├─ condition holds: next target
                           └─ sustained loss: latch alarm → hold target → end
```

Holding means freezing the last commanded actuator targets and simulating another 0.6 s. It does not freeze object coordinates or set velocity to zero.

## 2. Separate two kinds of failure

The scene, friction, zero pickup offset, actuators, schedule and placement criteria remain unchanged. The experiment crosses the following conditions with monitoring policies.

| Condition       | Injection                         | What changes                                                               |
| --------------- | --------------------------------- | -------------------------------------------------------------------------- |
| clean           | None                              | Normal pickup and transfer                                                 |
| observation-gap | One sample at 4.802 s             | The monitor receives an empty contact set; physical contacts remain intact |
| forced-open     | Simulation interval [4.8, 5.04) s | Both finger position targets are overridden to zero for 0.24 s             |

The second condition still has a timestamp and a record. It represents an observation reporting no contact, **not missing packets, a disconnected sensor or a timeout**. Detecting stale observations requires an additional rule that this experiment does not implement.

The third condition opens the fingers through their position actuators. MuJoCo computes the falling cube; the program does not teleport it. Forced opening is nevertheless not a natural friction-slip model. Conclusions below concern this reproducible loss of holding contact.

MuJoCo separates actuator control inputs in `ctrl` from the simulated state and contact data. The experiment records commands and observed outcomes separately. [MuJoCo 3.3.7 simulation API](https://mujoco.readthedocs.io/en/3.3.7/programming/simulation.html#state-and-control)

## 3. Three policies

| Policy    | Pre-transfer gate | During transfer                                                             |
| --------- | ----------------- | --------------------------------------------------------------------------- |
| once      | Retained          | Observe contact without cancelling                                          |
| immediate | Retained          | Alarm after one observation missing either pad                              |
| debounced | Retained          | Alarm after three consecutive bad observations; a good one resets the count |

Contact with the floor or palm cannot substitute for either finger pad. The counting rule is:

```python
both = {"left_pad", "right_pad"} <= set(contacts.split("|"))
bad_streak = 0 if both else bad_streak + 1

if required and bad_streak >= required:
    alarm = True
```

The full implementation adds two important boundaries. An alarm latches: renewed contact does not automatically resume transfer. Otherwise a noisy observation could repeatedly stop and restart the task. Recovery would require a separate decision.

The rule is active only in the transfer phase. Losing contact during intentional release is expected. Applying the same invariant throughout the schedule would misclassify normal release. Lowering is also outside this experiment's monitoring scope.

## 4. Observed outcomes

Three conditions × three policies × three identical repeats produced 27 rollouts. There was no randomization. Repeats check reproducibility; they are not independent statistical trials or generalization success rates.

| Condition                | once                        | immediate                                   | debounced                       |
| ------------------------ | --------------------------- | ------------------------------------------- | ------------------------------- |
| No disturbance           | 3 placements completed      | 3 placements completed                      | 3 placements completed          |
| One empty contact report | 3 placements completed      | 3 false cancellations; placement incomplete | 3 placements completed          |
| Fingers open for 0.24 s  | 3 empty transfers continued | 3 remaining transfers cancelled             | 3 remaining transfers cancelled |

**None of the policies completed placement in the forced-open condition.** The cube landed on the floor. Cancelling motion did not recover the grasp.

A placement-only metric hides differences in the response to failure. An alarm-only metric hides false cancellations in the observation-gap condition.

All nine clean state trajectories exactly match the previous successful baseline. The six observation-gap trajectories under once/debounced also match the clean baseline. Equality covers saved `qpos/qvel/ctrl` and phase records, not merely similar final positions.

## 5. What do two extra observations cost?

These are the first forced-open repeats; the other repeats produced identical state sequences. All times are simulation times.

| Policy    | First bad sample | Alarm time | Delay from first bad sample | Cumulative XY path after first bad sample |
| --------- | ---------------- | ---------- | --------------------------- | ----------------------------------------- |
| once      | 4.802 s          | None       | Not applicable              | 132.135 mm                                |
| immediate | 4.802 s          | 4.802 s    | 0 ms                        | 11.902 mm                                 |
| debounced | 4.802 s          | 4.842 s    | 40 ms                       | 22.534 mm                                 |

**Zero milliseconds here does not mean zero physical detection latency.** The override starts at 4.800 s, while the first recorded bad observation is at 4.802 s. The table starts its clock at that observation. A 50 Hz log also cannot locate the exact physical contact-loss instant between samples.

The three bad samples occur at 4.802, 4.822 and 4.842 s. Their first-to-last interval is 40 ms, not 60 ms. From fault injection to the debounced alarm it is 42 ms in this particular timing alignment, not a universal latency bound.

The path is computed from consecutive samples:

```text
Σ sqrt((x[i+1] - x[i])² + (y[i+1] - y[i])²)
```

It starts at the first bad sample and ends at each rollout's own termination: 9.2 s, 5.402 s and 5.442 s respectively. **These are different observation horizons.** The value describes the actual subsequent executed path, not speed over a common fixed window or a hardware braking distance.

![Forced opening produces similar cube-height curves but different subsequent hand movement](/media/practice/transfer-monitor-comparison.png)

The shaded interval is forced opening. The panels show cube height, hand displacement from its first-bad-sample position, and the bad-observation counter. After an alarm, the counter remains latched. Displacement in the plot and cumulative path in the table are different quantities; their closeness on this nearly one-directional path does not make them interchangeable.

## 6. Why does motion continue after cancellation?

The immediate policy raises its alarm at the first bad sample, yet the hand travels another 11.9 mm. The held value is the commanded target, not the actual position or velocity.

The position actuators still have tracking error and the system still has velocity. Freezing a target leaves the physical system to respond. The debounced policy travels approximately 11.85 mm after its own alarm; its 22.534 mm total also includes motion while waiting for confirmation.

Record three separate events: the observation becomes abnormal, the command changes, and the body responds. A log line saying “stopped” establishes neither an instantaneous physical stop nor elimination of falling-object risk.

## 7. Inspect the recorded trajectories

The following videos read the saved 50 Hz coordinates without interpolation or additional physics steps. A green circle is the hand centre, a red square is the cube centre, and a cross is the commanded target. These are **XZ projections, not robot geometry or 3D scene recordings**.

### One-time gate: the hand continues after the cube falls

<video controls preload="none" playsinline src="/media/practice/transfer-monitor-once.mp4" poster="/media/practice/transfer-monitor-once.png" width="960" height="640" aria-label="Recorded coordinate replay with one-time gating">Download the video from the evidence directory if playback is unavailable.</video>

### Three consecutive observations: hold the target after the alarm

<video controls preload="none" playsinline src="/media/practice/transfer-monitor-debounced.mp4" poster="/media/practice/transfer-monitor-debounced.png" width="960" height="640" aria-label="Recorded coordinate replay with consecutive-loss confirmation">Download the video from the evidence directory if playback is unavailable.</video>

The videos last 9.2 and 5.46 s, determined by frame count divided by 50 FPS. The second recording's last physical sample is at 5.442 s. This small packaging difference is not an alarm timestamp.

OpenGL scene rendering was unavailable in this execution environment, so these are CPU trajectory visualizations. Full states remain available for 3D replay on a graphics-capable machine.

## 8. Audit more than the runner's summary

The independent auditor imports neither the runner nor the monitor. From CSV, states and events, it recalculates injection conditions, observations, counters, alarms, held targets, paths and placement acceptance.

Checks actually passed:

- All 27 rollout records are complete, with no MuJoCo warnings.
- Eighteen policy pairs have identical saved physical states before their first decision divergence.
- Nine clean trajectories reproduce the previous successful baseline.
- Six trajectories tolerating the isolated empty report match the clean baseline.
- Eighteen repeat comparisons are identical; 11 monitor boundary tests also pass.

These checks improve traceability. They cannot rule out every implementation defect or validate the simulator against real hardware.

## 9. Reproduce the experiment

Use the project's Python 3.12 environment and locked dependencies from the repository root. Read the [frozen protocol](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/experiments/vl01_transfer_monitor/protocol.json) first.

```powershell
.venv/Scripts/python.exe -m unittest discover -s experiments/vl01_transfer_monitor -p test_monitor.py -v
.venv/Scripts/python.exe experiments/vl01_transfer_monitor/run.py --out outputs/my-transfer-monitor
.venv/Scripts/python.exe experiments/vl01_transfer_monitor/audit.py outputs/my-transfer-monitor
.venv/Scripts/python.exe experiments/vl01_transfer_monitor/render.py outputs/my-transfer-monitor
```

The output directory must not exist; old evidence is never overwritten. No model API key is needed. See the [project instructions](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/experiments/vl01_transfer_monitor/README.md) for dependencies, state replay and artifact meanings.

Check versions and source hashes in `manifest.json`, then inspect `trajectory.csv`, `events.json` and `audit.json`. Git preserves the original line endings of this evidence bundle so its recorded byte hashes remain verifiable.

## 10. What follows from these observations?

Under these fixed conditions, continuous monitoring cancelled transfer after contact loss. Three-sample confirmation tolerated one empty report and delayed the decision by 40 ms relative to immediate cancellation. **This demonstrates a particular trade-off, not an optimal threshold of three.**

The trial does not cover stale data, extended dropouts, varied friction or speeds, lowering, vision or real robots. It implements cancellation, not regrasping, recovery planning or a physical emergency stop. The wider VL01 and M4/M5 milestones remain unchanged.

A useful next experiment would freeze the rule and vary bad-observation duration and sampling interval, then add observation-freshness checks. Establish how long the system may wait and how old an observation may be before attempting recovery. This remains a plan, recorded in the existing research backlog.
