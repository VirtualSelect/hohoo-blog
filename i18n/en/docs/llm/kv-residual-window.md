---
title: "KV residual windows: do recent tokens deserve higher precision?"
description: "Compare early-focused and recent-focused attention to explain unequal gains from the same float32 window."
slug: "/llm/kv-residual-window"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-packed-groups"]
related: ["lab:packed-kv", "project:hohoo-ai-lab"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv) · [Archived evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv/evidence) · [Study protocol](/labs/packed-kv)

Keeping recent KV in float32 while quantizing older positions is an intuitive compromise. Yet recency describes position, not necessarily what the current query uses. This experiment makes that assumption visible with matched early-focused and recent-focused inputs.

These are synthetic attention mechanisms, not trained weights, text questions or measured task quality.

## Who receives the precision budget?

```text
[older Tokens: grouped 4-bit] [last R Tokens: float32]
              N-R                        R
```

The older section uses group 32 with K grouped across Tokens per channel and V across features per Token. R is 0, 16 or 64: three settings over 18 inputs produce 54 comparisons. Every method attends to the entire context; older Tokens are quantized, not removed.

For early_focus and recent_focus, the same base random arrays are modified only in the first Q/K channel to favor the first or last 16 positions. Other channels retain random variation. This is neither natural-language evaluation nor manually one-hot attention.

## Measure attention allocation before interpreting error

Reference attention measures how much probability mass falls in the recent window. Errors below average per-input relative L2 error across three seeds and two lengths:

| Distribution | R=0 error | R=16 error | R=64 error | Reference mass protected by R=16 |
| --- | ---: | ---: | ---: | ---: |
| Clean | 13.450% | 12.863% | 11.477% | 8.28% |
| Early focus | 13.386% | 13.366% | 13.365% | **1.23%** |
| Recent focus | 11.583% | **1.150%** | 1.038% | **77.19%** |

![Residual-window error under three controlled attention distributions](/img/research/20261011/residual-window.svg)

Protecting 16 recent positions sharply reduces local output error when attention focuses there. Expanding to 64 adds little. With early focus, the same expense barely helps because the heavily used older KV remains quantized.

Reference mass is an explanatory measurement, not an online oracle available at no cost. These results do not implement content-aware cache allocation or establish answer correctness.

## Residual precision consumes compression gains

At N=128, the full float32 cache is 32,768 bytes:

| Recent float32 Tokens | Array payload | Reduction from full float32 |
| ---: | ---: | ---: |
| 0 | 5,136 B | 84.3% |
| 16 | 8,912 B | 72.8% |
| 64 | 18,960 B | 42.1% |

Totals include padded groups, scales and shapes. N-R need not be divisible by 32, so a linear “bits times remaining elements” estimate is insufficient. The audit uses saved array sizes.

Sixteen Tokens are 12.5% of a 128-token cache but 3.125% of a 512-token cache. The combined averages describe this protocol; they cannot choose a production R. Multiple layers, heads, sessions, paging and moving Tokens out of the residual window introduce additional costs.

## Static representation is not online maintenance

This experiment constructs a cache once and evaluates attention. It does not generate token by token or continually quantize the oldest residual entries. It does not reproduce the complete [KIVI](https://arxiv.org/abs/2402.02750) residual mechanism.

The representation's error and size are auditable, but they say nothing about dynamic-update latency or temporary allocations. The next article tests block decoding separately: can it reduce particular decoded arrays while preserving the same quantized result, and at what CPU cost?

### Exercise and troubleshooting

Inspect one early_focus input at R=0 and R=64 alongside `attention_mass`. If more storage buys little improvement, reconsider the recency assumption. An alternative protecting the earliest 16 positions deserves a new protocol/output directory, not insertion into these 54 frozen comparisons.

Beware Python's `x[-0:]`, which returns the full array. The implementation uses `cut=N-R; x[cut:]`. If output unexpectedly matches the unquantized reference exactly, check that the original K/V was not accidentally passed to attention.

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
