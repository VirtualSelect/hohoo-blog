---
title: "Java LLM Practice II: How to validate model JSON after HTTP 200"
description: Build a Java 8 output boundary from a real fenced response and three timeouts, with strict validation, a bounded format adapter and reproducible evidence.
slug: /ai-apps/java-structured-output
status: published
published_at: '2026-09-28'
updated: '2026-09-28'
reading_minutes: 16
learning_step: structured-output
domain: ai-apps
article_kind: tutorial
difficulty: intermediate
prerequisites: ["doc:ai-apps/java-first-llm"]
related: ["project:hohoo-ai-lab", "doc:ai-apps/java-first-llm"]
---

The first tutorial connected Java to a multi-turn conversation. This one takes the next step: how can a blog use a model's proposed article category instead of merely printing its reply?

The real run was not a clean success demo. The first response was HTTP 200 but ignored the instruction to omit Markdown fences. Later requests timed out. We retained those results and built a program that rejects invalid output while allowing one explicitly chosen formatting accommodation.

:::note Execution and evidence
Codex executed this work with the author's authorization on September 28, 2026, Beijing time, using the local Java 8 environment and Agnes endpoint. This AI-assisted article does not claim that the author personally reproduced or reviewed it. Four online attempts, offline fixtures, loopback HTTP tests and response replay are identified separately. Code and redacted records live in the independent [hohoo-ai-lab repository](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output).
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

For the inner object, Gson's `JsonReader` checks token types explicitly:

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
