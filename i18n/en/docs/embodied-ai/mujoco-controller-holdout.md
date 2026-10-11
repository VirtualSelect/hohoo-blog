---
title: "MuJoCo controller tuning: best candidate is not a passing controller"
description: "Select on 54 development episodes, then check position error and stable completion on 36 held-out episodes."
slug: "/embodied-ai/mujoco-controller-holdout"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
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

## Holdout improvement has limits

Holdout seeds 73/97/131 combine delays 0/80 ms and noise 0/3/10 mm. Each controller runs 18 episodes, 36 total.

| Parameters | Holdout passes | Mean episode tail-position RMS |
| --- | ---: | ---: |
| Previous baseline | 3/18 | 54.70 mm |
| Development-selected | 7/18 | 3.61 mm |

![Development sweep and held-out position-error comparison](/img/research/20261011/controller-holdout.svg)

These are a small fixed seed set and one target family, not a robot generalization success rate. Despite a 3.61 mm mean, eleven selected-controller episodes fail the full criterion: every physical step in the final 300 ms must have distance below 15 mm and speed below 0.04 m/s.

Control does not read true velocity. EMA uses capture-time differences, and only arrived samples update control. Independent auditing reconstructs estimates, forces and acceptance from CSV, and checks `delta_v=F*delta_t/m` in this contact-free, undamped model.

## What explanation is justified?

The comparison supports retuning the controller/filter/delay combination. It does not establish universally better low gains or a universally correct 20 ms filter. No single-variable ablation assigns contributions to kp, kd and tau. Development and holdout share the same simulator model; mass, actuator mismatch, friction and complex targets remain outside this selection test.

The next articles change communication and mass without selecting new gains on those outcomes.

### Exercise and troubleshooting

Read `selection.json`, then recompute all eighteen means using only `section=tuning`. Do not mix in holdout results. Find an episode with small position RMS and `success=false`, and inspect its maximum tail speed: an average positional metric is not stable completion.

For mismatches, first check pinned versions, physical/control periods, seeds and grouping. Do not loosen thresholds. Compressed CSV preserves every physical step; a smoothed display curve cannot replace acceptance evidence.

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

If an import fails, verify that installation and execution use the same `$py`. Preserve failed outputs and choose a new directory for reruns. Numeric comparisons use the frozen tolerances; timing is a local measurement, not a required speed threshold.

Code and writing are AI-assisted; the findings are limited to the archived, auditable runs. No new paid model requests were made, and this does not claim author-performed manual review.
