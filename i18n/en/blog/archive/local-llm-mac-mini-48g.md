---
slug: local-llm-mac-mini-48g
title: "Running a 27B LLM on a 48GB Mac mini: Quantization, KV Cache and Context Trade-offs"
description: "Checkable memory estimates for a 27B model on a 48GB Mac mini, and the measurements still needed before recommending a deployment."
date: 2026-10-26
authors: Hohoo
domain: llm
status: published
article_kind: mechanism
tags: [local-llm, mac, quantization, kv-cache]
keywords: [Mac mini, oMLX, KV cache, quantization, speculative decoding, unified memory]
---


Weights, KV cache and temporary allocations share the memory budget of a 48GB Mac mini. The labels “27B” and “4-bit” alone do not establish whether a particular context length will run reliably.

**Scope reviewed on 2026-11-07: this is a capacity analysis, not a deployment benchmark.** The repository does not contain a complete model identifier, chip specification, runtime version, matched throughput runs and OOM logs for this article. The earlier claims of “about 2GB for 30%–50% throughput” and almost lossless quantization are withdrawn. They cannot support a recommendation for a particular package or enabling MTP.

<!-- truncate -->

## 1. Separate estimates from measurements

At 27 billion parameters, storing every parameter in FP16 requires an ideal **54GB** of parameter data; tightly packed 4-bit storage requires **13.5GB**. Neither number is the process memory after loading.

A package may mix precisions and include quantization metadata. The working budget also includes the OS, activations, caches and temporary buffers. Record the model revision and format, then measure loading instead of inferring speed or quality from “Q4”.

| Question | What can be estimated | What must be measured |
| --- | --- | --- |
| Do weights fit? | Parameter count × bit width | Actual package and loading peak |
| How long can context be? | KV payload from the model configuration | Prefill / decode peaks, concurrency and failures |
| Is quantization worthwhile? | Ideal storage reduction | Matched task quality, latency and memory |
| Should MTP be enabled? | First verify model and runtime support | Matched on/off runs with the same workload |

MTP overhead and benefits cannot be inferred from total parameter count. Without that comparison, this article makes no default-on recommendation.

## 2. KV Cache: The True Cost Center of Context

During autoregressive generation, the Key/Value attention for every token must be cached, and KV cache grows **linearly** with context — this is the biggest hidden cost of long context.

**KV per-token cost formula:**

```
KV/token = 2 × layers × KV_heads × head_dim × bytes_per_element
```

Use a GQA example with 48 layers, 8 KV heads, and head_dim 128. These are illustrative parameters, not a verified configuration of the actual 27B model; substitute the values from your model's `config.json`.

The factor 2 accounts for K and V; FP16 uses 2 bytes per element, and ideally packed 4-bit uses 0.5 bytes. The following assumes one sequence, all layers caching every token, and the same bit-width for K and V:

```
FP16: 2 × 48 × 8 × 128 × 2   = 196,608 bytes/token = 192 KiB/token
4-bit: 2 × 48 × 8 × 128 × 0.5 = 49,152 bytes/token  = 48 KiB/token
32K 4-bit: 49,152 × 32,768 = 1,610,612,736 bytes = 1.5 GiB
```

Here 8K / 32K / 64K mean 8,192 / 32,768 / 65,536 tokens, including cached input and generated tokens. 1 KiB = 1,024 bytes and 1 GiB = 1,073,741,824 bytes; GB means decimal 1,000,000,000 bytes and is not interchangeable with GiB. Hardware capacity and weight estimates in GB elsewhere in this article are not directly available KV budgets.

| Cache bit-width | Per token | 8K context | 32K context | 64K context |
|---|---|---|---|---|
| FP16 | 192 KiB | 1.5 GiB | 6 GiB | **12 GiB** |
| **4-bit (ideally packed)** | **48 KiB** | **0.375 GiB** | **1.5 GiB** | **3 GiB** |

**These are ideal KV payload sizes, not measured runtime memory.** Compared with FP16, 4-bit reduces the payload to one quarter (a 75% reduction), not one half. Actual quantized caches may also include per-group scales, zero-points, alignment, and allocation overhead; peak total memory also includes weights, activations, temporary buffers, and runtime overhead. Concurrent sequences and retained prefix caches can further increase usage, so this table is not a service memory ceiling.

**GQA (Grouped-Query Attention) is the key.** With identical layer count, head_dim, cache bit-width, and token count, 8 KV heads serving 48 query heads use 1/6 of the KV capacity of MHA with a separate K/V pair per query head. Increasing KV heads from 8 to 48 multiplies capacity by six: at 32K, FP16 rises from 6 GiB to 36 GiB, and ideal 4-bit rises from 1.5 GiB to 9 GiB. It does not merely double.

**64K feasibility requires runtime validation:**
- This example's ideal 4-bit KV payload at 64K is 3 GiB, twice the 32K payload
- Quantization metadata, peak activations, temporary buffers, allocation fragmentation, and actual Metal/wired limits must also be considered
- The KV formula alone proves neither inevitable OOM nor that 64K already works; validation needs the actual model configuration, runtime version, cache format, concurrency, and peak memory and error logs for both prefill and decode
- Keep the article's current protective 32K configuration; it is not a hardware limit proven by this formula, and 64K stability remains unverified


## 3. Why a KV table cannot establish deployability

Even if ideal KV at 32K is 1.5 GiB, subtracting weights from “48GB” does not reveal usable context. That mixes units and omits working allocations. Free system memory cannot replace runtime allocation records either.

For OOM, preserve the failed request, effective configuration and original error first. Reduce input length or concurrency one at a time to locate the failure boundary. Changing cache precision, context and system memory limits together prevents attribution even if the run recovers.

The earlier 32K cap is a protective configuration discussed in the draft, **not a demonstrated hardware limit**. Claims that a toolchain requires a 64K primary model or that settings always require a restart lack the relevant version and configuration snapshots. Check the effective configuration and the documentation for the runtime actually used.

## 4. What a useful run record contains

| Record | Purpose |
| --- | --- |
| Chip, OS, pinned model revision, quantization format, runtime version | Identify the tested system |
| Input and output tokens, concurrency, warm/cold cache state | Compare equivalent workloads |
| Loading, prefill and decode memory peaks | Separate weight capacity from working memory |
| Time to first token, generation duration, failed requests and raw logs | Retain failures as well as successes |
| Task outputs and scoring method | Check whether memory savings harm required quality |

This is a checklist for future measurements, not completed work. Mark unavailable metrics as unknown. Whole-process elapsed time is not pure decode time; missing memory data is not zero.

<details><summary>Exercise: what changes when context alone grows from 32K to 64K?</summary>

Under this article’s assumptions, ideal 4-bit KV grows from 1.5 GiB to 3 GiB. Weights do not double. Peak total memory need not double either. Reliability and speed still require matched measurements.

</details>

## 5. Existing evidence to read next

[Cache cost profiling](/docs/llm/cache-cost-profile) separates reduced computation from measured time. [Blockwise KV decode cost](/docs/llm/kv-block-decode-cost) retains trade-offs between capacity, error and elapsed time. These independent teaching experiments do not validate a deployment on this Mac.

The reusable method is to calculate KV from the model configuration, account for unmeasured overhead, and locate boundaries through recorded failures. Package recommendations and 64K reliability remain open until supported by complete runs.
