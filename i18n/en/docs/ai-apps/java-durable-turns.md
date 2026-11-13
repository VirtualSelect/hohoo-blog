---
title: "Durable Java turns: what survives a process crash?"
description: "Checksummed append records, 142 truncated prefixes and three halted JVMs distinguish local recovery from remote exactly-once execution."
slug: "/ai-apps/java-durable-turns"
status: "published"
published_at: "2026-10-07"
updated: 2026-11-13
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-durable-turns", "project:hohoo-ai-lab", "doc:ai-apps/java-context-wire-budget"]
---

<span id="published-correction"></span>

> **Correction published · 2026-11-13.** [Pinned source and run instructions](https://github.com/VirtualSelect/hohoo-ai-lab/tree/fdea0d8cc8c0a986deee47718cddbe1288afabed/demos/14-turn-flow) are now available. Statements below about a local branch or unpublished code describe the 2026-11-12 review snapshot. Historical checkout commands still reproduce the original archive, not this correction. From the companion repository root, run `git checkout fdea0d8cc8c0a986deee47718cddbe1288afabed`, then follow the linked directory README and use a new output directory. Historical results and AI-assistance disclosures are unchanged.

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

The three components suggest a pipeline: load committed turns, select bounded context, execute with a budget, validate the response, then commit the whole turn. The 2026-10-07 version delivers tested components, not an online production assistant or a remote model-quality result.

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

## Composing one complete turn

The journal recovers committed turns; it does not decide whether an HTTP reply deserves a commit. Appending the question before waiting for the answer creates a partial turn. Appending any received text can also accept a reply after the user has cancelled.

The local `demos/14-turn-flow` supplement composes the existing `ContextBudget` and `TurnJournal`, without changing the archived experiment. **This is an AI-assisted offline implementation and run, not yet reproduced by the author. The integration remains on a local branch and has no published pinned revision.** It is absent from the 2026-10-07 checkout above.

~~~text
Committed history → request projection → one send → validate reply → commit whole turn
Existing ID       → replay the committed answer
Failure, observed cancellation or expired checkpoint → retain history, reject candidate
~~~

### What happened before the commit check?

`TurnFlow.ask` checks the ID first. After reopening the journal, the same ID and question can reuse the committed answer. The same ID with another question is rejected before sending. Only a new turn needs a request projection and reply adapter.

This excerpt shows the order inside the coordinator. It is not a standalone compilable file; argument checks, owner-thread enforcement and recovery handling belong to the complete local implementation.

~~~java
ContextBudget.Selection selected = ContextBudget.select(
    system, journal.history(), question, maxRequestBytes);
String answer = source.generateOnce(
    selected.payload, remaining(deadline, cancelled));
remaining(deadline, cancelled);
if (answer == null || answer.trim().isEmpty()
    || answer.getBytes(StandardCharsets.UTF_8).length > maxAnswerBytes) {
    throw new IOException("answer rejected by the plain-text contract");
}
remaining(deadline, cancelled);
try {
    answer = journal.commit(id, question, answer);
} catch (IOException failedCommit) {
    unusable = true; // A partial append is possible; reopen before further writes.
    throw failedCommit;
}
~~~

The contract only accepts nonblank plain text within 512 UTF-8 bytes. It does not verify facts. Repeating “中” 171 times already takes 513 bytes, despite having fewer characters. Structured results need a separate [output contract](/docs/ai-apps/java-structured-output), rather than treating nonempty text as usable business data.

Cancellation and deadlines are checkpoint semantics. Marking cancellation after the reply but before the check rejects that candidate. A cancellation racing after the final check cannot undo a committed turn. One coordinator enforces its owner thread; creating multiple coordinators must not be used to share the same journal concurrently.

### Count received requests separately from new turns

Replies follow fixed rules served through real loopback HTTP, not a model. These are selected cases from 16 fixed scenarios. Seed turns are test setup, not new results. The replay row counts only the phase after closing and reopening the journal in the same JVM; its initial commit happened earlier.

| Local phase | Requests in this phase | New complete turns | Interpretation |
| --- | --- | --- | --- |
| Two successful turns | 2 | 2 | The second request contains the first question and answer |
| Oldest turn leaves the request window | 1 | 1 | Request keeps the recent turn; disk still contains three turns |
| Cancel after reply, before commit check | 1 | 0 | Reject the candidate, without claiming remote work was undone |
| Server reads the body but sends no reply | 1 | 0 | A missing local result does not establish remote status |
| Replay a committed ID after reopen | 0 additional | 0 additional | Reuse the commit; reject another question using that ID |

Blank replies, 503, an expired deadline check, malformed UTF-8 and oversized responses also retain the seed turn. The commit-I/O case uses a genuinely closed channel, not a new crash or power-loss experiment. The deadline case uses a controlled monotonic clock, not a latency measurement.

There is no application retry loop in `generateOnce`. The test adapter disables redirects and enables [fixed-length streaming](https://docs.oracle.com/javase/8/docs/api/java/net/HttpURLConnection.html#setFixedLengthStreamingMode-int-); the lost-reply run recorded one received POST. The earlier `RetryBudget` supports explicitly safe reads and must not simply wrap a generation POST. Continue with [retry identity](/docs/ai-apps/java-idempotent-retry) for that separate boundary.

### Running the local supplement

**Obtain the integration code first.** It currently exists only in the companion repository's local `codex/bounded-turn-flow-20261112` branch and has not been pushed. If you only have the pinned checkout above, run Demo 11; do not look for Demo 14 in that revision. A published commit link will not be invented before archiving.

~~~sh
python demos/14-turn-flow/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out demos/14-turn-flow/out/my-run
python demos/14-turn-flow/audit.py demos/14-turn-flow/out/my-run --verify-sources
~~~

Compare `lost.log` with `requests.json`: the journal retains only its old complete turn while the server still recorded the request. Compare `project-not-delete.log` with its request to see that omission is not deletion. Existing output directories are refused.

No key, model or new service was used. Interruptible loopback Socket reads now have a [cancellation integration supplement](/docs/ai-apps/java-transport-cancellation#connecting-cancellation-to-durable-turns). Provider-specific adapters and a concurrent commit protocol remain separate work. A passing local composition does not deliver a complete online assistant.
