---
title: "Java LLM V: why can a timed-out tool keep running?"
description: "Build an allowlisted read-only executor and reproduce the distinction between timeout, cancellation and termination."
slug: "/ai-apps/java-tool-boundary"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:tool-eval", "project:hohoo-ai-lab", "doc:ai-apps/java-concurrent-history", "doc:ai-apps/java-retrieval-evidence"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows/evidence/20261003-reviewed) · [Experiment record](/labs/tool-eval)

A JSON object can request a tool, but the application still decides which capabilities exist, which arguments are valid, how much work is allowed, and what a timeout means.

`ReadOnlyTools` is a local execution baseline for the existing tool-recovery plan. It does not let a model choose tools, execute shell commands, or fetch arbitrary URLs. Full Agent-policy comparisons remain unfinished.

## 1. Validate before execution

```json
{"tool":"lookup","key":"known"}
```

The request passes a size check, strict JSON parsing, a capability allowlist, an attempt budget, executor admission and a bounded wait. Exactly two string fields are accepted. Duplicate fields, extra fields, trailing data and keys outside `[a-z][a-z0-9-]{0,63}` are rejected. The input/result limits are 4096/8192 Java characters, not tokens.

The parser reads names with `JsonReader` and rejects duplicates before they can be overwritten in a map. A request for `../secret` cannot become a file path.

## 2. A registry defines capabilities

```java
registry.put("lookup", key -> ownedData.get(key));
ReadOnlyTools.Result result = executor.call(rawJson, 1000);
```

The application registers reviewed read-only functions. An unknown `exec` name returns `UNKNOWN_TOOL`; no reflection creates additional capabilities. Returned strings remain data, even if they contain imperative text.

This is not a sandbox. A registered Java function still has process privileges. The example cannot replace isolation or network controls for untrusted code.

## 3. Cancellation is not termination

```java
catch (TimeoutException e) {
    task.cancel(true);
    return new Result("TIMEOUT", null);
}
```

The suite starts a local tool that deliberately ignores interruption until a test latch is released. After a 150 ms wait, the caller receives `TIMEOUT`. The occupied worker makes a second call return `BUSY`. Releasing the latch lets the original tool continue and increment a local counter from 0 to 1.

These are actual thread operations, with no external side effects. They demonstrate that stopping the wait does not prove the work stopped. Retrying a payment, file write or robot action under that assumption could repeat an operation.

## 4. Bound queued work as well as waiting

One worker and a `SynchronousQueue` provide zero waiting capacity. A still-running timed-out task prevents new admission instead of creating a backlog of operations that users may no longer want.

The attempt budget increases only when the executor accepts a task. Invalid, unknown and busy requests do not consume execution attempts. Missing results, exceptions and timeouts do. There is no automatic retry.

| Status | Meaning |
|---|---|
| `INVALID`, `UNKNOWN_TOOL` | Rejected before execution |
| `BUSY`, `BUDGET` | No new execution admitted |
| `NOT_FOUND` | Executed, but no result |
| `TIMEOUT` | Wait expired; work may continue |
| `TOOL_ERROR` | Controlled error without internal exception text |
| `OK` | A result within the size limit, not proof of task completion |

## 5. Reproduce and extend

```sh
cd demos/06-reliable-workflows
python run.py --out evidence/my-tools-run
```

Fifteen of 33 suite checks exercise six invalid structures, the allowlist, rejection before execution, lookup, budget, missing results, sanitized errors, timeout, busy admission and post-cancellation work. The fault tool always has a final release path so the test itself does not hang.

No measurements here establish model tool-selection quality, retry benefits or production latency. When adding a model, record its proposal, argument validation, tool execution and task completion separately. Continue with [retrieval evidence](/docs/ai-apps/java-retrieval-evidence), where a successful lookup can still fail to answer a question.

## Read this series

- [Java LLM IV: which concurrent response may commit?](/docs/ai-apps/java-concurrent-history)
- [Java LLM VI: validate retrieval evidence before judging RAG answers](/docs/ai-apps/java-retrieval-evidence)
