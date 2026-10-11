---
title: "Durable idempotency: commit identity and result together"
description: "Use a framed journal, process crashes and 99 truncated prefixes to explain durable idempotency."
slug: "/ai-apps/java-durable-idempotency"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-idempotent-retry"]
related: ["lab:durable-dispatch", "project:hohoo-ai-lab"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch) · [Archived evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch/evidence) · [Study protocol](/labs/durable-dispatch)

The previous implementation prevented duplicates within one process, but lost its keys after restart. The counter had already changed; retrying changed it again. This article changes the commit boundary: **the business result and its idempotency identity become one journal record**.

The business operation is a teaching counter derived from valid records. It is not an order, payment or model request. By the end, you can explain recovery across processes and why a torn tail differs from a damaged complete record.

## Two files leave a gap

```text
increment counter -> crash -> key never saved
save successful key -> crash -> counter never incremented
```

Reordering the writes exchanges one failure for another. Here, each record contains the key, request body, its SHA-256 and a result sequence number. Both the counter and identities are reconstructed from the same records. This works because the journal itself is the business state. It cannot atomically include a remote effect; the next article tests that boundary.

## Establish completeness before replaying identity

```text
magic (4 B) | payload length (4 B) | CRC32 (4 B) | payload
payload = key + bodyHash + body + result
```

Strings use Java's length-prefixed `DataOutputStream.writeUTF`. Payload length is bounded at 65,536 bytes, with smaller CLI key/body limits. CRC detects accidental payload damage; it is not an authenticity signature.

Recovery validates the header, complete frame, CRC, body hash, unique key and consecutive result number. A complete frame with a bad checksum is rejected without changing the file. Silently deleting it could forget an operation that had already committed and allow a retry to repeat it.

Only an incomplete final frame is truncated to the preceding validated boundary. That assumes an append-only writer and a trustworthy earlier prefix, not arbitrary disk corruption. The archived `corrupt.wal` demonstrates refusal without modification.

## Keep lookup and append under one lock

```java
try (RandomAccessFile file = new RandomAccessFile(path.toFile(), "rw");
     FileLock lock = file.getChannel().lock()) {
    LinkedHashMap<String, Entry> entries = scan(file);
    // Same key/body: replay. Same key/different body: reject.
    // New key: append one frame, then force(true).
}
```

The concurrency test launches eight independent JVM processes. They hold the lock across scan, identity checks and append. This is not a thread mutex: [FileLock's documentation](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileLock.html) distinguishes JVM-level file ownership from thread coordination. Same-JVM callers need additional serialization. This is also not a distributed lock; NFS, other hosts and non-cooperating writers were not tested.

## Kill the process, then retry

Faults call `Runtime.halt(23)` rather than throwing an exception that permits cleanup.

| Condition | Valid operations after retry | Observation |
| --- | ---: | --- |
| Exit before append | 1 | Retry creates the operation |
| Exit after a forced partial frame | 1 | Repair tail, then append |
| Exit after complete frame force, before reply | 1 | Replay restored result |
| Eight processes, same key | 1 | One committed record |
| Same key, changed body | 1 | Conflict rejected |
| Flip one payload bit in a complete frame | Recovery refused | Original bytes retained |
| All 99 strict prefixes of one frame | 1 each | Recovered bytes match the reference |

The fixed `turn-1/add-one` frame is 99 bytes; prefixes cover lengths 0–98. These are framing checks, not 99 distinct business failures. The independent Python auditor parses the binary records and CRC without invoking Java recovery.

## Where this approach stops

Every operation scans the journal. Keys are never evicted and logs are not compacted. This is useful for learning commit boundaries, not a production throughput or retention design. Where a database already exists, unique constraints and transactions are usually a better starting point than expanding this file store.

Consult [FileChannel's contract](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileChannel.html) for `force(true)`. These tests cover specified process exits on local Windows storage, not power failure, directory durability, controller caches or damaged disks.

### Exercise and troubleshooting

After the forced-write crash, predict whether retrying needs the original key or a new one. Then try a new key with the same body in a separate output directory: it represents a second intention. Duplicate records suggest lookup and append escaped the common lock. A checksum failure requires preserving and investigating the sample, not editing its manifest until validation passes.

Next, send these durable intentions over real loopback HTTP and observe which guarantees survive the boundary.

## Reproduce the protocol

Run from a fresh checkout in PowerShell. The output directory must not exist. All three articles in this study share one frozen protocol; run it once and inspect the section relevant to each article.

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 0d4009cf840052c3111bbfc40dce900326daa3ae
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py demos/13-durable-dispatch/run.py --java-home "E:/Java/jdk1.8.0_171" --out demos/13-durable-dispatch/target/my-run
& $py demos/13-durable-dispatch/audit.py demos/13-durable-dispatch/target/my-run
```

Tested on Windows with Java JDK 1.8.0_171 + Python 3.12.14; 17 scenarios and 193 child-process records. The independent audit should print `PASS`. Other operating systems have not been rechecked. To inspect the archived result without rerunning the experiment, pass `demos/13-durable-dispatch/evidence` to the same audit command. Source hashes normalize LF; evidence hashes use original bytes. Do not rewrite the manifest to conceal a mismatch.

Replace the JDK path with a JDK 8 installation containing `javac`. Child exit code 23 is an intentional fault injection; a different unexpected exit is a failure. Do not expose the teaching HTTP server publicly.

Code and writing are AI-assisted; the findings are limited to the archived, auditable runs. No new paid model requests were made, and this does not claim author-performed manual review.
