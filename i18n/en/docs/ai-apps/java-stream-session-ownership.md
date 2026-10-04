---
title: "Java LLM practice (9): why can a cancelled answer overwrite a new conversation?"
description: "18 controlled thread schedules test request ownership for streaming previews, completion and errors, with cancellation and bounded deduplication."
slug: "/ai-apps/java-stream-session-ownership"
status: "published"
published_at: "2026-10-04"
updated: "2026-10-04"
reading_minutes: 10
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:stream-session-ownership", "project:hohoo-ai-lab", "doc:ai-apps/java-streaming-boundary", "doc:ai-apps/java-first-llm"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/920fee3717a373dc796269ee3a4a03ec33700ae3/demos/09-stream-session) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/920fee3717a373dc796269ee3a4a03ec33700ae3/demos/09-stream-session/evidence/20261004) · [Experiment record](/labs/stream-session-ownership)

The previous experiment required a complete stream before committing a conversation turn. Completeness is necessary, but the answer may belong to a request that has already been cancelled.

Suppose A is answering, the user cancels it and starts B, and A's final callback was already queued. An unconditional text update can overwrite B. Even if B later restores the correct screen, the intermediate update was wrong.

This study adds a second question: **does this callback still own the current request?**

## Make the race observable

The `late-preview` schedule pauses A immediately before its preview update:

```text
Main:   begin(A)
Worker: parse answer-A; wait before preview
Main:   begin(B); preview(B, answer-B)
Worker: preview(A, answer-A); complete(A)
Main:   complete(B)
```

The naive implementation replaces B's preview with A's and commits the old turn. Testing only the final screen can miss this. Every event therefore records the resulting preview and history, and the audit checks the entire trace.

<img src="/media/practice/stream-session.png" width="1500" height="600" loading="lazy" alt="18 controlled thread schedules: seven naive failures and nine guarded passes" />

## What actually ran

Java 8 runs a real worker thread alongside the main thread. Synthetic in-memory SSE passes through the unchanged [A6 text parser](/docs/ai-apps/java-streaming-boundary). This is neither a new network benchmark nor an Agnes compatibility test; it makes no model requests.

Two latches establish the order: the worker announces that it reached the selected callback, then waits until the main thread has cancelled, cleared or replaced the request. The [Java 8 CountDownLatch specification](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/CountDownLatch.html) defines the visibility relationship between releasing and returning from the wait. Latches construct the test schedule, not the product session lock. A five-second timeout fails a stalled test; it is not a model latency measurement.

| Schedule | Unconditional callbacks | Active-request ownership |
| --- | --- | --- |
| Normal completion | Pass | Pass |
| Completion after cancellation | Fail | Pass |
| Completion after clearing | Fail | Pass |
| Replace with B; A completes first | Fail | Pass |
| Replace with B; B completes first | Fail | Pass |
| A preview arrives after B preview | Fail | Pass |
| Duplicate completion callback | Fail | Pass |
| Truncated SSE | Pass | Pass |
| A error arrives after B begins | Fail | Pass |

There are 18 executions: seven of the nine naive schedules violate the contract; all nine guarded schedules pass. These are deterministic cases, not an estimated production failure rate or a proof covering every interleaving.

## Give each request a write permit

`begin` returns a privately constructed `Ticket` with its owning session, generation (`epoch`), request ID and question. Every update checks:

```java
t.owner == this && t == active && t.epoch == epoch
```

The owner blocks cross-session tickets. Object identity selects the active request. The generation expresses invalidation after starting, cancelling or clearing. Successful completion clears `active`, so a second completion is rejected even if no newer request exists.

These are in-process ownership checks, not authentication.

## Validate and mutate under the same lock

Checking outside the mutation is insufficient:

```java
if (isCurrent(ticket)) {
    // cancel() or begin(B) could happen here
    history.add(answer);
}
```

The example synchronizes preview, completion, cancellation, clearing and failure on the same `Session`. Each validation and short state update is indivisible. Reading and parsing the stream stay outside the lock:

```java
Session.Ticket ticket = session.begin(id, question);
if (ticket == null) return;
try {
    String answer = new StreamReader().read(input,
        text -> session.preview(ticket, text));
    session.complete(ticket, answer);
} catch (IOException ex) {
    session.fail(ticket);
}
```

`complete` assumes the caller has validated completion. Here the parser returns only after `stop` and `[DONE]`; calling it directly with partial text bypasses that boundary.

## Error callbacks also have owners

A late exception from A can clear B's preview or loading state even when answer writes are guarded. The `late-error` schedule tests precisely this. Guarded `fail(A)` records `STALE` without changing B. Exceptions do not grant a callback permission to mutate a newer request.

## Cancellation is local invalidation

Cancellation means A can no longer change this session. It does not promise that the provider stops generating or billing, that blocked I/O has been interrupted, that another server shares the same generation, or that request IDs survive a restart.

A real integration must also close connections and handle timeouts, and may use provider cancellation where supported. Local ownership must remain correct even when transport cancellation fails.

## Bounded receipts are not permanent idempotency

The example retains eight used IDs and eight complete question/answer pairs. Reusing an ID does not start another request; changing the question under the same ID is also rejected. Clearing content retains the ID window to prevent immediate replay.

An evicted ID can be used again. This is finite, single-process deduplication, not durable idempotency. A production service needs authenticated session keys and an explicit receipt lifecycle. Diagnostic event snapshots are for this small experiment; production logs also need limits and redaction.

## Reproduce and inspect

From `hohoo-ai-lab`:

```text
python demos/09-stream-session/run.py --out demos/09-stream-session/evidence/my-run --maven /path/to/mvn
python demos/09-stream-session/audit.py demos/09-stream-session/evidence/my-run
```

Use `--offline` if Maven dependencies are cached. The archived execution used Java 8u171. `results.json` contains all 18 event traces and intermediate states. The manifest pins source and raw-file hashes. The audit independently reconstructs previews and history rather than accepting final counters. Seven additional contract groups cover ownership, cancellation, duplicate IDs, paired-history limits, receipt eviction and validation.

A successful answer now needs both protocol completeness and current ownership at commitment. The next integration should preserve both while testing real connection cancellation and multi-process state, rather than adding another HTTP-status check.
