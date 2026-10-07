---
title: "A second MuJoCo scene: why does the actuator overshoot?"
description: "Compare mass and PD damping in a planar force-controlled actuator, separating target crossing from stable completion."
slug: "/embodied-ai/mujoco-planar-pd"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:mujoco-planar-pd", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-qualified-completion"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [Raw evidence](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [Lab record](/labs/mujoco-planar-pd)

Earlier studies examined grasping contracts, recovery and completion. This second MuJoCo teaching scene isolates control: a massive spherical actuator moves along two slide joints from (0,0) to (0.6,0), driven by two force motors. It is not an articulated arm, grasping system, ROS2 integration or completed VL01 milestone.

## Position error is not a stop command

Force is Kp × position error − Kd × velocity. Kp is fixed at 80; Kd is 0, 18 or 36, with masses 1kg and 2kg. Force is limited to ±5N per axis. Physics runs at 2ms, feedback updates at 20ms, and each rollout lasts four seconds.

P-only force approaches zero near the goal even when momentum remains. D feedback opposes velocity before crossing. More damping may slow the response; mass changes acceleration under the same force. The continuous linear critical-damping expression 2√(mass×Kp) offers intuition, not an optimal tuning guarantee for this saturated, sampled controller.

## Completion needs a window

Every sample in the final 0.3 seconds must have error below 15mm and speed below 40mm/s.

| Mass | Kd | Peak x overshoot | Final error | Stable completion |
| --- | --- | --- | --- | --- |
| 1kg | 0 | 740.6mm | 677.95mm | No |
| 1kg | 18 | 0mm | <0.01mm | Yes |
| 1kg | 36 | 0mm | 0.06mm | Yes |
| 2kg | 0 | 630.9mm | 569.47mm | No |
| 2kg | 18 | 74.0mm | <0.01mm | Yes |
| 2kg | 36 | 0mm | 0.04mm | Yes |

![Recorded position trajectories for mass and damping comparisons](/media/practice/planar-gain.svg)

Both undamped cases fail. Kd=18 overshoots with the heavier mass despite eventually passing. Final error alone hides that behavior. Six fixed conditions are not a population success-rate estimate.

The XML uses slide joints and force motors, not direct qpos assignment. The sphere radius is 35mm; gravity and passive joint damping are zero to isolate feedback. See the [MuJoCo 3.3.7 XML reference](https://mujoco.readthedocs.io/en/3.3.7/XMLreference.html) for actuator semantics. Replacing motors with position actuators would change the meaning of the action.

Exercise: inspect saturation in the first rows of 01-gain.csv, then inspect force direction near the goal. Increase mass in a separate run and predict overshoot before looking at the trace. Do not shorten the observation horizon to hide later failures.

Feedback uses simulator state, with no sensor uncertainty or hardware validation in this first comparison. Headless numeric execution needs no OpenGL context. Continue with [obstacle clearance](/docs/embodied-ai/mujoco-obstacle-clearance).

## Reproduce from a clean checkout

Python 3.12. The runner executes all three comparisons; each article discusses its own subset.

~~~sh
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 831789c2a1efb4564c4cfabc2298e48e16ada879
python -m pip install -r requirements-lock.txt
python experiments/planar_reach/run.py --out outputs/my-run
python experiments/planar_reach/audit.py outputs/my-run
python experiments/planar_reach/plot.py outputs/my-run
~~~

Use a new output directory. Windows was exercised; Linux/macOS were not rerun. No model API or key is required. The source commit in the manifest precedes the evidence commit linked above; source hashes bind the executed files.
