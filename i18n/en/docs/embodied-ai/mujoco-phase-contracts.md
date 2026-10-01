---
title: "Embodied AI Practice VII: Why a Transfer Rule Stops Normal Lowering"
description: "21 MuJoCo rollouts separate stage-specific grasp checks, stop actions and final placement. A false alarm and lingering finger contact reveal two different failure modes."
slug: /embodied-ai/mujoco-phase-contracts
status: published
published_at: "2026-10-01"
updated: "2026-10-01"
reading_minutes: 13
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
related: ["doc:embodied-ai/mujoco-recovery-ablation", "doc:embodied-ai/mujoco-observation-freshness", "lab:phase-contracts", "project:hohoo-embodied-agent"]
---

During transfer, requiring the cube center to remain above 12 cm helps confirm that it is still lifted. During lowering, however, the cube is supposed to descend. What happens if we simply keep that rule enabled?

In this 21-rollout experiment, **normal lowering stops at 6.002 s even though both fingers still touch the cube and its center is only 7.874 mm from the gripper center**. Removing the transfer-height requirement during lowering allows the clean rollout to place the cube. Yet the stop action still has a defect: a late-lowering fault leaves the fingers touching the cube at the end.

We therefore evaluate three things separately: whether a rule fits its current stage, whether an alarm follows the injected fault, and whether the final physical state satisfies the task.

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/43dacf4bbe72e0eecc288c1dc46692f51be2b43e/experiments/vl01_phase_contracts) · [21 raw rollouts](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/43dacf4bbe72e0eecc288c1dc46692f51be2b43e/evidence/phase-contracts-20261001) · [Independent audit and cell-level results](https://github.com/VirtualSelect/hohoo-embodied-agent/blob/43dacf4bbe72e0eecc288c1dc46692f51be2b43e/evidence/phase-contracts-20261001/audit.json)

## 1. Extending the scope also changes the meaning

[E6's recovery ablation](/docs/embodied-ai/mujoco-recovery-ablation) exposed a gate that operated only during transfer. Retiming the path also changed time spent in the monitored stage, so repeated resumptions could not be attributed to path geometry alone.

Replacing `phase == "transfer"` with `phase in ("transfer", "lower")` appears to close that gap. But does every condition inside the predicate remain appropriate?

Here, a **stage contract** means an explicit set of conditions expected during that stage. It is an experimental predicate, not a formally verified robot safety contract.

| Condition | Purpose during transfer | Keep during lowering? |
|---|---|---|
| Both fingers touch the cube | Evidence that the grasp is retained | Yes, before commanded release |
| Cube–gripper distance below 5 cm | Reject clearly detached states | Yes |
| Cube center above 12 cm | Confirm the lifted transfer state | No; normal lowering crosses that height |
| Latest accepted capture age below 60 ms | Avoid treating old evidence as current | Yes |

The transfer predicate stays unchanged. After commanded release, losing finger contact is expected, so it cannot retain the same interpretation as a grasp fault.

## 2. Remove recovery from this comparison

This experiment does not combine the new checks with E6's recovery and replanning. All three policies use the same fixed schedule, initial state and alarm response: **latch the stop and hold the current actuator target, without resuming**.

This isolates monitoring scope and predicate choice. It is a separate ablation, not a claim that the entire E6 controller has been upgraded and regression-tested.

| Policy | Transfer monitoring | Lowering monitoring |
|---|---|---|
| `transfer-only` | Full transfer predicate | None |
| `reuse-transfer` | Full transfer predicate | Same predicate, including height |
| `phase-aware` | Full transfer predicate | Contact, distance and age; no transfer-height requirement |

All three end grasp monitoring at scheduled release. Final placement is checked independently; a separate release-safety monitor has not been implemented.

The predicate difference is small:

```python
contact = {"left_pad", "right_pad"} <= set(packet["contacts"].split("|"))
retained = contact and packet["grasp_error"] < self.error
height_required = phase == "transfer" or self.policy == "reuse-transfer"
return retained and (not height_required or packet["cube_z"] > self.height)
```

The monitor reads observation packets, not the simulator directly. Those packets contain privileged MuJoCo state, not camera estimates, tactile inference or hardware measurements.

## 3. The 21-cell protocol

Seven conditions cross three policies, with one deterministic rollout per cell and no random seed. These are not 21 independent randomized trials for estimating a general success rate.

| Item | Setting |
|---|---|
| Environment | Windows 11, Python 3.12.14, MuJoCo 3.3.7, NumPy 2.2.6 |
| Physics/control step | 2 ms |
| Capture interval | 20 ms |
| Transfer / lower / release | 4.0–5.5 / 5.5–6.5 / 6.5–7.2 s |
| Horizon | 9.2 s, including retreat and settling |
| Grasp-fault confirmation | Bad captures spanning at least 40 ms |
| Freshness limit | Alarm when the latest accepted capture reaches 60 ms old |
| Stop response | Hold the target from the next control tick; no recovery |

Conditions: clean; forced opening during transfer at 4.8 s; early lowering opening at 5.6 s; late lowering opening at 6.2 s; delivery silence from 5.6 s; replaying the last pre-fault packet over that interval; and one empty-contact report at 5.6 s. Opening, silence and replay last 240 ms. The empty-report window lasts 20 ms and affects one sample.

Forced opening changes only the gripper actuator command; it does not rewrite cube position. When the fault window ends, the current policy's grip target applies again. A stopped Cartesian target can therefore coexist with a closed-gripper target being reapplied. This matters for the late fault.

MuJoCo distinguishes controls from physical state: motion and contact continue after an actuator target changes. See the official [simulation loop](https://mujoco.readthedocs.io/en/3.3.7/programming/simulation.html#simulation-loop) and [position actuator](https://mujoco.readthedocs.io/en/3.3.7/XMLreference.html#actuator-position) documentation. Holding a target does not freeze the object.

## 4. Clean lowering produces a false alarm

For `reuse-transfer`, the first sample below the height threshold arrives at 5.962 s. Forty milliseconds later, at 6.002 s, the monitor stops. At that moment:

| Measurement | Value |
|---|---:|
| Cube center height | 110.687 mm |
| Cube–gripper distance | 7.874 mm |
| Finger contact | Both fingers |
| Capture age | 0 ms, a new sample |

Neither stale communication nor lost contact caused this stop. **The implementation correctly applied a rule in the wrong stage.** The cube remains held above the tray, commanded release is never entered, and final placement fails.

The clean `phase-aware` and `transfer-only` state/control traces are identical and both place. This supports removing the transfer-height requirement in this particular lowering task, not deleting every height constraint from robot control.

<img src="/media/practice/phase-lowering-contracts.png" alt="Measured heights: reuse-transfer stops clean lowering at 6.002 seconds; after early forced opening, all three cube trajectories fall toward the tray. Crosses mark first stops and shading marks scheduled lowering." width="1560" height="598" loading="lazy" />

Some curves overlap. A descending cube in the right panel does not imply a planned release occurred.

## 5. A cube in the tray does not validate the process

All three early-lowering opening runs pass final placement. Yet `transfer-only` never monitors or alarms during lowering. The other two detect the contact fault at 5.642 s and hold their targets while gravity carries the cube into the tray below.

A simple success count would erase these differences. The final check asks whether, for the last 0.5 s, the cube is within the target bounds, at the expected height, sufficiently still, and free of finger contact, after having been lifted. It does not require a planned landing or measure collision impulse.

We retain that criterion and the resulting passes. Silently changing the rubric to obtain a preferred result would hide the missing process requirement rather than explain it.

## 6. Late lowering: correct alarm, incomplete stop action

With forced opening at 6.2 s, `phase-aware` stops at 6.242 s. At the 9.2 s endpoint, the cube touches the tray floor **and both fingers**, failing the no-finger-contact placement requirement.

The gripper holds a low target. When the 240 ms opening fault ends, its held closed-grip target applies again, leaving residual contact. This is not a designed regrasp or evidence that the system rescued the cube. Recorded targets and contacts support this explanation; contact forces and every collision event were not separately analyzed.

Meanwhile, `reuse-transfer` stops at 6.002 s—before the 6.2 s fault—because of the height rule. The cube later falls into the tray and passes placement. That earlier stop must not be counted as faster fault detection.

Thus, one policy falsely alarms and passes the endpoint check, while another correctly detects the fault and fails it. Monitoring decisions and exit actions need separate evaluation.

## 7. Packet delivery is not observation freshness

For both silence and stale replay, `phase-aware` stops at 5.642 s. Its latest accepted capture is from 5.582 s: exactly 60 ms old. Twelve replayed packets arrive, but neither their sequence nor capture time advances, so they do not reset age.

<img src="/media/practice/phase-capture-age.png" alt="Recorded capture age during lowering silence and stale replay. The phase-aware monitor stops at the 60 millisecond limit; age recovers after the fault, but the stop remains latched." width="1560" height="559" loading="lazy" />

Bad-capture confirmation spans 40 ms; the age limit is 60 ms. These have different origins. Fault commands begin at 5.600 s; the first post-step fault sample would be at 5.602 s. The 5.642 s alarm is 40 ms after that sample instant but 60 ms after the last good capture. A latency report must state its reference point.

One empty report does not stop `phase-aware`: the next good sample clears the bad interval. The later 6.002 s stop in `reuse-transfer` is still a height-rule false alarm, not a delayed response to the recovered empty report.

## 8. Full matrix

Each cell shows **first stop / final placement**. No stop does not establish a safe execution.

| Condition | transfer-only | reuse-transfer | phase-aware |
|---|---|---|---|
| Clean | None / pass | 6.002 s grasp / fail | None / pass |
| Transfer opening | 4.842 s grasp / fail | 4.842 s grasp / fail | 4.842 s grasp / fail |
| Early lower opening | None / pass | 5.642 s grasp / pass | 5.642 s grasp / pass |
| Late lower opening | None / pass | 6.002 s false alarm / pass | 6.242 s grasp / fail |
| Lower silence | None / pass | 5.642 s stale / fail | 5.642 s stale / fail |
| Lower stale replay | None / pass | 5.642 s stale / fail | 5.642 s stale / fail |
| One empty report | None / pass | 6.002 s false alarm / fail | None / pass |

For both lowering-opening faults, the phase-aware alarm occurs 40 ms after the first post-fault capture. This matrix does not demonstrate a placement-rate improvement. It reveals an unmonitored stage, an inappropriate reused predicate, and an incomplete hold response.

## 9. Verification and reproduction

Code and protocol were committed before the 21-cell run. The manifest records a clean working tree, versions and source fingerprints. The independent auditor imports neither the monitor nor MuJoCo and checks:

- 105 episode files and 10 source/protocol fingerprints.
- Fault windows, received packets, replay rejection, age and bad-capture spans.
- Stop decisions, next-tick target holds, placement and release entry.
- Three policy pairs for each of seven conditions: 21 state/control prefixes before the first divergent decision.

All 13 monitor tests and eight evidence-audit/mutation tests pass. Mutation tests alter only temporary copies of commands, packets, events, states or results and require rejection. This validates recorded consistency, not every contact force or the simulator itself.

From the repository root, audit the archived run:

```bash
python experiments/vl01_phase_contracts/audit.py evidence/phase-contracts-20261001
python -m unittest discover -s experiments/vl01_phase_contracts -p test_monitor.py -v
```

For a rerun, commit the source/protocol first and choose a new output directory. Use the MuJoCo version above.

```bash
python experiments/vl01_phase_contracts/run.py --out runs/e7-my-run
python experiments/vl01_phase_contracts/audit.py runs/e7-my-run --out runs/e7-my-run/audit.json
python experiments/vl01_phase_contracts/plot.py runs/e7-my-run --out runs/e7-my-run/figures
```

`control.csv` records every 2 ms decision step; `states.jsonl` and `trajectory.csv` retain 20 ms physical samples. Inspect `events.json` for stops and `summary.json` for outcomes. The [experiment README](https://github.com/VirtualSelect/hohoo-embodied-agent/blob/43dacf4bbe72e0eecc288c1dc46692f51be2b43e/experiments/vl01_phase_contracts/README.md) includes `E7_EVIDENCE` setup for all tests.

## 10. Define what happens after stopping

The next useful step is to specify exit actions after lowering faults, conditions after commanded release, and bounded recovery. Holding, controlled release and retreat may produce different outcomes; freeze their preconditions and compare identical fault times.

This remains a fixed schedule with one clock and privileged simulated observations. There is no vision, ROS2, learned policy, hardware validation or whole-task safety proof. VL01 and the full M4/M5 milestones remain open. The supported lesson is specific: **interpret evidence by stage, and keep separate evidence for the alarm, the action and the endpoint.**
