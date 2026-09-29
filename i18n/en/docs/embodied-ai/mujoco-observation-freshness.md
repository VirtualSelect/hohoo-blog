---
title: "Embodied practice IV: messages arrive, but observations expire"
description: "45 MuJoCo rollouts separate sampling intervals, bad-sample counts and capture age, showing how old messages can hide grip loss and why duration thresholds still have limits."
slug: /embodied-ai/mujoco-observation-freshness
status: published
published_at: "2026-09-29"
updated: "2026-09-29"
reading_minutes: 14
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
provenance: experiment-result
related:
  [
    "doc:embodied-ai/mujoco-transfer-monitor",
    "doc:embodied-ai/mujoco-grasp-guard",
    "project:hohoo-embodied-agent",
    "lab:observation-freshness",
  ]
---

[The previous experiment](/docs/embodied-ai/mujoco-transfer-monitor) monitored contact during transfer and cancelled further motion after three consecutive bad observations. Two questions remained.

If observations arrive every 50 ms instead of every 20 ms, does “three” still express the same tolerance? If messages keep reporting good contact, but they all repeat an old measurement, should the controller trust them?

This follow-up ran **45 MuJoCo rollouts**. With the same three-sample threshold, the measured alarm delay changed from 22 to 102 ms. Replaying an old good packet prevented both contact-only policies from alarming. Checking capture age exposed the stale evidence.

[Code](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/53cc6cbf3fbb3b734b8c5dddfc7e4f0dbddf3f86/experiments/vl01_observation_freshness) · [Raw records and audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/53cc6cbf3fbb3b734b8c5dddfc7e4f0dbddf3f86/evidence/freshness-20260929) · [Lab record](/labs/observation-freshness)

## 1. Start with a recorded failure

These rows come from the 20 ms replay-good condition. Forced opening begins at simulation time 4.800 s, while the transport continues delivering the old packet. Seconds below are recorded ticks multiplied by 0.002.

| Receipt time | Sequence | Capture time | Packet says bilateral contact | Physical bilateral contact | Age   |
| ------------ | -------- | ------------ | ----------------------------- | -------------------------- | ----- |
| 4.782 s      | 239      | 4.782 s      | Yes                           | Yes                        | 0 ms  |
| 4.802 s      | 239      | 4.782 s      | Yes                           | No                         | 20 ms |
| 4.822 s      | 239      | 4.782 s      | Yes                           | No                         | 40 ms |
| 4.842 s      | 239      | 4.782 s      | Yes                           | No                         | 60 ms |

Messages continue and their contents never become “bad.” **Time advances, but the evidence supporting good contact remains at 4.782 s.**

Neither the sample-count rule nor the bad-duration rule sees a bad contact observation. The freshness-aware policy alarms on the last row, with cause `stale`, not `contact`.

An age alarm establishes that there is no sufficiently recent evidence to justify continuing. It does not, by itself, establish that the cube fell. Here, actual loss is supported by a separate physical record.

## 2. Separate sampling, receipt and control

The scene, zero pickup bias, gripper, schedule and pre-transfer gate remain unchanged. Every rollout passes that gate.

| Time scale                | Setting         | Responsibility                                                   |
| ------------------------- | --------------- | ---------------------------------------------------------------- |
| Physics and control       | 2 ms            | Advance physics, process input, check age, issue the next target |
| Observation packet period | 10 / 20 / 50 ms | Produce a new contact observation                                |
| Regular state record      | 20 ms           | Save positions, velocities and controls                          |
| Transfer decision record  | 2 ms            | Save receipt events, age, counters and alarms                    |

Freshness must also be checked when no message arrives. A check implemented only inside the receive callback cannot run during complete silence. This experiment checks on each control step; it does not establish real-time scheduling guarantees for an operating system.

The experiment uses one simulation clock and compares integer ticks. MuJoCo exposes time, physical state and control input separately, allowing commands and outcomes to be recorded separately. [MuJoCo 3.3.7 state and control](https://mujoco.readthedocs.io/en/3.3.7/programming/simulation.html#state-and-control)

## 3. Three policies, adding one constraint at a time

| Policy    | Decision                                                                 | Added constraint                           |
| --------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| count3    | Three consecutive unique bad observations                                | Baseline                                   |
| elapsed40 | First-to-last capture span of consecutive bad observations reaches 40 ms | Express tolerance as time                  |
| fresh60   | elapsed40 plus an alarm when the latest capture reaches age 60 ms        | Old good messages are not current evidence |

All policies accept a packet only when both its sequence and capture tick advance. Duplicate delivery neither increments the bad counter nor refreshes capture time. A new good observation resets bad evidence; an alarm remains latched.

elapsed40 is not a timer started by one bad observation. It requires another new bad observation to establish the elapsed span. If delivery stops, waiting cannot manufacture evidence of continuing bad contact. fresh60 adds a separate age check for this unknown state.

The age branch is:

```python
# now and capture_tick share the simulation clock; one tick = 2 ms
age_ticks = now - latest["capture_tick"]

# A new packet updates latest before this check
if policy == "fresh60" and age_ticks >= 30:
    alarm = True
    cause = "stale"
```

The complete implementation also handles no initial observation, duplicate and reordered packets, future timestamps and phase transitions. This excerpt is not a replacement for the complete monitor. The 60 ms value is an experiment parameter, not a validated hardware safety limit.

## 4. What changes across 45 rollouts?

The matrix is three observation periods × five input conditions × three policies. There is **one deterministic rollout per cell**, with no randomization, confidence interval or probabilistic success-rate claim.

| Condition   | Physical input                        | Delivered observation                                 |
| ----------- | ------------------------------------- | ----------------------------------------------------- |
| clean       | None                                  | Normal updates                                        |
| empty-40ms  | None                                  | Due packets report empty contact during [4.8, 4.84) s |
| forced-open | Open the fingers during [4.8, 5.04) s | Actual simulated contact                              |
| replay-good | Same forced opening                   | Repeat the last old good packet from 4.8 s onward     |
| silence     | Same forced opening                   | Stop delivering packets from 4.8 s onward             |

An empty report is incorrect content; silence is no delivery; replay is delivery without new information. They are different failure modes.

Fault intervals use pre-step time; the first corresponding post-step record is at 4.802 s. Transport faults persist until the rollout ends; forced opening lasts only 0.24 s. The controller does not teleport the cube.

After an alarm, it holds the last commanded target for 0.6 s and ends the rollout. Physics continues. There is no regrasp, frozen state or hardware emergency-stop claim.

## 5. Three observations do not mean a fixed wait

With forced opening and normally delivered contact observations, the measured times from fault onset at 4.800 s are:

| Observation period | count3 | elapsed40 | fresh60 |
| ------------------ | ------ | --------- | ------- |
| 10 ms              | 22 ms  | 42 ms     | 42 ms   |
| 20 ms              | 42 ms  | 42 ms     | 42 ms   |
| 50 ms              | 102 ms | 52 ms     | 52 ms   |

![Measured alarm delays at three observation periods, with a fixed fault phase](/media/practice/freshness-sampling-delay.png)

Three samples span two sampling intervals: `(3 - 1) × period`. Add the 2 ms from this fault onset to the first sample to obtain 22, 42 and 102 ms.

For elapsed40, periods of 10 and 20 ms provide another bad observation exactly 40 ms after the first. With a 50 ms period, the next observation arrives after 50 ms. Add the same initial 2 ms.

**A duration threshold reduces the coupling to sample rate but does not remove sampling quantization.** These are not worst-case delays over arbitrary fault phases. Phase, scheduling jitter and network delay were not swept.

## 6. Faster sampling can change false cancellation

For the 40 ms empty-report condition, only **count3 at a 10 ms period** falsely cancelled transfer. The other eight cells completed placement.

```text
10 ms period: bad observations at 4.802, 4.812, 4.822, 4.832
20 ms period: bad observations at 4.802, 4.822
50 ms period: bad observation at 4.802
```

The first condition reaches three bad samples. The same duration of erroneous reports does not accumulate three at either slower rate. For elapsed40, the longest bad capture span is 30 ms; the next observation is good, so no alarm occurs.

This does not make slower sampling safer. It can also delay real failure detection. A fixed sample count implicitly changes the tolerated duration when the sensor rate changes.

## 7. Why does slow sampling trigger the age alarm sooner?

For replay-good and silence, count3 and elapsed40 never alarm. fresh60 produces the following identical timings in both transport conditions:

| Period | Last unique capture | Alarm at age 60 ms | Delay from fault onset |
| ------ | ------------------- | ------------------ | ---------------------- |
| 10 ms  | 4.792 s             | 4.852 s            | 52 ms                  |
| 20 ms  | 4.782 s             | 4.842 s            | 42 ms                  |
| 50 ms  | 4.752 s             | 4.812 s            | 12 ms                  |

At the 50 ms period, the observation is already 48 ms old when the fault begins. Only 12 ms remain before the age limit. This is not superior detection of a falling object.

Report **fault time, last capture time and alarm time together**. Comparing only the final column would confuse sample phase with policy capability.

![Packets continue to report good contact after physical contact disappears, while their capture age increases](/media/practice/freshness-timeline.png)

The contact and age curves use the elapsed40 rollout. The vertical marker is the actual alarm in its paired fresh60 rollout; their recorded physical states match before the decision diverges. Shading denotes forced opening, not the end of the transport fault.

An age limit also needs to accommodate normal delivery. Here, a 60 ms limit leaves only 10 ms beyond the longest normal period of 50 ms. Real communication and scheduling jitter could consume that margin; this experiment does not test them.

## 8. Check the records independently

The auditor imports neither the runner nor the monitor. It reconstructs packet injection, identity, capture time, acceptance, bad-evidence span and age, then recomputes alarms and placement acceptance.

Actual checks passed:

- 45 independently audited rollouts, with no MuJoCo warnings.
- 45 policy pairs with identical saved physical-state prefixes before their first decision divergence.
- Nine complete clean trajectories identical to the previous successful baseline.
- 17 new boundary tests and the existing 24 tests.
- Byte hashes of 180 committed raw files matching the audit.

Every clean rollout completes placement. Every physically forced-open condition fails placement. Freshness changes whether execution continues with expired evidence; it does not recover the task.

These checks establish consistency of the implementation and records, not real-robot safety certification.

## 9. Reproduce, then define the next question

Use the repository's Python 3.12 environment, MuJoCo 3.3.7 and locked dependencies. The protocol was committed before execution; `manifest.json` records source versions and environment. No model API is needed.

```powershell
.venv/Scripts/python.exe -m unittest discover -s experiments/vl01_observation_freshness -p test_monitor.py -v
.venv/Scripts/python.exe experiments/vl01_observation_freshness/run.py --out outputs/my-freshness
.venv/Scripts/python.exe experiments/vl01_observation_freshness/audit.py outputs/my-freshness
.venv/Scripts/python.exe experiments/vl01_observation_freshness/render.py outputs/my-freshness
```

The output directory must not exist. See the [reproduction guide](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/53cc6cbf3fbb3b734b8c5dddfc7e4f0dbddf3f86/experiments/vl01_observation_freshness/README.md) and [per-rollout audit](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/53cc6cbf3fbb3b734b8c5dddfc7e4f0dbddf3f86/evidence/freshness-20260929/audit.json). `control.csv` records every transfer control decision; `trajectory.csv` and `states.jsonl` contain 50 Hz physical snapshots, not a complete 500 Hz state sequence. Plots read measured logs without rerunning physics and are not scene recordings.

The setup still uses privileged simulator state and one clock. It does not cover clock synchronization, sequence resets, forged fresh timestamps, real networks, vision, natural frictional slip or recovery. Monitoring covers transfer only.

Next, distinguish delayed-but-usable evidence from situations requiring a fresh observation, then define recovery conditions. A newly arriving message should not automatically resume an old action. This remains in the existing VL01 research backlog, not a published result.
