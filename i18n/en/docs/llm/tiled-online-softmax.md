---
title: "Tiled attention: preserving results without a full score matrix"
description: "Derive online softmax from a failing block-average baseline and separate smaller temporaries from measured speed."
slug: "/llm/tiled-online-softmax"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:tiled-online-softmax", "project:hohoo-ai-lab", "doc:llm/kv-cache-equivalence"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [Raw evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [Lab record](/labs/tiled-online-softmax)

An attention output is a weighted sum over all keys. Splitting keys into blocks, normalizing each block and averaging the outputs seems convenient, but destroys the relative probability mass between blocks.

This is a NumPy mechanism demonstration, not a FlashAttention GPU implementation or a reproduction of its speedups. All eight query rows may attend to every KV row. Causal prefill needs an additional mask and is not implemented by this comparison.

## A failing baseline

For scalar scores 0, 10 and 20 with values 1, 3 and 5, full softmax heavily favors the last value. Independently normalizing the first two scores and the final singleton, then averaging, gives the two blocks equal weight. The suite keeps this intentionally wrong baseline.

## Online normalization

Maintain a running maximum m, denominator l and unnormalized output accumulator a:

~~~text
m_new = max(m, max(S))
rescale = exp(m - m_new)
P = exp(S - m_new)
a_new = a * rescale + P @ V_block
l_new = l * rescale + sum(P)
output = a / l
~~~

Both old accumulators must be rescaled when the maximum changes. Initialize m to negative infinity and the other accumulators to zero. Exact arithmetic preserves the original normalization; changed floating-point operation order requires a tolerance rather than byte equality. Empty or all-masked rows need separate handling; the recorded comparison uses nonempty, unmasked inputs.

## Recorded results

Three seeds, lengths 64/256/1024, eight query rows, width 32 and block size 32 yield nine array groups. Each kernel gets five warmups and 31 interleaved measurements: 558 timing samples. Maximum dense/tiled discrepancy is 3.33e-16.

| KV rows | Dense score array | Block score array | Dense median | Tiled median |
| --- | --- | --- | --- | --- |
| 64 | 4,096 B | 2,048 B | 80.6µs | 190.3µs |
| 256 | 16,384 B | 2,048 B | 151.3µs | 685.3µs |
| 1024 | 65,536 B | 2,048 B | 435.0µs | 2,235.5µs |

These bytes describe only the score temporary, not peak process memory. Probability blocks, accumulators, Q/K/V and Python objects remain. Smaller temporaries coexist with slower measured execution on this machine.

The [FlashAttention paper](https://arxiv.org/abs/2205.14135) combines tiling with GPU memory hierarchy and reduced memory traffic. This tutorial implements only the readable normalization mechanism, without fused kernels, backward passes or GPU measurements. Similar formulas do not establish an equivalent implementation.

Exercise: use block size seven, which does not divide every sequence length. Compare against dense output. Increase score magnitudes to test numerical stability, then deliberately omit rescaling the old accumulator and observe the error. Check normalization before relaxing tolerances.

Next: [KV quantization, storage and error](/docs/llm/kv-int8-error).

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
