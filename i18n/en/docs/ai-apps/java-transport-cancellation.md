---
title: "Java LLM practice (10): why is the reader still running after cancellation?"
description: "30 local HTTP connections separate conversation invalidation, reader exit and server work; a local supplement connects per-turn socket ownership to a complete-turn journal."
slug: "/ai-apps/java-transport-cancellation"
status: "published"
published_at: "2026-10-05"
updated: 2026-11-13
reading_minutes: 16
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:transport-cancellation", "project:hohoo-ai-lab", "doc:ai-apps/java-stream-session-ownership", "doc:ai-apps/java-streaming-boundary"]
---

<span id="published-correction"></span>

> **Correction published · 2026-11-13.** [Pinned source and run instructions](https://github.com/VirtualSelect/hohoo-ai-lab/tree/fdea0d8cc8c0a986deee47718cddbe1288afabed/demos/15-cancellable-turn-flow) are now available. Statements below about a local branch or unpublished code describe the 2026-11-12 review snapshot. Historical checkout commands still reproduce the original archive, not this correction. From the companion repository root, run `git checkout fdea0d8cc8c0a986deee47718cddbe1288afabed`, then follow the linked directory README and use a new output directory. Historical results and AI-assistance disclosures are unchanged.

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/503f5271ef0d5baa12353d6eeda672dec5fc240e/demos/10-transport-cancellation) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/503f5271ef0d5baa12353d6eeda672dec5fc240e/demos/10-transport-cancellation/evidence/20261005) · [Experiment record](/labs/transport-cancellation)

Stopping the UI does not necessarily stop the network reader. The [previous study](/docs/ai-apps/java-stream-session-ownership) protected conversation state from late callbacks. This study replaces the in-memory stream with a real loopback HTTP connection and measures when the reader actually exits.

## Three meanings of cancellation

| Layer | Desired effect | Evidence |
| --- | --- | --- |
| Conversation | Old previews and answers cannot update state | Final Session history and events |
| Client transport | The blocked reader terminates | A timestamp and latch inside the worker's finally block |
| Server | Generation or computation stops | Work steps recorded by the local fixture |

A successful `Future.cancel(true)` attempts interruption; its cancelled status is not proof that the worker has terminated. [Java 8 Future reference](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/Future.html)

## A real connection with a deliberately narrow protocol

The Java 8 fixture binds a classic blocking Socket to loopback on an ephemeral port. It serves connection-close HTTP/1.1 with a `text/event-stream` body. It does not implement TLS, chunked encoding, proxies or HTTP/2. The A6 SSE parser and A7 Session are reused unchanged.

Five conditions × two policies × three repetitions produce **30 local connections**: six normal controls and 24 cancellations/deadlines. Both policies invalidate the Session ticket, then call `future.cancel(true)`. Only `close-socket` additionally closes the connection.

| Condition | Server behavior | Action |
| --- | --- | --- |
| Complete | First text, stop, DONE | None |
| Cancel stalled | First text, then wait for cleanup | Cancel after first preview |
| Cancel dripping | Eight bounded work steps with requested 80ms sleeps | Cancel after first preview |
| Deadline stalled | First text, then silence | Cancel about 200ms after reader start |
| Deadline dripping | Continue eight work steps | Same deadline |

The idle read timeout is 500ms. An 80ms sleep request does not guarantee an exact send interval: scheduling and buffering matter. Recorded time, rather than eight times eighty, is the result.

## A cancelled Future can leave a live reader

Time below runs from the beginning of the cancellation action to the worker's finally timestamp. Values are milliseconds: median and minimum–maximum of three observations.

| Condition | Interrupt only | Also close Socket |
| --- | ---: | ---: |
| Cancel stalled | 507.211 (501.246–509.968) | 0.137 (0.119–0.389) |
| Cancel dripping | 747.739 (740.487–750.737) | 0.176 (0.173–0.181) |
| Deadline stalled | 310.534 (309.455–310.868) | 0.418 (0.402–0.710) |
| Deadline dripping | 532.356 (526.331–543.952) | 0.420 (0.316–0.536) |

<img src="/media/practice/transport-cancellation.png" width="1500" height="600" loading="lazy" alt="Reader exit times for two cancellation policies, with separate horizontal scales and observed ranges.">

The panels use different horizontal scales: compare numbers, not bar lengths. These are fixed local observations on Java 1.8.0_171, not an SLA or a claim about every Java HTTP client.

Interrupt-only stalled runs ended in `SocketTimeoutException`. Dripping runs read the whole answer, but Session rejected the late completion as `STALE_COMPLETE`. All twelve fault runs that closed the socket ended in `SocketException`. Closing a Socket wakes threads blocked in its I/O by throwing that exception. [Java 8 Socket reference](https://docs.oracle.com/javase/8/docs/api/java/net/Socket.html#close--)

## Observe worker exit independently

After cancellation, `future.get()` can report cancellation before the worker returns. The fixture records exit inside the actual worker:

```java
try {
    String answer = reader.read(input, text -> session.preview(ticket, text));
    session.complete(ticket, answer);
} finally {
    exitedAt.set(System.nanoTime());
    workerExited.countDown();
}
```

The cancellation side invalidates state before attempting transport cleanup:

```java
session.cancel();
future.cancel(true);
socket.close();
workerExited.await(5, TimeUnit.SECONDS);
```

These are excerpts; the complete fixture also closes resources and joins its server thread. Neither I/O nor waiting belongs inside the Session lock, where it could prevent the cancelling thread from acquiring ownership of the state.

All 24 cancelled runs committed zero history. Each normal run committed one question/answer pair. Identical conversation correctness therefore concealed very different resource-release behavior.

## Idle timeout is not a request deadline

A 500ms idle timeout limits a blocking read's wait for data. A stream that keeps supplying data can run much longer overall. The independent 200ms timer does not wait for another SSE event before firing.

This fixture starts its deadline **after connection establishment and request writing**. DNS, connect and request write are outside the measured boundary. A full-request deadline would need to propagate the remaining budget into those stages and handle cancellation racing with connection creation; this study does not implement that extension.

## Client cleanup does not prove remote cancellation

The dripping fixture deliberately continues its eight bounded work steps after a failed write. Both policies therefore leave eight recorded server steps. This demonstrates a missing implication, not a provider policy: a closed client connection alone does not prove remote work has stopped.

No Agnes endpoint or billing data was used. A real provider's cancellation acknowledgement and billing behavior require its protocol and actual evidence. Separate state such as `sessionInvalidated`, `readerExited` and a future `remoteCancellationAcknowledged` is more honest than one overloaded flag.

## Reproduce and inspect the evidence

In `demos/10-transport-cancellation`, prepare Java 8, Maven and Python. Adapt the local Maven executable path in `run.py` on another machine. The runner uses offline Maven; resolve declared dependencies first on a fresh installation.

```text
python run.py --out evidence/my-run
python audit.py evidence/my-run
```

Use a new output directory. `results.json` contains all 30 observations and Session events; `environment.json` identifies the JVM; `manifest.json` pins source and result hashes. The independent audit checks unique conditions, history counts, timestamp ordering and server steps. It intentionally does not use sub-millisecond exit as a pass threshold.

Inspect one interrupt-only dripping record. Together, `futureCancelledAtAction`, `workerExitedAtAction`, `outcome` and empty `history` show a cancelled Future, an active reader, a complete protocol response and a rejected stale commit.

## What remains to test

This is a classic Socket teaching experiment. SDK connection pools, concurrent requests, completion/cancellation races and cancellation before connect need separate tests. The useful next step is to instrument the actual HTTP client, not turn this narrow fixture into a production SDK.

## Fix follow-up · 2026-10-07

2026-10-07 correction: Demo08–10 now validate JSON lexical spelling; each passes 53 offline checks. Maven argument lists preserve output paths containing spaces, and Demo10 audits source fingerprints. The article’s pinned revision and original data remain unchanged; these fixes are not new online model results.

[Fixed code and regression commands](https://github.com/VirtualSelect/hohoo-ai-lab/blob/1d5a9fad9607ec981094c19a2381475762cd0d23/REVIEW-FIXES-20261007.md).

## Connecting cancellation to durable turns

**Local supplement · 2026-11-12.** This is an AI-assisted integration reference that was run locally; the author has not independently reproduced it. Replies are fixed SSE fixtures, with no model calls. The original 30 measurements, pinned revision and evidence above remain unchanged. The new code is on a local companion-repository branch and has no published pinned revision yet.

The [whole-turn supplement](/docs/ai-apps/java-durable-turns#composing-one-complete-turn) connects request projection, one send and a complete-turn journal, but only reads the cancellation flag at checkpoints. A reader waiting for the next SSE fragment cannot reach the next check. The turn can therefore lose permission to commit while its connection and worker remain occupied.

The missing piece is **resource ownership and handoff**, not another history store. The worker remains the sole owner and writer of `TurnJournal`; the existing `TurnFlow` commit checks remain in place. Demo 10's separate `Session` history is not layered on top. The adapter reuses the [reader with the JSON lexical correction](https://github.com/VirtualSelect/hohoo-ai-lab/blob/7fb37e8cdc7420c41fa474867b1fb268e97564e9/demos/10-transport-cancellation/src/main/java/com/hohoo/ailab/stream/StreamReader.java), separately from the original experiment revision above.

### One turn owns its own connection

Suppose A has finished and B is reading. A delayed “stop A” callback that closes a global `currentSocket` could close B instead. Reusing a resettable cancellation flag has the same ownership problem: A's callback still holds it.

Each turn therefore gets a fresh `CancellationLease`, containing a flag that is never reset and its single connection. Cancellation first revokes commit eligibility, detaches the owned resource, then closes it outside the monitor. This is an excerpt from the actual class, not a standalone compilable program:

```java
public void cancel() throws IOException {
    // Revoke eligibility even if close fails or registration arrives later.
    cancelled.set(true);
    Closeable closing;
    synchronized (this) { closing = owned; owned = null; }
    if (closing != null) closing.close();
}
```

Registration checks the flag too. If cancellation happens first, registration immediately closes the late Socket. If registration wins, cancellation detaches and closes it. Registration and detachment share a monitor; actual close happens outside it, so I/O does not hold the handoff lock.

The adapter registers the Socket before `socket.connect(...)`, making a created but unconnected resource visible to cancellation. Normal completion releases the same resource; A's old lease never contains B's Socket. The [Java 8 `Socket.close()` contract](https://docs.oracle.com/javase/8/docs/api/java/net/Socket.html#close--) specifies `SocketException` for blocked I/O on the closed socket. This addresses a local wait, not acknowledgment of remote task completion.

### Read the control before reading “passed”

The local server emits `fixture:` and waits at a continuation gate. In `flag-only`, the cancellation flag alone is set. At the end of a 100ms observation window, the worker has not signaled exit. Explicit cleanup then closes the connection, and the worker exits before the server is released. In `close-reading`, cancellation through the lease after the first fragment likewise confirms exit before server release.

The exit signal comes from the worker's own `finally`; a subsequent `join` checks actual termination. `Future.isDone()` is not a substitute. The 100ms window is a fixed control observation, not a response-time target or cancellation-latency distribution.

| Handoff / case | Requests received by server | New complete turns | What this run establishes |
| --- | ---: | ---: | --- |
| Normal completion | 1 | 1 | Commit after complete SSE validation |
| Cancel before start, before registration, or after registration but before connect (one case each) | 0 each | 0 each | No send; any created resource ends closed |
| Flag only: `flag-only` | 1 | 0 | Still blocked at observation; explicit close precedes exit before gate release |
| Close during read: `close-reading` | 1 | 0 | Exit and commit rejection are checked separately |
| Reply complete, cancelled before commit check: `before-commit` | 1 | 0 | A complete candidate cannot bypass the commit check |
| A committed; cancel old A lease while B reads | 2 | 2 | The old handle does not revoke B's resource or eligibility |

Each of the eight cases seeds one history turn. Of 11 final stored records, eight are seeds and three are new commits; 11 is not a success count. The table counts actual received requests and newly committed turns, excluding prior history.

Once the server's gate is released, it still executes the remaining fixed work step, recording two steps per request in total. A terminated reader does not establish stopped remote computation, much less stopped billing.

### Running the local supplement

First obtain `demos/15-cancellable-turn-flow` from the companion repository's local `codex/bounded-turn-flow-20261112` branch. Neither the original pinned revision nor the reader-correction revision above contains this new directory; those revisions still reproduce their own versions. Run from the companion repository root, replacing Java and Gson paths with local paths:

```sh
python demos/15-cancellable-turn-flow/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out demos/15-cancellable-turn-flow/out/my-run
python demos/15-cancellable-turn-flow/audit.py demos/15-cancellable-turn-flow/out/my-run --verify-sources
```

The output directory must not exist. Using existing Java 8, Python 3 and Gson 2.10.1, the runner first repeats the reader's 53 lexical checks, then runs eight cases. It installs nothing and reads no model credentials. Independent checks reconcile `results.json`, actual requests, complete journal frames and source fingerprints.

Predict this first: **why should cancellation after a complete reply still leave the journal unchanged?** Compare `before-commit`'s `completeCandidate=true` with its seed-only journal. Then inspect `flag-only`: `workerExitedAtControlObservation=false` and `workerExitedBeforeServerRelease=true` describe different stages, so they do not conflict.

`SocketFixtureReplyClient` accepts only loopback, narrow HTTP/1.1 close framing and SSE. TLS, authentication, chunked responses, blocked writes, real blocked connects and connection pools are untested. Connect/read timeouts are not a strict total deadline. Cancellation after the final check can still race with persistence and cannot undo committed records. Choose the actual client and commit semantics before testing those protocols; this narrow adapter is not ready for public endpoints.
