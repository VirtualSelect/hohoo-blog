---
title: "Delayed MuJoCo feedback: can an old observation predict now?"
description: "Twenty-four paired traces compare delay, position noise and constant-velocity prediction, retaining incomplete recoveries."
slug: "/embodied-ai/mujoco-delayed-feedback"
status: "published"
published_at: "2026-10-07"
updated: "2026-11-12"
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

### Find the first speed violation in the tail

Use the original archive's `19-observation.csv`: zero delay, 10 mm position noise, hold, seed 19. Predict first: why is `success` false if both final position and speed meet the limits?

Prepare the pinned revision identified in the setup guide above, then run this read-only snippet from the embodied repository root. It reads the existing CSV using only Python's standard library; no MuJoCo, NumPy or new simulation is needed. Use the audit command below for the complete archive check.

```python
import csv
import json
import math
from pathlib import Path

root = Path("evidence/planar-reach-20261007")
protocol = json.loads((root / "manifest.json").read_text(encoding="utf-8"))["protocol"]
records = json.loads((root / "results.json").read_text(encoding="utf-8"))
record = next(r for r in records if r["config"]["family"] == "observation"
              and r["config"]["mode"] == "hold" and r["config"]["delay"] == 0
              and r["config"]["noise"] == 0.01 and r["config"]["seed"] == 19)
with (root / record["file"]).open(encoding="utf-8", newline="") as stream:
    rows = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(stream)]
def distance(r):
    return math.hypot(r["x"] - protocol["goal"][0], r["y"] - protocol["goal"][1])
def speed(r):
    return math.hypot(r["vx"], r["vy"])
limits = protocol["success"]
tail = [r for r in rows if r["t"] >= protocol["duration"] - limits["last_seconds"] - 1e-9]
first = next(r for r in tail if distance(r) >= limits["distance_m"] or speed(r) >= limits["speed_m_s"])
print(record["file"])
for label, row in (("first_failure", first), ("last", rows[-1])):
    print(label, f'{row["t"]:.3f}', f'{distance(row) * 1000:.3f}', f'{speed(row) * 1000:.3f}')
print("tail", len(tail), "position_failures", sum(distance(r) >= limits["distance_m"] for r in tail),
      "speed_failures", sum(speed(r) >= limits["speed_m_s"] for r in tail))
```

It selects `19-observation.csv`. The last two printed values use mm and mm/s:

| Record | t/s | Position error/mm | Speed/(mm/s) |
| --- | ---: | ---: | ---: |
| First tail violation | 3.714 | 3.944 | 40.392 |
| Last row | 4.000 | 1.356 | 12.325 |

Both final values pass, but they cannot erase the speed violation at 3.714 s. Among 151 tail state samples, zero violate position and 24 violate speed. The code retains the original audit's `t >= 3.7 - 1e-9`, including both endpoints; 151 counts samples, while the interval remains 0.3 s. The time tolerance handles floating-point representation; the 15 mm and 40 mm/s limits remain unchanged.

This locates a recorded failure without requiring another simulation. Further delay changes need a new output directory, a separate protocol and all results retained.

Acceleration models, velocity noise, filtering, lower gains or age-based stopping are candidates for new paired experiments. None is already validated here. This planar system and predictor establish no hardware-safety or articulated-arm guarantee.

Published follow-ups now compare finite differences with EMA in [velocity estimation](/docs/embodied-ai/mujoco-velocity-estimation), then examine gains and filter settings in [development and holdout tuning](/docs/embodied-ai/mujoco-controller-holdout). Both retain failures and scope limits. Acceleration models and other new control policies still need separate validation.

## Reproduce from a clean checkout

For a first reproduction, open the [pinned setup guide](#reading-content) above and run the whole block once. It uses a Python 3.12 virtual environment, creates a new revision-specific directory, runs 36 episodes and audits `outputs/my-run`. The three articles explain different subsets of the same recording; do not clone or simulate again for each article.

If the matching revision and environment are already prepared, run this read-only archive audit from that repository root. The archive is also the source of the exercise above:

```powershell
& .\.venv\Scripts\python.exe experiments/planar_reach/audit.py evidence/planar-reach-20261007
```

After the setup guide has generated new results, this optional command plots them. It reads `outputs/my-run` and writes figures there; it is not a read-only archive check:

```powershell
& .\.venv\Scripts\python.exe experiments/planar_reach/plot.py outputs/my-run
```

Windows was exercised; Linux/macOS were not retested. No model key or paid service is needed. Use a new directory for another run and preserve existing results. The manifest's source commit precedes the evidence commit linked above; source hashes bind the executed files.
