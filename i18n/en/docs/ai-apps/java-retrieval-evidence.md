---
title: "Java LLM VI: validate retrieval evidence before judging RAG answers"
description: "Implement BM25 and citation boundaries over ten owned synthetic documents and fourteen frozen queries, retaining misses and false hits."
slug: "/ai-apps/java-retrieval-evidence"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:retrieval-eval", "project:hohoo-ai-lab", "doc:ai-apps/java-concurrent-history", "doc:ai-apps/java-tool-boundary"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows/evidence/20261003-reviewed) · [Experiment record](/labs/retrieval-eval)

A fluent answer after inserting three retrieved passages does not prove a RAG system works. We first need to know whether retrieval found the right material, which passages actually fit into the request, and whether citations refer to that supplied evidence.

This article implements the retrieval and evidence-assembly layer only. No generation model is called. The broader with/without-retrieval experiment remains in progress.

## 1. Freeze a small, owned corpus

Ten original synthetic English documents cover timeouts, history, tool allowlists, cancellation, JSON validation, KV caching, retrieval, release, retries and secrets. They are educational fixtures, not user documents.

Fourteen fixed questions include twelve with one labelled relevant document and two without answers. `photosynthesis` has no lexical overlap. `cache payment` overlaps with separate documents but has no supported complete answer. Queries were not rewritten after seeing results.

## 2. An inspectable BM25 baseline

The tokenizer lowercases and splits on non-alphanumeric characters. It is neither a Chinese segmenter nor an embedding model. Parameters are fixed at `k1=1.2`, `b=0.75`:

```text
idf(t) = ln(1 + (N - df(t) + 0.5) / (df(t) + 0.5))
score(d,q) = Σ idf(t) × tf(t,d) × 2.2
             / (tf(t,d) + 1.2 × (0.25 + 0.75 × len(d)/avgLen))
```

Query terms are deduplicated. Only positive scores enter the ranking; equal scores are ordered by document ID. The baseline makes missing candidates traceable to terms and arithmetic.

## 3. Results, including the failures

| Population | Observation |
|---|---|
| Twelve answerable questions, relevant document at rank 1 | 11/12 |
| Same questions, relevant document within top 3 | 11/12 |
| Two unanswerable questions with nonempty candidates | 1/2 |
| Generated-answer correctness | Not measured |

The miss, `conversation race`, uses different vocabulary from the labelled history/version/commit document. Increasing k cannot recover a document with no matching terms. The unanswerable `cache payment` still retrieves passages, showing why a nonempty list or positive score does not establish answerability or a calibrated confidence.

This tiny, author-constructed dataset has high lexical overlap. Its 11/12 result is not a general retrieval benchmark.

## 4. Validate against packed evidence

```java
Retrieval.Evidence evidence = Retrieval.pack(hits, 1000);
String context = evidence.text;
boolean allowed = evidence.cites("timeouts", "A read timeout");
```

Packing preserves whole source blocks and records only the included passages. The budget counts Java UTF-16 code units, not tokens. Oversized blocks are skipped; later smaller blocks may still fit. At a 20-character limit the tested passage is omitted, and citing it is rejected.

This matters because validating against all retrieved documents would authorize citations to evidence the model never received after truncation.

## 5. Exact provenance is not entailment

A citation needs an included ID and a nonempty exact quote from that document. Invented IDs, invented spans and omitted passages fail. However, a model can quote a real sentence and draw the opposite conclusion. Exact substring checking does not establish semantic support.

Retrieved imperative text is also just data. The retrieval layer grants no execution privileges. A later model integration must clearly separate instructions from source material.

## 6. Reproduce and extend

```sh
cd demos/06-reliable-workflows
python run.py --out evidence/my-rag-run
python audit.py evidence/20261003-reviewed
```

Ten retrieval checks run in the Java suite. A separate Python implementation recomputes all fourteen rankings and metrics from the frozen corpus. Evidence includes every query, label, hit list and score, rather than only aggregate numbers.

A useful next experiment would hold questions fixed while changing a documented tokenizer or retriever, then compare candidate coverage. Generated-answer and citation-support comparisons require a separately authorized model run. Neither is claimed as completed here.

## Read this series

- [Java LLM IV: which concurrent response may commit?](/docs/ai-apps/java-concurrent-history)
- [Java LLM V: why can a timed-out tool keep running?](/docs/ai-apps/java-tool-boundary)
