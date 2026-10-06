---
title: "Java LLM practice (10): why is the reader still running after cancellation?"
description: "30 local HTTP connections separate conversation invalidation, reader exit and server work, comparing Future interruption with socket closure."
slug: "/ai-apps/java-transport-cancellation"
status: "published"
published_at: "2026-10-05"
updated: "2026-10-07"
reading_minutes: 11
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:transport-cancellation", "project:hohoo-ai-lab", "doc:ai-apps/java-stream-session-ownership", "doc:ai-apps/java-streaming-boundary"]
---

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
