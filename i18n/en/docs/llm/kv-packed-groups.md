---
title: "Packed KV groups: what does 4-bit actually save?"
description: "Store real nibbles and audit group-scale overhead, padding bytes and attention output error."
slug: "/llm/kv-packed-groups"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-quantization-axes"]
related: ["lab:packed-kv", "project:hohoo-ai-lab"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv) · [Archived evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv/evidence) · [Study protocol](/labs/packed-kv)

The previous experiment compared quantization axes but stored int8. Calling a value “4-bit” does not halve storage if every value still occupies a uint8. **Bit width, packing and scale overhead require separate accounting.**

This implementation packs two nibbles per byte and compares group sizes 8/32 and bit widths 4/8. Inputs are fixed synthetic arrays, not KV collected from a trained model.

## What occupies one byte?

Symmetric 4-bit quantization uses signed values `[-7,7]` and a per-group scale `max(abs(x))/7`. Adding 7 maps codes to `[0,14]`; 15 is unused.

```python
packed = codes[0::2] | (codes[1::2] << 4)
low = packed & 15
high = packed >> 4
```

For example, codes 2 and 13 form hexadecimal `D2`; subtracting 7 reconstructs -5 and 6 before scaling. This is not two's-complement int4 or a learned codebook. Decoding restores shape and removes padding.

The 8-bit comparison similarly shifts `[-127,127]` into unsigned bytes. Both retain float32 scales and two int32 shape dimensions, included in the payload totals.

## Direction and group length both matter

K is `N×D`: each channel is grouped across consecutive Tokens. V is grouped across features within each Token.

```text
K: fixed channel -> Tokens 0..7 | 8..15 | ...
V: fixed Token   -> features 0..7 | 8..15 | ...
```

Smaller groups may reduce within-group range differences, but require more scales. Partial groups are zero-padded and cropped after decoding; tests include a 35×13 matrix. Formal comparisons use 128/512 Tokens, D=32 and four queries.

Eighteen inputs combine three seeds, two lengths and three distributions. Each compares four group/bit settings, giving 72 comparisons. Early/recent attention-focused conditions are reused by the next study.

## Accuracy is purchased with storage

For the six clean inputs, compute each output's relative L2 error before averaging:

| Group size | Bits | Relative output error | KV payload at N=128 |
| ---: | ---: | ---: | ---: |
| 8 | 4 | 9.797% | 8,208 B |
| 32 | 4 | 13.450% | 5,136 B |
| 8 | 8 | 0.589% | 12,304 B |
| 32 | 8 | 0.743% | 9,232 B |

![Packed KV size and synthetic attention output error](/img/research/20261011/packed-groups.svg)

The unquantized float32 K/V payload is 32,768 bytes. Group-32 4-bit codes occupy 4,096 bytes, but scales and shapes bring the total to 5,136: approximately 84.3% less, not exactly 87.5%. Group 8 consumes more space and produces lower error on these inputs.

Moving from 0.743% to 13.450% is not “nearly lossless.” Task tolerance requires real-model quality measurements. This study has no accuracy, perplexity or generated answers.

## Audit the representation, not the filename

`arrays.npz` preserves Q/K/V, references, packed bytes, scales, shapes and outputs. The independent auditor extracts each nibble and recomputes attention with a separate expression; it does not import the implementation's decoder.

Compressed NPZ size is not cache size: the archive duplicates alternatives and its compression depends on values. Payload totals cover arrays only, excluding Python containers, allocator overhead, temporary decoded arrays and other model layers.

### Exercise and troubleshooting

Decode `D2` manually, then check it with masking and shifting. All-zero input uses scale 1 and should reconstruct exact zeros. Incorrect non-divisible shapes suggest cropping/transposition mistakes. If a “4-bit” array remains the same size as 8-bit, check whether values were actually packed.

See [KIVI](https://arxiv.org/abs/2402.02750) for the granularity and residual-cache research questions. This symmetric 4/8-bit NumPy study does not reproduce its asymmetric 2-bit system. Next, keep the codec fixed and test whether recent Tokens deserve the high-precision budget.

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
