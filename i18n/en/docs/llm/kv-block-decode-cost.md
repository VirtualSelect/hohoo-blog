---
title: "Block KV decoding: less workspace, more time"
description: "Separate cache payload, work arrays and observed runtime, retaining 810 timings including slower block decoding."
slug: "/llm/kv-block-decode-cost"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-residual-window"]
related: ["lab:packed-kv", "project:hohoo-ai-lab"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv) · [Archived evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv/evidence) · [Study protocol](/labs/packed-kv)

The simplest quantized-cache computation decodes all K/V into floating-point arrays before attention. Block decoding appears to need smaller temporary arrays. Does it also run faster? This study separates numerical equivalence, specific workspace dimensions and measured elapsed time.

The blocked result matches dense decoding of the same quantized cache. Particular arrays become smaller, yet this NumPy CPU path is slower. There is no GPU kernel or full-model inference here.

## Do not average independently normalized blocks

Each block has its own maximum score and normalization constant. Averaging block-softmax outputs changes global weights. Instead, carry a maximum m, exponential sum z and weighted value sum u:

```text
m_new = max(m_old, max(block_scores))
a     = exp(m_old - m_new)
z_new = a*z_old + sum(exp(block_scores - m_new))
u_new = a*u_old + exp(block_scores - m_new) @ block_V
output = u / z
```

Rescaling aligns old and new terms. Initialize m at negative infinity and z/u at zero. Decode 32 Tokens at a time, merge them, and replace local references on the next iteration.

Every KV position is still read. Tiling does not remove the work. The method draws on the online-normalization idea discussed in [FlashAttention](https://arxiv.org/abs/2205.14135), but does not reproduce its GPU memory hierarchy, fused kernels or speedups.

## Compare equivalent representations first

Dense and blocked paths use 4-bit group-32 data with aligned group boundaries. Across 18 inputs, their maximum absolute difference satisfies the frozen `1e-10` tolerance. Neither result is assumed equal to the unquantized reference.

A float32 cache provides an additional timing baseline. All three methods perform float64 attention arithmetic; “float32 cache” describes storage, not end-to-end compute precision.

## Which arrays shrink?

At N=512, D=32 and four queries:

| Array | Dense decode | One 32-token block |
| --- | ---: | ---: |
| Decoded float32 K/V | 131,072 B | 8,192 B |
| One float64 score matrix | 16,384 B | 1,024 B |

These values multiply array shapes by dtype size. Conversion buffers, exponentials, accumulators, reference arrays and prepacked copies also exist. This is **not measured process RSS, GPU memory or total peak reduction**. Measuring complete peaks requires isolated-process accounting rather than extrapolating from one buffer.

## CPU timing retains the negative result

Each input receives three warmups and fifteen measured rounds. Method order rotates, retaining 810 raw observations. Each cell is the median of 135 observations for one length/method, in microseconds:

| Tokens | Float32-cache reference | Decode all, then compute | Decode and merge blocks |
| ---: | ---: | ---: | ---: |
| 128 | 36.9 | 97.5 | 277.5 |
| 512 | 91.1 | 252.3 | 1305.0 |

![Raw CPU timing distributions and medians](/img/research/20261011/decode-cost.svg)

Timing includes decoding, conversion, softmax and multiplication. It excludes prepacking, input generation, disk writes and model projections. No CPU affinity, process isolation or significance test was used; repeated measurements will differ. These medians are not an SLA or a GPU prediction.

Python loops, repeated allocations and small matrix calls are plausible contributors, but this experiment does not isolate their shares. The supported conclusion is limited: at these sizes, this implementation does not accelerate the measured computation.

### Use the failure to choose the next question

If storage is the bottleneck, the representation measurements remain useful. If latency matters, “4-bit” and “blocked” are insufficient deployment arguments. Real-model distributions and the complete generation path should precede investing in a fused implementation.

As an exercise, remove the `a*u_old` rescaling and compare two blocks with very different maxima. Numerical validation should fail even if timing improves. For slow but correct results, check identical timing scopes and thread configuration, and retain all observations rather than reporting the fastest sample.

## Reproduce the protocol

Run from a fresh checkout in PowerShell. The output directory must not exist. All three articles in this study share one frozen protocol; run it once and inspect the section relevant to each article.

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 0d4009cf840052c3111bbfc40dce900326daa3ae
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r experiments/12-packed-kv/requirements.txt
& $py -m unittest discover -s experiments/12-packed-kv -p "test_*.py"
& $py experiments/12-packed-kv/run.py --out experiments/12-packed-kv/target/my-run
& $py experiments/12-packed-kv/audit.py experiments/12-packed-kv/target/my-run
```

Tested on Windows with Python 3.12.14 + NumPy 2.2.6; 4 unit tests, 144 comparisons and 810 raw timings. The independent audit should print `PASS`. Other operating systems have not been rechecked. To inspect the archived result without rerunning the experiment, pass `experiments/12-packed-kv/evidence` to the same audit command. Source hashes normalize LF; evidence hashes use original bytes. Do not rewrite the manifest to conceal a mismatch.

If an import fails, verify that installation and execution use the same `$py`. Preserve failed outputs and choose a new directory for reruns. Numeric comparisons use the frozen tolerances; timing is a local measurement, not a required speed threshold.

Code and writing are AI-assisted; the findings are limited to the archived, auditable runs. No new paid model requests were made, and this does not claim author-performed manual review.
