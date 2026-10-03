---
title: "LLM mechanics III: why is a four-slot cache not four-token recomputation?"
description: "Separate absolute positions, cache slots and retained representations with a two-layer sliding-attention experiment."
slug: "/llm/sliding-cache-positions"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:attention-mechanisms", "project:hohoo-ai-lab", "doc:llm/causal-mask-lab", "doc:llm/kv-cache-equivalence"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab/evidence/20261003) · [Experiment record](/labs/attention-mechanisms)

Keeping only four cached positions sounds like recomputing only the latest four tokens. But cached representations, input positions and raw-token truncation are distinct operations. This experiment extends [KV-cache equivalence](/docs/llm/kv-cache-equivalence) with a window of four while preserving the other parameters.

## 1. Define the window

The window includes the current token: absolute position i may read i−3 through i, clipped at the beginning. The full reference computes all input positions while applying this mask in every layer.

The incremental path stores per-layer K/V and absolute positions. It appends new entries, masks old keys outside the window, computes the output, then retains the final four entries. Array slot 0 may represent absolute position 20. Temporary concatenated arrays can exceed four entries; the final 2048-byte K/V payload is not peak process memory.

## 2. Compare three implementations

Using 24 fixed IDs, two 16-dimensional float64 layers and seeds 7, 19, 41, we measure maximum absolute coordinate error against the full sliding-mask reference:

| Seed | Correct sliding cache | Reset each new position | Recompute last four raw IDs |
|---|---:|---:|---:|
| 7 | 4.996e-16 | 1.639644 | 0.322195 |
| 19 | 5.274e-16 | 1.581518 | 0.412958 |
| 41 | 3.331e-16 | 1.483657 | 0.391865 |

The first column passes 1e-12 tolerance. The others are intentionally different calculations, not differences in language capability.

<img src="/media/practice/cache-positions.png" alt="Positionwise errors for cached, reset-position and cropped-recomputed sliding attention" width="1500" height="600" loading="lazy" />

## 3. Cache slots are not positions

Inputs use additive absolute sinusoidal positions. Processing token 20 should not assign it position 0 just because storage is bounded. The negative control resets the input position on every single-token call while retaining correct absolute indices for masking. This isolates the input-position error from a separate mask error.

We did not implement RoPE. These numeric results therefore cannot establish how a rotary-position cache relocation method behaves.

## 4. Upper-layer caches contain earlier computation

The cropped-recompute control retains correct absolute positions, yet still differs in a two-layer network. At position 20, layer 2 can read cached representations at 17–20. The layer 2 key/value for position 17 was computed from its layer 1 representation, which may already contain information from 14–17.

Recomputing only raw tokens 17–20 removes 14–16 from position 17's first-layer computation. Its upper-layer representation changes even though its absolute position remains correct.

Thus a multi-layer local-attention dependency can extend beyond the latest four raw tokens. Cached states are transformed representations, not slices of original text. This is not unlimited memory, and coordinate error cannot be interpreted as a count of forgotten facts.

## 5. Keep three indices separate

```python
past = cache['next_position']
positions = np.arange(past, past + len(new_tokens))
# Append per-layer states and mask by absolute positions.
cache['next_position'] = past + len(new_tokens)
# Eviction does not reset next_position to the storage capacity.
```

Track processed-token count, absolute cached positions and array slots separately. Tests cover window 1, window 4 and no eviction; lengths 1, 2, 8, 17; three seeds and chunked input, giving 36 combinations. Invalid windows, token IDs and all-masked rows are rejected.

## 6. Reproduce and extend

```sh
python experiments/05-attention-lab/run.py --out experiments/05-attention-lab/evidence/my-window-run
python experiments/05-attention-lab/audit.py experiments/05-attention-lab/evidence/my-window-run
```

Inspect `sliding`, `sliding_cached`, `reset` and `cropped`. A subsequent real-model experiment should separately validate its positional mechanism, cache policy, numeric differences, peak memory and task behavior.

No weights were downloaded and no online calls were made. This mechanics study does not replace the pending L1v3 Agnes behavior experiment. General background is available in the [Hugging Face caching explanation](https://huggingface.co/docs/transformers/main/en/cache_explanation).

## Read this series

- [LLM mechanics I: should changing future tokens affect earlier outputs?](/docs/llm/causal-mask-lab)
- [LLM mechanics II: what does KV caching save, and how do we verify it?](/docs/llm/kv-cache-equivalence)
