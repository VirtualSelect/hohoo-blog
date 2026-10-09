---
title: "KV quantization axes: why Key and Value need separate reasoning"
description: "162 archived INT8 comparisons examine tensor, token and K-channel/V-token scales, including cases where the hybrid loses."
slug: "/llm/kv-quantization-axes"
status: "published"
published_at: "2026-10-09"
updated: "2026-10-09"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-int8-error"]
related: ["lab:kv-quantization-axes", "project:hohoo-ai-lab", "doc:llm/tiled-online-softmax"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/experiments/11-kv-quantization-axes) · [Inputs, integer codes and outputs](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/experiments/11-kv-quantization-axes/evidence) · [Lab](/labs/kv-quantization-axes)

The previous article showed that per-row INT8 shrinks KV storage but leaves small elements vulnerable to a large element in the same row. Is per-channel quantization always better? **It depends on the distribution of outliers. An axis is not a universal recommendation.**

These are fixed synthetic arrays, saved integer codes, scales and attention outputs, not a trained-model evaluation. There are no Agnes calls, model weights, GPU kernels or throughput measurements.

## What rows and columns mean

K and V have shape `N × D`: N token rows and D feature channels. Every method uses the same symmetric rule:

```text
scale = max(abs(group)) / 127
code  = clip(round(x / scale), -127, 127)
x_hat = code * scale

Tensor: one scale for the whole matrix
Token:  one scale per row, N scales
Channel: one scale per column, D scales
```

If one channel is large across many tokens, it enlarges every per-token scale, reducing resolution for small channels. Per-channel grouping isolates that column. Conversely, if one token row is large, per-token grouping isolates that row while per-channel scales all grow.

This is a testable mechanism, not a claim that real model distributions have these idealized shapes. [KIVI](https://arxiv.org/abs/2402.02750) discusses K/V distributions and differing granularities. This experiment borrows the question, not its grouping, asymmetric 2-bit scheme, residual cache or model-quality conclusions.

## Separate the two error paths

```text
K error -> QKᵀ / √D -> changed Softmax weights -> output
V error -----------------------------------> weighted sum
```

K changes where attention goes; V changes the values it aggregates. We therefore quantize K-only, V-only and both. Attention uses stable Softmax in float64. The source and unquantized storage baseline are float32; their byte counts must not be confused with the calculation precision.

The frozen protocol uses seeds 7, 19 and 41; lengths 64 and 256; D=32; eight query rows. Each base input has three conditions: clean, K column 0 multiplied by 40, or V row 0 multiplied by 40. The conditions reuse the same base arrays. Three schemes and three quantization targets produce **18 inputs and 162 output comparisons**.

## The hybrid wins one condition and loses others

Relative error is `||output - reference||₂ / ||reference||₂`. Each table cell is the arithmetic mean of six individually calculated errors (three seeds × two lengths), expressed as a percentage. It is neither the error of an averaged output nor a task-accuracy metric.

| Both K/V quantized | Tensor | Token for both | K-channel / V-token |
| --- | ---: | ---: | ---: |
| Clean | 1.2067 | **0.8006** | 0.8818 |
| K-channel outlier | 13.9727 | 7.9781 | **1.9215** |
| V-token outlier | 8.9957 | **0.7364** | 0.8106 |

![Relative attention-output error across three synthetic distributions](/img/research/20261009/quantization-en.svg)

With K-only quantization, the K-channel-outlier errors are 13.9658%, 7.9645% and 1.7653%. That supports the local explanation of isolating high-amplitude channels. For V-only quantization under a V-row outlier, tensor error is 8.9198%, while token and hybrid both give 0.5427%: their V rules are identical.

The hybrid does not beat token-for-both on clean or V-row-outlier inputs. There is no basis here for calling it more universal. Nor should every output error be blamed on Softmax without decomposition; the K-only/V-only results limit that explanation.

## Scales occupy bytes too

This counts numeric KV payload including float32 scales, excluding object headers, allocators and workspaces.

| N | Float32 K/V | Tensor INT8 | Token for both | K-channel / V-token |
| --- | ---: | ---: | ---: | ---: |
| 64 | 16,384 B | 4,104 B | 4,608 B | 4,480 B |
| 256 | 65,536 B | 16,392 B | 18,432 B | 17,536 B |

The hybrid formula is `2ND + 4D + 4N` bytes. At N=256 it reduces cache-array bytes by 73.24%, not exactly 75%. The compressed `arrays.npz` archive repeats some arrays for auditing; its file size is not a deployed inference cache size.

This implementation restores INT8 to float64 before multiplication. It establishes representation size and local numerical error, **not lower peak memory or faster generation**. Dequantization and allocation might offset gains in a decoding loop. This round did not time that path and reports no speedup.

## Reproduce

```sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 009289d3c9314d64a495303d9b16517080282788
python -m venv .venv
# Windows: .venv/Scripts/activate; Linux/macOS: source .venv/bin/activate
python -m pip install -r experiments/11-kv-quantization-axes/requirements.txt
python -m unittest discover -s experiments/11-kv-quantization-axes -p "test_*.py"
python experiments/11-kv-quantization-axes/run.py --out experiments/11-kv-quantization-axes/target/my-run
python experiments/11-kv-quantization-axes/audit.py experiments/11-kv-quantization-axes/target/my-run
```

Windows, Python 3.12.14 and NumPy 2.2.6 were tested; other platforms were not. Expect four passing unit tests, 162 saved comparisons and `PASS: 162 archived comparisons...`. The audit does not import the implementation's attention function: it restores archived codes/scales and independently expresses the calculation with NumPy to check outputs, errors and bytes.

If scales have the wrong shape, check the reduction axis: token scales are `(N,1)` and channel scales `(1,D)`. A zero group uses scale 1 to avoid division by zero. NaN/Inf inputs are rejected. After source changes, run into a new directory rather than editing the old manifest to suppress mismatches.

Exercise: change V to a column outlier and predict whether token grouping still isolates it. Freeze and save this as a new condition. Real-model work still needs actual K/V distributions, grouping choices, task quality, dequantization cost and measured memory. Random arrays cannot replace those validations.
