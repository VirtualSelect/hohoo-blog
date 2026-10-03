---
title: "LLM mechanics I: should changing future tokens affect earlier outputs?"
description: "From a two-row hand calculation to a two-layer numeric experiment: causal masks, softmax and future-information leakage."
slug: "/llm/causal-mask-lab"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:attention-mechanisms", "project:hohoo-ai-lab", "doc:llm/kv-cache-equivalence", "doc:llm/sliding-cache-positions"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab/evidence/20261003) · [Experiment record](/labs/attention-mechanisms)

The earlier [context-position study](/docs/llm/context-position-paired-protocol) observed a model through its API. This series inspects the computation itself: which positions are permitted to influence which outputs?

Our network is untrained: 32 discrete IDs,16-dimensional representations, two single-head attention layers, and `tanh(x + attention(x))` residual updates. It uses absolute sinusoidal positions and float64. There is no tokenizer, FFN, normalization, dropout, language-quality test or Agnes request. We test computation, not linguistic competence.

## 1. Start with a hand calculation

Set Q and K to zero. Let the value rows be `[2,4]` and `[6,8]`. All scores are zero, so softmax averages the permitted values.

| Query | Allowed keys | Weights | Output |
|---|---|---|---|
| 0 | 0 | `[1,0]` | `[2,4]` |
| 1 | 0, 1 | `[0.5,0.5]` | `[4,6]` |

Without a causal mask, both rows would output `[4,6]`; the first would use a future value. A unit test fixes these hand-derived answers instead of relying entirely on two implementations agreeing.

## 2. Mask before softmax

```python
scores = q @ k.T / np.sqrt(d)
allowed = key_positions[None, :] <= query_positions[:, None]
scores = np.where(allowed, scores, -np.inf)
ex = np.exp(scores - scores.max(axis=1, keepdims=True))
weights = ex / ex.sum(axis=1, keepdims=True)
output = weights @ v
```

Forbidden entries contribute zero exponentials. Clearing weights after softmax without renormalizing would change the output scale. An all-masked row is rejected, avoiding undefined arithmetic. Subtracting the row maximum prevents exponential overflow without changing the normalized distribution; a separate large-score test checks this behavior.

Score scaling and causal masking serve different purposes. One should not describe the mask merely as a numerical-stability trick.

## 3. Perturb only the future

The 24 input IDs follow `tokens[i]=(7*i+3)%32`. Only indices 12–23 are changed by adding 1 modulo 32. We compare the largest absolute coordinate change in the first twelve final representations, using seeds 7, 19, 41 frozen before execution.

| Seed | Causal change | Unmasked change |
|---|---:|---:|
| 7 | 0 | 0.139619 |
| 19 | 0 | 0.081980 |
| 41 | 0 | 0.328622 |

These are hidden-state coordinate differences, not accuracy, confidence or loss. The nonzero negative controls demonstrate that the fixture can expose future leakage rather than being insensitive to the modification.

<img src="/media/practice/causal-mask.png" alt="Recorded causal attention and representation changes when only later input IDs change" width="1500" height="600" loading="lazy" />

The left panel contains actual first-layer weights for seed 7. The right uses the complete two-layer output. Changes to the right of the dashed boundary are expected: those inputs were changed directly.

## 4. Why causality survives another layer

At layer 1, position i depends only on positions 0 through i. Layer 2 at i reads their layer 1 representations, which likewise contain no information from after i. Positionwise residual updates and activations preserve this dependency boundary.

The reasoning assumes identical parameters and positions, correct masks, and no additional cross-position operation leaking future information. It motivates a useful implementation test, but this experiment contains no training loss and establishes no training benefit.

## 5. Reproduce

```sh
python -m unittest discover -s experiments/05-attention-lab -p "test_*.py"
python experiments/05-attention-lab/run.py --out experiments/05-attention-lab/evidence/my-run
python experiments/05-attention-lab/audit.py experiments/05-attention-lab/evidence/my-run
```

Recorded versions: Python 3.12.14 and NumPy 2.2.6. Nine test methods include 36 seed/length/window chunk comparisons. The archive contains 48 named arrays. An auditor that does not import the decoder recomputes 27 numeric differences plus mask structure and operation counts.

Continue with [KV-cache equivalence](/docs/llm/kv-cache-equivalence): if old positions could read future tokens, appending a token could invalidate old cached states. General attention background comes from the [Transformer paper](https://arxiv.org/abs/1706.03762); these measurements belong to the simplified local implementation, not that paper's translation experiments.

## Read this series

- [LLM mechanics II: what does KV caching save, and how do we verify it?](/docs/llm/kv-cache-equivalence)
- [LLM mechanics III: why is a four-slot cache not four-token recomputation?](/docs/llm/sliding-cache-positions)
