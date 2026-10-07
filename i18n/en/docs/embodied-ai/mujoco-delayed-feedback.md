---
title: "Delayed MuJoCo feedback: can an old observation predict now?"
description: "Twenty-four paired traces compare delay, position noise and constant-velocity prediction, retaining incomplete recoveries."
slug: "/embodied-ai/mujoco-delayed-feedback"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:mujoco-delayed-feedback", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-obstacle-clearance"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [Raw evidence](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [Lab record](/labs/mujoco-delayed-feedback)

Stable empty-scene control and a feasible path still depend on feedback. This study removes the obstacle and changes only observations: delay 0/80ms, position noise 0/10mm, and held versus constant-velocity-predicted position. Seeds 7, 19 and 41 yield 24 traces.

Prediction reduces some overshoot, but every 80ms-delay case still fails the frozen completion criterion.

## Capture, delivery and decision

A packet samples state at capture, becomes available after the configured delay, and is consumed at a 20ms control tick. The controller uses zero force before the first packet and cannot read current state to fill gaps. Noise changes reported position, not physical state.

Velocity is delayed simulator truth without added noise, an optimistic sensor assumption—not visual velocity estimation. Both controllers use that old velocity in the damping term.

~~~text
predicted_position = captured_position
                   + captured_velocity × (now - capture_time)
~~~

The predictor does not estimate acceleration, update velocity or implement a Kalman filter. Changing force violates the constant-velocity approximation; delayed velocity feedback remains a separate problem.

## Recorded completion

| Delay / noise | hold passes | predict passes |
| --- | --- | --- |
| 0ms / none | 3/3 | 3/3 |
| 0ms / 10mm | 1/3 | 1/3 |
| 80ms / none | 0/3 | 0/3 |
| 80ms / 10mm | 0/3 | 0/3 |

No-noise seeds duplicate deterministic conditions, not independent random trials. Three noisy seeds are sensitivity examples, not a population estimate.

At 80ms without noise, peak overshoot drops from 210.7mm to 52.0mm, but final error changes from 2.79mm to 26.76mm. Neither remains within 15mm and below 40mm/s throughout the final 0.3 seconds. Selecting the overshoot metric alone would incorrectly suggest recovery.

Some zero-delay noisy failures end only 1.36mm or 0.30mm from the target. A favorable final frame cannot replace a sustained position-and-speed condition.

![Recorded seed-seven error traces under noise, delay and prediction](/media/practice/planar-observation.svg)

The figure shows seed seven only; all seeds are archived.

## Recompute instead of trusting the controller

The auditor checks that capture times precede current time and evaluates completion from physical x/y/vx/vy, not estimated state. Otherwise an estimator could certify its own incorrect belief.

Exercise: inspect a small-final-error failure and find which tail-window sample violates which threshold. Reduce delay in a new output directory, retaining the original protocol and failures instead of moving thresholds afterward.

Acceleration models, velocity noise, filtering, lower gains or age-based stopping are candidates for new paired experiments. None is already validated here. This planar system and predictor establish no hardware-safety or articulated-arm guarantee.

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
