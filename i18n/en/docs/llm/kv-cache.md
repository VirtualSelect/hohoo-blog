---
title: KV Cache explained — why send the conversation history again?
description: Derive K/V reuse from causal attention, calculate cache memory, and separate inference caching from prefix reuse and chat history.
---

The Java chat demo sends previous questions and answers in `messages` every time. When a response includes `cached_tokens`, it is tempting to ask whether the next request can contain only the new question.

For a Chat Completions interface that requires client-supplied history, that inference is invalid. **The conversation protocol determines the required input; the inference implementation determines how that input is processed efficiently.** KV Cache addresses the latter.

:::note Scope
This AI-assisted technical explanation uses primary sources. It is not a GPU benchmark. Calculations use explicit teaching assumptions, not the configuration, price or latency of Agnes or another provider. No model download is needed to check the arithmetic.
:::

## 1. Separate three kinds of memory

| Layer | Stored data | Responsible component | Effect of losing it |
| --- | --- | --- | --- |
| Application history | User and assistant messages | Client or conversation service | The request may lack necessary facts |
| KV Cache within generation | Per-layer K/V tensors for earlier positions | Inference engine | Computation must be repeated |
| Cross-request prefix cache | Reusable cached prefix blocks | A supporting serving system | A miss should still process the complete request |

For example, vLLM identifies reusable blocks using prefix context and tokens. It reuses computation; it does not supply omitted messages on the user's behalf. Provider-specific `cached_tokens` semantics must be checked separately. See the [vLLM prefix-cache design](https://docs.vllm.ai/en/latest/design/prefix_caching/).

A model-free check is to inspect the outgoing JSON. If “I am learning Java” is absent and no stateful service receives a conversation reference, the client has not supplied that fact. A lucky correct answer would not establish persistent memory.

## 2. Why cache K/V rather than old queries?

In one attention layer, Q represents queries at current positions; K and V represent positions that can be read:

```text
scores = Q × transpose(K) / sqrt(head_dim) + causal_mask
weights = softmax(scores)
output = weights × V
```

Causal masking prevents a position from reading future positions. With unchanged parameters, input prefix and position handling, appending tokens does not require recomputing earlier representations. A new position still needs its own Q/K/V, but can reuse earlier K/V. Its query does not use previous query vectors, so standard KV caching does not retain old Q. See the [Transformer paper](https://arxiv.org/html/1706.03762v7) and [Hugging Face explanation](https://huggingface.co/docs/transformers/main/cache_explanation).

For a processed three-position prompt:

```text
Cached: K[0..2], V[0..2]
Process new position 3: compute q3, k3, v3
Read: use q3 against K[0..3], then weight V[0..3]
Store: append k3 and v3
Predict: use the new hidden state to predict the next token
```

Each layer keeps tensors, not a dictionary of copied text. Editing a prefix token can change later representations; reusing the entire old cache without checking would be incorrect.

## 3. Prefill and decode do different work

**Prefill** processes the prompt and establishes its cache; the last prompt position can provide the first output-token distribution. **Decode** processes subsequent generated positions and grows the cache. It does not rerun the entire prompt at every step.

Caching does not make every later step constant-cost. With standard full attention, the current query still reads a growing K/V history. Avoiding repeated projections and old-position computation trades against cache capacity and memory traffic. “One new position” does not mean “only the last token matters.”

This is also why first-token waiting time and total generation time deserve separate measurements. Network time, queues, prompt length and output length can all contribute. One API timeout cannot identify KV caching as its cause.

## 4. Calculate cache size on paper

For a simplified model with full attention, uniform KV-head count and uniform precision, one K or V contains `B × Hkv × T × D` elements per layer:

```text
KV bytes = 2 × L × B × Hkv × T × D × S

2    separate K and V
L    layer count
B    retained sequence count
Hkv  KV heads, not query heads
T    cached positions per sequence
D    dimension per head
S    bytes per element
```

GQA shares fewer KV heads among groups of query heads. Substituting the query-head count can therefore overestimate cache storage. See the [GQA paper](https://arxiv.org/abs/2305.13245).

**Teaching assumptions:** 32 layers, 8 KV heads, head dimension 128 and 2 bytes per element; equal sequence lengths, no prefix sharing, no additional overhead.

| Sequences B | Length T | Theoretical KV size |
| --- | --- | --- |
| 1 | 4,096 | 512 MiB |
| 1 | 8,192 | 1 GiB |
| 4 | 8,192 | 4 GiB |
| 4 | 32,768 | 16 GiB |

Check with Node.js or a browser console:

```javascript
function kvGiB({ layers, sequences, kvHeads, tokens, headDim, bytes }) {
  return (2 * layers * sequences * kvHeads * tokens * headDim * bytes) / 2 ** 30;
}
const config = { layers: 32, sequences: 1, kvHeads: 8,
  tokens: 8192, headDim: 128, bytes: 2 };
console.log(kvGiB(config)); // 1 GiB
console.log(kvGiB({ ...config, sequences: 4, tokens: 32768 })); // 16 GiB
```

Changing KV heads from 8 to 32 multiplies every value by four under otherwise identical assumptions. This is formula sensitivity, not a measurement of swapping real models.

Total device memory also includes weights, activations, workspaces and allocator overhead. Sliding windows, mixed layers, variable lengths, quantization and sharing change the estimate. Fitting model weights on a GPU does not guarantee that arbitrarily long conversations will fit.

## 5. Optimization has a price

Hugging Face supports dynamic, static, offloaded and quantized cache strategies. Dynamic caches grow; static caches reserve capacity and can support certain compilation optimizations; offloading reduces GPU residency but transfers data; quantization saves storage while adding processing tradeoffs. None is universally fastest. See the [official cache-strategy guide](https://huggingface.co/docs/transformers/main/kv_cache).

Map mechanisms back to application questions:

- **Long-document requests exhaust memory:** estimate KV demand from length and concurrency before choosing truncation, sharing or another cache strategy.
- **Quantization slows a short request:** saved space may not offset processing costs. Measure rather than comparing bit widths alone.
- **Many requests share a system prompt:** prefix reuse is possible, but depends on token prefixes, positions, model and service rules.

A hosted API may not expose these server-side settings. The Java client's direct responsibilities are context budgeting, necessary history, input/output usage accounting and failure records. A technical term is not an API switch unless the provider actually exposes it.

## 6. Test your understanding with counterexamples

**“KV Cache means history can be omitted.”** This confuses request meaning with computation reuse. Check how the protocol supplies context.

**“Caching reduces memory.”** Compared with not retaining old tensors, KV caching spends memory to save computation. Quantization and offloading make additional tradeoffs.

**“Double the context means double the latency.”** The formula predicts cache bytes under uniform assumptions, not end-to-end latency. Hardware, batching, kernels and queues also matter.

Return to the [Java chat tutorial](/docs/ai-apps/java-first-llm) with two separate questions: did the program supply the correct history, and did the service process it efficiently? They need separate evidence.
