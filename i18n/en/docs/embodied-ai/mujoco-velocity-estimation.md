---
title: "MuJoCo velocity estimation: smoother signals can mean worse control"
description: "54 actual simulation rollouts compare finite differences, EMA and an oracle reference across position noise and observation delay."
slug: "/embodied-ai/mujoco-velocity-estimation"
status: "published"
published_at: "2026-10-09"
updated: "2026-10-09"
reading_minutes: 11
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-delayed-feedback", "doc:embodied-ai/mujoco-planar-pd"]
related: ["lab:mujoco-velocity-estimation", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-qualified-completion"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1931effc42f9d5974f20c09614dc2ebbdfcbf44b/experiments/planar_velocity_estimation) · [54 compressed trajectories](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1931effc42f9d5974f20c09614dc2ebbdfcbf44b/evidence/planar-velocity-20261009) · [Lab](/labs/mujoco-velocity-estimation)

The previous predictor received ground-truth velocity at the capture timestamp, an optimistic sensor assumption. Many sensors provide positions instead. Subtracting consecutive positions gives velocity, but also differences the noise and divides it by a short interval. Feeding this directly into damping can create large force fluctuations.

This round reuses the planar force-controlled actuator. It compares finite differences, smoothed differences and an oracle velocity reference in **actual MuJoCo simulation**. There is no arm, vision, ROS2 or hardware. All methods hold the same delayed position and use identical gains and force limits, without position extrapolation.

## From millimetres to velocity error

The sensor samples every 20ms:

```text
measured position = true position + noise
estimated velocity = (new measured position - previous measured position) / 0.02s
```

For independent position-noise samples with standard deviation σ, the single-axis difference-noise standard deviation is `√2 × σ / Δt`. With σ=3mm and Δt=20ms, that is about **0.212m/s**. This is noise propagation, not a measured result; actual error also includes the difference approximation to motion.

The controller uses `force = 80 × position error - 18 × estimated velocity`, clipped to ±5N per axis. A 0.212m/s noise component corresponds to roughly 3.82N in the damping term, comparable to the force bound. A position error of a few millimetres can therefore produce repeated saturation.

## What smoothing changes

The EMA scheme filters the finite difference with a fixed 60ms time constant:

```text
α = 1 - exp(-Δt / τ), τ = 60ms
smoothed velocity = (1 - α) × previous estimate + α × new difference
```

Δt is the difference between **capture timestamps**, not wall-clock arrival intervals. The first sample initializes velocity to zero; duplicate or out-of-order timestamps are rejected. Smoothing suppresses rapid changes but delays response during acceleration and deceleration. Damping no longer reflects motion as promptly.

```text
Physics -> noisy position -> timestamped delay queue
-> consume arrived samples -> velocity estimate -> PD and clipping
-> MuJoCo step -> save trace and evaluate
```

Only the oracle reads captured ground-truth velocity. Difference and EMA do not read `qvel`; true velocity is separately saved for offline evaluation. Decisions can only use arrived samples, and the auditor checks sample age.

## Freeze the protocol before looking at outcomes

Two delays (0/80ms), three noise levels (0/3/10mm), three estimators and three seeds give 54 rollouts. Each runs for four seconds with 2ms physics and 20ms control, producing 108,000 rows. There is no obstacle; mass is 1kg and the goal is `(0.6,0)`.

Acceptance requires **every physics step in the last 300ms** to be within 15mm of the goal and below 0.04m/s in speed norm. A lucky endpoint or a small final error is insufficient.

Each table cell is passing rollouts out of three seeds:

| Delay | Position-noise σ | Oracle reference | Difference | EMA |
| --- | ---: | ---: | ---: | ---: |
| 0ms | 0mm | 3/3 | 3/3 | 3/3 |
| 0ms | 3mm | 3/3 | 0/3 | 0/3 |
| 0ms | 10mm | 1/3 | 0/3 | 0/3 |
| 80ms | 0mm | 0/3 | 0/3 | 0/3 |
| 80ms | 3mm | 0/3 | 0/3 | 0/3 |
| 80ms | 10mm | 0/3 | 0/3 | 0/3 |

Thirteen rollouts pass overall. This small, fixed-scene matrix is not a robot generalization success rate.

## Two results that need their full context

**Smoothing reduces some estimation noise.** With zero delay and 10mm noise, mean velocity-estimation RMSE across seeds falls from 0.9553m/s for differences to 0.2471m/s for EMA. Tail position RMS falls from 21.89mm to 10.01mm. Both still pass 0/3: an acceptable position RMS does not imply that position and speed meet both thresholds at every step.

**Smoothing can worsen delayed control.** With 80ms delay and no noise, tail position RMS is 30.32mm for differences and 93.66mm for EMA. At 3mm noise, it is 26.00mm versus 123.31mm. Smoothing adds dynamic lag on top of observation delay. The protocol did not scan τ or retune gains, so this establishes degradation for these parameters, not that all filters fail.

![Tail position RMS for finite differences and EMA across delay/noise conditions](/img/research/20261009/velocity-en.svg)

Velocity RMSE compares the estimate with true velocity **at capture time**. The oracle is zero by construction on this metric, yet its velocity may already be 80ms old. Even noiseless, undelayed finite differences have approximation error: displacement divided by an interval is an average velocity, not the instantaneous endpoint value.

## Reproduce and diagnose

```sh
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 1931effc42f9d5974f20c09614dc2ebbdfcbf44b
python -m venv .venv
# Windows: .venv/Scripts/activate; Linux/macOS: source .venv/bin/activate
python -m pip install -r requirements-lock.txt
python -m unittest discover -s experiments/planar_velocity_estimation -p "test_*.py"
python experiments/planar_velocity_estimation/run.py --out outputs/velocity-my-run
python experiments/planar_velocity_estimation/audit.py outputs/velocity-my-run
```

The tested environment is Windows, Python 3.12.14, MuJoCo 3.3.7 and NumPy 2.2.6. Other operating systems were not retested. No rendering window, GPU, model key or paid service is required. Expect four estimator tests to pass, then 54 episodes, 108000 rows and 13 successes. The audit independently checks hashes, timestamps, estimates, force and acceptance.

`csv.gz` is lossless compression and can be read with Python's `gzip.open(..., 'rt')`. Use a separate output directory so archived evidence stays intact. If results differ, first check pinned dependencies and commit, then `capture_t`, estimated velocity, raw force and saturation. Do not start by relaxing acceptance thresholds. Persistent clipping suggests inspecting the derivative estimate; smooth oscillation near the target calls for inspecting sample age and estimator lag.

Exercise: hand-calculate differences and EMA for three samples around a sudden deceleration. Observe why EMA retains old velocity. A follow-up should separately scan sampling period, τ and controller gains while retaining every condition. This round does not complete VL01 or establish hardware safety. The next question is the closed-loop tradeoff, not simply choosing a more elaborate filter name.
