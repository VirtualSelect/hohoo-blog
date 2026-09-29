---
title: "Embodied practice II: if the grasp failed, skip the transfer"
description: An 18-rollout MuJoCo comparison of a lift/contact gate, with recorded trajectories, videos, runnable code and explicit limits.
slug: /embodied-ai/mujoco-grasp-guard
status: published
published_at: '2026-09-29'
updated: '2026-09-29'
reading_minutes: 12
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
provenance: experiment-result
related: ["doc:embodied-ai/mujoco-first-pick-place", "project:hohoo-embodied-agent", "lab:grasp-guard"]
---

In the [first experiment](/docs/embodied-ai/mujoco-first-pick-place), a 25 mm pickup offset left the cube on the table. The gripper nevertheless completed its timed transfer, lowering and release sequence.

This follow-up keeps the scene, friction, robot and pickup motion unchanged. It asks one narrower question: **can observations collected during lifting prevent an empty transfer?**

Across 18 rollouts, the gate cancelled all six transfers after biased pickups failed. The three zero-offset placements still completed, with entire trajectories identical to baseline. Failed grasps remained failures; the change improved the response to failure.

[Code and reproduction](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/eb186ee4927da99d4ba48e334fabf9442c929507/experiments/vl01_grasp_guard) · [All 18 recordings](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/eb186ee4927da99d4ba48e334fabf9442c929507/evidence/grasp-guard-20260929) · [Lab](/labs/grasp-guard)

## 1. A phase deadline is not a phase precondition

The original high-level schedule was:

```text
approach → descend → close → lift → transfer → lower → release → retreat
```

After lifting, the next phase implicitly assumed that the cube was in the gripper. That assumption was false in the biased runs.

MuJoCo position actuators already use feedback. “Open-loop timing” here describes the **high-level task sequence**, which did not branch on pickup outcome; it does not mean that every control layer lacked feedback.

The new branch is small:

```text
lift ends → check grasp
               ├─ accepted: original transfer and placement
               └─ rejected: hold actuator targets for 0.6 s, end episode
```

Holding actuator targets is neither attaching the cube nor a physical robot emergency stop. The program still advances physics normally, without editing cube poses or adding attachment constraints.

## 2. What counts as a confirmed grasp?

At simulation time 4.0 s, immediately after the lift phase, the controller checks the last 0.2 s of recorded observations. The thresholds were frozen in protocol.json before execution.

| Check             | Threshold                                                                  | Failure it addresses                  |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------- |
| Complete window   | At least 10 samples spanning at least 0.18 s; successive gaps ≤0.0200001 s | One lucky sample or missing history   |
| Fresh observation | Last sample age ≤0.025 s                                                   | Acting on stale state                 |
| Lifted cube       | Every cube centre z >0.1 m                                                 | Gripper rises while cube stays behind |
| Bilateral contact | Both left_pad and right_pad in every sample                                | One-sided or fleeting contact         |
| Finite height     | No NaN or Infinity                                                         | Invalid values bypassing validation   |

The height is an **absolute world-coordinate threshold for this scene**, not a universal height above a table. A different scene requires a new protocol.

Contact pairs report MuJoCo-detected contacts; they do **not** establish sufficient gripping force. This gate is more constrained than a height-only check, but is not a general stable-grasp criterion.

The core logic below matches the implementation; the complete function also validates time continuity and finite values:

```python
window = [r for r in rows if now - 0.2 - 1e-9 <= r["time"] <= now]
high = all(r["cube_z"] > 0.1 for r in window)
both = all(
    {"left_pad", "right_pad"} <= set(r["contacts"].split("|"))
    for r in window
)
accepted = complete_window and finite_height and high and both
```

The time tolerance handles floating-point accumulation; it does not relax the height threshold. Empty windows must fail: Python's all([]) returns True.

## 3. Why a window instead of the last frame?

A brief collision can resemble a held object in a single contact snapshot. Requiring sustained height and bilateral contact rejects some transient cases in this fixed scene.

That introduces tradeoffs: delayed decisions, possible missed events between samples, and false rejection of otherwise viable grasps. The experiment does not establish 0.2 s as an optimal window.

Physics advances every 0.002 s, or 500 Hz. Logging happens every 10 steps, or 50 Hz, and the gate uses those samples. Its actual window contains 10 observations from 3.802 to 3.982 s: a 0.18 s span, with the latest observation approximately 0.018 s old at decision time.

A call to mj_forward after stepping refreshes derived positions and contacts to align with the saved state. See the [MuJoCo 3.3.7 API](https://mujoco.readthedocs.io/en/3.3.7/APIreference/APIfunctions.html#mj-forward) for its distinction from mj_step.

## 4. Preserve the pickup before comparing what follows

Both modes use the original scene, actuator targets and placement acceptance criteria.

- baseline computes and records the gate but ignores its decision.
- guarded applies the gate, then holds for 0.6 s and ends if rejected.
- 0 / 25 / 50 mm × two modes × three repeats = 18 rollouts.

There is no randomization. Repeats test deterministic reproducibility, not success over independent environments.

The independent audit does not import the controller's evaluate function. It rechecks CSV observations and verifies:

1. All nine paired trajectory prefixes are identical before 4 s.
2. All nine new baseline CSV files exactly match the corresponding previous experiment.
3. All three successful zero-offset pairs have identical **entire trajectories**.
4. Rejected episodes contain no transfer phase; horizontal actuator targets remain unchanged during the hold.

These checks support attributing the difference to applying the gate rather than inadvertently modifying pickup motion.

## 5. Observed result: less empty motion, unchanged task outcome

| Pickup offset | baseline placement | guarded placement | guarded transfer cancelled | baseline post-gate XY path |
| ------------- | -----------------: | ----------------: | -------------------------: | -------------------------: |
| 0 mm          |                3/3 |               3/3 |                        0/3 |                 268.330 mm |
| 25 mm         |                0/3 |               0/3 |                        3/3 |                 246.221 mm |
| 50 mm         |                0/3 |               0/3 |                        3/3 |                 224.722 mm |

Post-gate XY path sums horizontal distances between adjacent recorded gripper positions from 4 s onward. Rejected guarded episodes travelled around 10⁻⁸ mm, a numerical residual, **not a hardware positioning-accuracy measurement**.

Rejected runs ended at 4.6 s; baseline ended at 9.2 s. This reflects cancelled phases, not inference acceleration or measured energy savings.

![25 mm bias: both pickups fail, but only baseline continues its horizontal transfer](/media/practice/grasp-guard-comparison.png)

The plot uses the first 25 mm pair's CSV. The top panel shows cube-centre height; the bottom shows horizontal distance from the gripper's position near the gate. The dashed line is 4 s. Displacement in the plot differs from accumulated path in the table; these paths are almost straight, so their final values are close.

## 6. Watch the two continuations of the same failed pickup

**Original sequence:** the cube stays behind while the empty gripper moves toward the bin.

<video controls preload="none" playsinline src="/media/practice/grasp-guard-baseline.mp4" poster="/media/practice/grasp-guard-lift.png" width="960" height="640" aria-label="25 mm baseline: the empty gripper continues its transfer">If playback fails, open the video in the evidence directory.</video>

**With the gate:** the lift check fails, the gripper holds its current targets, and the episode ends.

<video controls preload="none" playsinline src="/media/practice/grasp-guard-stopped.mp4" poster="/media/practice/grasp-guard-stop.png" width="960" height="640" aria-label="25 mm guarded: transfer is rejected and the gripper holds position">If playback fails, open the video in the evidence directory.</video>

Both are actual 25 FPS recordings. The [evidence directory](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/eb186ee4927da99d4ba48e334fabf9442c929507/evidence/grasp-guard-20260929) contains all other states, screenshots and recordings.

## 7. Reproduce and diagnose

Use the original Python 3.12 / MuJoCo 3.3.7 environment. From the independent repository root:

```powershell
.venv/Scripts/python.exe -m unittest discover -s experiments/vl01_grasp_guard -p "test_*.py"
.venv/Scripts/python.exe experiments/vl01_grasp_guard/run.py --out evidence/my-guard-run --render
.venv/Scripts/python.exe experiments/vl01_grasp_guard/audit.py evidence/my-guard-run
```

The output directory must not exist. manifest.json records the source commit, hashes and runtime versions. Each episode includes trajectory.csv, states.jsonl, events.json and summary.json. Eight unit tests cover valid grasps and boundaries including one-sided contact, threshold height, stale/empty history, duplicate/reordered samples, transient contact, future observations and non-finite height.

When rejected, inspect gate.reasons, window_start/window_end, min_cube_z_m and both_pad_samples rather than only the success flag.

Saved states can be replayed:

```powershell
.venv/Scripts/python.exe experiments/vl01_grasp_guard/replay.py evidence/grasp-guard-20260929/guarded-025mm-run-1/states.jsonl --out outputs/guard-replay.mp4
```

Replay restores recorded qpos/qvel/ctrl; it does not rerun the policy and is not another independent trial.

## 8. What remains before a real closed-loop robot?

The gate reads simulator body positions and contact pairs: **privileged state observations**. Real hardware would need visual estimates, gripper width, motor current or force sensing, each with noise, delay and missing data.

Three gaps remain:

- The check happens once before transfer. A later slip is not detected.
- There is no regrasp or recovery planning. A rejected task remains failed.
- Two biased conditions in one fixed scene cannot establish false-positive rates, false-negative rates or robustness.

The useful principle is to verify the facts that the next action depends on. The next test should introduce a reproducible slip during transport and compare ongoing monitoring before adding recovery.
