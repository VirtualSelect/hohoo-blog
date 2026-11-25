---
title: "Conversation recovery: reconcile intent, receipt and whole turn"
description: "Halt the JVM at three commit boundaries and rebuild whole-turn history from durable facts."
slug: "/ai-apps/java-recovery-reconciliation"
status: "published"
published_at: "2026-10-11"
updated: "2026-11-25"
reading_minutes: 10
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-outbox-delivery"]
related: ["lab:durable-dispatch", "project:hohoo-ai-lab"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch) · [Archived evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch/evidence) · [Study protocol](/labs/durable-dispatch)

A tool succeeded and its receipt was saved, but the process exited before storing the answer. Should restart execute the tool again, report failure, or complete the conversation from existing evidence?

This article combines durable intentions, receipts and complete history into a recoverable workflow. Answers remain fixed counter results, not generated model text. It tests recovery, not a finished online assistant.

## Define evidence before naming states

```text
intention, no receipt: pending delivery OR remote outcome unknown
receipt, no history: confirmed remote result, local turn pending
history present: complete local turn committed
```

The first state cannot mean “the tool has not executed.” The second should not call the tool again. Rather than maintaining another possibly stale status file, recovery derives progress from these records.

The history body is `question => result`, written idempotently under the original turn key. A real assistant needs structured roles, messages, versions and display rules; the fixed string isolates the commit boundary.

## Advance from durable evidence

```text
for each durable intention:
    look for its receipt
    if absent: deliver original identity, persist returned result
    idempotently commit the complete question/answer from the receipt
```

Recovery does not depend on a Future or callback left in the previous process. A crash after HTTP success but before receipt still causes redelivery, relying on receiver idempotency from the previous article. Once a receipt exists, completing history is local work.

“No partial turn” and “one remote effect” are separate properties. Neither proves the other.

## Different crash points require different recovery actions

| Condition | Effects after recovery | Receipts | Complete turns |
| --- | ---: | ---: | ---: |
| Crash after response, before receipt | 1 | 1 | 1 |
| Crash after receipt, before history | 1 | 1 | 1 |
| Crash after history, then recover again | 1 | 1 | 1 |
| Two distinct turns, recover twice | 2 | 2 | 2 |
| Eight dispatcher processes compete | 1 | 1 | 1 |

The first three terminate a real JVM and recover in a new process. The last validates local coordination, not distributed consumer performance. Independent auditing matches intention, receipt and history keys and verifies each stored answer came from the corresponding receipt; matching file counts alone is insufficient.

## What remains missing

The original Demo13 serially processes durable intents. Recovery checks the intent, receipt and history. With no cancellation record to consult, it still executes a cancelled intent after restart. To support cancellation, recovery needs a separate record of the user's decision and a way to preserve downstream evidence.

Conversation concurrency semantics also remain independent. Serial execution, first-committer wins and latest-request wins serve different products. This workflow does not replace them. Integration must determine whether a turn still owns write permission, while reconciling remote operations that may already have happened.

Journals have no retention or compaction and scanning cost grows with record count. Database transactions can coordinate local intentions and state, but an HTTP effect remains outside that transaction. Only local cooperative Windows processes and fixed fault points were verified.

### Read and modify the evidence

Start with `recover-receipt` and locate the first exit code 23 in `processes.json`. Recognize that it does not mean “nothing happened.” Compare `recover-two_intents`: the second key represents a distinct turn and must not be deduplicated away.

A useful exercise is a read-only status view showing pending delivery, confirmed result awaiting history and completed turn. It should not modify records or turn uncertainty into failure. Duplicate history suggests a changed turn key. A conflicting receipt should stop recovery with retained evidence, not trigger a fresh key to bypass the conflict.

Together the three articles cover the local commit, remote redelivery and conversation reconciliation. The follow-up below uses the same receiver to test how a cancellation record changes recovery.

## Will a cancelled intent still run after restart?

The follow-up uses the same idempotency key throughout each case. It writes cancellations to a separate durable journal under the same local lock as the dispatcher. The guarded version checks for cancellation before sending or adding conversation history. It records a dispatch marker before sending the HTTP request. Each case recovers twice in fresh JVMs and checks the observed requests, receiver effects, receipts and conversation history independently.

| Condition before recovery | HTTP POSTs | Receiver effects | Receipts | Conversation turns |
| --- | ---: | ---: | ---: | ---: |
| Cancel before sending, original recovery | 1 | 1 | 1 | 1 |
| Cancel before sending, guarded recovery | 0 | 0 | 0 | 0 |
| Exit after the marker and before sending, then cancel | 0 | 0 | 0 | 0 |
| Exit after the effect and before the receipt, then cancel | 1 | 1 | 0 | 0 |
| Exit after the receipt and before history, then cancel | 1 | 1 | 1 | 0 |
| Exit after the effect and before the receipt, no cancellation | 2 | 1 | 1 | 1 |

Rows three and four have the same local evidence: a dispatch marker, a cancellation and no receipt. The receiver and request logs tell us whether the effect actually occurred. Recovery reports the outcome as unknown in both cases and stops redelivery. Row five keeps the existing receipt and stops before adding a normal turn. In row six, the dispatcher resends with the original key, and the receiver returns the original result after deduplication.

The follow-up used macOS, JDK 8 and a loopback receiver. Cancellation and recovery are serialized, and a cancellation takes effect once it has been recorded under the lock. Interrupting an active request, compensating for a completed effect and reconciling a real service require separate tests.

### Inspect the archived run

The report’s `cases` array records HTTP requests, journals and recovery checkpoints for all six cases. Use it to check each row of the table.

[Run report](https://github.com/VirtualSelect/hohoo-blog/blob/07bc16aba4fb1b01e00743c21d5db5faf84d8e7c/reports/java-cancellation-recovery-20261125.json) · [Reproduction script](https://github.com/VirtualSelect/hohoo-blog/blob/07bc16aba4fb1b01e00743c21d5db5faf84d8e7c/scripts/research/java-cancellation/run.py) · [Frozen protocol](https://github.com/VirtualSelect/hohoo-blog/blob/07bc16aba4fb1b01e00743c21d5db5faf84d8e7c/scripts/research/java-cancellation/protocol.json) · [Companion source](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch)

### Rerun the six cases in a fresh directory

On macOS, install Git, Python 3 and JDK 8. Set `JAVA_HOME` to the JDK 8 directory containing `bin/java` and `bin/javac`. The command fetches both pinned commits and runs the study in a temporary directory. The script checks protocol and source fingerprints, and the experiment sends requests over loopback.

```bash
(
  set -eu
  : "${JAVA_HOME:?Set JAVA_HOME to your JDK 8 directory}"
  study_dir="$(mktemp -d "${TMPDIR:-/tmp}/hohoo-java-cancellation.XXXXXX")"

  git init -q "$study_dir/blog"
  git -C "$study_dir/blog" fetch --depth 1 \
    https://github.com/VirtualSelect/hohoo-blog.git \
    07bc16aba4fb1b01e00743c21d5db5faf84d8e7c
  git -C "$study_dir/blog" checkout FETCH_HEAD -- scripts/research/java-cancellation

  git init -q "$study_dir/lab"
  git -C "$study_dir/lab" fetch --depth 1 \
    https://github.com/VirtualSelect/hohoo-ai-lab.git \
    0d4009cf840052c3111bbfc40dce900326daa3ae

  python3 "$study_dir/blog/scripts/research/java-cancellation/run.py" \
    --repo "$study_dir/lab" \
    --java-home "$JAVA_HOME" \
    --run-dir "$study_dir/run"
)
```

On success, the terminal prints the new report’s full path and the results of all six cases. The report and raw journals are in the temporary `run` directory for comparison with the archived run.

## How can we reconcile a cancelled intent with a read-only lookup?

The next study starts from the two cases above that both show an unknown outcome locally. A separate loopback service uses HTTP GET to look up the original idempotency key and request digest. It opens the existing journal read-only and validates every record under a shared lock. A truncated tail makes the snapshot unavailable even if an earlier record matches. The client also checks the echoed key, request digest and completeness of the snapshot response.

| Lookup condition | Outcome |
| --- | --- |
| The receiver executed the request and the digest matches the key | Execution confirmed |
| A healthy, complete snapshot contains no matching key | No record at this receiver at query time |
| The journal is missing or has a truncated tail | Outcome unknown |
| The key belongs to a request with a different digest | Outcome unknown, with a recorded conflict |
| The lookup times out or HTTP 200 carries incomplete evidence | Outcome unknown |

Seven cases ran twice, with fresh server and client JVMs for each lookup. The observer recorded 14 GET requests and zero additional business POSTs during reconciliation. The bytes and existence of each of the six types of business journals were identical before and after every lookup. Confirming execution left the receipt and normal conversation history untouched. A no-record result describes only the complete snapshot at the local receiver when queried. Replicas, retention, compensation and interruption of active requests require separate tests.

Run the following from the blog checkout containing this study. The companion repository must contain the pinned commit above, and `JAVA_HOME` must point to JDK 8. The script creates a fresh output directory, reproduces the faults and checks the journals. The seven archived cases are in `reports/java-cancellation-reconciliation-20261125.json`.

```bash
study_dir="$(mktemp -d "${TMPDIR:-/tmp}/hohoo-java-reconcile.XXXXXX")"
python3 scripts/research/java-cancellation-reconciliation/run.py \
  --repo /path/to/hohoo-ai-lab \
  --java-home "$JAVA_HOME" \
  --run-dir "$study_dir/run"
```

The next section reproduces the original Demo13 protocol on Windows.

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

The original full matrix ran on Windows with JDK 1.8.0_171 and Python 3.12.14. It produced 17 scenarios and 193 child-process records. The independent audit should print `PASS`. To inspect the archive, pass `demos/13-durable-dispatch/evidence` to the same audit command. Source hashes normalize line endings to LF. Evidence hashes use the original bytes.

Replace the JDK path with a JDK 8 installation containing `javac`. Child exit code 23 is an intentional fault injection; a different unexpected exit is a failure. Do not expose the teaching HTTP server publicly.

Code and writing are AI-assisted; the findings are limited to the archived, auditable runs. No new paid model requests were made, and this does not claim author-performed manual review.
