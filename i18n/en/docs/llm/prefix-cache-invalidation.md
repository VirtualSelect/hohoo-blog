---
title: "LLM mechanics (4): when a prefix changes, is the old KV cache still valid?"
description: "Three seeds and six conditions compare unchecked and keyed prefix reuse; numerical equality does not establish permission to share across scopes."
slug: "/llm/prefix-cache-invalidation"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:prefix-cache", "project:hohoo-ai-lab", "doc:llm/kv-cache-equivalence", "doc:llm/sliding-cache-positions"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ba75c55c53f6f5e30ac027bbf59f28a8202708d7/experiments/06-prefix-cache) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ba75c55c53f6f5e30ac027bbf59f28a8202708d7/experiments/06-prefix-cache/evidence/20261003) · [Experiment record](/labs/prefix-cache)

The previous study established cache equivalence when inputs, weights, positions and masks stay consistent. What happens when someone edits an earlier message and continues the conversation?

A KV cache is not a copy of the text. It contains intermediate representations created under particular computation conditions. Matching shapes and lengths do not establish that those representations remain valid.

This study keeps the earlier untrained teaching network and adds a prefix store. Three seeds and six conditions produce 18 cases comparing unchecked reuse, keyed reuse and fresh computation. No Agnes requests or language-capability measurements are involved.

## 1. A cache identity contains more than eight tokens

The prefix is token IDs 1–8, followed by IDs 9–12. The model has two single-head layers, width 16, vocabulary size 32, float64 arithmetic, sinusoidal absolute positions and tanh residual updates. It has no tokenizer, training, FFN or layer norm.

Reuse depends on prefix IDs, weights, position rules, window policy, implementation revision and permitted application scope. The key is:

```python
wanted = (
    scope,
    signature(model, window),
    tuple(int(x) for x in prefix),
)
```

The signature hashes the attention source, dimensions, layer count, window and position label, plus the embedding and Q/K/V arrays including their shapes, dtypes and values. The suffix is deliberately absent: continuing one prefix with different questions is a valid reuse case.

Hashing every weight is inspectable for this small network. It is not a recommendation to scan production model weights per request. Production systems need trusted immutable revision identifiers covering the adapters, position and cache settings that affect computation. That deployment system is outside this implementation.

## 2. What a hit and a miss do

`remember` computes a cache from owned inputs; callers cannot submit arbitrary K/V through that API. The store holds two entries and evicts by insertion order: FIFO, not LRU.

Continuation validates token IDs before looking up a key. Converting to integers first could make floating-point inputs alias valid integer IDs.

```python
model.inputs(prefix, np.arange(len(prefix)))
model.inputs(suffix, np.arange(len(prefix), len(prefix) + len(suffix)))
match = next((e for e in reversed(self.entries) if e[:3] == wanted), None)
model.reset()
if match:
    out, _ = model.chunk(suffix, cache=match[3], window=window)
    return out, dict(reused=True, projected_rows=model.projected_rows)
out, _ = model.chunk(list(prefix) + list(suffix), window=window)
return out[-len(suffix):], dict(reused=False, projected_rows=model.projected_rows)
```

A miss is normal: recompute the complete input and return its suffix states. This implementation requires an exact match of the entire prefix. It does not find the longest common prefix or implement paged, persistent or cross-process caching.

## 3. Six conditions fixed before execution

The seeds are 7, 19 and 41. Every condition uses fresh full causal computation under its own settings as the reference, rather than treating the initial output as the answer for all variants.

| Case | Change from the stored prefix | Reuse? |
| --- | --- | --- |
| same-prefix | None | Yes |
| edited-prefix | Replace the third prefix ID with 20 | No |
| different-weights | Add 0.5 to one first-layer WK element | No |
| different-window | Change full attention to window 4 | No |
| different-scope | Change reader-a to reader-b | No |
| new-suffix | Use suffix IDs 20–23 | Yes |

The unchecked baseline always reuses the original prefix cache while continuing with the current model and window. It represents the tempting mistake of treating cache availability as sufficient evidence for reuse.

## 4. Measured errors from stale reuse

The metric is maximum absolute error across four suffix hidden states, relative to fresh computation. It is not token accuracy, answer correctness or a task score.

<img src="/media/practice/prefix-cache-invalid.png" alt="Unchecked prefix-cache reuse yields nonzero hidden-state errors after changes to prefix, weights or window; keyed reuse has zero measured error in all 18 float64 teaching cases" width="1500" height="600" loading="lazy" />

| Unchecked reuse condition | Seed 7 | Seed 19 | Seed 41 |
| --- | ---: | ---: | ---: |
| Edited prefix | 0.088204 | 0.060447 | 0.058312 |
| Changed weights | 0.021804 | 0.012761 | 0.009166 |
| Changed window | 0.127578 | 0.069393 | 0.040604 |

The guarded path has measured error 0 in all 18 cases on this float64 run; the frozen tolerance is `1e-12`. Misses use fresh computation by design. Hits are the cases that compare actual reuse against the reference. This does not promise bitwise equality across other models, precisions or hardware.

The same-prefix and new-suffix cases project 24 rows during continuation; misses project 72. There are two layers and three Q/K/V projections: `4×2×3` versus `12×2×3`. These counts exclude cache preparation, hashing and lookup. They do not establish a threefold speedup.

## 5. Equal numbers do not establish permission to reuse

The unchecked different-scope case also has error 0: inputs and computation are identical. Why must the guarded store miss?

Numerical correctness and allowed reuse are different questions. Partitioning reader-a from reader-b illustrates a policy boundary that tensor comparisons alone cannot see.

However, this `scope` is an ordinary caller-supplied string. It is not authenticated identity and does not demonstrate secure multi-tenant isolation. A production service must derive the namespace from trusted identity context rather than browser input. Python object internals are not a security boundary either.

## 6. Verify arrays, not just the summary

Every case retains reference, unchecked and guarded arrays: 54 arrays in total. The independent audit recomputes 36 error metrics, checks 18 reuse decisions and projection counts, and verifies source/data hashes.

Eight unit tests cover independent continuations from one prefix, invalidation after prefix/weight/window/scope changes, rejection of floating-point IDs, bounded eviction and scope validation. They do not exhaust every possible cache policy.

From the `hohoo-ai-lab` root, reuse the previous study's dependencies:

```sh
python -m pip install -r experiments/05-attention-lab/requirements.txt
python -m unittest discover -s experiments/06-prefix-cache -p "test_*.py"
python experiments/06-prefix-cache/run.py --out experiments/06-prefix-cache/evidence/MY-RUN
python experiments/06-prefix-cache/audit.py experiments/06-prefix-cache/evidence/MY-RUN
```

Choose a new output directory. Predict the new-suffix hit before looking at its result, then change just one prefix ID and compare both the operation count and error.

## 7. What this means for a chat application

Editing history should invalidate affected prefixes. Model upgrades and changed attention policies need new cache identities. Permission changes require their own treatment, independent of numerical equivalence.

For library cache implementations and their constraints, see the [official Transformers KV Cache documentation](https://huggingface.co/docs/transformers/main/en/kv_cache). This study uses an independent teaching network, not that library's cache implementation.

Longest-common-prefix reuse is a useful next experiment, but it is not implemented here. No GPU timing or answer-quality claims follow from this run. The result concerns the conditions under which an existing intermediate computation remains eligible for reuse.
