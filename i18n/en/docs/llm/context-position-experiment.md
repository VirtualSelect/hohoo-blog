---
title: Does moving an answer into the middle make a model miss it? An interrupted controlled trial
description: Six synthetic cases, four context conditions and 29 recorded requests. A Java experiment that separates retrieval results from HTTP 429 failures.
slug: /llm/context-position-experiment
status: published
published_at: '2026-09-29'
updated: '2026-09-29'
reading_minutes: 12
domain: llm
article_kind: retrospective
difficulty: intermediate
provenance: experiment-result
related: ["doc:llm/kv-cache", "doc:ai-apps/java-structured-output", "project:hohoo-ai-lab", "lab:context-position"]
---

Putting facts into a request does not establish that a model will use them. When an answer is missing, how can we separate information position, missing evidence and a failed request?

This trial narrows the task to retrieving a handover code from synthetic project records. The answer-bearing line moves through otherwise identical material; a fourth condition removes it.

**48 requests were planned, 29 attempted. The 26 normal responses matched expectations. Three consecutive HTTP 429 responses then triggered the stopping rule; 19 requests were never sent.** This is an incomplete trial. No observed answer errors does not establish that position is irrelevant.

[Code and reproduction](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e072718c3cd66d44978612208d393ff0d3eff9e4/experiments/01-context-position) · [Individual records](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e072718c3cd66d44978612208d393ff0d3eff9e4/experiments/01-context-position/evidence/20260928-l1) · [Experiment file](/labs/context-position)

## 1. A cache is not evidence of memory

The [KV Cache article](/docs/llm/kv-cache) separates request contents from inference reuse. Each request here contains only a fixed system message and the current user message, with no conversation history.

A cached_tokens value does not show that an answer came from persistent conversational memory. Caching is not manipulated in this trial and cannot replace inspecting the actual input.

[Lost in the Middle](https://arxiv.org/abs/2307.03172) motivates the question: the paper reports position-dependent performance for its evaluated models and tasks. Our task, model, lengths and scale differ. This trial is not a reproduction of that paper.

## 2. Make the answer independently checkable

An example Chinese record assigns code QX-7319 to the fictional project 松塔试验项目. All six names and codes are synthetic, not real organizations or devices. Expected answers are frozen in cases.json rather than judged by another model.

Each context includes 60 distractor lines with project identifiers and codes resembling NX-4000. The target is therefore not simply the only code in the text: its project must match the question.

| Condition | Target line, zero-based | Other material |
| --- | ---: | --- |
| beginning | 0 | The same 60 distractors |
| middle | 30 | The same 60 distractors |
| end | 60 | The same 60 distractors |
| absent | No target fact | One unrelated replacement line |

The three positive conditions reorder the same 61 lines. The question is always after the records, so moving a fact also changes its distance from the question. We have not isolated an internal attention mechanism.

The absent replacement is not exactly length-matched to the fact. It is a missing-evidence control, not another precisely matched position condition. All live prompts remain in Chinese; this English page translates the report, not the experiment.

## 3. Freeze requests, scoring and budget

The configuration uses Agnes agnes-2.5-flash, temperature 0 and max_tokens 512. Serialized request JSON has approximately **4,298–4,301 UTF-16 characters**, including fields, instructions and records. This is not a token count.

Code and materials were committed before execution. The manifest records the source commit, JDK version and input SHA256 values. plan.json contains all 48 jobs, shuffled using seed 20260928.

- Six facts × four conditions × two repeats: maximum 48 requests.
- Sequential requests with no automatic retries.
- Ten-second connection timeout and 90-second read timeout.
- Stop after three consecutive request or protocol failures.
- For a returned response, check assistant and finish_reason=stop before scoring content.

The read timeout applies to individual blocking reads, not a hard deadline for the entire request. Temperature 0 does not guarantee bitwise determinism from a hosted service.

| Trimmed content | Answer-present conditions | Absent condition |
| --- | --- | --- |
| Exact expected code | correct | incorrect: unsupported guess |
| UNKNOWN | abstention | correct_abstention |
| Another valid-looking code | incorrect | incorrect |
| Explanation or other format | format_error | format_error |

Only surrounding whitespace is trimmed. Answers are not repaired or extracted from paragraphs. HTTP failures, network errors and protocol failures are separate from answer errors. The program's transport_error bucket is broad: inspect errorCode. All three errors here were http_429.

## 4. What actually happened

The run lasted from 2026-09-28 15:52:59 to 15:56:38 UTC. Independent rescoring produced:

| Condition | Planned | Attempted | Normal response | Correct answer / abstention | HTTP 429 | Not sent |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| beginning | 12 | 8 | 8 | 8 | 0 | 4 |
| middle | 12 | 8 | 6 | 6 | 2 | 4 |
| end | 12 | 7 | 6 | 6 | 1 | 5 |
| absent | 12 | 6 | 6 | 6 | 0 | 6 |
| Total | 48 | 29 | 26 | 26 | 3 | 19 |

Requests 1–26 returned usable outputs. Requests 27–29 returned 429, triggering the stop. The specific limiting cause was not established from these records; no balance diagnosis or credential switching was attempted.

All 20 returned answer-present outputs matched their codes. All six returned absent outputs were UNKNOWN. These are observations conditional on normal responses. Repeated presentations of the same cases are not independent problems.

Returned usage totals are 74,476 prompt_tokens, 2,567 completion_tokens and 77,043 total_tokens. These cover responses with usage only, not an account bill or unknown consumption for failed requests.

## 5. Why this cannot establish that the middle is safe

1. The trial is incomplete and groups are unbalanced. Unsent jobs are neither successes nor failures.
2. Regular, short-code retrieval may be easy. It is not multi-document reasoning or natural long-form text.
3. The material is short. Request characters do not establish token length or coverage of a model's long-context limit.
4. Only one hosted configuration was used. Model snapshots, other models, loads and temperatures were not compared.
5. Final answers cannot explain how evidence was located internally.

The supported statement is narrow: with this fixed short material, normal responses included correct retrieval at all three positions and correct abstention when evidence was absent. **There is insufficient evidence to estimate a position effect.**

A trial need not produce the expected failure to be useful. Here it identifies both a likely task-difficulty issue and availability as a separate factor that must be measured.

## 6. Audit the code and records

The Java repository contains experiments/01-context-position. It shares Java 8 and Gson foundations with Demo 04 but addresses a separate research question.

Run offline checks first:

```powershell
mvn -q compile
mvn -q exec:java -Dexec.args=--self-test
mvn -q exec:java -Dexec.args=--dry-run
```

The 92 assertions cover unique target facts, placement, material consistency, absence controls, scoring and budget. An optional independent Node.js audit reads the saved evidence:

```powershell
node audit.mjs evidence/20260928-l1
```

It verifies request hashes and character counts, condition combinations, per-response scoring, the stopping rule and summary. Gson serializes the temperature as 0.0; the audit preserves that distinction. Equivalent JSON values do not necessarily mean identical request bytes.

To perform another live run, set AGNES_API_KEY yourself and choose a new output directory:

```powershell
mvn -q exec:java "-Dexec.args=--run evidence/my-run"
```

This can issue up to 48 billable requests. Do not overwrite old evidence or combine a changed protocol with this run. The key comes only from process environment; request headers, credentials and reasoning content are not stored.

## 7. What a second round should change

Define a new protocol with deliberate request pacing and a specified 429 policy before increasing material length and adding natural-text distractors. Preserve paired cases while separately counting complete responses and answer correctness.

Only then does a position comparison become easier to interpret. This run is not extended merely to obtain a nicer completion count. Its 29 records already document a method, observations and limitations.

Three questions remain distinct: **Was the answer present in the input? Did a complete response arrive? Is its answer supported by the evidence?**
