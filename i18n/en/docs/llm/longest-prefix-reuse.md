---
title: "LLM mechanics (5): after editing history, can we recompute only the changed suffix?"
description: "27 fixed conditions and 81 raw arrays test longest-prefix cropping, continuation positions, sliding-window fallback and scope isolation."
slug: "/llm/longest-prefix-reuse"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:longest-prefix-reuse", "project:hohoo-ai-lab", "doc:llm/prefix-cache-invalidation", "doc:llm/sliding-cache-positions"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ad2929e2b2b7decdb578d16e4ccafb666496ebfd/experiments/07-prefix-reuse) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ad2929e2b2b7decdb578d16e4ccafb666496ebfd/experiments/07-prefix-reuse/evidence/20261003) · [Experiment record](/labs/longest-prefix-reuse)

The previous experiment invalidated a cache whenever its full prefix identity changed. That is conservative and correct. But if a user edits only the eighth token, must we discard the first seven tokens' computation too?

This study adds longest identical prefix reuse to the same untrained NumPy decoder. Across three fixed seeds and nine conditions, all 27 guarded paths match fresh computation within approximately `3.89e-16`. Intentionally retaining the old continuation position produces substantial errors in nine partial-reuse cases. We measure hidden states and projected rows, not GPU latency or language quality.

## An edit invalidates a suffix, not scattered positions

```text
old: 1 2 3 4 5 6 7 8
new: 1 2 3 4 20 6 7 8 9 10 11 12
     identical | recompute from here
cut = 4
```

Tokens six through eight have their previous IDs, but their later-layer states can depend on the changed fifth token. Reuse the continuous identical prefix; do not assemble cached rows from every position whose ID happens to match.

In this causal decoder, earlier states do not depend on future tokens. With identical computation settings and positions, the first `cut` K/V rows can be retained at every layer. The [Transformers cache documentation](https://huggingface.co/docs/transformers/main/en/kv_cache) provides general background; this article's implementation and measurements come from the local educational model.

## Crop the position state as well as K/V

Our cache contains K, V, absolute row positions and `next_position`. All must agree with the retained prefix.

```python
cache = {
    'next_position': cut,
    'layers': [
        (k[:cut].copy(), v[:cut].copy(), positions[:cut].copy())
        for k, v, positions in stored['layers']
    ],
}
out, _ = model.chunk(tokens[cut:], cache=cache)
```

Cropping to four rows while keeping `next_position=8` places new tokens after an artificial positional gap. Shapes still align and execution may succeed, but it computes a different result. The negative control changes only this continuation position, making the error distinguishable from floating-point rounding.

## Query selection and ownership

`Store` holds at most two prefilled entries: `1..8` and the branch `1,2,3,4,5,20,21,22`. A query validates integer token IDs, checks scope and computation signature, selects the longest matching prefix and copies the retained arrays. Ties favor the most recently inserted entry.

The signature covers weights, implementation, window and positional convention. Floating IDs such as `1.0` are rejected before lookup. Copying keeps one query from mutating a sibling branch, but is not a production paging or concurrency mechanism. A scope string supplied by the caller is not authentication.

For a query contained entirely in a cached prefix, this implementation uses `cut <= len(query)-1`. It does not store final per-token outputs, so it recomputes at least the last token instead of requesting an empty suffix. An implementation storing additional outputs could make a different tradeoff.

## Measured work and error

The model is unchanged: two layers, one head, width 16, vocabulary 32, float64, absolute sinusoidal positions and tanh residuals. It has no training, FFN, LayerNorm or natural-language tokenizer. Seeds are 7, 11 and 23.

<img src="/media/practice/longest-prefix-reuse.png" width="1500" height="600" loading="lazy" alt="Projected rows across nine conditions and errors caused by retaining stale continuation positions under three seeds." />

| Condition | Query length | Reused rows | New projected rows | Full-query rows |
| --- | ---: | ---: | ---: | ---: |
| Append | 12 | 8 | 24 | 72 |
| Edit first token | 12 | 0 | 72 | 72 |
| Edit fifth token | 12 | 4 | 48 | 72 |
| Edit eighth token | 12 | 7 | 30 | 72 |
| Shorten to four tokens | 4 | 3 | 6 | 24 |
| Append to second branch | 12 | 8 | 24 | 72 |
| Different scope | 12 | 0 | 72 | 72 |
| Edit within sliding-cache history | 12 | 0 | 72 | 72 |
| Append after sliding-cache prefix | 12 | 8 | 24 | 72 |

The count is `layers × three Q/K/V projections × newly computed tokens`, or `6 × (queryLength-cut)`. It excludes prefill, weight hashing, lookup, copying and memory management. Reducing 72 rows to 24 therefore does not establish a threefold inference speedup.

The independent audit recomputes 54 errors from 81 archived arrays and checks cuts and operation counts. All guarded errors remain below the frozen `1e-12` tolerance. All nine partial-reuse negative controls exceed it: seed 7 yields `1.37749785` for the middle edit and `0.64189345` for the last-token edit. This exposes a positional bug in the matrix; it says nothing about learned language ability.

## Why partial sliding-window hits fall back

A full-attention cache holding eight rows can provide the first four. A window-four cache retains only absolute positions 4, 5, 6 and 7. The rows needed for positions 0 through 3 have been evicted.

Taking the first four rows of the remaining array does not recover the first four rows of history. We conservatively reuse a sliding cache only when its entire stored token prefix matches and the query has a new suffix. Partial hits recompute from scratch.

Checkpoints or retained pages could support finer reuse. This example has neither, so it does not invent state that is no longer available.

## Reproduce and predict a changed case

Use Python 3 and NumPy; the archive records Python 3.12.14 and NumPy 2.2.6. No API key is needed.

```sh
python -m unittest discover -s experiments/07-prefix-reuse -p "test_*.py"
python experiments/07-prefix-reuse/run.py --out experiments/07-prefix-reuse/evidence/MY-RUN
python experiments/07-prefix-reuse/audit.py experiments/07-prefix-reuse/evidence/MY-RUN
```

Seven tests cover middle edits, singleton queries, branch immutability, changed scope/weights, sliding fallback, capacity and invalid IDs. Use a new output directory. Auditing checks source and raw-array hashes rather than trusting chart labels.

Move the edit from token five to token two and predict `cut=1` before running a new condition. Then explain why token six needs recomputation even though its ID did not change. The answer lies in causal dependencies, not merely in the phrase “cache invalidation.”

## What this justifies

The reusable unit is a continuous prefix with matching identity and computation conditions. Correct slicing, continuation positions, retained window contents and application scope jointly determine whether reuse is valid.

A useful next study would add block storage and eviction, measuring lookup, copy and prefill costs. The current counts cannot establish production speed, and the code should not be transplanted into RoPE, quantized caches or multi-request schedulers without fresh validation.
