---
title: "Java LLM practice 3: don't let a failed request change conversation history"
description: "Candidate snapshots, complete-pair commits and a UTF-8 request budget: 41 offline checks for history that survives failed requests."
slug: /ai-apps/java-transactional-history
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 10
domain: ai-apps
article_kind: case-study
difficulty: intermediate
related: ["doc:ai-apps/java-first-llm", "doc:ai-apps/java-structured-output", "doc:ai-apps/typescript-output-boundary", "lab:transactional-history", "project:hohoo-ai-lab"]
---

[The first Java article](/docs/ai-apps/java-first-llm) showed that each request resends conversation history. A longer-lived program needs a stronger rule: which turns should enter history, and what survives a failure?

A timed-out question left in history produces a transcript different from what the user received. Trimming the original list before that failed request can also erase successful conversation.

Demo 05 separates a candidate request from committed history. **41 offline checks passed, with 13 synthetic transport invocations and zero network requests.** This tests application state, not model memory.

[Demo](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/05-transactional-chat) · [Session implementation](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/05-transactional-chat/src/main/java/com/hohoo/ailab/history/Session.java) · [Recorded checks](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/05-transactional-chat/evidence/20260930-contract.json)

## 1. The commit boundary

```text
History → copy candidate → add question → trim candidate → request → validate → commit pair
```

Committed history remains unchanged during the request. Replace it only after a complete accepted reply. A failed candidate is discarded.

“Transaction” here means in-process session state. It is neither a database transaction nor a rollback of work done by the provider.

## 2. Why copy instead of add then remove?

The introductory demo removes the pending user message after failure. Once trimming and additional rejection paths are involved, maintaining rollback code becomes harder.

```java
List<Message> candidate = new ArrayList<Message>(committed);
candidate.add(new Message("user", question));
Reply reply = transport.send(request);
if (reply == null || reply.content == null ||
        reply.content.trim().isEmpty()) {
    throw new Failure("EMPTY");
}
if (!"stop".equals(reply.finishReason)) {
    throw new Failure("INCOMPLETE");
}
candidate.add(new Message("assistant", reply.content));
committed = candidate;
```

Request construction and capacity trimming are omitted here; the repository has the full implementation. The final assignment is the only successful history replacement. Public snapshots are detached and unmodifiable, and message fields are immutable.

## 3. What may commit?

| Result | Action |
|---|---|
| Nonempty content and finish_reason=stop | Commit the user/assistant pair |
| HTTP 429 or another non-2xx | Do not commit |
| Timeout or I/O failure | Do not commit |
| Malformed response envelope | Do not commit |
| Empty content | Do not commit |
| length, missing or another finish reason | Do not commit |
| Empty question or oversized current request | Reject before transport |

This is plain text chat, not a tool loop. Supporting tool_calls requires a different completion boundary rather than casually expanding the accepted-reason list. A stop reason also does not establish factual correctness.

## 4. Evict whole pairs

The console retains up to four committed pairs. A request can include those four pairs plus the current question; after the new reply commits, the oldest pair is removed.

```text
Broken boundary: assistant1 → user2 → assistant2 → user3
This demo:       user2 → assistant2 → user3
```

The system instruction is constructed separately and never evicted. The current question is kept intact. If it alone exceeds the budget, reject it rather than silently truncating it.

## 5. Bytes are not tokens

The console also caps the serialized request at 16000 UTF-8 bytes, including model, system, roles and escaping:

```java
while (request.getBytes(StandardCharsets.UTF_8).length > maxRequestBytes
        && candidate.size() > 1) {
    candidate.subList(0, 2).clear();
    request = serialize(candidate);
}
```

This is a deterministic wire-size limit, not a context-window or billing estimate. A long accepted reply may force eviction of its pair on the next request. This demo does not summarize messages or treat generated summaries as original memory.

## 6. The subtle failure: trim, then time out

A test commits a long answer, builds a candidate that requires eviction, then injects TIMEOUT. The expected result is that the original successful pair remains intact.

After a successful request, however, the committed transcript becomes exactly the sent candidate plus its reply. Evicted history must not unexpectedly reappear. Failure preserves the old state; success reflects the context actually used.

## 7. What the offline run establishes

Maven ran Java 1.8.0_171 with Gson 2.10.1. Forty-one assertions cover ordering, rollback, pre-transport rejection, model selection, whole-pair trimming, immutable snapshots, UTF-8 limits and malformed envelopes.

Thirteen calls go to in-process test doubles. TIMEOUT, HTTP_429 and PARSE are injected events, not recorded provider failures. They establish state transitions, not network behavior, model recall or universal online compatibility.

The report contains check names, synthetic request JSON, Java version and source SHA-256 hashes.

## 8. Online entry and timeout meaning

The optional `--live` entry uses `agnes-3.0-flash` and an AGNES_API_KEY environment variable. It was not executed in this run.

Connect timeout is 10 s; read timeout is 90 s; the response body is capped at 256 KiB. Error bodies are not printed, and there are no automatic retries. A timeout does not establish that the provider did no work or incurred no cost.

The [Java 8 URLConnection documentation](https://docs.oracle.com/javase/8/docs/api/java/net/URLConnection.html#setReadTimeout-int-) describes read waiting, not a total request deadline. A reliable overall deadline requires additional cancellation and reconciliation design.

## 9. Run it

From `demos/05-transactional-chat`:

```bash
mvn -q compile
mvn -q exec:java "-Dexec.args=--self-test evidence/my-run.json"
```

CREATE_NEW prevents overwriting an existing report. After explicitly configuring your own environment variable, online chat can be started with:

```bash
mvn -q exec:java "-Dexec.args=--live"
```

Type exit to finish. Restarting clears memory. No account, disk persistence or cloud synchronization is implied.

## 10. What production still needs

Session uses synchronized to serialize calls while holding the lock during network waiting. That is understandable for a console, but not a final concurrent-service architecture.

There is no cross-process consistency, request idempotency, cancellation reconciliation, persistence or streaming transaction. Next, validate the real request/response adapter in an authorized live session, then separately design versioned commits for concurrent requests. Offline checks do not complete either task.

Together with [the TypeScript boundary experiment](/docs/ai-apps/typescript-output-boundary), this establishes two distinct boundaries: validate external output, then commit a complete accepted turn.
