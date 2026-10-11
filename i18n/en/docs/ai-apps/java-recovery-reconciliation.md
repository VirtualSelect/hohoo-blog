---
title: "Conversation recovery: reconcile intent, receipt and whole turn"
description: "Halt the JVM at three commit boundaries and rebuild whole-turn history from durable facts."
slug: "/ai-apps/java-recovery-reconciliation"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
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

The implementation serially processes durable intentions. It does not implement cancellation, expiration, user edits or revoked permission. A revoked intention would still execute after restart. Before connecting risky tools, cancellation records and downstream stop semantics need a separate design; deleting local history does not undo a remote effect.

Conversation concurrency semantics also remain independent. Serial execution, first-committer wins and latest-request wins serve different products. This workflow does not replace them. Integration must determine whether a turn still owns write permission, while reconciling remote operations that may already have happened.

Journals have no retention or compaction and scanning cost grows with record count. Database transactions can coordinate local intentions and state, but an HTTP effect remains outside that transaction. Only local cooperative Windows processes and fixed fault points were verified.

### Read and modify the evidence

Start with `recover-receipt` and locate the first exit code 23 in `processes.json`. Recognize that it does not mean “nothing happened.” Compare `recover-two_intents`: the second key represents a distinct turn and must not be deduplicated away.

A useful exercise is a read-only status view showing pending delivery, confirmed result awaiting history and completed turn. It should not modify records or turn uncertainty into failure. Duplicate history suggests a changed turn key. A conflicting receipt should stop recovery with retained evidence, not trigger a fresh key to bypass the conflict.

These three articles provide one inspectable local chain: commit boundary, remote redelivery and final conversation reconciliation. Model quality, authorization and cancellation remain separate work.

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
