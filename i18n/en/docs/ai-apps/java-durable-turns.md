---
title: "Durable Java turns: what survives a process crash?"
description: "Checksummed append records, 142 truncated prefixes and three halted JVMs distinguish local recovery from remote exactly-once execution."
slug: "/ai-apps/java-durable-turns"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-durable-turns", "project:hohoo-ai-lab", "doc:ai-apps/java-context-wire-budget"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [Raw evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [Lab record](/labs/java-durable-turns)

Atomic in-memory turns disappear when the process exits. Replacing one large JSON file can leave the entire file unreadable after a partial write. TurnJournal appends one validated question/answer pair per checksummed record and gives partial tails a specific recovery rule.

## Commit order

~~~text
JSON {id, question, answer}
→ UTF-8 → Base64(payload) + space + SHA256(payload) + newline
→ write every byte → FileChannel.force(true)
→ update in-memory history → acknowledge
~~~

Base64 keeps embedded newlines out of the record delimiter, at the cost of larger files. The checksum detects accidental corruption; it is not authentication against someone who can edit the file and recompute it. The [Java8 FileChannel contract](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileChannel.html) also depends on storage type. Power loss and network filesystems were not tested.

## Recovery, not silent data deletion

Complete lines must pass format, checksum and duplicate-ID checks. An incomplete trailing line is truncated back to the last complete record. A corrupted complete line rejects the journal instead of skipping missing history. The teaching log is capped at 4MiB and an exclusive FileLock rejects a second writer. Use it synchronously from one owning thread; it is not a database isolation implementation.

| Actual child-process halt | Recovered turns | Meaning |
| --- | --- | --- |
| Before writing the second turn | 1 | No new commit |
| Halfway through its record | 1 | Incomplete tail removed |
| After commit and force | 2 | Complete turn recovered |

Each child JVM exits via Runtime.halt(23), then another JVM reopens the journal. The suite also checks all 142 incomplete byte prefixes of the second record and rejects a separate corrupted complete record.

## Local deduplication has a boundary

Committing the same ID and question again returns the original answer. Reusing that ID for a different question fails. Checking find(id) before a remote request can reuse an already committed answer.

However, the remote provider may finish before the process crashes and before the local journal is committed. A missing local record does not prove no remote work occurred. Without a transactional provider or real remote idempotency, this journal cannot guarantee exactly-once model invocation.

## Inspect the artifacts

before.log and partial.log recover one turn; committed.log recovers two. crashes.json records the exits. turns.log is intentionally corrupted by the negative case and is not a healthy example.

In a disposable copy, alter a Base64 character without updating its checksum: opening should fail. Truncate only the final line: earlier complete turns should survive. An “already open” error calls for checking another writer, not clearing the file. After a write error, end use of that instance and reopen for recovery rather than appending past a possible partial write.

The three components suggest a pipeline: load committed turns, select bounded context, execute with a budget, validate the response, then commit the whole turn. This batch delivers tested components, not an online production assistant or a remote model-quality result.

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
