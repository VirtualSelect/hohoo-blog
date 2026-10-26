---
slug: local-llm-mac-mini-48g
title: "Running a 27B LLM on a 48GB Mac mini: Quantization, KV Cache and Context Trade-offs"
description: "A field-tested guide to deploying a 27B model locally on a 48GB Mac mini: quantization schemes, KV cache math, unified memory OOM, and context budget engineering."
date: 2026-10-26
authors: Hohoo
domain: llm
status: published
article_kind: case-study
tags: [local-llm, mac, quantization, kv-cache]
keywords: [Mac mini, oMLX, KV cache, quantization, speculative decoding, unified memory]
---

Running a 27B-scale model locally on a 48GB unified-memory Mac mini is the cheapest option with the most pitfalls. This article doesn't just record “it works” — it breaks down **why this configuration works and why that one crashes**, deconstructing quantization, KV cache, and unified memory down to the parameter level.

<!-- truncate -->

## Key Takeaways

| Decision | Conclusion | Why |
|---|---|---|
| Model size | 27B Q4 | 16GB weights leaves 32GB for KV and activations |
| Quantization | 4-bit with outlier channels (oQ4-style) | Pure 4-bit degrades on long context; outlier channels are the compromise |
| KV cache | 4-bit | Halves per-token cost — essential for long context |
| Context | Cap at 32K | KV expansion + activation peaks make 64K infeasible |
| MTP | Enabled | Multi-token prediction head; ~2GB for 30%+ throughput gain |
| Role | Fallback / auxiliary model | The 64K hard floor means it can't be the primary model |

---

## 1. Model Selection: 27B Is the Sweet Spot, but “Q4” Is Not One Thing

**Weight memory composition** (using a 4-bit + outlier-channel + MTP scheme as example):

```
Total weights ≈ trunk params (4-bit) + Embedding (usually 16-bit) + MTP head (4-bit) + output head (16-bit)
```

If all 27B parameters were compressed to 4-bit: 27B × 0.5B ≈ 13.5GB. But engineering practice doesn't do this — Embedding and output heads are precision-sensitive and typically kept at higher bit-widths, and a small number of outlier channels in the trunk also stay high. The final result lands around 16GB, which is the balance point between “acceptable precision” and “memory budget.”

**Quantization scheme comparison:**

| Scheme | Weight usage | Precision | Speed | Verdict |
|---|---|---|---|---|
| FP16 | ~54GB | Baseline | Slowest | Infeasible on 48GB |
| INT8 | ~27GB | Near-lossless | Medium | Context budget squeezed |
| Pure 4-bit (NF4-style) | ~16GB | Sporadic quality degradation on long context | Fast | Usable but not stable enough |
| **4-bit + outlier channels (oQ4-style)** | **~16GB** | **Close to 8-bit** | **Fast** | **Recommended** |

The core tension of 4-bit: weight matrices contain a small number of “outlier” channels whose values are far larger than other channels. Compressing them uniformly to 4-bit causes quantization error to explode on those channels. The oQ4 approach identifies these channels and keeps them at higher bit-widths — the cost is a few percent of extra memory, buying significantly more stable long-context quality.

**MTP (Multi-Token Prediction) head**: This doesn't just “predict the next word” — it predicts several future tokens in parallel, then a smaller model verifies and accepts them sequentially. Throughput improvement is typically 30–50%. The cost is a small prediction head plus verification computation, totaling about 2GB of additional memory. On a 48GB machine, this trade is worth making.

---

## 2. KV Cache: The True Cost Center of Context

During autoregressive generation, the Key/Value attention for every token must be cached, and KV cache grows **linearly** with context — this is the biggest hidden cost of long context.

**KV per-token cost formula:**

```
KV/token = 2 × layers × KV_heads × head_dim × bytes_per_element
```

Using a typical GQA architecture as example (48 layers, 8 KV heads, head_dim 128 — substitute your model's actual config.json values):

| Cache bit-width | Per token | 8K context | 32K context | 64K context |
|---|---|---|---|---|
| FP16 | ~192KB | 1.5GB | 6.3GB | **12.6GB** |
| **4-bit** | **~96KB** | **0.75GB** | **3.2GB** | **6.3GB** |

**GQA (Grouped-Query Attention) is the key.** 8 KV heads serving 48 query heads means KV overhead is 1/6 of full attention. Without GQA, 32K-context KV cache would double to 12.6GB, and this machine would essentially lose long-context capability.

**Why 64K is infeasible:**
- KV 64K × 4-bit ≈ 6.3GB (theoretically acceptable)
- But peak activations, temporary buffers during generation, and Metal heap fragmentation push the actual peak far beyond linear estimates
- Under `wired_limit` constraints, long-context inference triggering Metal OOM is inevitable, not accidental

**KV 4-bit precision cost**: With reduced mantissa bits, subtle long-range attention ranking can go wrong. For local tool scenarios (code completion, summarization, Q&A), the impact is negligible; for tasks requiring precise long-document retrieval, empirical validation is needed. This is why the approach is “use first, then verify.”

---

## 3. Unified Memory: Why OOM Happens Even When “Memory Still Has Room”

Apple Silicon uses **unified memory** — CPU and GPU share the same physical memory, but it's divided into different heap regions:

- **CPU heap**: Process address space; weight loading and intermediate tensors go here
- **Metal GPU heap**: The main battlefield for inference computation and KV cache, constrained by `iogpu.wired_limit_mb`
- **wired limit**: The maximum “pinned” memory the GPU can occupy

The key pitfall: `Activity Monitor` showing “memory available” doesn't mean the GPU heap isn't full. The GPU heap's available space is determined by the wired limit and allocated buffers together — **OOM often happens when “total memory still has headroom.”**

Troubleshooting order:
1. Check `Metal OOM` lines in `gateway.error.log`
2. Verify KV bit-width and context length aren't exceeding budget
3. Check if `model_settings.json` changes took effect (must restart the service — the KV cache allocator initializes at load time, hot-changing doesn't work)
4. Before adjusting `iogpu.wired_limit_mb`, confirm it's a “limit” not a “bottleneck” — the value 45219 was mentioned but lost after restart, indicating this parameter doesn't persist every launch and needs per-session verification

---

## 4. Context Length: How 32768 Came About

The model itself supports context far beyond 32K, but the **actual delivery** is capped at 32768 by three constraints:

1. **Memory budget**: See Section 2 — KV linear expansion + activation peaks
2. **Server-side config**: The context ceiling in `model_settings.json` is a protective cap
3. **Toolchain threshold**: Agent framework primary models require 64K+; 32K directly fails, forcing fallback to auxiliary/backup role

**The correct configuration approach: set context per provider, not one global value.** A global `context_length` value locks all models — cloud models with large windows get squeezed and waste budget, local models with small windows get inflated and OOM. The right way is independent per-provider configuration (e.g., 262144 for cloud API, 32768 for local), with the framework routing tasks by model capability.

**Relationship to prompt caching**: KV cache is also the carrier for prompt caching. When prefixes are stable, repeated prompts can hit the KV cache directly, skipping redundant prefill computation. This requires stable prefix structure on the request side — which is why “context engineering” (budgeting, offloading, compression) and KV quantization are two sides of the same coin, not two separate topics.

---

## 5. Troubleshooting Manual

| Symptom | Investigation path |
|---|---|
| Generation suddenly interrupts, errors | Check `Model fallback` and `Metal OOM` in `gateway.error.log` |
| Output noticeably slows | KV expansion near context limit; check `agent.log` for actual context per turn |
| Config changes don't take effect | `~/.omlx/bin/omlx restart`, verify after service restart |
| Long prompt crashes directly | Lower context cap, or temporarily reduce KV bit-width to test |
| OOM despite available memory | Check `iogpu.wired_limit_mb` and GPU heap actual usage — don't trust system total memory |

---

## 6. Recommended Configuration for a 48GB Machine

| Item | Recommended value | Notes |
|---|---|---|
| Model | 27B Q4 (4-bit + outlier channels + MTP) | 16GB weights, 32GB left for KV and activations |
| Quantization | 4-bit + outlier channels | Precision-memory compromise |
| KV cache | 4-bit | 32K context drops from 6.3GB to 3.2GB |
| Context cap | 32K | Practical ceiling — don't chase 64K |
| MTP | Enabled | 30%+ throughput gain, ~2GB cost |
| Config activation | Must restart after changes | `model_settings.json` hot-change doesn't work |
| Role | Auxiliary / fallback model | Primary model role goes to 64K+ cloud solutions |

## 7. Summary

Running a local 27B model on a 48GB Mac mini is essentially budget allocation across three subsystems:

1. **Quantization budget**: Compress weights to 16GB, preserve precision with outlier channels
2. **KV budget**: 4-bit + GQA brings 32K context to 3.2GB; 64K doubles to 6.3GB and triggers OOM
3. **Memory budget**: Unified memory is not an infinite pool — GPU heap is constrained by wired limits, OOM is unrelated to total memory headroom

Configure these parameters properly, restart for effect, set context per provider, and local inference can reliably serve coding assistance and sensitive data processing. The rest — larger context, higher throughput — belongs to larger memory, or the cloud.

**The point of a local model isn't to replace the cloud, but to fill the gap the cloud can't: privacy, offline, control.**
