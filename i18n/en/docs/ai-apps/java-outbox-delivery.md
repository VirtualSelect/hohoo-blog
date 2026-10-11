---
title: "Outbox delivery: local durability is not remote exactly-once"
description: "Compare keyed and unkeyed receivers to separate lost replies, missing receipts and duplicate remote effects."
slug: "/ai-apps/java-outbox-delivery"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-durable-idempotency"]
related: ["lab:durable-dispatch", "project:hohoo-ai-lab"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch) · [Archived evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch/evidence) · [Study protocol](/labs/durable-dispatch)

Persisting an intention prevents restart from forgetting pending work. It does not answer whether a remote service already acted. If delivery succeeds but the dispatcher crashes before writing a receipt, recovery must decide what resending means.

This experiment connects the durable journal to real loopback HTTP. The receiver increments a journal-derived teaching counter. No external service, model or business transaction is involved.

## An outbox is not proof of execution

The outbox records a stable operation key and body. The dispatcher scans intentions without receipts, sends HTTP and persists the returned result.

```text
persist intention -> send original key/body -> receiver commits effect
                  <- successful response
                  crash before receipt
restart -> same delivery -> replay, or another effect?
```

Marking delivery before sending can lose work. Marking it afterward allows duplicates. This implementation chooses resending and requires the receiver to define duplicate semantics.

## Identity must cross the network boundary

`Workflow.deliver` sends the original `Idempotency-Key` and unchanged body. The keyed receiver passes that identity to its durable ledger. The unkeyed receiver creates a fresh identity for every arrival.

Both use the same real HTTP path and crash point after receiving the response but before recording it. A header alone adds no guarantee; the receiver must implement the agreement.

| Scenario | Receiver effects | Receipts | Complete history records |
| --- | ---: | ---: | ---: |
| Keyed receiver, delivery crash and recovery | 1 | 1 | 1 |
| Unkeyed receiver, identical crash and recovery | **2** | 1 | 1 |
| Keyed receiver also restarts | 1 | 1 | 1 |
| Receiver unavailable, then restored | 1 | 1 | 1 |
| Receiver already has same key/different body | 1 previous effect | **0** | **0** |

The second row is the central counterexample: local history contains one turn while the receiver performed two effects. Deduplicated conversation history cannot prove deduplicated tool execution.

The unavailable case first stops the receiver and checks a failed dispatcher exit with zero receipts/history, then restores it. The table describes the recovered outcome, not the initial failure. A conflict returns 409 and creates neither a successful receipt nor a fabricated answer.

## Why serialize dispatchers?

`dispatcher.lock` coordinates processes using one directory. Each ledger separately protects its own record operations. The dispatcher lock spans network waiting, making the recovery logic small but allowing a slow request to delay later intentions.

A production queue might use claims, leases and partitioned consumers. Expired leases reopen duplicate-delivery windows; adding a thread pool does not resolve the protocol. This is a correctness experiment, not a queue platform or distributed throughput benchmark.

## Retention belongs to the agreement

The receiver keeps keys indefinitely in this study. If it forgets them after one minute while the sender retries after two hours, duplication becomes possible again. Reusing a key for changed parameters is a conflict, not a convenient update mechanism.

TTL, cross-region replication, authentication and transactional business databases were not tested. A model provider is not assumed to honor this header, and no billing guarantee follows. For non-idempotent operations, preserve an unknown outcome and use an operation-status query or reconciliation process.

### Exercise

Inspect `unkeyed_delivery`: its receiver journal has two records; receipts and history each have one. Draw the crash boundary before switching the receiver to keyed mode in a fresh output directory. If duplicate effects remain, check whether retry generated a new key, the receiver lost its journal, or the body changed.

`processes.json` retains commands and actual exit codes. Injected `halt(23)` is a process exit; do not relabel every nonzero exit as a network timeout. Next we recover the remaining gap: the tool and receipt succeeded but conversation history has not committed.

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
