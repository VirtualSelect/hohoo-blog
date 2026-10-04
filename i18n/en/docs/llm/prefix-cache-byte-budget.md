---
title: "LLM mechanics (6): why can a larger prefix cache still get zero hits?"
description: "324 requests across cold-start traces and 648 arrays test byte-bounded prefix checkpoints, working sets, isolation and LRU eviction."
slug: "/llm/prefix-cache-byte-budget"
status: "published"
published_at: "2026-10-04"
updated: "2026-10-04"
reading_minutes: 11
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:prefix-cache-byte-budget", "project:hohoo-ai-lab", "doc:llm/longest-prefix-reuse", "doc:llm/prefix-cache-invalidation"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/920fee3717a373dc796269ee3a4a03ec33700ae3/experiments/08-cache-budget) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/920fee3717a373dc796269ee3a4a03ec33700ae3/experiments/08-cache-budget/evidence/20261004) · [Experiment record](/labs/prefix-cache-byte-budget)

The previous study reused the longest identical prefix after editing history. But memory is finite. Does reuse still save work when only a few checkpoints fit?

This study starts from a **cold cache** and counts all twelve requests, including initial computation and recomputation after misses. A revealing result: alternating between two prefixes, increasing the budget from 4 to 8 KiB saves no projection work while doubling evictions from 11 to 22.

## Define the object being cached

We reuse the untrained, two-layer NumPy decoder: width 16, float64, vocabulary 32, seeds 7, 11 and 23. It tests numerical equivalence, not language quality or Agnes internals.

Full-prefix checkpoints can be saved after tokens four and eight. Each owns K, V and absolute-position arrays for every layer plus its continuation position. **Checkpoints do not share pages**; repeated prefixes are charged repeatedly.

```text
2 layers × (K: 16×8 + V: 16×8 + position: 8) = 528 bytes/token
4-token checkpoint = 2,112 bytes
8-token checkpoint = 4,224 bytes
Both checkpoints for one prefix = 6,336 bytes
```

The budget uses actual NumPy `nbytes`. It is not process memory: Python objects, token keys, weights, active-query temporary arrays and internal workspaces are excluded.

## Freeze the workload

Every trace contains twelve requests of twelve tokens each. The final token changes; the first eight depend on the trace.

| Trace | Ordering | Question |
| --- | --- | --- |
| Hot prefix | Same first eight tokens and scope | Can a fitting working set stay hot? |
| Alternating branches | Two different prefixes alternate | Does the working set fit? |
| Three scopes | Same tokens, scopes A/B/C rotate | What does isolation do to capacity? |

Three seeds × three budgets (4, 8, 32 KiB) × three traces × twelve requests gives 324 requests. Scope strings are synthetic cache-key components, not authentication. Identical text across scopes is deliberately not shared.

## Query, admit and evict

The store validates tokens, computes a model/configuration signature and finds the longest eligible prefix in the same scope. A hit is copied into the active query and marked recently used. Remaining tokens are computed in segments. At each checkpoint boundary, oversized entries are skipped; otherwise least-recently-used entries are evicted until an owned copy fits.

```python
cost = sum(array.nbytes for layer in checkpoint['layers'] for array in layer)
while resident_bytes + cost > budget:
    evict_least_recently_used()
save_owned_copy(checkpoint)
```

Only checkpoints strictly shorter than the query are used, leaving at least one new output state. In this workload queries have length twelve, with checkpoints at four and eight. This is not PagedAttention, shared-page management or sliding-cache reconstruction.

The limit applies to persistent checkpoint arrays. A query can still create a full temporary K/V cache; this budget alone cannot prevent process OOM.

<img src="/media/practice/cache-budget.png" width="1500" height="600" loading="lazy" alt="Projection work and eviction counts under three budgets and three access traces" />

## Include the cold request

Each new token needs Q, K and V projections in two layers. A full twelve-token query therefore costs 72 projected rows; twelve fresh queries cost 864. All three seeds have the following counts because they change values, not shapes or access order.

| Budget | Trace | Hits / 12 | Total projected rows | Evictions | Explicit checkpoint copy bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| 4 KiB | Hot prefix | 11 | 600 | 0 | 25,344 |
| 4 KiB | Alternating | 0 | 864 | 11 | 25,344 |
| 4 KiB | Three scopes | 0 | 864 | 11 | 25,344 |
| 8 KiB | Hot prefix | 11 | 336 | 0 | 52,800 |
| 8 KiB | Alternating | 0 | 864 | 22 | 76,032 |
| 8 KiB | Three scopes | 0 | 864 | 22 | 76,032 |
| 32 KiB | Hot prefix | 11 | 336 | 0 | 52,800 |
| 32 KiB | Alternating | 10 | 384 | 0 | 54,912 |
| 32 KiB | Three scopes | 9 | 432 | 0 | 57,024 |

For the 8 KiB hot trace, the first request costs 72 rows and the remaining eleven cost 24 each: `72 + 11 × 24 = 336`.

Copy bytes count explicit checkpoint admission and retrieval only. They exclude internal concatenation and library transfers and are not a memory-bandwidth measurement.

## Why does the larger budget evict more?

8 KiB holds both checkpoints of one prefix (6,336 bytes), but not two branches (12,672). Switching from A to B admits B4 and B8 while evicting A4 and A8. Returning to A repeats the cycle. The cache is busy, but never useful.

4 KiB admits only the four-token checkpoint, so each switch evicts one entry instead of two. Extra capacity did not cross the working-set threshold; the admission policy simply retained more entries that would be discarded before reuse.

This is not a universal claim that larger caches are worse. It is a result for this admission policy and workload. Keeping only the longest checkpoint, value-based admission or prefix sharing could change the outcome and requires a separate comparison.

## Check equivalence before claiming savings

Every reused suffix is compared with matching positions from full recomputation. The archive contains 648 arrays. All 324 maximum absolute errors are below `1e-12`; the largest is approximately `4.16e-16`.

The audit independently replays LRU from the request log and checks cut lengths, evictions, resident bytes and copy counters. Seven unit tests cover zero budget, scope isolation, weight changes, array ownership, short queries, input validation and the byte formula.

Correctness and usefulness are separate. The 8 KiB alternating trace is numerically correct and saves no projection work.

## What the experiment does not establish

There is no GPU, trained model, tokenizer or latency benchmark. Signature hashing, lookup and Python bookkeeping are not timed. `864 / 336` must not be presented as an end-to-end speedup.

The [Transformers KV cache documentation](https://huggingface.co/docs/transformers/main/en/kv_cache) provides background on cache strategies. Our counts come from the local NumPy model, not from benchmarking that library.

## Reproduce

```text
python -m unittest discover -s experiments/08-cache-budget -p test_cache.py
python experiments/08-cache-budget/run.py --out experiments/08-cache-budget/evidence/my-run
python experiments/08-cache-budget/audit.py experiments/08-cache-budget/evidence/my-run
```

`results.json`, `arrays.npz` and source/file hashes are archived; `audit.json` contains trace totals. Figures are generated from those records. A useful next study would compare admission strategies and measure lookup, copy and computation time together. For now, evaluate caching on a complete workload from cold start, not one attractive hit.
