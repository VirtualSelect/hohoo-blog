---
title: "Java retries: three timeouts are not one deadline"
description: "Seven local HTTP conditions separate retryability, Retry-After, attempt limits and elapsed-time budgets."
slug: "/ai-apps/java-retry-deadline"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-retry-deadline", "project:hohoo-ai-lab", "doc:ai-apps/java-transport-cancellation"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [Raw evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [Lab record](/labs/java-retry-deadline)

Three requests with five-second timeouts do not create one five-second deadline. Connection, reading and backoff all consume time. A timeout also does not prove that the server did no work. Blind retries can duplicate answers or side effects.

RetryBudget tests seven real loopback HTTP conditions. Bodies are fixed fixtures, not model responses. Retrying is enabled only for an operation the caller explicitly considers safe; the code does not automatically apply this GET policy to model-generation POST requests.

## Two gates

First decide whether retrying is permitted. Then decide whether enough budget remains. The implementation retries only 429/503, within an attempt cap, and computes elapsed time using System.nanoTime(). It recomputes remaining time before connection and reading operations.

This is a cooperative budget, not hard real-time cancellation. DNS, scheduling and blocking-call boundaries can overrun the ideal instant. The recorded slow-header case used a 40ms budget and returned after 45ms. It must not be advertised as an exact 40ms guarantee.

## Respect server waiting instructions

A 503 with Retry-After: 1 requires a one-second delay. If the total budget is 500ms, stop with deadline-before-retry rather than shortening the delay and retrying early. The example handles integer seconds only; HTTP-date values fail closed with unsupported-retry-after. Production use would need date parsing, jitter, connection-pool policy and monitoring. The 20ms linear fixture backoff is not an internet-service recommendation.

| Local condition | Attempts | Outcome |
| --- | --- | --- |
| Immediate 200 | 1 | ok |
| 503 then 200 | 2 | ok |
| 401 | 1 | not-retryable |
| Retry-After exceeds remaining budget | 1 | deadline-before-retry |
| Repeated 503 | 3 | attempt-limit |
| Headers delayed 200ms, budget 40ms | 1 | deadline-or-interrupt |
| Caller does not permit retries | 1 | not-retryable |

An attempt count is not a count of server executions or billed requests. Individual timings are preserved, but do not support latency percentiles.

## Integrating with a conversation

Confirm actual provider idempotency before retrying generation. A locally invented request ID cannot force remote deduplication. Even a successful retry must pass output validation before a whole turn is committed; previews are not final history.

Automatic redirects are disabled and successful bodies are capped at 4096 bytes. General IO exceptions do not trigger blanket retries. An interrupt while sleeping propagates; budget checks stop when interruption is observed without clearing the flag.

## Exercise

Set the total budget to 10ms while retaining a 20ms backoff. The second attempt should not start. Set maxAttempts to one: a hypothetical later success no longer matters. If observed elapsed time exceeds the budget, distinguish checking points from underlying blocking behavior. TLS, connection pools and real network failure distributions remain untested.

Next: [recovering whole turns after a crash](/docs/ai-apps/java-durable-turns).

## Reproduce from a clean checkout

Java 8, Python 3 and Gson 2.10.1. Replace the two paths with your local JDK and jar.

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python demos/11-bounded-assistant/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/my-run
python demos/11-bounded-assistant/audit.py outputs/my-run
~~~

Use a new output directory. Windows was exercised; Linux/macOS were not rerun. No model API or key is required. The source commit in the manifest precedes the evidence commit linked above; source hashes bind the executed files.
