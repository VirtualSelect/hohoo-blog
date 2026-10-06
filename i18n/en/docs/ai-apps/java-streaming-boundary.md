---
title: "Java LLM practice (8): should an interrupted stream enter conversation history?"
description: "22 loopback HTTP cases separate incremental preview from committing history, testing UTF-8, SSE framing, cancellation and abnormal endings."
slug: "/ai-apps/java-streaming-boundary"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-07"
reading_minutes: 11
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:streaming-boundary", "project:hohoo-ai-lab", "doc:ai-apps/java-first-llm", "doc:ai-apps/java-grounded-claims"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ad2929e2b2b7decdb578d16e4ccafb666496ebfd/demos/08-streaming-boundary) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ad2929e2b2b7decdb578d16e4ccafb666496ebfd/demos/08-streaming-boundary/evidence/20261003-r2) · [Experiment record](/labs/streaming-boundary)

HTTP 200 has arrived and half an answer is already visible. If the connection now closes, did the turn succeed? Appending that fragment to `messages` turns a display problem into a context problem: the next request treats an unfinished answer as conversation history.

This experiment separates **incremental preview from committing a completed turn**. Twenty-two frozen cases run through a real local HTTP connection. Six complete; sixteen fail or cancel without changing history. There are no Agnes requests and no claim of compatibility with a live provider's streaming protocol.

## Four boundaries, four responsibilities

| Layer | Question | Common mistake |
| --- | --- | --- |
| Byte reads | How many bytes did `read` return? | Treating one read as a token or JSON message |
| UTF-8 decoding | Is a multibyte character complete? | Decoding each byte buffer independently |
| SSE framing | Has a blank line ended the event? | Parsing each `data:` line separately |
| Turn validation | Did the application protocol finish? | Equating HTTP 200, EOF or visible text with success |

Line endings, comments and joined data lines follow the [WHATWG SSE specification](https://html.spec.whatwg.org/multipage/server-sent-events.html). `choices`, `finish_reason` and `[DONE]` belong to this example's application protocol; SSE itself does not define them.

## Preserve decoder state across reads

A Chinese character can straddle two reads. Independently decoding the first incomplete buffer can insert a replacement character; decoding the next buffer cannot restore the lost state. A bigger buffer does not guarantee character alignment.

```java
Reader reader = new InputStreamReader(
    input,
    StandardCharsets.UTF_8.newDecoder()
        .onMalformedInput(CodingErrorAction.REPORT)
        .onUnmappableCharacter(CodingErrorAction.REPORT)
);
```

The fixtures cap client bulk reads at one or seven bytes. This determines decoder input boundaries, **not TCP packet boundaries**. Server writes and network packets may still be coalesced.

Independently decoding every byte of `one-byte.sse` produces 13 replacement characters. The persistent decoder yields `你好，Java 🌱`. This is a fixed-input result, not an estimated network failure rate. The one-byte path records 253 read calls versus 37 for the seven-byte path; neither count establishes throughput.

## Dispatch complete SSE events

These two data lines form one event. Their values must be joined with a newline and dispatched only when the blank line arrives.

```text
data: {
data: "choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}

```

`StreamReader` accepts LF, CRLF, bare CR, a leading BOM and comment lines. It does not reconnect automatically using `id` or `retry`: reconnecting requires decisions about duplicated preview and repeated side effects.

The JSON layer rejects duplicate keys, trailing data and excessive nesting. The deliberately narrow text protocol accepts one choice at index zero, role/content deltas and optional usage frames. Tool-call deltas are refused. Tool arguments need their own assembly and validation state machine; renderable text does not establish executable arguments.

## Preview is not history

This contract requires nonempty text, `finish_reason: "stop"`, then a normally dispatched `[DONE]` event. Only a successful return permits appending the current user message and full answer:

```java
String answer = reader.read(input, this::updatePreview);
// Reached only after successful protocol completion.
history.add("U:" + question);
history.add("A:" + answer);
```

This excerpt explains the order; `Suite` verifies it with a fixed question and list. Failure closes the connection and may retain a visible preview, but leaves formal history untouched. Retrying must not accumulate duplicate user messages.

This is a single-request commit boundary, not a database transaction or a concurrent session lock. A service also needs request identity so an old completion cannot modify a newly selected conversation.

## Results from all 22 cases

<img src="/media/practice/streaming-boundary.png" width="1500" height="600" loading="lazy" alt="Visible previews in 22 SSE cases: six green committed cases and sixteen refused cases, some of which still displayed text." />

| Cases | Count | Observed outcome |
| --- | ---: | --- |
| Read caps, line endings, multiline data, BOM/heartbeat | 6 | Same complete answer; history grows from 2 entries to 4 |
| Missing or unterminated DONE | 2 | `INCOMPLETE_STREAM` despite partial preview |
| DONE without stop, text after stop, tool delta | 3 | `PROTOCOL` |
| Length finish, provider error event | 2 | `INCOMPLETE_FINISH`, `PROVIDER_ERROR` |
| Malformed/duplicate JSON, invalid UTF-8 | 3 | Parsing fails; history unchanged |
| Oversized line or output | 2 | `LIMIT` |
| Wrong MIME, HTTP 503 | 2 | Refused before the text protocol |
| Cancellation, read timeout | 2 | `CANCELLED`, `READ_TIMEOUT` |

The length-finish fixture displays the entire test string but still fails. A sentence looking complete is not evidence that generation ended normally.

Cancellation is injected after the preview reaches three Java character units. The timeout fixture sends headers, delays 400ms, and encounters a 100ms client read timeout. Neither commits history. Raw SSE, status and history sizes are archived; an independent audit checks hashes, frozen labels and commit conditions.

## Bound resources and state the units

Limits are 8,192 Java UTF-16 units per line and event, 65,536 input units, 4,096 output units, 256 data events and JSON depth 16. The chart counts Unicode code points instead; emoji illustrate why the units differ.

A two-second processing deadline is checked after reading each character. It cannot preempt an arbitrary blocking read, so connection and socket timeouts remain separate. The fixtures cover line/output overflow, not every possible resource-limit combination.

## Reproduce, then modify one boundary

Use Java 8, Maven and Python 3. Java uses the existing Gson 2.10.1 dependency. Auditing requires only Python's standard library; plotting requires Matplotlib.

```sh
python demos/08-streaming-boundary/run.py --out demos/08-streaming-boundary/evidence/MY-RUN
python demos/08-streaming-boundary/audit.py demos/08-streaming-boundary/evidence/MY-RUN
```

Pass `--maven` for an explicit executable and `--offline` when dependencies are cached. Use a new output directory. The archive is `20261003-r2`: an initial attempt stopped while resolving an unpinned plugin, before any HTTP case ran. The runner then reused the repository's pinned plugin.

Change `stop` to `length` to see visible text without commitment. Remove the final blank line after DONE to see a terminal-looking string that never becomes a complete event. A live integration still needs provider-specific checks for errors, usage frames and tool deltas.

The useful result is a lifecycle distinction: temporary display and reusable conversation history need different acceptance rules. Concurrent cancellation, request identity and idempotent retries remain follow-up work; automatic retry is not the default fix for every failure.

## Fix follow-up · 2026-10-07

2026-10-07 correction: Demo08–10 now validate JSON lexical spelling; each passes 53 offline checks. Maven argument lists preserve output paths containing spaces, and Demo10 audits source fingerprints. The article’s pinned revision and original data remain unchanged; these fixes are not new online model results.

[Fixed code and regression commands](https://github.com/VirtualSelect/hohoo-ai-lab/blob/1d5a9fad9607ec981094c19a2381475762cd0d23/REVIEW-FIXES-20261007.md).
