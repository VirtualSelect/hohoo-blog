---
title: "Java history and request windows: can a trimmed fact return?"
description: "Follow narrowing, commit, restart and expansion to separate durable conversation history from one request context."
slug: "/ai-apps/java-context-wire-budget"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-context-wire-budget", "project:hohoo-ai-lab", "doc:ai-apps/java-transactional-history"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [Raw evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [Lab record](/labs/java-context-wire-budget)

[Transactional history](/docs/ai-apps/java-transactional-history) already implements whole-turn trimming, UTF-8 request budgets and rollback. This article asks a different product question: after committing the trimmed candidate, can the user still revisit a removed turn? The old bounded-history policy is valid for a short-lived context window. Here a durable append log retains every confirmed turn while ContextBudget projects a smaller request. This is a different storage contract, not a blanket correction of the earlier article.

## Separate storage from context

~~~text
Stored: U1 A1 | U2 A2 | U3 A3
New question: U4
Bad slice: A2 | U3 A3 | U4
Whole-turn slice: SYSTEM | U3 A3 | U4
~~~

System instructions and the current question are mandatory. If those alone exceed the limit, the selector rejects the request instead of silently removing either. It serializes the actual model/messages JSON with Gson and measures the UTF-8 byte array. Java String.length() counts UTF-16 units, not wire bytes.

## The selection rule

Starting with every turn, remove the oldest complete turn until the serialized body fits. Return the exact bytes that were measured. Do not mutate the stored list and do not skip a large recent turn to pack an older short turn.

~~~java
for (int start = 0; start <= history.size(); start++) {
    byte[] payload = request(system,
        history.subList(start, history.size()), current);
    if (payload.length <= maxBytes) {
        return new Selection(payload, history.size() - start, start);
    }
}
throw new IllegalArgumentException("mandatory input exceeds budget");
~~~

This readable implementation repeatedly serializes candidate suffixes. Large histories could use more efficient accounting, but JSON separators and envelope fields must still be included. That optimization was not measured here.

## Recorded boundary cases

The fixed fixture includes Chinese, English, quotes, a newline and an emoji.

| Budget, bytes | Retained turns | Dropped turns | Actual bytes |
| --- | --- | --- | --- |
| 140 | 0 | 2 | 140 |
| 235 | 1 | 1 | 235 |
| 308 | 2 | 0 | 308 |
| 408 | 2 | 0 | 308 |

A 139-byte limit is rejected because mandatory input needs 140 bytes. Stored history remains two turns. These are fixture sizes, not a provider context window or recommended production limits.

## A sequence, not an isolated selector test

ProjectionScenario.java persists two turns: a fictional project code ORCHID-17, then a Java 8 preference. It narrows the request to the latest turn, commits a fixed local reply, closes and reopens the journal, and widens the next request.

| Stage | Recorded result | Meaning |
| --- | --- | --- |
| Narrow | 264 bytes, one retained turn, no ORCHID-17 | The old fact is actually absent from the request |
| Commit | Three durable turns | The projection does not replace the complete ledger |
| Reopen and expand | 480 bytes, three turns, ORCHID-17 restored | The saved fact can be supplied again |
| Reject mandatory overflow | File bytes unchanged | A failed projection does not mutate committed history |

[The integration evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/projection-20261007-verified) includes the report and checksummed conversation log. This proves data restoration, not a model remembering an omitted fact. No model call was made.

~~~text
Ledger: U1 A1 | U2 A2
Request projection: SYSTEM | U2 A2 | U3
Commit fixed reply: U1 A1 | U2 A2 | U3 A3
Reopen and widen: SYSTEM | U1 A1 | U2 A2 | U3 A3 | U4
~~~

Keeping a ledger has costs: disk grows, and user deletion must remove stored data, not merely hide it from requests. This example rejects a log above 4MiB; compaction, retention, user deletion and synchronization are not implemented.

The first integration fixture attempted a second file handle while the writer held an exclusive Windows lock. Verification failed. The fixture was corrected to compare bytes after closing the owner and then reopen it, without bypassing the journal lock.

## Trade-offs and exercise

A recent-turn policy may discard important early facts. Long-term memory, retrieved evidence and system constraints need explicit origins and budgets. No summarization or online answer-quality experiment was performed. A provider token limit is a separate constraint and must reserve output space; this byte selector does not estimate tokens.

Make the newest stored turn much larger and set a budget that would fit only the older turn. The expected result is mandatory input only: the rule preserves a contiguous suffix, not arbitrary packing. Increase the current question until mandatory input fails. Debug with byte and turn counts, not full private conversations.

The code makes no model requests; agnes-3.0-flash is a request-field default only. Continue with [bounded retries](/docs/ai-apps/java-retry-deadline).

## Reproduce from a clean checkout

Java 8, Python 3 and Gson 2.10.1. Replace the two paths with your local JDK and jar.

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python demos/11-bounded-assistant/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/my-run
python demos/11-bounded-assistant/audit.py outputs/my-run
python demos/11-bounded-assistant/projection.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/projection
python demos/11-bounded-assistant/projection.py --audit --out outputs/projection
~~~

Use a new output directory. Windows was exercised; Linux/macOS were not rerun. No model API or key is required. The source commit in the manifest precedes the evidence commit linked above; source hashes bind the executed files.
