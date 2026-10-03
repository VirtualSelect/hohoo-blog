---
title: "LLM mechanics II: what does KV caching save, and how do we verify it?"
description: "Compare prefix recomputation, token decoding and chunk caching with output errors, projected-row counts and actual array payloads."
slug: "/llm/kv-cache-equivalence"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:attention-mechanisms", "project:hohoo-ai-lab", "doc:llm/causal-mask-lab", "doc:llm/sliding-cache-positions"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab/evidence/20261003) · [Experiment record](/labs/attention-mechanisms)

The [earlier KV-cache explanation](/docs/llm/kv-cache) separated inference caches from chat history. Here we verify reuse numerically with the [causal-attention implementation](/docs/llm/causal-mask-lab), holding all 24 input IDs and model parameters fixed.

This is an untrained two-layer network. There is no hosted-model comparison, downloaded language model or GPU speed benchmark.

## 1. Compare the same output

The reference is a 24×16 representation matrix from one full causal forward pass. Prefix recomputation processes lengths 1 through 24 and takes each final row. Token decoding processes one new ID at a time. Chunk decoding uses blocks of 5, 3, 7, 9 and retains all new rows.

We compare hidden states at corresponding positions, not shifted next-token predictions or sampled text.

## 2. Keep K/V separately for every layer

```python
k = concatenate(old_k, new_k)
v = concatenate(old_v, new_v)
output = attention(new_q, k, v, query_positions, key_positions)
```

Old queries are unnecessary for the new position's computation. Each layer stores its own keys, values and positions because its projections receive different inputs. Tests also verify that a chunk call does not mutate the input cache, permitting independent prefix branches. This implementation uses copies, not a production shared-block allocator.

## 3. Cached chunks need an offset mask

With five cached positions and three new tokens, queries are at 5, 6, 7 and keys at 0–7:

```text
q5: 1 1 1 1 1 1 0 0
q6: 1 1 1 1 1 1 1 0
q7: 1 1 1 1 1 1 1 1
```

Numbering the new query rows 0, 1, 2 incorrectly excludes most old context. Output shapes can still look valid. In our negative control, the resulting maximum errors were 0.589838, 0.739833, 0.648703 for the three seeds. Correct chunk processing stayed within 3.89e-16.

## 4. Count work without claiming a speedup

| Recorded count: 24 tokens, two layers | Prefix recomputation | Token cache |
|---|---:|---:|
| Input rows projected into Q/K/V | 1800 | 144 |
| Allocated attention-score elements | 9800 | 600 |
| Final retained K/V payload | Not retained across steps | 12288 bytes |

Projection counts are `3×2×Σt` and `3×2×24`. Score counts are `2×Σt²` and `2×Σt`, including entries later masked in the allocated square reference matrices. K/V payload is `2×2×24×16×8=12288` bytes.

<img src="/media/practice/kv-storage.png" alt="Recorded full and four-position-window K/V payload as input length grows" width="1500" height="600" loading="lazy" />

Payload excludes positions, temporary copies, weights, Python objects and allocator overhead. Batched kernels, copying and hardware parallelism affect actual runtime, so these counts are not a wall-clock speedup ratio. Runtime was not an experimental metric.

## 5. How equivalent were the paths?

All three seeds kept prefix, token and chunk output differences below the frozen 1e-12 tolerance. The largest token-cache difference was 5.55e-16 in float64. This does not imply bitwise equality across quantization, lower precision, dropout or different backends.

Parameters, inputs, positions and masks must agree. Editing the prefix invalidates any assumption that its old cache remains reusable.

## 6. Reproduce

```sh
python experiments/05-attention-lab/run.py --out experiments/05-attention-lab/evidence/my-cache-run
python experiments/05-attention-lab/audit.py experiments/05-attention-lab/evidence/my-cache-run
```

Inspect `full`, `prefix`, `cached` and `chunked` in the saved arrays. The tests cover different lengths, chunks and windows. The [next experiment](/docs/llm/sliding-cache-positions) asks whether retaining four cached positions is equivalent to recomputing just the latest four raw tokens.

See the [Hugging Face caching explanation](https://huggingface.co/docs/transformers/main/en/cache_explanation) for general background. The measurements above belong to this simplified implementation, not that library's performance.

## Read this series

- [LLM mechanics I: should changing future tokens affect earlier outputs?](/docs/llm/causal-mask-lab)
- [LLM mechanics III: why is a four-slot cache not four-token recomputation?](/docs/llm/sliding-cache-positions)
