---
title: "LLM experiment II: make the comparison valid before interpreting position"
description: A Java 8 paired-block protocol with 24 live Agnes 3.0 requests, independently audited scores and reported token usage, including the limits of a perfect observed score.
slug: /llm/context-position-paired-protocol
status: published
published_at: '2026-09-29'
updated: "2026-11-12"
reading_minutes: 9
domain: llm
article_kind: case-study
difficulty: intermediate
related: ["doc:llm/kv-cache", "project:hohoo-ai-lab", "lab:context-position"]
---

Why cannot 26 expected answers establish that context position has no effect? The original run stopped early, leaving different missing conditions. On 2026-09-30, a newly frozen Agnes 3.0 protocol completed 24 real requests: six complete blocks, 18 correct identifiers with an answer present, and six UNKNOWN responses when absent. **These materials did not distinguish a position effect; they do not establish universal position independence.**

AI-assisted documentation. Actual calls and limitations remain intact. The interrupted earlier run is summarized below; its evidence is neither rewritten nor pooled with this run.

## What makes the comparison paired

Each block fixes one fictional project and one material length, changing only the target line's beginning/middle/end position or absence. Three projects × two lengths (60/240 distractor lines) × four conditions yield 24 requests. Four protocol-usable responses form a complete block; wrong answers must still be scored.

The three answer-present versions contain identical line lists in different orders. The target identifier occurs once; the absent version contains neither the target project nor identifier. Other lines also contain identifiers. The question follows the material, so position and distance from the question remain coupled; this experiment does not isolate internal attention mechanisms.

## Record pacing, failures and scoring separately

The actual model is agnes-3.0-flash with temperature=0 and max_tokens=1024. Wait at least 20 seconds after each completed request; do not retry. Stop immediately on 429/401/403, or after two consecutive other request/protocol failures. Unexecuted requests, unusable responses and wrong answers are distinct outcomes.

Block lengths alternate and starting conditions rotate, without a fully balanced ordering. Scoring trims outer whitespace only, then compares the identifier or UNKNOWN exactly. These are fixed teaching questions, not sampled user tasks.

## Agnes 3.0: what do 24 expected answers establish?

On September 30, 2026, all 24 live calls ran under the separately frozen L1v2-agnes3 protocol. Every response identified its model as agnes-3.0-flash. The runtime was Java 1.8.0_171, at code revision b352a38. The request plan exactly matches the saved preparation: no post-result question edits, retries or replacement observations.

[Code and reproduction](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced) · [Independent audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live/audit.json) · [Individual responses](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live)

### Separate request availability from answer correctness

| Measure | Observed |
| --- | ---: |
| Planned / attempted / scorable responses | 24 / 24 / 24 |
| Complete blocks | 6 / 6 |
| HTTP or response-protocol failures | 0 |
| Evidence present: correct code | 18 / 18 |
| Evidence absent: correct UNKNOWN | 6 / 6 |
| Retries / unattempted jobs | 0 / 0 |

Scoring trims only surrounding whitespace. It does not extract a code from an explanation or use another model as judge. Each answer position has six observations, three at each material length:

| Distractor lines | Beginning | Middle | End | Absent |
| --- | ---: | ---: | ---: | ---: |
| 60 | 3/3 correct codes | 3/3 correct codes | 3/3 correct codes | 3/3 correct abstentions |
| 240 | 3/3 correct codes | 3/3 correct codes | 3/3 correct codes | 3/3 correct abstentions |

These denominators count fixed requests, not independently sampled business questions. Three projects recur across conditions: 24 requests are not 24 independent tasks.

### Trace a score back to a response

Attempt 1 is F1 with 60 distractors and the answer at the beginning. Its saved record contains HTTP 200, finishReason=stop and final content QX-7319. Reported usage is 2323 input, 8 output and 2331 total tokens.

To verify it, find the expected code in the frozen case, inspect the material and target position in plan.json, then compare the final response. The locally computed outcome field is not sufficient evidence by itself. Independent audit.mjs recomputes scores, request hashes, complete blocks and usage. Five new offline tests accept the original evidence and reject mutations to the model, score, usage or request hash.

These commands run entirely offline from the experiment directory, without reading a key or calling the model:

```sh
node audit.mjs evidence/20260930-agnes3-live
node --test audit.test.mjs
```

### Verify usage and pacing

Returned usage sums to **134,614 input**, **144 output**, and **134,758 total tokens**. Per-request reported input ranges from 2,320 to 8,898 tokens. These are this endpoint's usage fields, not a verified bill or price estimate. Short answers do not eliminate the input cost of long material.

The run spans UTC 05:06:52.476–05:17:12.120, or approximately 13:06:52–13:17:12 in Beijing. Start times and elapsed durations yield a minimum observed pause of **20.001 seconds**, consistent with the 20-second rule. No 429 occurred in this run; that does not establish a guaranteed provider quota.

### A perfect observed score does not establish position independence

No answer difference was observed across positions. The narrower interpretation is that **three fixed cases, two material lengths and one run per cell did not distinguish position-dependent performance**.

All cells reached the scoring ceiling. The target sentence and project names are distinctive; numerous other codes may still be insufficient to make retrieval difficult. This is not a context-limit measurement or an isolation of internal attention mechanisms.

Do not pool these responses with the 26 older Agnes 2.5 responses, or attribute cross-run differences to the model upgrade: materials, order, lengths and stopping rules differ.

A useful next protocol could freeze similar project names, conflicting historical/current records or naturally paraphrased questions, retain absent-evidence controls and add repeats. That extension has not run. This authorization ended at 24 calls.

## Why the interrupted run is no longer a separate article

The 2026-09-28 Agnes 2.5 plan contained 48 requests. It attempted 29: 26 usable expected answers, then three HTTP 429 failures, leaving 19 unexecuted. Beginning/middle/end/absent attempted 8/8/7/6 requests, with 8/6/6/6 usable responses. Unequal denominators cannot support a position comparison or be pooled with the new 24 requests.

[Original attempts and unfinished plan](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e072718c3cd66d44978612208d393ff0d3eff9e4/experiments/01-context-position/evidence/20260928-l1) remain available. The distinct failure record survives here without duplicating the protocol as another article. The later 128-request distractor design has zero executions and remains a [future plan](/learning?track=llm#plans-llm), not a research result.

## Check archived results without sending requests

Clone into a fresh directory and check out the evidence-bearing revision below. Node.js audits the archived results without a model key. No automatic online run is part of this verification.


```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-position
cd hohoo-ai-lab-position
git checkout e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1
cd experiments/02-context-position-paced
node audit.mjs evidence/20260930-agnes3-live
node --test audit.test.mjs
```
