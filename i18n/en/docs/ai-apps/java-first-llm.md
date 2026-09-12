---
title: Calling an LLM with Java 8 — from one request to a conversation
description: Three runnable Java demos explain HTTP requests, JSON parsing, timeouts and conversation history.
slug: /ai-apps/java-first-llm
status: published
published_at: '2026-09-12'
updated: '2026-09-12'
reading_minutes: 15
learning_step: first-call
domain: ai-apps
difficulty: beginner
related: ['project:hohoo-ai-lab']
---

:::note Practice record
This is an AI translation of the Simplified Chinese article, not a human-reviewed translation. The code was written with AI assistance; Hohoo ran the API calls locally. The figures below describe those runs, not a performance benchmark or a promise about the service. Allow approximately 15 minutes to read, plus time to run the examples.
:::

I started with a familiar interface: an HTTP request. First I sent a greeting from an API testing tool, then repeated the request in Java, and finally built a console conversation that could use previous messages.

This walkthrough does not train a model or introduce Spring AI. It follows the data: how a question is sent, where the answer lives, and how the next request gets its context.

## Choose a demo

The [Java LLM Practice project](/projects/hohoo-ai-lab) groups the three stages. These links are pinned to the version used for this article.

| Stage | Question | Code and instructions |
| --- | --- | --- |
| 01 / REQUEST | How does Java send a model request? | [First call](https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/01-first-llm-call) |
| 02 / PARSE | How do we extract the answer? | [Parsing and console input](https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/02-parse-llm-response) |
| 03 / CHAT | How does the next turn use earlier messages? | [Multi-turn chat](https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/03-multi-turn-chat) |

You need Java 8, IDEA and your own Agnes API key. My runtime reported `1.8.0_341`; compilation was also checked with `javac 1.8.0_171`. The first demo uses only the JDK. The other two use Gson 2.10.1 with separate Maven configurations.

## 01 / What goes into a request?

The endpoint came from the platform's example and was verified in these local runs:

```text
POST https://apihub.agnes-ai.com/v1/chat/completions
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

`https://apihub.agnes-ai.com/v1` is the base URL. `/chat/completions` selects the operation. This address is different from the account management website. `YOUR_API_KEY` is a placeholder.

```json
{
  "model": "agnes-2.5-flash",
  "messages": [{ "role": "user", "content": "你好！" }]
}
```

`model` selects the model. `messages` is the list supplied for this request. A user's message has role `user`; a model reply has role `assistant`. The text itself is in `content`.

```java
String apiKey = System.getenv("AGNES_API_KEY");
connection.setRequestMethod("POST");
connection.setDoOutput(true);
connection.setRequestProperty("Authorization", "Bearer " + apiKey);
connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
byte[] requestBytes = requestBody.getBytes(StandardCharsets.UTF_8);
```

This is a focused excerpt. Demo 01 includes stream cleanup and error handling. Keep the key in the `AGNES_API_KEY` environment variable, not in source control. In IDEA, set it in the application's run configuration. An already-running IDEA process does not automatically inherit variables subsequently set in another terminal.

The first Java run returned HTTP 200 and reported 293 input tokens, 104 output tokens and 397 total tokens. The next step was to extract the answer rather than print the entire response.

## 02 / Find the answer in JSON

`responseBody` initially contains a Java string. Gson parses it into objects and arrays. The relevant structure, excerpted from the first Java response, was:

```json
{
  "choices": [{
    "finish_reason": "stop",
    "message": {
      "role": "assistant",
      "content": "\n\n大语言模型是一种基于深度学习和海量文本数据训练的人工智能系统，能够理解、生成和处理复杂的自然语言任务。"
    }
  }],
  "usage": {"prompt_tokens": 293, "completion_tokens": 104, "total_tokens": 397}
}
```

The Chinese text is the actual returned text, not a new English-language run. Follow `choices` → first item → `message` → `content`. Array indexes start at zero.

```java
// Focused excerpt; the full demo validates missing fields and wrong types.
JsonObject root = JsonParser.parseString(responseBody).getAsJsonObject();
JsonArray choices = root.getAsJsonArray("choices");
JsonObject firstChoice = choices.get(0).getAsJsonObject();
JsonObject message = firstChoice.getAsJsonObject("message");
String answer = message.get("content").getAsString();
System.out.println(answer.trim());
```

JSON escapes such as `\n` become actual newlines. `trim()` removes whitespace at the edges for display. The service also returned `reasoning_content`. These demos do not display, store or depend on that field, and do not treat it as verifiable evidence of internal computation.

Usage is separate: `usage.total_tokens`. Here, `293 + 104 = 397`. Tokens are not equivalent to character counts. The input count can include structure that is not visible in the question. Pricing rules are required to estimate a bill. When usage is absent, the application reports that it was not provided rather than inventing zero.

### Accept console input

```java
String question = scanner.nextLine();
userMessage.addProperty("content", question);
```

`question` is the user's input. Gson handles its JSON escaping. I entered `请解释 Java 中的 "接口"，并给一个简短例子。` (explain a Java interface with a short example). The successful request reported 299 / 246 / 545 tokens. The quotation marks did not break the request.

## A real Read timed out failure

That question first produced:

```text
请求失败: Read timed out
Process finished with exit code 1
```

Demo 02's read timeout was initially 30 seconds. It was increased to 90 seconds, while the connection timeout stayed at 10 seconds. A manual retry then succeeded.

The connection timeout limits the wait to establish a connection; the read timeout limits a wait for response data. It is not an overall request deadline. See the [Java 8 URLConnection documentation](https://docs.oracle.com/javase/8/docs/api/java/net/URLConnection.html#setReadTimeout-int-).

One successful retry does not establish the cause of the earlier timeout. The network or service could also have changed. A timeout does not prove that the server did not process a request, so the demo does not retry automatically. IDEA's `Disconnected from the target VM` message was a consequence of the process exiting.

## 03 / Continue a conversation

I compared two requests. With only “what was my previous message?”, the model said it did not know. When I included the earlier greeting and assistant reply, it correctly identified the greeting.

My takeaway was: send the earlier questions and answers with each new turn. In code, this “memory” is a list managed by the application. A third request contains:

```text
user 1 → assistant 1 → user 2 → assistant 2 → user 3
```

Only after the third answer arrives is it appended to history.

```java
history.add(new ChatMessage("user", question));
try {
    ChatResponse response = request(history);
    history.add(new ChatMessage("assistant", response.content));
} catch (RequestFailedException e) {
    removeLastUserMessage();
}
```

On failure, the application removes the current user message but keeps earlier successful turns. It neither invents a reply nor retries automatically. The full demo also displays usage and warns about non-normal finish reasons.

### Observed run

| Turn | Input (original) | Observation | Input / output / total tokens |
| --- | --- | --- | --- |
| 1 | 你好 | A greeting | 285 / 60 / 345 |
| 2 | 我正在学习Java | A response about learning Java | 318 / 75 / 393 |
| 3 | 我正在学习什么 | Correctly answered Java | 368 / 81 / 449 |

The third question did not name Java, but the supplied history did. Input usage increased as this conversation grew. These are observations from one session, not benchmarks or fixed costs.

History lives only in this Java process. Entering `exit` ends it; restarting clears it. This does not update model weights or create persistent, cross-device memory. Context length is limited; this demo does not compress or truncate the history.

## Reproduce the walkthrough

1. Clone or download the [repository](https://github.com/VirtualSelect/hohoo-ai-lab) and read the chosen demo's README.
2. Compile Demo 01 with `javac`. Import the individual `pom.xml` files for Demos 02 and 03 in IDEA and use Java 8.
3. Set `AGNES_API_KEY` in each run configuration. The entry classes are `FirstLlmCall`, `ParseLlmResponse` and `MultiTurnChat`.
4. Enter one question in Demo 02. In Demo 03, say you are learning Java, wait for a response, then ask what you are learning. Enter `exit` to finish.
5. Distinguish HTTP failures, timeouts and JSON structure errors. Remove credentials before sharing logs. Do not disable TLS verification to work around a connection problem.

Compilation and offline checks used Java 8 and a cached Gson JAR. Maven plugin resolution had stalled with the local repository configuration; direct compilation is not evidence that a Maven build passed. Fixtures only test escaping, parsing and rollback. The results above came from the author's actual runs.

## Success still needs verification

The first request asked for two sentences but returned one; a later call returned two. The answer about interfaces also used overly broad claims about implementations while showing a `default` method.

HTTP 200 and `finish_reason: stop` do not guarantee factual accuracy or instruction following. Check language details against references such as the [Java 8 default methods tutorial](https://docs.oracle.com/javase/tutorial/java/IandI/defaultmethods.html).

Requests, parsing, console input and history now form one working path. The next useful step is to constrain and validate output before consuming it in other code, then move on to framework integration.

[Project](/projects/hohoo-ai-lab) · [AI Applications](/docs/ai-apps) · [Learning](/learning)
