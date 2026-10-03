---
title: "Java LLM IV: which concurrent response may commit?"
description: "Reproduce reversed response order with real Java threads, then enforce versioned commits, complete turns and bounded receipts."
slug: "/ai-apps/java-concurrent-history"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:concurrent-history", "project:hohoo-ai-lab", "doc:ai-apps/java-retrieval-evidence", "doc:ai-apps/java-tool-boundary"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows/evidence/20261003-reviewed) · [Experiment record](/labs/concurrent-history)

The previous [transactional-history demo](/docs/ai-apps/java-transactional-history) committed only validated user/assistant pairs. Its synchronized `ask` method also held a lock while waiting for the response. Moving that wait outside the lock removes blocking, but exposes a new problem: a response can be based on a history version that is no longer current.

This experiment tests that state boundary with real Java threads and controlled local replies. It makes no model requests and measures no provider throughput.

## 1. A deterministic reversed completion

Both A and B receive version 0 and an empty snapshot. A latch requires B to commit before A attempts its commit. The recorded order is `fast:COMMITTED`, followed by `slow:STALE`. The final history contains only `fast / new answer`, and the version is 1.

The late response is not necessarily low quality. Its input snapshot has become stale. A product could expose it as a branch, or ask the caller to regenerate against the new state; silently appending it would imply conversational continuity that never existed during generation.

## 2. Snapshot outside, atomic commit inside

```java
VersionedSession.Ticket ticket = session.begin(requestId, question);
// Build and send a request from this immutable snapshot, outside the lock.
String status = session.commit(ticket, validatedReply, finishReason);
```

The ticket contains the owning session, version, operation ID, question and an immutable history copy. The synchronized commit method compares the version, appends a complete turn, trims old pairs and increments the version in one critical section. Checking the version outside that section would allow two writers to pass simultaneously.

An atomic reference is another possible implementation, but our compound state also contains history limits and receipts. A short synchronized section makes the invariant easy to inspect. The goal is an atomic state transition, not a particular concurrency primitive.

## 3. Duplicate versus conflicting IDs

| Situation | Status | Version changes? |
|---|---|---|
| Same ID, question and answer, receipt retained | `DUPLICATE` | No |
| Same ID with different content | `ID_CONFLICT` | No |
| New ID based on an old version | `STALE` | No |
| Empty reply or incomplete finish reason | `INVALID` | No |
| Valid reply and current version | `COMMITTED` | Yes |

Receipt lookup precedes version checking, so a repeated successful commit is recognized precisely. A ticket belonging to another session is rejected even if its numeric version matches.

This is in-process commit idempotency. It does not prevent duplicate remote requests, refund model costs, or provide a database transaction. Receipts are bounded and disappear after eviction or restart. A production design needs an explicit persistence and expiry policy before making stronger execution guarantees.

## 4. Recorded checks and limits

Eight of the suite's 33 checks cover reversed completion, atomic pairs, duplicates, ID conflicts, incomplete replies, pair trimming, foreign tickets and snapshot isolation. The suite starts actual threads; latches control ordering without timing guesses.

Keeping two turns removes complete question/answer pairs. Earlier tickets retain their original copies. This separates reading a snapshot from updating current state. It does not exhaust all thread interleavings or establish distributed correctness.

## 5. Reproduce and integrate

```sh
cd demos/06-reliable-workflows
python run.py --out evidence/my-run
python audit.py evidence/20261003-reviewed
```

The first command compiles Java, runs the cases and saves new results, source hashes and an audit; the second checks archived evidence. Use a new output directory. Recorded runtime: Java 1.8.0_171 and Gson 2.10.1, with zero network requests.

To integrate an existing transport, obtain a ticket, construct its request, send outside the lock, validate the reply, and commit. Surface `STALE` to the caller instead of silently resending, which could introduce extra paid calls. Do not append transport errors as assistant replies.

Reverse the latch ordering as an exercise. Then let an invalid response arrive first: the valid response should still be able to commit. Finally, try a ticket from another session and explain why equal version numbers are insufficient.

Continue with [tool execution boundaries](/docs/ai-apps/java-tool-boundary). For atomic-reference semantics, see the [Java 8 documentation](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/atomic/AtomicReference.html); this demo uses a synchronized critical section.

## Read this series

- [Java LLM V: why can a timed-out tool keep running?](/docs/ai-apps/java-tool-boundary)
- [Java LLM VI: validate retrieval evidence before judging RAG answers](/docs/ai-apps/java-retrieval-evidence)
