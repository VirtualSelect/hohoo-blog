---
title: "LLM experiment II: make the comparison valid before interpreting position"
description: A Java 8 protocol for paired blocks, request pacing, stopping rules and independent auditing, with 80 offline checks and a frozen 24-request plan.
slug: /llm/context-position-paired-protocol
status: published
published_at: '2026-09-29'
updated: '2026-09-29'
reading_minutes: 12
domain: llm
article_kind: case-study
difficulty: intermediate
related: ["doc:llm/context-position-experiment", "doc:llm/kv-cache", "project:hohoo-ai-lab", "lab:context-position"]
---

The [first context-position trial](/docs/llm/context-position-experiment) planned 48 requests but attempted 29, ending with three HTTP 429 responses. Its 26 normal responses met expectations, yet conditions had unequal numbers of observations.

Simply waiting and running it again would not resolve the design problem. This article asks: **how can the experiment enforce a budget, stop appropriately, and identify which observations can actually be compared?**

The deliverables are a Java implementation, frozen materials and a complete request plan. **80 offline assertions passed and the 24-job plan passed an independent audit. This version has not run a new live model comparison. No new model accuracy is reported; simulated transport responses are not observations of Agnes.**

[Code and reproduction](https://github.com/VirtualSelect/hohoo-ai-lab/tree/dae0b8c50cd786b1bced8686f265f7560430d4f1/experiments/02-context-position-paced) · [Full request plan](https://github.com/VirtualSelect/hohoo-ai-lab/tree/dae0b8c50cd786b1bced8686f265f7560430d4f1/experiments/02-context-position-paced/evidence/20260929-l1v2-offline/plan.json) · [Validation manifest](https://github.com/VirtualSelect/hohoo-ai-lab/tree/dae0b8c50cd786b1bced8686f265f7560430d4f1/experiments/02-context-position-paced/evidence/20260929-l1v2-offline/manifest.json)

## 1. Why can rate limiting compromise a comparison?

A position comparison should keep the question, evidence and scoring fixed. If successful beginning-position requests happen to contain easier cases than successful middle-position requests, comparing their raw accuracy mixes position with case difficulty.

The first trial shuffled all jobs globally. Early termination left authentic records, but not necessarily all conditions for the same case.

Randomization remains useful for distributing time effects. It does not eliminate the need to handle missing observations. The new design groups four conditions for one case and one length into a consecutive block:

```text
same case + same material length
    beginning → middle → end → absent
    four usable responses form a complete comparison block
```

“Usable” means the request and response protocol can be evaluated, **not that the answer is correct**. Wrong answers, abstentions and formatting errors must stay in the scores.

## 2. Freeze the new protocol

| Item        | Setting                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| Facts       | Three fictional projects with explicit handoff codes                              |
| Distractors | 60 / 240 lines using four fixed archive templates                                 |
| Conditions  | beginning / middle / end / absent                                                 |
| Budget      | 3 × 2 × 4 = 24 requests; no retries                                               |
| Model       | agnes-2.5-flash                                                                   |
| Parameters  | temperature=0; max_tokens=1024                                                    |
| Pacing      | At least 20 s after the previous attempt finishes                                 |
| Stop        | Immediately on 429/401/403; after two consecutive other request/protocol failures |
| Scoring     | Trim outer whitespace; exact code or UNKNOWN comparison                           |

Materials, sample count, ordering, output budget and pacing changed. Old and new observations therefore **must not be pooled as one homogeneous larger experiment**. Each protocol and evidence directory remains separate.

Twenty-four is a ceiling, not a target that overrides stopping rules. Unsent jobs remain unsent.

## 3. Longer material needs leakage checks first

Positive conditions contain the same N+1 lines, moving only the target fact:

| Condition | Zero-based target index |             N=60 |            N=240 |
| --------- | ----------------------: | ---------------: | ---------------: |
| beginning |                       0 |                0 |                0 |
| middle    |                     N/2 |               30 |              120 |
| end       |                       N |               60 |              240 |
| absent    |          No target fact | Missing evidence | Missing evidence |

Four distractor templates contain other project names and codes such as NX-4000. The target must not be the only code in the document.

Offline checks compare sorted **line lists**, not sets: a set could conceal changed duplicate counts. They verify a single occurrence of the answer at the intended index, and no target project name or code in the absent material.

The question always follows the records. Moving the fact also changes its distance from the question; this design does not isolate attention or another internal mechanism.

Four times as many distractor lines is not exactly four times as many tokens. Serialized requests contain 3,689–13,912 UTF-16 characters, including JSON and instructions. These are character counts, not token measurements. Returned usage, if available during a real run, follows the provider's accounting.

## 4. Block ordering: benefits and remaining bias

The six frozen blocks are:

| Block | Case | Distractor lines | Order                             |
| ----- | ---- | ---------------: | --------------------------------- |
| 1     | F1   |               60 | beginning / middle / end / absent |
| 2     | F2   |              240 | middle / end / absent / beginning |
| 3     | F3   |               60 | end / absent / beginning / middle |
| 4     | F1   |              240 | absent / beginning / middle / end |
| 5     | F2   |               60 | beginning / middle / end / absent |
| 6     | F3   |              240 | middle / end / absent / beginning |

Lengths alternate and starting conditions rotate. Six blocks cannot perfectly balance four orders, so temporal and ordering effects remain.

If request 7 fails and triggers termination, block 1 may be complete while block 2 is incomplete. All records remain available, but incomplete fragments cannot be used to pad another group's denominator.

Restricting comparisons to complete blocks can itself introduce selection bias. A report must therefore show **all attempts, failures, unsent jobs, complete blocks and incomplete blocks**, not only its analysis subset.

## 5. A 20-second pause is not a provider guarantee

The runner waits between attempts:

```java
for (JsonElement el : jobs) {
    if (index > 0) sleeper.pause(number("minPauseMs"));
    // Record request identity, then call transport.send(...)
    // Save the response or failure and evaluate stopping rules
}
```

The delay begins after the previous attempt has been processed and saved. An 8-second generation therefore puts request starts at least roughly 28 seconds apart, rather than launching on a fixed 20-second clock.

HTTP 429 means too many requests and may include Retry-After. It does not identify whether the underlying limit concerns requests, tokens, concurrency or something else. See [RFC 6585, section 4](https://www.rfc-editor.org/rfc/rfc6585#section-4).

The local delay is **not a verified Agnes quota and does not guarantee that 429 disappears**. This trial stops immediately on 429. A syntactically valid Retry-After duration or HTTP date is recorded, but does not trigger an automatic retry.

401/403 also stop immediately. Other request/protocol failures stop after two consecutive occurrences. Connect timeout is 10 s and read timeout 90 s; the read timeout is not a total request deadline and does not prove that the server did no work.

## 6. Test the runner separately from the model

The implementation exposes two small interfaces:

```java
interface Transport {
    JsonObject send(JsonObject request, String key) throws IOException;
}
interface Sleeper {
    void pause(long millis) throws InterruptedException;
}
```

Production uses HTTP and Thread.sleep. Tests substitute a fake transport and sleeper while exercising the same execute loop, without network calls or real delays.

| Injected condition           | Verified runner behavior                                       |
| ---------------------------- | -------------------------------------------------------------- |
| First response is 429        | One attempt, no subsequent wait or request                     |
| First response is 401 or 403 | One attempt, status retained, stop                             |
| Consecutive 500 responses    | Two attempts with one intervening pause, then stop             |
| 24 usable responses          | 24 attempts and 23 pauses, within budget                       |
| Simulated UNKNOWN output     | Abstention when evidence exists; correct abstention for absent |

The 80 passing assertions validate these paths and material constraints. A fake UNKNOWN response is not an Agnes response, and those simulated outputs cannot measure model performance. Temporary test files are removed; the public preparation directory contains no attempt response files.

Scoring remains strict: wrong valid codes are incorrect, explanatory prose is format_error, and UNKNOWN on positive evidence is abstention. HTTP and protocol failures are separate. A 1024-token output cap does not guarantee 1024 tokens of visible final text.

## 7. Export, audit, then call

From experiments/02-context-position-paced, using JDK 8 and Maven:

```powershell
mvn -q compile
mvn -q exec:java "-Dexec.args=--self-test"
mvn -q exec:java "-Dexec.args=--dry-run"
mvn -q exec:java "-Dexec.args=--prepare evidence/my-preparation"
node audit.mjs evidence/my-preparation --prepared
```

These commands send no model requests. The output directory must be new.

| File          | Inspectable evidence                                   |
| ------------- | ------------------------------------------------------ |
| protocol.json | Model, budget, lengths, pacing and stopping rules      |
| cases.json    | Fictional facts and expected codes                     |
| plan.json     | Full messages and exact job order                      |
| manifest.json | Source commit, hashes, JDK version and assertion count |

The recorded preparation used Java 1.8.0_171 and source commit ee081ef. The independent Node auditor verified all 24 unique case/length/condition combinations and material constraints.

For a live run, configure AGNES_API_KEY in the local process environment and choose **another new directory**:

```powershell
mvn -q exec:java "-Dexec.args=--run evidence/my-live-run"
node audit.mjs evidence/my-live-run
```

Only --run sends requests, up to 24. The program does not read IDE configuration, print credentials or preserve reasoning_content. Preparation files must not be presented as live response records.

## 8. What would justify the next research conclusion?

At minimum: real timestamps, request hashes, response text, protocol status, individual scores, denominators, stop reasons and returned usage. Usage totals cover only responses containing usage and are not account bills.

Even a completed 24-request run would contain only three fixed synthetic cases, one model, one endpoint and no repeats. A 240-line context is not the model's context limit and cannot establish immunity to middle-position failures.

[Lost in the Middle](https://arxiv.org/abs/2307.03172) investigated position effects in particular tasks and models. This small exercise borrows a comparison idea; it is not a reproduction of that paper.

This article completes an auditable experiment entry point. Its next result report should execute the frozen protocol and inspect each observation before choosing whether to expand tasks, lengths or retrieval. A comparison must be valid before its outcome can be interpreted.
