---
title: "LLM mechanics (7): why is caching slower even when it saves computation?"
description: "4,860 measured queries compare three admission policies, connecting byte budgets, working sets, computation and local elapsed time."
slug: "/llm/prefix-cache-admission"
status: "published"
published_at: "2026-10-05"
updated: "2026-10-05"
reading_minutes: 12
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:prefix-cache-admission", "project:hohoo-ai-lab", "doc:llm/prefix-cache-byte-budget", "doc:llm/prefix-cache-invalidation"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/503f5271ef0d5baa12353d6eeda672dec5fc240e/experiments/09-cache-admission) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/503f5271ef0d5baa12353d6eeda672dec5fc240e/experiments/09-cache-admission/evidence/20261005) · [Experiment record](/labs/prefix-cache-admission)

The [previous study](/docs/llm/prefix-cache-byte-budget) found an 8KiB cache repeatedly evicting checkpoints without a single hit. Saving fewer checkpoints seems like an obvious improvement. This time we measure both work and elapsed query time: **admission improves some traces, yet the tiny NumPy model remains faster without caching.**

## Change admission, keep the model

The unchanged untrained Decoder has two layers, dimension 16 and vocabulary 32. Each request contains twelve tokens: an eight-token prefix and a changing four-token suffix.

| Policy | Persistent checkpoints | Query path |
| --- | --- | --- |
| `none` | None | Compute all twelve tokens; no cache signature or copies |
| `all` | Full prefixes at tokens 4 and 8 | Find the longest matching prefix and continue |
| `longest` | Only the full prefix at token 8 | Same lookup, segmented computation and LRU machinery |

Both cache policies retain the same segmentation even when token-4 state is not admitted. The no-cache baseline performs genuinely ordinary computation rather than paying artificial lookup costs for symmetry.

Entries own full K/V and position arrays, without shared pages. Persistent payload costs 528 bytes per token: 2,112 bytes for four tokens and 4,224 for eight. This is array payload, not process RSS or GPU memory.

## Capacity arithmetic is useful, but not sufficient

For three isolated scopes:

```text
all:      3 × (2,112 + 4,224) = 19,008 bytes
longest:  3 × 4,224           = 12,672 bytes
16 KiB:                       16,384 bytes
```

The longest checkpoints fit; all checkpoints do not. Identical tokens in different scopes remain isolated.

However, failing to hold every checkpoint does not imply zero hits. At 12KiB, the two-branch `all` trace evicts one short checkpoint, retains both long prefixes and subsequently hits ten times. Access order and the surviving working set matter alongside capacity.

## What the timer includes

Three seeds × three budgets (8, 12, 16KiB) × three traces × three policies produce 81 configurations. Each receives one excluded warm-up trace, then five measured traces. Configuration order is shuffled in each measurement block with a fixed seed; each trace starts with a fresh model object and empty cache.

The archive contains **405 measured traces / 4,860 requests**, plus 972 excluded warm-up requests. Each budget/trace/policy summary aggregates fifteen trace times: three model seeds and five repetitions.

```python
start = time.perf_counter_ns()
states, info = store.query(scope, model, tokens)
elapsed_ns = time.perf_counter_ns() - start
fresh, _ = model.full(tokens)  # outside the timing interval
```

Timing includes signature checks, lookup, copies, computation, admission and eviction. It excludes model construction, reference computation, output serialization and plotting. The inherited signature function **reads the model source file and hashes weights on every query**, so that source-file read is included. This is intentionally the existing teaching implementation, not a tuned production cache.

`perf_counter_ns()` provides an integer nanosecond representation for time differences; its unit does not guarantee nanosecond measurement accuracy. [Python time reference](https://docs.python.org/3/library/time.html#time.perf_counter_ns)

## At 16KiB, less work does not mean less time

Each row covers a twelve-request trace, including the initial cold request. Times are median and minimum–maximum across fifteen measured traces.

| Trace | Policy | Hits | Q/K/V rows | Query time (ms) |
| --- | --- | ---: | ---: | ---: |
| Hot prefix | none | 0 | 864 | 1.646 (1.607–3.260) |
| Hot prefix | all | 11 | 336 | 5.921 (5.680–6.886) |
| Hot prefix | longest | 11 | 336 | 6.231 (5.679–8.648) |
| Alternating branches | none | 0 | 864 | 1.733 (1.603–3.511) |
| Alternating branches | all | 10 | 384 | 6.495 (6.036–9.840) |
| Alternating branches | longest | 10 | 384 | 6.282 (5.846–7.138) |
| Three scopes | none | 0 | 864 | 1.697 (1.612–2.126) |
| Three scopes | all | 0 | 864 | 10.263 (9.255–15.599) |
| Three scopes | longest | 9 | 432 | 6.723 (6.345–10.020) |

<img src="/media/practice/cache-admission.png" width="1500" height="600" loading="lazy" alt="At 16KiB, longest-prefix admission halves projection work for three scopes but remains slower than fresh computation.">

Three scopes provide the clearest admission contrast: twenty evictions become zero, rows drop from 864 to 432, and median time falls from 10.263ms to 6.723ms. Yet no caching takes 1.697ms. Improving one cache strategy is not the same as beating the no-cache baseline.

The hot trace also rejects a universal claim that longest-only is faster. Both policies hit eleven times; longest-only has a slightly higher median and overlapping ranges. No statistical significance test was performed, and no fastest repetition was selected for presentation.

## An explanation, not a component-level profile

The model's matrices are tiny. The cache path still performs source/weight hashing, Python container management, owned copies and segmented calls. Fresh computation avoids that machinery.

This explanation is consistent with the code and observations, but this study does not time individual components. It cannot assign a percentage of overhead to hashing or copying. A next experiment could profile those parts and compare a model-load-time version signature with per-query signatures while retaining invalidation tests.

Simply deleting identity checks would make stale K/V reusable after weight or positional-rule changes. Returning a wrong answer faster is not an optimization.

## Keep the zero-benefit cases

At 8KiB, two longest prefixes require 8,448 bytes, exceeding 8,192. Longest-only reduces evictions from 22 to 11 and explicit copying from 76,032 to 50,688 bytes, but still gets zero hits and saves no projection work.

At 12KiB, three longest prefixes require 12,672 bytes, exceeding 12,288. This trace also remains at zero hits. Admission rules cannot erase the capacity constraint.

These deterministic traces are not sampled user traffic. Their hit counts explain mechanisms rather than predict online hit rates.

## Correctness and reproduction

All 4,860 measured requests are compared with a full reference calculation. Maximum absolute error is **4.16 × 10⁻¹⁶**. The first measured repetition of each configuration archives reference and reused outputs: 1,944 arrays in total. Later repetitions retain errors and timing without duplicating arrays.

Six contract tests cover invalid policy, a one-byte capacity boundary, scope separation, model identity changes, return/cache memory isolation and longest-only admission. The independent audit replays token/scope LRU behavior without calling the Store under test.

In `experiments/09-cache-admission`:

```text
python -m unittest discover -s . -p test_cache.py
python run.py --out evidence/my-run
python audit.py evidence/my-run
```

Use the repository's Python/NumPy environment. Archived versions are Python 3.12.14 and NumPy 2.2.6. The manifest identifies frozen source, runtime, NumPy configuration, timer resolution and hashes. Raw results retain ordering, elapsed nanoseconds, work counters, copying and eviction events.

This was not a dedicated benchmark machine: no CPU affinity, GPU or production inference engine. Timing will vary. The useful discipline is to report correctness, capacity, work and elapsed time together, so the reader can see exactly what improved.
