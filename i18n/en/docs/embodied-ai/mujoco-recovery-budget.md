---
title: "Embodied AI X: why can a recovery budget stop a recoverable task?"
description: "Twelve rollouts compare unlimited recovery, a two-resume cap and a 400 ms cooldown, separating bounded behavior from task completion."
slug: "/embodied-ai/mujoco-recovery-budget"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:recovery-budget", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-exit-actions", "doc:embodied-ai/mujoco-release-verification"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/experiments/vl01_exit_release_budget) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/evidence/exit-release-budget-20261003) · [Experiment record](/labs/recovery-budget)

The [recovery ablation](/docs/embodied-ai/mujoco-recovery-ablation) showed why smooth replanning alone does not explain repeated stops. This experiment adds a resume budget and minimum hold duration to the E5 fresh-observation gate.

More restrictions do not automatically produce more completed tasks. The recorded results expose that tradeoff.

## 1. Preserve the evidence gate

During transfer, capture age reaching 60 ms triggers hold. Resuming requires fresh, consecutive, good observations captured after the stop and spanning at least 100 ms. Bilateral contact, lift height and grasp distance must still pass.

Each resume replans from the measured hand position over 500 ms, followed by the existing lower/release/retreat sequence. A hold exceeding 800 ms aborts.

| Policy | Resume cap | Minimum hold |
|---|---:|---:|
| unlimited | No per-episode count cap | 0, evidence still required |
| budget-two | 2 | 0, evidence still required |
| budget-two-cooldown | 2 | 400 ms, evidence still required |

Unlimited still has a 12 s episode horizon and an 800 ms hold deadline. The budget counts admitted resumes, not received packets.

## 2. Four communication conditions

The matrix contains clean operation; a 4.6–4.84 s gap; periodic gaps from 4.3 s, dropping 140 ms of every 440 ms until 6.94 s; and permanent silence from 4.3 s. These faults alter communication, not physical state or capture timestamps.

Monitoring remains transfer-only. Faults are tied to absolute simulation time, so different waits affect motion progress and exposure. Twelve deterministic rollouts do not establish a whole-task pure budget effect or randomized success rate.

## 3. Outcomes

| Condition | Unlimited | Cap 2 | Cap 2 + cooldown |
|---|---|---|---|
| Clean | 0 resumes, pass | 0, pass | 0, pass |
| Single gap | 1, pass | 1, pass | 1, pass |
| Repeated gaps | 6, pass | 2, budget abort | 2, budget abort |
| Permanent gap | 0, deadline abort | Same | Same |

The unlimited policy eventually places the cube despite repeated interruptions. Both capped policies obey their resource rule but abort with the cube still held. Bounded behavior and successful task completion are separate metrics.

<img src="/media/practice/recovery-budget.png" alt="Hold, resume and abort events under repeated gaps for three budget policies" width="1500" height="600" loading="lazy" />

## 4. Cooldown does not guarantee future stability

The first hold occurs at 4.342 s. Without cooldown, recovery occurs at 4.542 s; with cooldown, at 4.742 s. The next stale-observation stop arrives at 4.782 s, only 40 ms later.

Waiting 400 ms proves a past waiting duration. It does not predict a future healthy interval. The capture age and prior observation window were valid at resume, but the next scheduled gap was close. Longer health windows or link-quality estimates need separate frozen comparisons, not post-hoc tuning to improve the chart.

## 5. Order the constraints explicitly

The base gate checks its 800 ms deadline first. Once recovery evidence qualifies, the subclass rejects an exhausted budget, waits for minimum hold time if necessary, or admits the resume:

```python
if resumes >= cap:
    abort("budget")
elif now - hold_tick < cooldown:
    keep_waiting()
else:
    resume_after_revalidation()
```

Budget abort keeps the held target. It does not automatically incorporate the [E8 opening exit](/docs/embodied-ai/mujoco-exit-actions), which would introduce another explanation for changed placement outcomes. Combining individually tested modules requires a new integration test.

## 6. Verification and limits

Sixteen tests cover contract boundaries and evidence-tampering rejection. The independent audit covers 96 records from 32 rollouts and 11 source fingerprints, checking E10 resume counts, post-hold observation windows, freshness, cooldown and deadlines.

This is neither an independent physics-force recomputation nor a formal safety proof. No hardware braking, variable loads, realistic sensor-error distribution or cross-scene performance was evaluated. VL01 and full M4/M5 remain open.

```sh
python experiments/vl01_exit_release_budget/run.py --out evidence/my-budget-series
python experiments/vl01_exit_release_budget/audit.py evidence/my-budget-series
```

Predict the outcome of a zero resume budget, or a cooldown longer than the hold deadline, before reading the corresponding tests. These boundaries explain more than a generic retry counter alone.

## Read this series

- [Embodied AI VIII: what should the gripper do after a drop alarm?](/docs/embodied-ai/mujoco-exit-actions)
- [Embodied AI IX: a release command is not verified placement](/docs/embodied-ai/mujoco-release-verification)
