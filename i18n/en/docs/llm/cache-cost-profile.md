---
title: "Profiling KV reuse: saved work versus added overhead"
description: "Profile 909 queries across signatures, lookup, copying and continuation, including the remaining slowdown."
slug: "/llm/cache-cost-profile"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:cache-cost-profile", "project:hohoo-ai-lab", "doc:llm/prefix-cache-admission"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [Raw evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [Lab record](/labs/cache-cost-profile)

The preceding admission experiment saved projected rows yet ran slower. Total timings alone could not identify the cause. This study isolates an always-hit eight-token prefix in the existing untrained two-layer, width-16 NumPy decoder. A full request has 12 tokens. There is no GPU, provider call or answer-quality claim.

## Three paths

full recomputes all 12 tokens and returns the last four outputs. rehash reads source bytes and hashes weights/configuration on every cached query. frozen computes that identity during initialization, then uses the same lookup, copying and continuation. Keys retain scope, identity and prefix tokens. Frozen arrays are read-only; changed weights require a new instance and identity. This is a trusted-code lifetime contract, not a security boundary.

~~~text
Total query = signature + lookup + copy + continuation + residual
~~~

Three seeds, five excluded warmups per path and 101 shuffled rounds per seed produce 909 measured queries. BLAS thread variables are set to one. Outputs are compared against fresh computation at tolerance 1e-12.

## What the local timing supports

Each column below is an independently computed median in microseconds. Their sum is not the median total.

| Path | Total | Signature | Lookup | Copy | Compute |
| --- | --- | --- | --- | --- | --- |
| full | 252.7 | — | — | — | 250.9 |
| rehash | 682.7 | 365.2 | 2.8 | 12.0 | 290.4 |
| frozen | 273.6 | 0.6 | 2.2 | 9.0 | 257.1 |

Removing per-request source/weight hashing reduces measured cost substantially, but frozen reuse still exceeds fresh computation by 20.9µs at the median. Internal NumPy overhead was not further decomposed. Residual time is bookkeeping between measured segments, not an identified hardware bottleneck.

This does not revise the earlier 4,860-request experiment: that workload included cold starts, eviction and working sets. Do not combine these different workloads into one speedup claim.

## Ownership remains part of correctness

A cache hit is copied before continuation. Removing that copy requires proving that shared state cannot be mutated across requests. The experiment deliberately does not trade request isolation for a smaller timing number.

Exercise: verify that component times plus residual equal total for one raw row, then compare the sum of column medians with the median total. Try a larger input only in a new output directory and define the reused prefix carefully. Do not assume the result will favor caching.

For timing differences check BLAS versions, threads, background work and measurement scope. For numerical disagreement check model identity and positions before discussing speed. Continue with [tiled online softmax](/docs/llm/tiled-online-softmax).

## Reproduce from a clean checkout

Python 3.12. The runner executes all three comparisons; each article discusses its own subset.

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python -m pip install numpy==2.2.6
python experiments/10-attention-costs/run.py --out outputs/my-run
python experiments/10-attention-costs/audit.py outputs/my-run
~~~

Use a new output directory. Windows was exercised; Linux/macOS were not rerun. No model API or key is required. The source commit in the manifest precedes the evidence commit linked above; source hashes bind the executed files.
