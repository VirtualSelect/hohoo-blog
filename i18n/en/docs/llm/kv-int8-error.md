---
title: "KV quantization: how many bytes, and at what error?"
description: "Compare tensor and row-wise int8 quantization, including scale bytes and attention error under outliers."
slug: "/llm/kv-int8-error"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:kv-int8-error", "project:hohoo-ai-lab", "doc:llm/tiled-online-softmax"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [Raw evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [Lab record](/labs/kv-int8-error)

Changing float32 KV to int8 suggests fourfold compression, but ignores scales and output error. This experiment compares one symmetric scale per tensor with one per row on saved synthetic arrays. Computation dequantizes back to float64, so it does not establish lower compute-time peak memory or higher throughput.

## Representation

~~~text
scale = max(abs(x)) / 127
q = round(x / scale), clipped to [-127,127]
x_hat = q * scale
~~~

Zero groups use scale one. Scales are float32, values int8. The quantization step explains rounding error, while finite scale precision adds another term. Row scales protect different tokens from one another's ranges, but do not solve an outlier within the same row.

We multiply the first element of both K and V by 40 as a controlled outlier. This is not a claim about real model distributions. K errors change scores and softmax weights; V errors change the weighted sum directly. Array error alone cannot substitute for attention-output comparison or task-quality evaluation.

## Count every stored array

Width is 32, with N rows in each of K and V. Object headers and allocator costs are excluded.

| N | Float32 KV | Tensor int8 + scales | Row int8 + scales |
| --- | --- | --- | --- |
| 64 | 16,384 B | 4,104 B | 4,608 B |
| 256 | 65,536 B | 16,392 B | 18,432 B |
| 1024 | 262,144 B | 65,544 B | 73,728 B |

At N=256 the row representation saves about 71.9%, not exactly 75%. This storage comparison uses float32 as its denominator, although the numerical reference uses float64.

## Errors depend on inputs

Three seeds, three lengths, two outlier conditions and two quantizers yield 36 comparisons. At seed seven and length 256:

| Input | Tensor maximum output error | Row maximum output error |
| --- | --- | --- |
| Normal | 0.00437 | 0.00247 |
| 40× single-element perturbation | 0.04396 | 0.04295 |

The full matrix reaches maximum absolute output error 4.136. Showing only the mild examples would conceal an important failure. Absolute errors also depend on output scale.

[KIVI](https://arxiv.org/abs/2402.02750) studies different distributions and grouping needs for keys and values. This tutorial uses the same simple strategy for both, does not implement its 2-bit method and cannot inherit its model-quality claims.

Exercise: quantize all-zero arrays, then enlarge one element and inspect which scales change. Tensor scaling affects every element's resolution; row scaling localizes that effect to a row. For production decisions, real calibration distributions, task quality, dequantization cost, peak device memory and end-to-end measurements remain necessary.

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
