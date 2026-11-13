---
title: "MuJoCo controller tuning: best candidate is not a passing controller"
description: "Select on 54 development episodes, then check position error and stable completion on 36 held-out episodes."
slug: "/embodied-ai/mujoco-controller-holdout"
status: "published"
published_at: "2026-10-11"
updated: "2026-11-12"
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-velocity-estimation"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [Archived evidence](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [Study protocol](/labs/planar-reliability)

EMA reduced finite-difference noise in the previous study, yet worsened delayed control. Declaring filtering inherently bad would be premature: filtering changes dynamics while the gains remained fixed. Here, smoothing time and PD gains are selected together, then evaluated on seeds and conditions excluded from selection.

This is actual MuJoCo simulation of a planar force-controlled actuator, not an arm, camera, ROS2 system or physical robot. Observed position drives control; true velocity is reserved for offline acceptance.

## A pleasing trajectory is not a selection protocol

The controller applies `F=kp*(goal-observed_position)-kd*estimated_velocity`, clipped to ±5 N per axis. Smaller kp can reduce overshoot but slow movement. Changing kd changes both damping and sensitivity to velocity-estimation noise. A larger EMA time constant smooths more while adding lag.

Instead of picking an attractive trajectory afterward, the frozen rule minimizes mean final-300ms position RMS on development seeds, with kp/kd/tau as deterministic tie-breakers. The selection metric is deliberately distinct from the complete success contract.

```text
18 parameter sets x 3 development seeds -> frozen selection rule
                                              |
                3 new seeds x 6 conditions, compared with old baseline
```

## What was selected?

kp takes 20/40/80, kd 8/18 and tau 20/60/120 ms. Development conditions use 80 ms observation delay, 3 mm position noise and seeds 7/19/41. Episodes last four seconds with 2 ms physics and 20 ms control.

The selected combination is **kp=20, kd=8, tau=20 ms**, compared with the previous 80/18/60 ms baseline. Several parameters changed together, so improvement cannot be credited to one parameter alone.

Crucially, **none of the 54 development episodes passed the complete terminal contract**. The rule still chooses a lower-position-error candidate. “Best candidate” is not synonymous with “successful controller,” and acceptance thresholds were not relaxed.

The score first computes tail-position RMS within each episode, then averages the three development seeds for one candidate. It is not one pooled RMS over every physical step. The selected development score is 1.888 mm; the 3.61 mm holdout mean below comes from different data.

## Holdout improvement has limits

Holdout seeds 73/97/131 combine delays 0/80 ms and noise 0/3/10 mm. Each controller runs 18 episodes, 36 total.

| Parameters | Holdout passes | Mean episode tail-position RMS |
| --- | ---: | ---: |
| Previous baseline | 3/18 | 54.70 mm |
| Development-selected | 7/18 | 3.61 mm |

Split the total by condition: six of the selected controller's seven passes occur without position noise. Among the twelve noisy holdout episodes, the baseline passes 0/12 and the selected controller 1/12. Lower position error does not establish stable completion under noisy observations.

<details><summary>Inspect all six holdout conditions</summary>

| Delay / position-noise σ | Baseline passes | Selected passes |
| --- | ---: | ---: |
| 0ms / 0mm | 3/3 | 3/3 |
| 0ms / 3mm | 0/3 | 1/3 |
| 0ms / 10mm | 0/3 | 0/3 |
| 80ms / 0mm | 0/3 | 3/3 |
| 80ms / 3mm | 0/3 | 0/3 |
| 80ms / 10mm | 0/3 | 0/3 |

Each cell retains the three original episodes with seeds 73/97/131. For the same controller and delay, the three decompressed CSVs at σ=0 are byte-identical: changing the seed introduces no disturbance. The selected controller's noiseless 6/6 therefore repeats two deterministic conditions three times each, not six independent random successes. The original 7/18 remains a count of recorded episodes.

</details>

![Development sweep and held-out position-error comparison](/img/research/20261011/controller-holdout.svg)

These are a small fixed seed set and one target family, not a robot generalization success rate. Despite a 3.61 mm mean, eleven selected-controller episodes fail the full criterion: every physical step in the final 300 ms must have distance below 15 mm and speed below 0.04 m/s.

Control does not read true velocity. EMA uses capture-time differences, and only arrived samples update control. Independent auditing reconstructs estimates, forces and acceptance from CSV, and checks `delta_v=F*delta_t/m` in this contact-free, undamped model.

## What explanation is justified?

The comparison supports retuning the controller/filter/delay combination. It does not establish universally better low gains or a universally correct 20 ms filter. No single-variable ablation assigns contributions to kp, kd and tau. Development and holdout share the same simulator model; mass, actuator mismatch, friction and complex targets remain outside this selection test.

The next articles change communication and mass without selecting new gains on those outcomes.

### Exercise and troubleshooting

Predict two results first: can development data alone recover 20/8/20 ms? Once noiseless repetitions are separated, does 7/18 establish noise robustness?

With the revision identified by the setup guide prepared, run this read-only Python 3.12 snippet from the embodied repository root. It reads existing JSON using only the standard library, without installing MuJoCo or rerunning simulation. It checks each candidate's development seeds; selection never reads holdout episodes.

```python
import itertools
import json
import math
from pathlib import Path
from statistics import fmean

root = Path('evidence/planar-reliability-20261011')
rows = json.loads((root / 'results.json').read_text(encoding='utf-8'))
p = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))['protocol']
selection = json.loads((root / 'selection.json').read_text(encoding='utf-8'))
tuning = [r for r in rows if r['section'] == 'tuning']
scores = []
for params in itertools.product(p['kp'], p['kd'], p['tau']):
    group = [r for r in tuning if (r['kp'], r['kd'], r['tau']) == params]
    assert len(group) == len(p['dev_seeds'])
    assert {r['seed'] for r in group} == set(p['dev_seeds'])
    scores.append((fmean(r['tail_rms_m'] for r in group), *params))
score, kp, kd, tau = min(scores)
assert {'kp': kp, 'kd': kd, 'tau': tau} == selection['selected']
assert math.isclose(score, selection['dev_score_m'], rel_tol=0, abs_tol=1e-12)
print('selected', kp, kd, tau, 'score_mm', f'{score * 1000:.3f}')
print('tuning', len(tuning), 'passed', sum(r['success'] for r in tuning))
for method in ('baseline', 'selected'):
    noisy = [r for r in rows if r['section'] == 'holdout' and r['method'] == method and r['noise'] > 0]
    assert {r['seed'] for r in noisy}.isdisjoint(p['dev_seeds'])
    print('noisy_holdout', method, sum(r['success'] for r in noisy), '/', len(noisy))
```

Expected output uses seconds for tau and mm for score:

```text
selected 20 8 0.02 score_mm 1.888
tuning 54 passed 0
noisy_holdout baseline 0 / 12
noisy_holdout selected 1 / 12
```

Then inspect the selected candidate's development episode `000.csv.gz` (seed 7): tail-position RMS is only 1.813 mm, but peak tail speed is 61.341 mm/s, above the 40 mm/s limit. This is a concrete counterexample to equating a better selection score with complete acceptance; no threshold is changed after seeing failure. Maximum position error in this window is also only 2.641 mm; the speed condition causes failure.

When recomputing from CSV, retain this study's original `t > 3.7 + 1e-9`: 150 post-step states from 3.702 to 4.000 s. The earlier delayed-feedback study includes the 3.7 s endpoint and uses 151 states. Changing that sampling convention changes RMS; it is not an exact replay of the original metric.

The snippet recomputes recorded summaries and grouping, not the row-by-row trajectory audit below. For mismatches, check the pin, development/holdout seeds and grouping before loosening thresholds. Lossless CSV retains every physical step; display curves cannot replace acceptance evidence.

## Reproduce the protocol

For a first reproduction, open the [pinned setup guide](#reading-content) above and run the whole block once. It creates a new directory at this revision, writes results to `outputs/my-run` and audits them. The three articles share one frozen protocol: run it once, then inspect each article's section of the evidence.

Once that revision and environment are prepared, run the original three checks separately from the repository root:

```powershell
& .\.venv\Scripts\python.exe -m unittest discover -s experiments/planar_reliability -p "test_*.py"
```

To inspect the existing archive, no new simulation is needed. With the matching revision and environment, run this read-only audit; expect `PASS`:

```powershell
& .\.venv\Scripts\python.exe experiments/planar_reliability/audit.py evidence/planar-reliability-20261011
```

Tested on Windows with Python 3.12.14 + MuJoCo 3.3.7 + NumPy 2.2.6; the original archive has 153 episodes and 306000 rows. Other operating systems were not retested. Source hashes normalize LF; evidence hashes use original bytes. Do not rewrite the manifest to conceal a mismatch. The review note above explains this revision's protocol limitations. The local correction is unpublished; passing the original audit does not validate arbitrary configuration changes.

For import failures, check that installation and execution both use this checkout's `.venv` interpreter. Preserve failed outputs and choose a new directory for reruns. Numeric comparisons use frozen tolerances; local timing is not a required speed threshold.

Code and writing are AI-assisted; the findings are limited to the archived, auditable runs. No new paid model requests were made, and this does not claim author-performed manual review.
