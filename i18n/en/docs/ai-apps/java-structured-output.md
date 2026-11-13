---
title: "Java LLM Practice II: How to validate model JSON after HTTP 200"
description: Check a field contract in Java 8 using a real fenced response and three timeouts, with bounded adaptation and a verified lexical gap in the original validator.
slug: /ai-apps/java-structured-output
status: published
published_at: '2026-09-28'
updated: 2026-11-13
reading_minutes: 16
learning_step: structured-output
domain: ai-apps
article_kind: tutorial
difficulty: intermediate
prerequisites: ["doc:ai-apps/java-first-llm"]
related: ["project:hohoo-ai-lab", "doc:ai-apps/java-first-llm"]
---

<span id="published-correction"></span>

> **Correction published · 2026-11-13.** [Pinned source and run instructions](https://github.com/VirtualSelect/hohoo-ai-lab/tree/fdea0d8cc8c0a986deee47718cddbe1288afabed/demos/04-structured-output) are now available. Statements below about a local branch or unpublished code describe the 2026-11-12 review snapshot. Historical checkout commands still reproduce the original archive, not this correction. From the companion repository root, run `git checkout fdea0d8cc8c0a986deee47718cddbe1288afabed`, then follow the linked directory README and use a new output directory. Historical results and AI-assistance disclosures are unchanged.

[Open the validation bench: edit a recorded response and inspect rejection layers →](#output-validation)


The first tutorial connected Java to a multi-turn conversation. This one takes the next step: how can a blog use a model's proposed article category instead of merely printing its reply?

The real run was not a clean success demo. The first response was HTTP 200 but ignored the instruction to omit Markdown fences. Later requests timed out. We retained those results and built a program that rejects invalid output while allowing one explicitly chosen formatting accommodation.

:::note Execution and evidence
The experiment ran on September 28, 2026, Beijing time, using the local Java 8 environment and Agnes endpoint. Four online attempts, offline fixtures, loopback HTTP tests and response replay are identified separately. Code and redacted records live in the independent [hohoo-ai-lab repository](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output).
:::

## 1. Define a usable result before prompting

The task is to classify an article summary. The expected shape is:

```json
{
  "category": "ai-apps",
  "tags": ["Java", "JSON"]
}
```

This is a format example, not a model response.

| Field | Constraint | Purpose |
| --- | --- | --- |
| category | ai-apps, llm, embodied-ai or needs-review | Prevent nonexistent site categories |
| tags | 1–3 distinct, nonempty strings | Keep downstream rendering predictable |
| Each tag | At most20 Unicode code points; no control characters or surrounding whitespace | Bound malformed input |
| Object | Exactly these two fields, with no duplicate keys | Reject omissions, extra instructions and overwrites |

The `needs-review` value means unrelated or insufficient evidence. It is a workflow value, not a fourth research track. Without an abstention option, a cooking article may be forced into an AI category.

[contract.schema.json](https://github.com/VirtualSelect/hohoo-ai-lab/blob/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output/contract.schema.json) documents the local contract. It is **not sent to Agnes**. Java additionally rejects duplicate keys and control characters; this small validator is not a full JSON Schema implementation.

## 2. There are two JSON layers

The API response is already JSON, but `message.content` remains a string:

```text
HTTP response body
└─ API JSON: choices, message, finish_reason, usage
   └─ message.content: model-generated string
      └─ Business JSON: category, tags
```

Four questions must be checked separately:

1. **Transport:** did an acceptable HTTP response arrive?
2. **Protocol:** is there a completed assistant message with content?
3. **Structure:** does the content satisfy the classification contract?
4. **Meaning:** is the category appropriate for this article?

Passing an earlier stage does not imply passing the next. A cooking article labeled `llm` can have perfectly valid fields and still be wrong. This program checks the first three boundaries; it does not replace labeled evaluation or semantic review.

## 3. The first real HTTP 200 was rejected

The endpoint and model are unchanged from the first tutorial:

```text
POST https://apihub.agnes-ai.com/v1/chat/completions
model: agnes-2.5-flash
```

The system message specified the category and tag rules and requested JSON without Markdown or explanation. The user message described a Java HTTP/Gson example, including a quoted term and a newline. Gson serialized the request instead of manually concatenating escaped text.

The returned `content` was this **string representation**, with its original Chinese tags preserved:

```json
"\n\n```json\n{\"category\":\"ai-apps\",\"tags\":[\"LLM应用\",\"API集成\",\"多轮对话\"]}\n```"
```

The outer response reported HTTP200 and `finish_reason=stop`, with431 prompt,79 completion and510 total tokens. The strict inner parser encountered the fence and raised `MalformedJsonException`.

This attempt demonstrates that the prompt's formatting request was not guaranteed on this call. It does not establish a permanent model limitation or a stable failure rate. [Read the complete selected response fields](https://github.com/VirtualSelect/hohoo-ai-lab/blob/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output/evidence/live-20260928/live-1.json).

## 4. Validate the boundary in Java

The implementation separates four responsibilities:

| Class | Responsibility |
| --- | --- |
| ChatClient | HTTPS, timeouts, size limit and status |
| Classification | API envelope and business-object validation |
| ContentFormat | Optional, bounded format adaptation |
| StructuredOutput | Requests, modes and evidence writing |

The envelope must contain an assistant message, normal stop and nonempty content. This example rejects `finish_reason=length` even if the visible fragment resembles complete JSON.

For the inner object, Gson's `JsonReader` checks token types explicitly. This excerpt is from the **original pinned revision**. `setLenient(false)` still has a lexical gap; it does not establish rejection of every invalid JSON text. See the review below:

```java
JsonReader reader = new JsonReader(new StringReader(text));
reader.setLenient(false);

require(reader.peek() == JsonToken.BEGIN_OBJECT, "object_required");
reader.beginObject();

Set<String> seen = new HashSet<String>();
while (reader.hasNext()) {
    String key = reader.nextName();
    require(seen.add(key), "duplicate_field");
    // Validate category and tags; reject unknown fields.
    // See Classification.java for the full implementation.
}
```

The local `require` method throws on failure; it is not Java's optional `assert`. A value that can be converted into a string is not necessarily a JSON string. A numeric tag such as12 is rejected instead of being silently coerced.

Duplicate keys are rejected too:

```json
{"category":"llm","category":"ai-apps","tags":["Java"]}
```

The parser must not silently let a later value overwrite an earlier one. It also requires the end of the document, rejecting another object after an otherwise valid one.

<span id="json-lexical-review"></span>

### 2026-11-12 review: a field contract does not establish valid JSON syntax

The article's unchanged pinned code accepts this **invalid input** offline, decoding its tag to `can't`:

```text
{"category":"llm","tags":["can\'t"]}
```

A plain apostrophe is allowed inside a double-quoted JSON string. The extra backslash in `\'` is the problem: [RFC 8259 section 7](https://www.rfc-editor.org/rfc/rfc8259#section-7) does not include that escape. [Gson 2.10.1's `readEscapeCharacter`](https://github.com/google/gson/blob/gson-parent-2.10.1/gson/src/main/java/com/google/gson/stream/JsonReader.java#L1567) handles it without checking `lenient`. Valid decoded fields therefore do not prove valid original JSON spelling.

The local correction checks string spelling before `JsonReader`: only JSON escapes, four ASCII hexadecimal digits after a Unicode escape, and no unescaped control characters. Field names, duplicate keys, types and business rules still use the original checks. Plain `can't`, `can\u0027t`, and valid escaped backslashes/quotes remain accepted; banning apostrophes would be an incorrect repair. Fence adaptation uses the same entry. That lexical correction passed 41 offline checks, including six added regressions. The following review extends the HTTP boundary. This is not a full JSON Schema implementation.

**The correction is local, uncommitted and unpublished. The linked historical revision still has this defect.** The original 35 checks and 32-case Java/TypeScript comparison did not include this counterexample. Their archived results remain unchanged, and the four real model calls were not repeated. Do not reuse the old boundary with `setLenient(false)` as its only lexical safeguard.

<span id="response-json-review"></span>

### The response text can change before JSON validation

The correction above protects inner strings; the response envelope needs a separate check. In a loopback HTTP fixture, replace the question-mark byte in tag `a?b` with invalid UTF-8 byte `FF`. The old `ChatClient` silently decodes it as `a�b`, which still satisfies the classification contract. It validates replacement text rather than the original response.

[Java 8's `String(byte[], Charset)`](https://docs.oracle.com/javase/8/docs/api/java/lang/String.html#String-byte:A-java.nio.charset.Charset-) replaces malformed sequences. The local correction instead reports decoding errors before building a JSON tree:

```java
String json = StandardCharsets.UTF_8.newDecoder()
    .onMalformedInput(CodingErrorAction.REPORT)
    .onUnmappableCharacter(CodingErrorAction.REPORT)
    .decode(ByteBuffer.wrap(responseBytes)).toString();
```

Banning `�` would be wrong. A valid U+FFFD character is encoded as `EF BF BD`, unlike the malformed byte `FF`. Valid `a�b` must remain accepted unchanged.

| Loopback response input | Old client | Local correction |
| --- | --- | --- |
| Bad `FF` byte in a tag | Replaces, then accepts | Rejects during UTF-8 decoding |
| Valid `�` (`EF BF BD`) | Accepts | Preserves and accepts |
| Comments or single/unquoted envelope fields | Accepts | Rejects outer JSON |
| Repeated `content` in one message | Accepts the later value | Rejects duplicate names |
| Envelope `TrUe` or `NULL` | Accepts | Rejects the spelling |

Setting a reader to false and passing it to the tree parser is insufficient: [Gson 2.10.1's `JsonParser` temporarily enables leniency](https://github.com/google/gson/blob/gson-parent-2.10.1/gson/src/main/java/com/google/gson/JsonParser.java#L96). The new local `JsonInput` reuses lexical checks, verifies structure, decoded names within each object and end-of-document with the streaming reader, then builds the Gson tree. The legacy reader also recognizes mixed-case keywords, so their original spelling is checked separately, without repairing invalid values. Separate objects may each have a `content` field.

This is the demo client's input boundary, not a general JSON Schema implementation. The existing 1 MB response limit remains; object/array nesting is capped at 64 containers including the root. An initial UTF-8 BOM remains allowed, a parser compatibility choice permitted by [RFC 8259 section 8.1](https://www.rfc-editor.org/rfc/rfc8259.html#section-8.1). The cost of prevalidation followed by tree construction was not measured. The browser validator below receives decoded strings and cannot reproduce malformed wire bytes.

All 60 local offline checks pass: the earlier 41 plus 19 loopback-response cases. Chinese text, valid U+FFFD, valid numbers/booleans, identical names in separate objects and the 64-container boundary remain accepted; 65 containers are rejected. All original 32 string cases still match their expectations. **This correction is uncommitted and unpublished; pinned links retain the old implementation.** The original 35-check records, 32-case archive and four real model requests are unchanged. This round connects only to 127.0.0.1, not a model provider, and establishes no provider reliability result.

## 5. Adapt one wrapper without repairing arbitrary content

The real response's inner object satisfies the contract. A product may continue to reject the surrounding fence, or explicitly allow this particular wrapper:

```java
String normalized = ContentFormat.unwrapOneJsonFence(raw);
Classification result = Classification.parse(normalized);
```

The adapter only removes a single complete `json` fence enclosing the entire response. Explanations before it, text after it and multiple code blocks remain invalid. The same strict validator runs afterward.

It does not guess categories, rewrite `java` into `ai-apps`, or hunt through arbitrary prose for braces.

We **replayed the saved first response offline**. The selected result was:

```json
{
  "transformation": "unwrap-one-json-fence",
  "accepted": true,
  "classification": {
    "category": "ai-apps",
    "tags": ["LLM应用", "API集成", "多轮对话"]
  }
}
```

This is local processing of an earlier real response, not another successful model call. The replay record includes the original evidence path and SHA256.

## 6. JSON mode is not Schema-constrained output

| Mechanism | Intended constraint | What this run established |
| --- | --- | --- |
| Prompt-only JSON | Natural-language formatting instructions | One fenced response was observed |
| JSON mode | Legal JSON on providers supporting the feature | The explicit probe timed out; support remains unverified |
| Schema-constrained output | Field structure on supporting providers | Not tested; no Agnes capability claim |

The optional probe added:

```json
{"response_format":{"type":"json_object"}}
```

It timed out. That does not prove either support or lack of support. The program keeps it as an explicit capability probe, without automatically enabling it or falling back.

Even a guarantee of legal JSON would not validate `{"category":"java"}` against this application's required fields and enum. Local validation still matters.

## 7. Retain every attempt

| Attempt | Observation | Local decision |
| --- | --- | --- |
| Java summary, prompt-only | HTTP200 with a JSON code fence | Strict rejection |
| Cooking summary, prompt-only | Read timeout | No usable reply |
| MuJoCo summary, prompt-only | Read timeout | No usable reply |
| Java summary, json_object probe | Read timeout | Capability unresolved |

Failed attempts were not removed. No token totals or costs were invented for timeouts. Records contain the request, model, prompt version, time, selected response, exception type and elapsed duration, but no credential, response header or `reasoning_content`.

The connection timeout is10 seconds and the read timeout90 seconds. The latter is not a strict total-request deadline, so elapsed time can exceed90 seconds. A timeout does not determine whether the provider processed or billed the request. There is no automatic retry.

## 8. Run offline before calling the API

From `demos/04-structured-output`, using Java 8 and Maven:

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git
cd hohoo-ai-lab
git checkout 0f91065aeac1cb1da22a20ec87a2ab2c14b21938
cd demos/04-structured-output
mvn -q compile exec:java '-Dexec.args=--self-test'
mvn -q compile exec:java '-Dexec.args=--replay evidence/live-20260928/live-1.json'
```

The first command runs35 offline checks. The second replays the real response. Neither requires a key or calls a model.

For online mode, configure `AGNES_API_KEY` in IDEA's environment variables or the current process. Do not place it in source files or screenshots. This command sends exactly three educational requests to an empty output directory:

```powershell
mvn -q compile exec:java '-Dexec.args=--live evidence/my-run'
```

The explicit JSON-mode probe sends one request:

```powershell
mvn -q compile exec:java '-Dexec.args=--live-json evidence/my-json-probe'
```

[Full setup, code and evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output). This run used Java1.8.0_171 and Gson2.10.1. The second article uses Demo04 because the first article covered Demos01–03.

Among the35 checks, HTTP500, redirects, invalid responses and delayed responses come from a loopback test server. They validate client behavior, not Agnes reliability. One deliberate test accepts a structurally valid `llm` classification with a cooking tag, exposing the boundary of structural validation.

## 9. Check your understanding

<details><summary>Why does HTTP200 not imply successful classification?</summary>

It only passes part of the transport check. Protocol, inner JSON, business fields and meaning still require separate checks. The first real response in this article was200 but failed strict format validation.

</details>

<details><summary>Can a result be trusted after removing its fence?</summary>

No. Removing a wrapper is neither field validation nor semantic verification. The adapter tests still reject an invalid enum afterward.

</details>

<details><summary>Does this implement robot control?</summary>

No. The output is only an article classification, without a publishing or robot-execution integration. Tool Calling needs a separate parameter, permission and result contract. Valid JSON is not authorization to execute an action.

</details>

A useful next practice is to define and validate the parameters of one read-only tool, including its failure behavior, before allowing a model to cause external effects.

## References

- [Gson2.10.1 JsonReader](https://github.com/google/gson/blob/gson-parent-2.10.1/gson/src/main/java/com/google/gson/stream/JsonReader.java): the actual streaming-parser version used.
- [JSON Schema object constraints](https://json-schema.org/understanding-json-schema/reference/object): required properties and additional properties.
- [Agnes](https://platform.agnes-ai.com/) and the repository's recorded attempts: only observed behavior is reported.
