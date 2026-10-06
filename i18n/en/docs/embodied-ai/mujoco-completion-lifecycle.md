---
title: "Embodied AI practice (11): placement completed, but is it still valid?"
description: "Seven MuJoCo rollouts and a paired replay separate historical completion from current validity, including false alarms and expiry boundaries."
slug: "/embodied-ai/mujoco-completion-lifecycle"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-07"
reading_minutes: 11
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:completion-lifecycle", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-release-verification", "doc:embodied-ai/mujoco-recovery-budget"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/cd26180e8560155d18c45d34a33dc9ef25bbcdf6/experiments/vl01_completion_lifecycle) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/cd26180e8560155d18c45d34a33dc9ef25bbcdf6/evidence/completion-lifecycle-20261003) · [Experiment record](/labs/completion-lifecycle)

The release-verification study exposed a concrete failure: a cube remains settled long enough to pass, then an external force pushes it outside the accepted region. Final placement fails, but the latched completion flag remains true.

The flag is not wrong about history. The error is interpreting “accepted once” as “valid now.” This study separates a one-time `completed_at` event from a continuously updated `state`. Seven real MuJoCo rollouts cover force, silence, stale replay and isolated faulty observations.

## 1. Watch two outcomes of the same action

The left rollout is clean. The right applies 1N along x from 8.0 to 8.08 seconds. Scene, action schedule and acceptance conditions are otherwise shared.

<video src="/media/practice/completion-replay.mp4" controls preload="none" width="1280" height="448" poster="/media/practice/completion-replay-poster.png" aria-label="Recorded MuJoCo states comparing clean and forced motion, with historical completion and current validity">Video is unavailable. The table and raw records below contain the same key results.</video>

The replay reads archived qpos, qvel and events, then calls `mj_forward` for rendering. It does not step physics or count as additional rollouts. `historical=True` means acceptance happened before; `current=VALID/INVALID` describes current evidence. There is no audio; all key findings are also in the table below.

Both rollouts first complete at **7.102 seconds**. The forced rollout revokes current validity at **8.022 seconds**, retaining its historical timestamp. Runs end at 12 seconds. The final half-second placement check passes for clean motion and fails after the force.

## 2. Why one boolean is insufficient

Five mutually exclusive states describe current evidence:

| State | Meaning | What it does not mean |
| --- | --- | --- |
| NOT_READY | Lift/release prerequisites are unmet | Verification has begun |
| UNKNOWN | Evidence is insufficiently fresh or valid | The cube is known to have fallen |
| INVALID | Fresh evidence violates placement conditions | Recovery is permanently impossible |
| VERIFYING | Good captures are accumulating | Completion is established |
| VALID | A sustained window passes and remains fresh | Success is guaranteed forever |

`completed_at` is separate and set once. Requalification never rewrites the first completion time. An upper layer can ask both when acceptance first happened and whether the result is currently eligible for handoff.

The observer does not automatically regrasp or recover. Revoking a status and selecting an action are separate responsibilities.

## 3. Specify geometry, contacts and time

Physics runs every 2ms, captures every 20ms, qualification requires at least 250ms, and evidence expires at an age of 60ms. Integer ticks make boundary behavior explicit.

A good capture places the cube within 0.045m of `(0.24, 0.12)` on each horizontal axis and within 0.006m of z=0.026m, with speed below 0.02m/s, `bin_floor` contact and no finger contacts. The cube must previously have risen above 0.1m and the action schedule must have entered release.

Capture gaps cannot exceed 20ms. Duplicates and out-of-order packets cannot refresh evidence. At 20ms cadence, a window of at least 250ms actually spans 260ms. VALID means these specific conditions pass; it is not general robot safety certification.

The original VL01 endpoint test checks the last half-second's position, speed, lift and lack of finger contact. The current observer additionally requires floor contact. Both outputs are retained separately; endpoint success is not an alias for the continuous state.

## 4. Check expiry before processing a new packet

Update order matters. Check the age of the previous capture before admitting a newly arrived one:

```python
if self.last is None or now - self.last >= self.age:
    self.start = None
    self.transition('UNKNOWN', now, 'no-fresh-evidence')
if packet is None:
    return
# Validate format; ignore duplicate, out-of-order or stale captures here.
if not placed(packet):
    self.start = None
    self.transition('INVALID', now, 'fresh-violation')
    return
```

A packet arriving exactly at the 60ms deadline must not erase the gap. It can start a new qualification interval, but cannot preserve the old one.

The boundary-gap case therefore records two events at 8.042 seconds: UNKNOWN followed by VERIFYING. The chart stores the final state per physics tick, so the zero-duration UNKNOWN transition has no visible width. The event list preserves it. Charts and event logs have different resolution.

## 5. Results of all seven conditions

Two observers process the same physical trajectory: seven rollouts, not fourteen. All first complete at 7.102 seconds. The old latched flag remains set afterward.

<img src="/media/practice/completion-lifecycle.png" alt="Current state timelines for seven conditions: force invalidates, silence and stale replay become unknown, then fresh evidence requalifies; all historical completions occur at 7.102 seconds" width="1500" height="600" loading="lazy" />

| Condition | Key transitions in seconds | Final placement |
| --- | --- | --- |
| Clean | VALID at 7.102 and stays valid | Pass |
| Force | INVALID at 8.022 | Fail |
| Silence during 8.0–8.4 | UNKNOWN 8.042 → VERIFYING 8.402 → VALID 8.662 | Pass |
| Repeated old good capture in that interval | Same as silence | Pass |
| One false bad capture | INVALID 8.002 → VERIFYING 8.022 → VALID 8.282 | Pass |
| One false good capture after force | VERIFYING 8.202 → INVALID 8.222; never requalifies | Fail |
| Arrival at the expiry boundary | UNKNOWN/VERIFYING 8.042 → VALID 8.302 | Pass |

Silence and stale replay behave identically: receiving packets does not establish fresh observation. A single false good report after the force starts verification but cannot restore validity on its own.

## 6. The important negative finding: false revocation

The false-bad condition leaves physics untouched and changes only the received x coordinate to 0.4m at 8.002 seconds. The real cube stays settled, but the immediate-revocation rule enters INVALID and does not regain VALID until 8.282 seconds.

That is the cost of conservative revocation. Showing only the successful force detection would hide it. Requalification uses a sustained window, while invalidation requires just one bad capture. The system resists an isolated false positive placement report, but not an isolated false alarm.

Revocation hysteresis or consecutive-violation checks are possible follow-ups. They must also measure additional detection delay after real motion. This run does not retune a threshold after observing results to conceal the tradeoff.

## 7. Keep physical evidence apart from sensor faults

Each rollout stores 2ms control/physical records, 20ms full qpos/qvel states and an event summary. Received packets are recorded separately from actual cube position, speed and contacts.

The independent audit does not import MuJoCo or the controller. It reads 21 per-rollout files, reconstructs states, completion time, endpoint acceptance and fault schedules, and checks source/raw-file hashes. It verifies five identical-physics pairs: clean versus four sensor-only variants, and force versus force plus a false good capture.

Nine state-boundary tests and three evidence tests pass. Evidence tests include rejecting a falsified state even after recomputing its file hash, and rejecting a missing experimental condition. Hashes establish consistency with bytes; independent recomputation checks aspects of the contents. Neither constitutes a formal proof about contact forces, all possible faults or real hardware.

## 8. Reproduce the run and audit

Use the existing embodied repository environment: Python 3.12, MuJoCo 3.3.7 and NumPy 2.2.6. From `hohoo-embodied-agent`:

```powershell
python experiments/vl01_completion_lifecycle/run.py --out evidence/MY-E11
python experiments/vl01_completion_lifecycle/audit.py evidence/MY-E11
$env:E11_EVIDENCE = (Resolve-Path evidence/MY-E11).Path
python -m unittest discover -s experiments/vl01_completion_lifecycle -p "test_*.py"
python experiments/vl01_completion_lifecycle/replay.py --evidence evidence/MY-E11
```

These are PowerShell commands; other shells need their equivalent environment-variable syntax. Rendering additionally uses the existing imageio/FFmpeg and Pillow packages. Numerical experiments do not require rendering. Without `E11_EVIDENCE`, the three evidence tests skip while nine state tests still run. Point the variable to an existing archive to audit it separately. Output directories must be new.

The distinction between advancing physics and updating derived state is described in the [official MuJoCo simulation documentation](https://mujoco.readthedocs.io/en/stable/programming/simulation.html). The replay uses the latter on stored states rather than rerunning a more attractive trajectory.

This completes a validity-lifecycle experiment, not full VL01, hardware safety, or the combination of exit actions and recovery budgets. The next stage can now require both the historical event and current evidence at handoff instead of relying on a success flag that never clears.

## Fix follow-up · 2026-10-07

2026-10-07 correction: incoming observations are handled before expiry at the same tick. E14 records release-intent time and excludes late packets captured before it. Twenty observer checks and reruns of the original E11/E14 protocols (7/8 episodes) passed, including independent audits. Historical evidence stays pinned to its original revision; this does not establish hardware safety or a complete milestone.

[Fixed code and regression commands](https://github.com/VirtualSelect/hohoo-embodied-agent/blob/907c10a8fb25e1cec242e335b1a52b21b122fdc6/REVIEW-FIXES-20261007.md).
