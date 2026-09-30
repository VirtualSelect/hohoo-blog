---
title: "After 24 correct answers: designing a more discriminating context experiment"
description: "Remove wording and identifier shortcuts, freeze 128 similar-distractor requests, and verify the materials with Java 8 and an independent audit. Offline preparation is not a new model result."
slug: /llm/context-similar-distractors
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 10
domain: llm
article_kind: case-study
difficulty: intermediate
related: ["doc:llm/context-position-paired-protocol", "doc:llm/context-position-experiment", "project:hohoo-ai-lab"]
---

[The previous Agnes 3.0 experiment](/docs/llm/context-position-paired-protocol) completed 24 real calls: all 18 answer-present conditions returned the correct code, and all six answer-absent conditions returned `UNKNOWN`. That establishes performance on those materials. It does not distinguish a negligible position effect from a task too easy to expose one.

The next step is not merely more requests. This article makes “harder” inspectable: introduce similar distractors, preserve comparability and check that the experiment itself does not leak the answer.

**The deliverable is a frozen design and runnable offline implementation. The new protocol plans 128 requests and has sent zero real model requests.** There are no new accuracy, billing or latency results, and nothing is pooled with the earlier 24 calls.

[Pinned implementation](https://github.com/VirtualSelect/hohoo-ai-lab/tree/987c9f06e3f6db01cc274ea17cfe9a1e2ffe854a/experiments/04-context-position-similar) · [Frozen requests](https://github.com/VirtualSelect/hohoo-ai-lab/blob/987c9f06e3f6db01cc274ea17cfe9a1e2ffe854a/experiments/04-context-position-similar/evidence/20260930-offline-prepared/plan.json) · [Java 8 verification](https://github.com/VirtualSelect/hohoo-ai-lab/blob/987c9f06e3f6db01cc274ea17cfe9a1e2ffe854a/experiments/04-context-position-similar/VERIFICATION-WINDOWS.md)

## 1. What does an all-correct result leave unresolved?

Earlier target wording and code prefixes differed from the background. Distinctive cues might have made retrieval easier. This is a possible confound to remove, not proof that the model used a shortcut.

Expanding a background from 60 to 2,400 lines would change length, cost, failure exposure and information density together. Instead, the new protocol retains exact project-name lookup and adds paired low/high similarity conditions.

## 2. What a similar distractor looks like

These are excerpts from frozen case S1, using synthetic records rather than real business data. Names remain in their original Chinese because character-level differences are the manipulation.

| Record | Project name | Code |
|---|---|---|
| Target | 松塔北站试验项目 | OM-3642 |
| One-character change | 松塔南站试验项目 | NA-0653 |
| Reordered words | 北站松塔试验项目 | EL-4135 |

The question asks for the handover code of 松塔北站试验项目, or `UNKNOWN` if unavailable. This table is an excerpt, not a complete reproducible request.

All records share a sentence template, eight-character project names and a common randomly generated code pool. High similarity includes six near names: two character substitutions, two word-order changes and two qualifier changes. Low similarity substitutes unrelated names at the same positions, leaving codes unchanged.

Within each pair, **only six project names change**. Length, codes, target and other background records remain fixed. Near names occupy background indices `floor((2*k+1)*N/12)`, for `k=0..5`, rather than clustering at the start. Both 60- and 240-record backgrounds have six near names, keeping their count independent of length.

## 3. The 128-request matrix

| Dimension | Levels |
|---|---|
| Cases | Eight lexical/code instances |
| Background length | 60, 240 records |
| Similarity | Low, high |
| Target condition | Beginning, middle, end, absent |
| Planned requests | 8 × 2 × 2 × 4 = 128 |
| Model | agnes-3.0-flash |
| Parameters | temperature=0, max_tokens=1024 |

Answer-present conditions move only the target record while preserving the background. The absent condition inserts an equally long unrelated placeholder in the middle. The question follows the records; the system message must not contain the answer.

The eight cases instantiate one shared template family. They are not eight independent task structures, and 128 requests are not 128 independent statistical samples. Moving the target also changes its distance from distractors; the design does not isolate internal attention mechanisms.

## 4. Execution order is part of the design

One case, length and similarity combination forms a four-condition block. Complete low/high blocks form a pair. The full design has 32 blocks and 16 pairs.

Four condition orders avoid always presenting the same position first:

```text
B-M-A-E
M-E-B-A
E-A-M-B
A-B-E-M
```

`B/M/E/A` mean beginning, middle, end and absent. Each order appears twice within every length/similarity stratum. A fixed Java random seed shuffles the cases; the low/high order alternates by shuffled case index.

The independent Node auditor reconstructs Java's shuffle and the request sequence instead of trusting a runner's “randomized” label. This balances order positions without claiming to remove all load or time effects.

## 5. Wrong answers, invalid responses and missing data

Normal, complete assistant text is scored by exact comparison after Java `trim()`. That removes leading/trailing U+0000 through U+0020, unlike JavaScript's broader whitespace handling. Independent scoring must use the same rule.

- Correct code or an appropriate `UNKNOWN`: expected answer.
- Wrong code, incorrect refusal, extra explanation or bad format: an error within valid responses, retained in the denominator.
- HTTP failure, non-`stop` finish, unexpected role/model, unparsable or empty content: request/protocol failure, reported separately.
- An unattempted item: unexecuted, never filled in as a wrong answer.

A wrong-code attribution matches only distractor codes actually present in that request. A well-formed arbitrary code is not automatically evidence of distraction.

All four protocol-valid responses are needed for a complete block, and both similarity blocks for a complete pair. Primary analysis further requires every planned length for a case to be paired completely. It averages lengths within cases, then weights cases equally. Partial pairs remain exploratory, with exclusion reasons; missing entries are not zeros.

## 6. Freeze the calculation before observing results

Let B, M and E be exact-correct indicators (0 or 1) for the three answer-present positions within one case, length and similarity:

```text
middle loss = (B + E) / 2 - M
similarity difference = middle loss_high - middle loss_low
primary metric = average lengths within each case, then average cases
```

The question is whether high similarity additionally increases the middle-position loss relative to the ends. This is not overall error rate. Absent-condition performance tests evidence-based refusal separately.

B=1, M=0 and E=1 give a loss of 1; this is an illustrative calculation, not a measured result. If both similarity conditions are perfect, the difference is zero, but a ceiling remains possible.

The protocol specifies case-cluster bootstrap intervals at 95% and a 10-percentage-point replication threshold. Only a difference meeting that threshold with an interval lower bound above zero supports the stated effect on this batch. Eight cases yield coarse uncertainty, and their shared template limits generalization. A preregistered threshold is not a power guarantee.

## 7. What can be reproduced now?

Inside `experiments/04-context-position-similar`, run these offline commands:

```bash
mvn -q compile
mvn -q exec:java "-Dexec.args=--self-test"
mvn -q exec:java "-Dexec.args=--dry-run"
node --test audit.test.mjs
mvn -q exec:java "-Dexec.args=--verify-prepared evidence/20260930-offline-prepared"
node audit.mjs evidence/20260930-offline-prepared --prepared
```

Compilation passed locally using Oracle JDK 1.8.0_171, Maven 3.6.3 and Node 26.8.2. All 2,515 Java checks and 60 independent Node tests passed. The 128 frozen requests and source fingerprints match the original snapshot. This adds a real Java 8 runtime check to the delivery's earlier Java 8-target bytecode verification.

Tests cover answer leakage, equal-length pairing, ordering, budget consistency, invalid responses, missingness and score tampering. They validate rules, not model behavior. `--simulate` uses a fake transport with an explicit simulation label; its all-correct output cannot become a model claim.

## 8. What remains before a live run?

The prior 24-request authorization was consumed by L1v2. The new limit of 128 is a code ceiling, not a spending approval. Account rates and a total monetary cap still need confirmation. This integration read no API key and sent no Agnes requests.

The runner requires an explicit request allowance, an audited prepared directory and a key in the process environment. The blog exposes no public calling endpoint. Attempts are separated by at least 20 seconds after completion. HTTP 429/401/403 stop immediately; two consecutive other request/protocol failures also stop, with no retries. A read timeout does not prove the server did nothing. Missing usage stays unknown, never zero cost.

Once the budget is agreed, execute the frozen plan, retain failures and unattempted cells, and add per-case results with uncertainty. A smaller 32-request exploration would need a new protocol version and fresh preparation, not outcome-driven selection halfway through.

The current contribution makes “harder” an inspectable set of variables, inputs, orders and scoring rules. Model conclusions must wait for real observations.
