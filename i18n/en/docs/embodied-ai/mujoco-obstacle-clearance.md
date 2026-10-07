---
title: "MuJoCo obstacle clearance: a point path is not a body path"
description: "Six contact trajectories compare direct, edge and clearance paths while separating geometry from controller tracking."
slug: "/embodied-ai/mujoco-obstacle-clearance"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:mujoco-obstacle-clearance", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-planar-pd"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [Raw evidence](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [Lab record](/labs/mujoco-obstacle-clearance)

The empty scene reaches its target. Add a box at x=0.3m while keeping the target at x=0.6m and the controller unchanged: mass 1kg, Kp=80, Kd=18, ±5N per axis. A direct path hits the wall. A path that merely clears it for a point also fails because the actuator has a 35mm radius.

## Fixed path comparison

The wall has x half-width 40mm and y half-width h of either 40mm or 90mm.

| Route | Targets |
| --- | --- |
| direct | (0.6,0) |
| corner | (0.16,h), (0.44,h), then goal |
| clearance | (0.16,h+0.1), (0.44,h+0.1), then goal |

The controller advances within 15mm of a waypoint. The 100mm clearance is a fixed teaching choice, not an optimized or certified safety distance.

For a sphere, expanding obstacles by its radius converts body clearance into a point-path question. Tracking error adds another margin: inertia can cut corners or overshoot. This example uses fixed waypoints, not a general planner.

## Actual contact results

| Wall half-height | Route | Contact samples | Final error | Completion |
| --- | --- | --- | --- | --- |
| 40mm | direct | 1850 | 374.79mm | No |
| 40mm | corner | 1680 | 376.86mm | No |
| 40mm | clearance | 0 | <0.01mm | Yes |
| 90mm | direct | 1850 | 374.79mm | No |
| 90mm | corner | 1670 | 385.19mm | No |
| 90mm | clearance | 0 | <0.01mm | Yes |

Contact samples are 2ms states containing contact, not separate collision events. Sustained contact contributes many samples. No impact-force or hardware-damage conclusion follows.

![Six recorded planar trajectories comparing edge and clearance paths](/media/practice/planar-path.svg)

Both clearance routes pass; the other four fail. This supports the need for body clearance in this scene, not universal obstacle avoidance.

## Inspect the right trajectory

Waypoints are controller targets; mj_step integrates actual position. The plot uses recorded x/y, not a drawing of intended targets. Direct motion should stop at the wall, corner motion should remain blocked, and clearance should travel above it. If a run passes through the wall, inspect contact masks before celebrating the planner.

Exercise: enlarge the sphere without changing waypoints. Compute the geometric clearance, account for the waypoint tolerance, then inspect actual contacts. Lower damping as a second exercise to see whether a geometrically valid path remains trackable.

Dynamic obstacles, articulated robot configurations, narrow passages and hardware safety are outside this study. Next: [delayed noisy feedback](/docs/embodied-ai/mujoco-delayed-feedback).

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
