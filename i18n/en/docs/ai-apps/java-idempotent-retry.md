---
title: "Java idempotent retries: no reply does not mean no effect"
description: "Seven loopback HTTP fault cases explain idempotency keys, concurrent admission, payload conflicts and process-crash gaps."
slug: "/ai-apps/java-idempotent-retry"
status: "published"
published_at: "2026-10-09"
updated: "2026-10-09"
reading_minutes: 11
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-retry-deadline", "doc:ai-apps/java-durable-turns"]
related: ["lab:java-idempotent-retry", "project:hohoo-ai-lab", "doc:ai-apps/java-tool-boundary"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/demos/12-idempotent-retry) · [HTTP records and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/demos/12-idempotent-retry/evidence) · [Lab](/labs/java-idempotent-retry)

The previous article bounded retry count and total waiting time. It did not answer whether a retry would perform a side effect twice. A tool server may commit an operation and lose its reply. The client only knows that it did not receive an answer.

This experiment uses Java 8's built-in HTTP server to increment a local counter. The counter represents a logical side effect; it is **not a payment, order or model request**. A Python client uses real loopback connections. The server deliberately drops replies or terminates its process. No external API is called.

## The ambiguous failure window

```text
Client                 Server                    Counter
POST /effect --------> increment -------------> 0 -> 1
             <-------- connection closes before reply
observe EOF
retry POST ----------> increment -------------> 1 -> 2
receive 200, body 2
```

The first attempt records an actual connection exception, not a fabricated timeout message. The `unkeyed_lost_reply` case ends at 2. The exception alone cannot tell the client whether the first operation took effect.

[HTTP idempotency](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2) concerns the intended effect of repetition, not identical response codes. A POST does not become idempotent merely because a client adds a header: the receiver must implement and agree to that protocol.

## A key identifies an intent, not a network attempt

Generate one key for this increment and reuse it across retries:

```text
Absent key -> claim atomically -> execute -> store result -> reply
Same key, same body -> wait for / replay the same result
Same key, different body -> reject with 409
```

The example compares SHA-256 of the exact request bytes. Two semantically equal JSON objects with different field ordering therefore conflict. A semantic protocol needs explicit canonicalization and identities scoped by tenant, operation and version. Silently ignoring different arguments is unsafe.

The claim must be atomic. A separate `containsKey`, execution and `put` lets two threads enter. The essential structure protects lookup and record creation with the same lock, then executes outside it:

```java
synchronized (records) {
    record = records.get(key);
    if (record == null) {
        // Capacity check omitted here; see the complete source.
        record = new Record(hash);
        records.put(key, record);
    } else {
        // Validate hash first; reject a mismatch with 409.
        owner = false;
    }
}
// Owner executes once; duplicates wait on record.result.
```

A `CompletableFuture` shares the result with duplicate requests. Twelve concurrent clients with the same key produce one increment. All twelve receive 1, and eleven replies are marked as replayed. Waiting is bounded to five seconds; a failed wait does not delete the record and immediately execute again.

## Lost replies are covered; lost processes are not

The final count comes from the server's file, not the number of successful client responses.

| Condition | Final count | Observation |
| --- | ---: | --- |
| No key; first reply dropped | 2 | Retry repeats the effect |
| Same key; first reply dropped | 1 | Retry replays the result |
| 12 concurrent duplicate requests | 1 | One owner, eleven replays |
| Same key, different body | 1 | Second request gets 409 |
| Successful reply, server restart, retry | 2 | In-memory records are gone |
| Crash after effect, before result completion | 2 | Crash gap repeats the effect |
| Invalid inputs and 64-key capacity boundary | 64 | 400/413 reject inputs; 429 rejects a new key at capacity; existing key still replays |

The counter file is forced to disk, but the registry is volatile. In `crash_after_effect`, the server calls `Runtime.halt(23)` after `force(true)` and before completing the Future. The client sees the connection close; the runner checks exit code 23. After restart, the counter is 1 and the registry is empty. A retry increments again.

Writing the key to a separate file would not automatically solve this: two independent writes still have a gap. If business state and the deduplication result fit in one database transaction, they can commit atomically. External tools or model services need their own idempotency protocol, queryable operation status or a compensation strategy. **This example implements none of those production mechanisms and makes no exactly-once claim.**

## How this fits an assistant

A request budget limits waiting. An idempotency identity groups retries of one intent. Durable history stores complete turns. Success at one layer does not prove success at another: a clean history does not imply that a remote tool never ran, and a deadline does not prove that remote execution stopped.

Sending an idempotency header to a model provider that does not promise support does not prevent duplicate billing. Preserve an “effect unknown; query required” state instead of translating every connection failure into “safe to repeat.”

To keep the experiment small, records have no TTL and are not evicted. At 64 keys, new intents are rejected while old results remain replayable. This sacrifices availability but avoids deleting a record just before a late retry arrives. Production retention must match the business retry window. The counter file's truncate/write sequence is not a power-loss-safe transaction either: only the specified post-write process failure was tested.

## Reproduce and debug

Use JDK 8 and Python 3.12. Maven, Gson, a database and credentials are unnecessary. Write new results to a separate directory:

```sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 009289d3c9314d64a495303d9b16517080282788
python demos/12-idempotent-retry/run.py --java-home "E:/Java/jdk1.8.0_171" --out demos/12-idempotent-retry/target/my-run
python demos/12-idempotent-retry/audit.py demos/12-idempotent-retry/target/my-run
```

Replace `--java-home` with a JDK root containing both `bin/java` and `bin/javac`. The server binds only to `127.0.0.1` on an automatically allocated port. `X-Test-*` failure headers are exclusively for this local experiment, not a public API. Windows/JDK 1.8.0_171 was tested; Linux and macOS were not.

Expect `PASS: 7 cases...`. If concurrent effects exceed one, inspect whether admission was split. If dropping the reply produces no first-attempt error, check that the injection happened before sending a response. Missing `javac` usually means a JRE or wrong path. The audit checks source and evidence hashes; editing result files does not make a valid reproduction.

Exercise: give every retry a new key and predict the final count before running a separate experiment. They become separate intents. Also consider completing the record before performing the effect: a crash could now replay success for an operation that never happened. The design problem is the commit boundary, not simply the header.
