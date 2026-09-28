---
title: "Embodied AI Practice I: Pick up a cube in MuJoCo, then deliberately miss"
description: Run a contact-based pick-and-place task, compare0,25 and50mm target biases, and preserve videos, state trajectories and explicit success criteria.
slug: /embodied-ai/mujoco-first-pick-place
status: published
published_at: '2026-09-28'
updated: '2026-09-28'
reading_minutes: 18
learning_step: first-simulation
domain: embodied-ai
article_kind: tutorial
difficulty: beginner
related: ["project:hohoo-embodied-agent", "doc:embodied-ai/openvla-action-pipeline"]
---

Moving an object on screen is easy. More useful questions are: why did it move, did the fingers actually contact it, and why can a completed motion still fail the task?

This practice starts with a small physical task: grip a red cube, lift it, carry it over a blue bin, release it and check that it settles. Then only one condition changes: the pickup target shifts25 or50mm along x.

:::note Scope of the actual run
The experiment ran locally with MuJoCo 3.3.7 on September 28, 2026, Beijing time. This is an educational Cartesian gripper, not a commercial robot. There is no real hardware, visual detection, LLM planning, ROS2 or policy training. It is a control-and-data foundation for embodied learning, not a claim of trained embodied intelligence.
:::

## 1. Watch the recorded episode

This is the first zero-bias rollout, approximately9.2 seconds long. The video loads when requested and does not autoplay.

<video controls preload="none" playsinline src="/media/practice/vl01-baseline.mp4" poster="/media/practice/vl01-lift.png" width="960" height="640" aria-label="MuJoCo zero-bias episode: lift the red cube and release it into the blue bin">Use the original video link below if playback is unavailable.</video>

Text alternative: the open gripper descends around the red cube, closes and lifts it, moves above the blue bin, lowers and releases it, then retreats while the cube stays in the bin. The recording has no audio.

[Original video](https://github.com/VirtualSelect/hohoo-embodied-agent/raw/17144c47a2294f157420946b15f78c49d8d17dd5/evidence/vl01-20260928-v2/bias-000mm-run-1/episode.mp4) · [Code and reproduction guide](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/17144c47a2294f157420946b15f78c49d8d17dd5/experiments/vl01_pick_place) · [All nine recorded episodes](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/17144c47a2294f157420946b15f78c49d8d17dd5/evidence/vl01-20260928-v2)

The video is an observation aid. Saved states and explicit rules decide success; a convincing-looking lift is insufficient.

## 2. Why use a simple Cartesian gripper?

The mechanism has five actuated joints: x/y/z translations and two opposing finger slides. This makes a request such as “move two centimeters right” directly representable as a translational target, postponing articulated-arm inverse kinematics.

The simplification omits real-arm coupling, self-collision, cables, transmission and workspace constraints. It cannot establish real-robot performance. It lets a first exercise focus on actions, contact, observations and task criteria.

The red cube is40mm wide and weighs0.05kg. The bin floor's top surface is at z=0.006m; a settled cube center is therefore approximately z=0.026m. The cube has a free joint and moves under gravity and contact. It is never welded to the gripper or teleported during transport.

## 3. From an HTTP request to a physics loop

A familiar API flow is “build request → send → read response.” In simulation, an action also changes the environment for the next step:

```text
Target → actuator force → physics step → new state
  ↑                                      ↓
  └──────── next control and record ──────┘
```

| Concept | Here | Important distinction |
| --- | --- | --- |
| State | Joint positions/velocities, cube pose, contact | Simulator access is not equivalent to real sensor access |
| Observation | The selected positions, velocities, contacts and images we record | A selection or transformation, not the complete world |
| Action | Position targets for x/y/z and both fingers | Not setting the cube's position to its destination |

This run reads simulator state directly. It does not locate the object from camera pixels and should not be described as successful visual perception.

`MjModel` holds the model configuration and `MjData` the runtime state. The essential loop is:

```python
data.ctrl[:] = [
    target_x,
    target_y,
    target_z - 0.16,
    grip_target,
    grip_target,
]
mujoco.mj_step(model, data)
mujoco.mj_forward(model, data)

cube = data.body("cube").xpos.copy()
hand = data.site("grip_center").xpos.copy()
```

After advancing dynamics, derived quantities are refreshed so recorded world coordinates match the post-step `qpos`. Copying arrays matters: otherwise earlier observations may retain references to values changed on a later step.

## 4. Why subtract0.16 from the z target?

The hand's base is located at world z=0.16m. The z joint specifies displacement from that base:

```text
World height = base height + joint displacement
0.024m       = 0.160m      + (-0.136m)
```

Reaching world z=0.024m requires a joint target of−0.136, not0.024. The latter moves the hand higher.

All lengths use meters; world +z points upward. Both fingers receive a positive closing displacement but have opposite axes: left along+x, right along−x.

Always ask what a number means: which unit, which coordinate frame, and whether it represents a position, displacement or force. Position actuators turn joint targets into forces through configured gains and damping. Desired and actual positions can differ.

## 5. Nine phases make one episode

| Phase | Duration | Goal |
| --- | --- | --- |
| approach | 1.0s | Open above the pickup target |
| descend | 1.0s | Lower around the cube |
| close | 0.8s | Close both fingers |
| lift | 1.2s | Raise to0.18m |
| transfer | 1.5s | Move above the bin |
| lower | 1.0s | Lower to0.04m |
| release | 0.7s | Open fingers |
| retreat | 1.0s | Raise the hand |
| settle | 1.0s | Wait and observe |

Targets change through smooth interpolation. There is no learned policy.

Joint actuators provide position feedback, but the **high-level schedule never checks for a missed grasp before continuing**. In a failed condition, an empty gripper can finish its transport sequence. Program completion and task success are distinct.

## 6. Define success before running

The criteria combine historical and final conditions:

1. The cube center must previously rise above0.10m.
2. Every recorded point in the final0.5s must be within0.045m of the bin center on each horizontal axis.
3. Center height must be within0.006m of0.026m.
4. Linear speed must remain below0.02m/s.
5. Neither finger may contact the cube.
6. No MuJoCo warnings or non-finite states may occur.

The final window is sampled every20ms; this does not establish the absence of every possible contact between samples. Bin containment uses conservative center tolerances, not a general geometric containment test for arbitrary object rotations.

Height alone could accept a cube still held above the bin. Position alone could accept a cube already placed there initially. The tests explicitly reject both shortcuts.

## 7. Change only pickup bias

Pickup x bias is0,25 or50mm. Cube position and placement target remain fixed, as do scene, friction, mass, actuators, schedule and criteria.

Each condition repeats three times with identical initial state and no randomization. Repetition checks deterministic reproducibility. It is not three independent random samples or a general-purpose grasp success rate.

The physics step is2ms/500Hz. State is saved every10 steps/50Hz; video is25FPS. Each9.2s episode contains460 sampled trajectory rows.

## 8. What actually happened?

These values come from the formal v2 records. One episode is shown numerically per condition; its two repetitions produced the same results.

| Pickup bias | Lifted above0.10m? | Final cube-to-bin XY distance | Episodes meeting all criteria |
| --- | --- | --- | --- |
| 0mm | Yes | 0.673mm | 3 / 3 |
| 25mm | No | 260.337mm | 0 / 3 |
| 50mm | No | 262.063mm | 0 / 3 |

The distance is from the **cube to the bin center**, not gripper tracking error or commercial-arm positioning repeatability. The0.673mm value describes only this educational setup.

<img src="/media/practice/vl01-trajectories.png" alt="Recorded trajectories: the zero-bias cube rises and approaches the bin; the25mm and50mm conditions remain near the floor." width="1500" height="1020" loading="lazy">

This figure is generated from saved CSVs, showing one rollout per condition. The upper panel answers whether the cube lifted; the lower panel whether it approached the bin. Release and settling still require their own checks.

Here is the25mm condition:

<video controls preload="none" playsinline src="/media/practice/vl01-bias25.mp4" poster="/media/practice/vl01-bias25-lift.png" width="960" height="640" aria-label="MuJoCo25mm bias: the cube is not lifted while the empty gripper completes transport">Use the video in the evidence directory if playback is unavailable.</video>

Text alternative: the off-center descent moves the cube slightly. The rising gripper leaves it behind, continues to the bin according to the fixed schedule and opens. The cube stays in the pickup area. There is no audio.

The observation is “not lifted.” The scene and contact records support further analysis, but not a claim that every robot fails at25mm bias. We also did not determine the maximum tolerable bias: only three discrete values were tested.

## 9. Reproduce the experiment

Verified environment: Windows x64, Python3.12 and MuJoCo3.3.7.

```powershell
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git
cd hohoo-embodied-agent
git checkout 17144c47a2294f157420946b15f78c49d8d17dd5
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
```

Run contract tests, the experiment and the saved-data audit:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s experiments/vl01_pick_place -p test_contract.py
.\.venv\Scripts\python.exe experiments/vl01_pick_place/run.py --out outputs/my-first-run --render
.\.venv\Scripts\python.exe experiments/vl01_pick_place/analyze.py outputs/my-first-run
```

Without working OpenGL, omit `--render` to test physics and recording first. Linux/macOS require a different virtual-environment interpreter path and were not tested in this run.

The output directory must not exist; earlier evidence is never overwritten. After installation, no model API or training weights are required.

| Artifact | Purpose |
| --- | --- |
| manifest.json / protocol.json | Versions, actual code commit, hashes and fixed protocol |
| trajectory.csv |50Hz phases, targets, poses, speed and contacts |
| states.jsonl | Recorded qpos/qvel/ctrl for replay |
| events.json | Phase start times and targets |
| summary.json | Episode outcome and failure class |
| episode.mp4 / phase PNGs | Actual images from the first repetition of each condition |
| audit.json / trajectories.png | Independently checked saved trajectories and figure |

Height peaks are computed in the500Hz runtime loop; plots use50Hz samples. Their decimal precision is not interchangeable.

Replay the recorded state:

```powershell
.\.venv\Scripts\python.exe experiments/vl01_pick_place/replay.py evidence/vl01-20260928-v2/bias-000mm-run-1/states.jsonl --out outputs/replay.mp4
```

That produces a rendering of saved states, **not an additional policy evaluation**.

## 10. What is complete, and what should come next?

Completed: a runnable physics scene, fixed controller, nine recorded episodes, failure comparison, videos and replayable state. This uses the existing VL01 rather than creating a duplicate planned experiment.

Not completed: visual localization, state estimation, failure-driven replanning, ROS2, real arms, dataset training or Sim2Real. The complete VL01 and M4/M5 roadmap are not automatically marked finished.

The most useful next change is to check lift success at the end of the lift phase and stop with a failure result if the object stayed behind. Give high-level control access to meaningful feedback before adding more complicated intelligence.

<details><summary>Is setting the hand target equivalent to completing the task?</summary>

No. The target, actual hand state and cube state are different quantities. This example sets actuator targets and lets contact dynamics move the object. Task success is checked separately.

</details>

<details><summary>Why does this exercise need no language model?</summary>

A fixed task can be executed by an explicit phase program. Establish action, observation and physical-execution boundaries first; later a model can choose tasks or tools. Using a simulator does not itself imply learning a policy.

</details>

## References

- [MuJoCo3.3.7 modeling](https://mujoco.readthedocs.io/en/3.3.7/modeling.html): MJCF, local frames and joint representation.
- [MuJoCo3.3.7 Python](https://mujoco.readthedocs.io/en/3.3.7/python.html): models, runtime data, stepping, array references and rendering.
- [Scene, protocol and code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/17144c47a2294f157420946b15f78c49d8d17dd5/experiments/vl01_pick_place): use the fixed revision and raw records to check all numerical statements.
