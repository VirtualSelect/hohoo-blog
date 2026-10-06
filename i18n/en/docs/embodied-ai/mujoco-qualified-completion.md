---
title: "Embodied AI practice (14): does landing in the bin mean the task is complete?"
description: "Eight MuJoCo trajectories, three passive readouts and recorded-state replay separate historical placement, current evidence and qualified completion."
slug: "/embodied-ai/mujoco-qualified-completion"
status: "published"
published_at: "2026-10-05"
updated: "2026-10-06"
reading_minutes: 13
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:qualified-completion", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-phase-recovery", "doc:embodied-ai/mujoco-completion-lifecycle"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/9800095689ce3893f9e7a6ec681355e76c6fcff6/experiments/vl01_qualified_completion) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/9800095689ce3893f9e7a6ec681355e76c6fcff6/evidence/qualified-completion-20261005) · [Experiment record](/labs/qualified-completion)

The [phase-aware recovery study](/docs/embodied-ai/mujoco-phase-recovery) left a misleading final frame: the controller had aborted, yet the cube landed inside the bin. This study connects completion back to execution history and asks whether physical placement, current validity and authority to declare completion should share one boolean.

## Start with the discriminating case

Under the lowering/open-gripper fault, sustained physical placement is first confirmed at 6.102s. The controller aborts at 6.442s after its revalidation deadline. At twelve seconds the cube remains in the target, but the planned release was never executed normally.

```text
Historical physical placement: true
Current physical placement:    VALID
Qualified completion:          ABORTED, no completion timestamp
```

The physical observation is retained. It answers where the object ended up, whereas execution qualification answers how the task got there.

## Connect the modules: execution and completion run in parallel

```text
Approach → close → lift → transfer → lower → release
                    │       │         │
                    └── phase contracts ┘
                              ↓ fault
         hold → revalidate within budget → rebuild remaining path
                              └ exhausted → ABORTED → exit action

A separate observer runs each control tick:
received packet → freshness → physical placement → current validity
                               + release intent and no abort → qualification
```

This maps existing modules, not a newly implemented controller. E7 [phase contracts](/docs/embodied-ai/mujoco-phase-contracts) define what to check; E10 [recovery budgets](/docs/embodied-ai/mujoco-recovery-budget) bound waiting and attempts; E13 [phase recovery](/docs/embodied-ai/mujoco-phase-recovery) connects them. E14 observes passively and does not write actuator commands.

`ABORTED` is an execution terminal state. `VALID / INVALID / UNKNOWN` describe what current evidence supports. `completed_at` records history. Their different simultaneous values are meaningful, not contradictory.

<details><summary>Exercise: the cube remains in the bin, but the latest observation is stale. Success or failure?</summary>

The physical goal may remain satisfied, but the observer lacks fresh evidence: `UNKNOWN`, not continued `VALID` and not an assertion that the cube fell. Preserve historical `completed_at`. The downstream consumer must explicitly choose waiting, pausing or an exit procedure.

</details>

## Correction, 2026-10-06: contracts the implementation does not yet guarantee

Two reproducible boundaries are not covered by the original eight trajectories with zero transport delay:

1. **Expiry runs before the new packet is processed.** The E11 base checks the previous packet first. With 20ms sampling, a fixed 40ms delay and a 60ms age threshold, each incoming packet is fresh but the previous one expires just before receipt. The window repeatedly resets and sustained placement remains `VERIFYING`. Rejecting individual stale packets does not establish correct behavior for a delayed stream.
2. **Release is a boolean, not a timestamp.** E14 cannot reject a packet captured before release but received afterward. At 2ms/tick, release at tick 100 and a first capture at 90 received at 100 lead to completion at 230 with a last capture at 220. Only 120 ticks (240ms) of evidence are after release, below the required 125 ticks (250ms).

“Do not borrow pre-release evidence” is therefore an **intended contract**, not a universal guarantee of the pinned code. The original 7.102s / 7.302s observations remain valid for their recorded fixed scenarios. No trajectories were rewritten or new physical experiments run for this review. Reuse requires separate fixes for packet-processing order and release-time boundaries, plus delayed, duplicate, reordered and backward-time regressions—not just a larger threshold.

## Three observers, one physical trajectory

The experiment reuses E13 control and E11 [completion validity](/docs/embodied-ai/mujoco-completion-lifecycle). New observers are passive and cannot change actions.

| Observer | Requirements | After completion |
| --- | --- | --- |
| Latched physical | Observed lift and sustained placement | Retains the historical fact |
| Current physical | Same physical predicate and fresh evidence | Can become INVALID or UNKNOWN |
| Qualified current | Current physical evidence, normal release intent and non-aborted execution | Can lose validity; ABORTED is terminal |

There are **eight physical rollouts and three readouts per rollout**, not twenty-four independent trials. Historical placement is derived from whether the physical observer has ever been valid, avoiding another copy of the physical predicate.

## Release must follow actual execution

An absolute rule such as “released after 6.5s” breaks when recovery replans the remaining trajectory. Release intent is instead captured from the actual running action:

```python
if gate.state == 'running' and phase == 'release' and target[3] < .005:
    released = True
```

This is a command-level intent, **not hardware acknowledgement**. Contact and stability still require subsequent observations. Lift qualification also comes from received fresh packets rather than privileged simulation truth.

Abort overrides current qualification:

```python
if aborted or self.aborted:
    self.aborted = True
    self.start = None
    self.transition('ABORTED', now, 'controller-terminal')
    return
self.update(now, released, lifted, packet)
```

A past completion timestamp survives a later abort, but fresh positive observations cannot restore current qualification after termination. The lowering fault never qualified earlier, so its completion timestamp stays empty.

## Conditions and evidence windows

MuJoCo 3.3.7 advances each twelve-second rollout at 2ms. Observations arrive every 20ms; evidence expires at an age of 60ms or more. The required placement span is 250ms, which becomes 260ms between the first good sample and confirmation at this cadence.

Placement requires x/y within 45mm of the bin center, z within 6mm of 26mm, speed below 0.02m/s, bin-floor contact and no finger-pad contact. Final physical acceptance uses the last 500ms of physics; observers use received packets.

| Condition | Injection |
| --- | --- |
| Clean | None |
| Lowering gap | No packets from 5.6–5.84s |
| Lowering drop | Open-gripper command from 5.6–5.84s |
| Permanent lowering gap | No packets after 5.6s |
| Post-release push | 1N in x from 8–8.08s |
| Post-release silence | No packets from 8–8.4s |
| One false bad packet | Replace observed x with 0.5m at 8.202s; physics unchanged |
| Stale replay | Repeat the last pre-8s packet from 8–8.4s, retaining its capture time |

## What the final states distinguish

| Condition | Final physics | Historical placement | Current physical | Qualified current |
| --- | --- | --- | --- | --- |
| Clean | Pass | Yes | VALID | VALID |
| Lowering gap | Pass | Yes | VALID | VALID |
| Lowering drop | Pass | Yes | VALID | ABORTED |
| Permanent gap | Fail | No | UNKNOWN | ABORTED |
| Post-release push | Fail | Yes | INVALID | INVALID |
| Post-release silence | Pass | Yes | VALID | VALID |
| False bad packet | Pass | Yes | VALID | VALID |
| Stale replay | Pass | Yes | VALID | VALID |

<img src="/media/practice/qualified-completion.png" width="1500" height="600" loading="lazy" alt="Lowering-drop and post-release-push timelines distinguish current physical placement from qualified completion.">

Two mistakes are exposed separately. The drop case shows that current physical success does not establish normal task completion. The push case shows that historical completion does not establish current validity.

Clean physical completion occurs at 7.102s; qualified completion at 7.302s. These zero-transport-delay trajectories collect a new window after release intent; see the correction above for delayed observations. After a lowering-gap recovery, the corresponding times are 7.142s and 7.342s. This additional wait is a decision-rule effect, not slower robot motion.

## Identical endpoints can hide different histories

Post-release silence becomes UNKNOWN at 8.042s, starts collecting evidence at 8.402s and returns to VALID at 8.662s.

Stale replay produces the same transitions. Packets keep arriving, but old capture timestamps cannot extend evidence freshness.

The false bad packet produces INVALID at 8.202s, VERIFYING at 8.222s and VALID at 8.482s. The cube was never pushed: the rule is sensitive to a single erroneous observation. This remains an explicit limitation.

Keep both `completed_at` and `current_validity`. One preserves history; the other informs whether downstream actions may still rely on that result.

## Replay the stored states

<video src="/media/practice/qualified-completion-replay.mp4" controls preload="none" width="1440" height="384" poster="/media/practice/qualified-completion-poster.png" aria-label="Recorded-state replay of clean, lowering-drop and post-release-push scenarios">Download the replay from the evidence archive if video is unavailable.</video>

Left: clean. Center: lowering drop. Right: post-release push. These are **different fault scenarios**, not three policies under one identical fault. Labels show qualified state. Around 8.4s the frames display a valid normal outcome, accidental placement after abort and an invalidated previously completed outcome.

Rendering restores archived qpos, qvel and ctrl and calls `mj_forward`; it does not call `mj_step` or count as additional rollouts.

## Reproduction and audit

From the embodied repository root, using its existing environment:

```text
python -m unittest discover -s experiments/vl01_qualified_completion -p test_completion.py
python experiments/vl01_qualified_completion/run.py --out evidence/my-completion-run
python experiments/vl01_qualified_completion/audit.py evidence/my-completion-run
python experiments/vl01_qualified_completion/replay.py --evidence evidence/my-completion-run
```

The archive contains **48,000 control/observation rows and 4,800 replay states**, summaries, hashes and a frozen source revision. The independent audit reconstructs observer histories and final physical acceptance from raw CSV. Seven contract tests cover release prerequisites, sticky abort, historical preservation, missing evidence, false observations, replay and backwards time.

In `lower-drop/control.csv.gz`, compare `state_after`, `release_intent`, `current_physical` and `qualified`. They explain more than the summary's single placement flag.

## Remaining boundaries

Observers currently report state; they do not regrasp or retreat after a post-release invalidation. Control may remain `running` while completion is INVALID. These state machines serve different responsibilities.

Noise tolerance needs a separately designed noisy-observation study. Command intent also needs an execution acknowledgement in a more realistic system. This fixed simulation does not establish hardware safety, general success rates or completion of the full VL01 milestone.

The next useful test is how downstream actions subscribe to validity changes and stop or replan when evidence expires. That tests whether the completion contract is actually used, beyond adding another success percentage.
