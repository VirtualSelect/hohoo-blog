---
title: "MuJoCo observation loss: zero force is not a stop"
description: "Compare stale feedback, zero force and fading in 27 episodes to distinguish timeout from physical braking."
slug: "/embodied-ai/mujoco-stale-force"
status: "published"
published_at: "2026-10-11"
updated: 2026-11-13
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-controller-holdout"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

<span id="published-correction"></span>

> **Correction published · 2026-11-13.** [Pinned source and run instructions](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/335e756bb7e86ded9128b7c9b978636a4069fa61/experiments/planar_reliability) are now available. Statements below about a local branch or unpublished code describe the 2026-11-12 review snapshot. Historical checkout commands still reproduce the original archive, not this correction. From the companion repository root, run `git checkout 335e756bb7e86ded9128b7c9b978636a4069fa61`, then follow the linked directory README and use a new output directory. Historical results and AI-assistance disclosures are unchanged.

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [Archived evidence](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [Study protocol](/labs/planar-reliability)

Communication stops while the controller continues using its last position and velocity estimate. Does commanding zero force constitute a safe stop? In this frictionless planar model, **zero force means no further acceleration, not zero velocity**.

Using the development-selected parameters, this experiment compares three stale-observation policies. MuJoCo advances every physical state; nothing teleports the actuator or clears its velocity to manufacture a stop.

## Which clock detects staleness?

Each sample carries capture time and becomes usable only after arrival. Age is decision time minus capture time. Reusing the same sample cannot refresh its age.

```text
sample -> 40 ms delay queue -> arrived observation -> estimate/control
                                    |
                           now minus capture time
```

Delay is 40 ms, position noise 3 mm, control period 20 ms and physics step 2 ms. Policies activate strictly above 100 ms; the exact boundary remains normal control. Conditions are normal delivery, dropped captures from 0.4 to 1.0 seconds, and permanent loss after 0.4 seconds. Three seeds, conditions and policies give 27 episodes.

Noise is drawn even for dropped samples, then discarded. This preserves matching random-number consumption across policies and dropout conditions.

## Three policies change different commands

| Policy | Age at most 100 ms | Older observation |
| --- | --- | --- |
| hold | PD and force clipping | Continue PD from last observation |
| zero | PD and force clipping | Command zero force |
| fade | PD and force clipping | Fade clipped force until observation age reaches 200 ms |

The 200 ms is still measured **from sample capture**, not another 200 ms after detecting staleness. Above age 100 ms, multiply clipped force by `max(0, (0.200-age)/0.100)`: the fading interval is ages 100–200 ms. Floating-point arithmetic can leave a residual around `1e-15 N` at the boundary; use a tolerance rather than `fx == 0` to locate fade's endpoint.

Hold does not hold the current physical position: it keeps a stale control computation. The actuator moves while the observed error remains fixed, potentially driving sustained acceleration.

Zero and fade are not closed-loop braking. They add no fresh speed information, friction or brake model. The implementation never clears `qvel` to obtain a stationary picture.

## Temporary loss and permanent loss differ

The following values average final-300ms position RMS over three seeds, in millimetres:

| Communication | hold | zero | fade |
| --- | ---: | ---: | ---: |
| Normal | 2.04 | 2.04 | 2.04 |
| Burst loss, 0.4–1.0 s | 2.02 | 2.06 | 2.05 |
| Permanent loss after 0.4 s | **16,025.96** | 2,748.98 | 2,370.92 |

![Recorded physical position following permanent observation loss](/img/research/20261011/stale-force.svg)

Normal results match because age never triggers the policies. After temporary loss, new observations allow low terminal position error again; terminal averages do not describe the intermediate path.

With permanent loss, hold keeps pushing, zero permits momentum-driven coasting, and fade changes force withdrawal without guaranteeing braking. None of the 27 episodes passes the full position-and-speed contract, including normal episodes with small position error. There is no safety winner in this table.

## Why retain such a simple counterexample?

Sending a zero command, stopping controller software, entering actuator braking mode and confirming a stationary object are different events. Verifying only the first cannot justify the fourth. Hardware systems also require actuator semantics, watchdogs, gravity/contact handling, brakes and appropriate safety validation; none is present here.

The 100/200 ms thresholds are teaching parameters, not safety standards. Mass, initial velocity, target and failure phase alter displacement. Testing one loss onset cannot establish a worst-case stopping distance.

### Read the trace

Do not search the entire trace for its first zero force: before the first observation arrives, both force and velocity are already zero. Select permanent loss under the zero policy, then find the first **control row with a valid captured sample whose age exceeds the limit**, and only then inspect force and velocity.

CSV `t` is recorded after the physics step. That row's command was decided at the beginning of the step, so decision time is `t - 0.002`. Check age only on `control_tick=1` rows; do not use post-step state time as decision time.

Run this read-only Python 3.12 snippet from the article's pinned repository root. It needs neither MuJoCo nor a new simulation:

```python
import csv
import gzip
import json
from pathlib import Path

root = Path("evidence/planar-reliability-20261011")
protocol = json.loads((root / "manifest.json").read_text(encoding="utf-8"))["protocol"]
records = json.loads((root / "results.json").read_text(encoding="utf-8"))
record = next(r for r in records if r["section"] == "dropout"
              and r["dropout"] == "permanent"
              and r["policy"] == "zero" and r["seed"] == 73)
with gzip.open(root / record["trace"], "rt", encoding="utf-8") as stream:
    rows = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(stream)]
dt = protocol["timestep"]
stale = next(r for r in rows if r["control_tick"] == 1
             and r["capture_t"] >= 0
             and r["t"] - dt - r["capture_t"] > protocol["fresh_limit"] + 1e-9)
later = rows[rows.index(stale) + round(0.1 / dt)]
for label, row in (("startup", rows[0]), ("stale", stale), ("later", later)):
    print(label, row["t"], row["fx"], row["vx"])
```

This selects `111.csv.gz` and prints startup, the first stale control, and another 100 ms later. The table rounds `vx` to six decimal places:

| CSV t/s | fx/N | vx/(m/s) |
| ---: | ---: | ---: |
| 0.002 | 0 | 0 |
| 0.502 | 0 | 0.853823 |
| 0.602 | 0 | 0.853823 |

The last sample was captured at 0.380 s. At decision time 0.480 s its age is exactly 100 ms, so the policy has not triggered. The 0.500 s decision reaches 120 ms, recorded after the step at 0.502 s. Force becomes zero while velocity stays nonzero: that is the intended counterexample. The original independent audit also checks `F=m*a` from physical rows. If your trajectory stops instantly, check for additional damping or cleared state rather than substituting startup's zero velocity for the post-loss result.

For burst loss under fade, inspect capture times after recovery: receiving an old sample again is not fresh sensing. A future braking design must specify available observations and actuator capabilities rather than secretly reading simulator truth to replace missing sensors.

## Before changing configuration, check what actually executes

The pinned revision reproduces the original frozen protocol. It records `fresh_limit/fade_end` in JSON while the controller still uses fixed 100/200 ms boundaries. Physics timestep, actuator limits, position/speed acceptance and development conditions have similar mismatches. The original defaults match these constants, so the published tables remain valid. **Editing protocol.json at that revision alone does not reliably change the experiment.**

The local runner, controller and independent audit now apply these settings to execution and acceptance, rejecting incompatible timestep combinations before running. Replaying the default 153 episodes produced identical results and all decompressed CSV traces. This correction is not published; the fixed links above and commands below still reference the historical version. New threshold studies require matching corrected code and a new output directory. Do not rewrite the old manifest or treat regression fixtures as research outcomes.

## Reproduce the protocol

Run from a fresh checkout in PowerShell. The output directory must not exist. All three articles in this study share one frozen protocol; run it once and inspect the section relevant to each article.

```powershell
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 1d1faab57e20b352761e9abc736c6d277b505e6b
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r requirements-lock.txt
& $py -m unittest discover -s experiments/planar_reliability -p "test_*.py"
& $py experiments/planar_reliability/run.py --out outputs/reliability-my-run
& $py experiments/planar_reliability/audit.py outputs/reliability-my-run
```

Tested on Windows with Python 3.12.14 + MuJoCo 3.3.7 + NumPy 2.2.6; 3 unit tests, 153 episodes and 306000 rows. The independent audit should print `PASS`. Other operating systems have not been rechecked. To inspect the archived result without rerunning the experiment, pass `evidence/planar-reliability-20261011` to the same audit command. Source hashes normalize LF; evidence hashes use original bytes. Do not rewrite the manifest to conceal a mismatch.

If an import fails, verify that installation and execution use the same `$py`. Preserve failed outputs and choose a new directory for reruns. Seconds here refer to simulation time, not the computer's wall-clock execution time; check physical trajectories against the frozen protocol and numerical tolerances.

Code and writing are AI-assisted; the findings are limited to the archived, auditable runs. No new paid model requests were made, and this does not claim author-performed manual review.
