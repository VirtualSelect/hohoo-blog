---
title: "MuJoCo velocity estimation: smoother signals can mean worse control"
description: "54 actual simulation rollouts compare finite differences, EMA and an oracle reference across position noise and observation delay."
slug: "/embodied-ai/mujoco-velocity-estimation"
status: "published"
published_at: "2026-10-09"
updated: 2026-11-13
reading_minutes: 11
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-delayed-feedback", "doc:embodied-ai/mujoco-planar-pd"]
related: ["lab:mujoco-velocity-estimation", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-qualified-completion"]
---

<span id="published-correction"></span>

> **Correction published · 2026-11-13.** [Pinned source and run instructions](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/335e756bb7e86ded9128b7c9b978636a4069fa61/experiments/planar_velocity_estimation) are now available. Statements below about a local branch or unpublished code describe the 2026-11-12 review snapshot. Historical checkout commands still reproduce the original archive, not this correction. From the companion repository root, run `git checkout 335e756bb7e86ded9128b7c9b978636a4069fa61`, then follow the linked directory README and use a new output directory. Historical results and AI-assistance disclosures are unchanged.

> Reproduction correction, 2026-10-11: Git newline conversion in the original pinned commit `1931eff` changed the bytes of `results.json`, breaking its checkout-time hash audit. Links and checkout commands below now use the byte-preserving fix. The measurements, publication date and conclusions are unchanged.

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1c2f0198564c4b8ff7a62d74ae51d7a13e038b1f/experiments/planar_velocity_estimation) · [54 compressed trajectories](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1c2f0198564c4b8ff7a62d74ae51d7a13e038b1f/evidence/planar-velocity-20261009) · [Lab](/labs/mujoco-velocity-estimation)

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

For a first reproduction, open the [pinned setup guide](#reading-content) above and run the whole block once. It installs the environment in a new revision-specific directory, writes 54 episodes to `outputs/my-run` and audits them. There is no second clone or runner block here.

The pinned README's argument-free command defaults to overwriting evidence; even explicit `--out` accepts an existing directory in that revision. Do not omit the argument or reuse an output directory. The local entry requires `--out` and refuses existing directories, but is not published. The setup guide still checks out the historical pin. Once it is prepared, run the original four estimator checks separately from that repository root:

```powershell
& .\.venv\Scripts\python.exe -m unittest discover -s experiments/planar_velocity_estimation -p "test_*.py"
```

To inspect the existing archive, no new simulation is needed. With the matching revision and environment, run this read-only audit:

```powershell
& .\.venv\Scripts\python.exe experiments/planar_velocity_estimation/audit.py evidence/planar-velocity-20261009
```

The tested environment is Windows, Python 3.12.14, MuJoCo 3.3.7 and NumPy 2.2.6. Other operating systems were not retested. No rendering window, GPU, model key or paid service is required. Expect the original four tests to pass; the archive contains 54 episodes, 108000 rows and 13 successes. The audit checks hashes, timestamps, estimates, force and acceptance, but omits the additional physical checks discussed in the correction below.

`csv.gz` is lossless compression and can be read with Python's `gzip.open(..., 'rt')`. If results differ, first check pinned dependencies and commit, then `capture_t`, estimated velocity, raw force and saturation. Do not start by relaxing acceptance thresholds. Persistent clipping suggests inspecting the derivative estimate; smooth oscillation near the target calls for inspecting sample age and estimator lag.

### A protocol value must reach the physical state

In the pinned revision, `mass` does not update the MuJoCo body and the actuator retains the XML's 5 N limit. The old audit hard-codes some counts and acceptance values and never checks acceleration against the declared mass. A controlled regression with mass set to 2 kg produced exactly the 1 kg archive's trajectories, yet the old audit passed. **PASS covers only the checks that exist.** The original default is 1 kg, matching the XML, so the 54-episode table and findings above remain valid.

Check the first row of the original `00.csv.gz`: it starts from rest, takes a 2 ms step and applies 5 N on x, with no contact, gravity or damping. The expected increment is `Δvx = F × Δt / m`.

| Source of the first step | Declared mass/kg | Actual vx/(m/s) | From declared mass/(m/s) |
| --- | ---: | ---: | ---: |
| Original default archive | 1 | 0.010 | 0.010 |
| 2 kg configuration regression, before correction | 2 | 0.010 | 0.005 |
| 2 kg configuration regression, local correction | 2 | 0.005 | 0.005 |

The last two rows test the configuration interface; they are not part of the original 54 episodes or a new mass-transfer study. The local correction applies mass, physical timestep and actuator limits. Its independent audit also reconstructs capture-time truth, noise, velocity estimates and acceptance from the physical rows. It is not published; the commands above still use the historical pin. Additional external forces must be included in the dynamics before applying this check to another scene.

### Work through two velocity updates

These are **constructed arithmetic samples**, outside the 54 episodes above: `(t/ms, x/m) = (0, 0), (20, 0.04), (40, 0.04)`, y is always zero and τ=60 ms. Calculate the difference and EMA at 20 and 40 ms first. The first sample initializes EMA to zero, as in the implementation.

<details><summary>Check the finite differences and EMA</summary>

| Time/ms | x/m | Difference/(m/s) | EMA/(m/s) |
| --- | ---: | ---: | ---: |
| 0 | 0 | No previous sample | 0 |
| 20 | 0.04 | 2 | 0.566937 |
| 40 | 0.04 | 0 | 0.406228 |

Each update uses `α = 1 - exp(-20/60) ≈ 0.283469`. At 20 ms the result is `2α`; at 40 ms the difference is zero but `(1-α) × 2α` remains. The table rounds to six decimal places; do not round α during calculation. This example shows how filter state retains the previous difference. Stable physical motion still requires trajectory-based acceptance.

</details>

The proposed τ and controller-gain scan was later developed in [development and holdout tuning](/docs/embodied-ai/mujoco-controller-holdout). Sampling-rate changes still need a separate protocol and validation. These results do not complete VL01 or establish hardware safety.
