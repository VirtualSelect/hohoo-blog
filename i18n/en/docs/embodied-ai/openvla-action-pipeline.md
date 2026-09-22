---
title: Reading OpenVLA — from an image and instruction to robot actions
description: Follow preprocessing, visual projection, action tokens and unnormalization, with particular attention to units, boundary indices and the environment interface.
---

A vision-language-action model can sound like a chatbot that looks at an image and emits a command. More useful questions are: what exactly is returned, how many dimensions does it have, and which coordinate system and scale make those numbers meaningful?

This article treats the original OpenVLA as an interface to understand, tracing inputs, output values and the conventions connecting them.

:::note A code walkthrough, not a robot experiment
This AI-assisted article uses the [OpenVLA paper v3](https://arxiv.org/html/2406.09246v3) and official source accessible on 2026-09-22. It covers the original autoregressive action-token path, not later variants such as OpenVLA-OFT. No checkpoint, simulation or physical robot was run. Numerical examples are teaching inputs.
:::

## 1. Start with the interface

The original model maps a single RGB observation and language instruction to actions. DINOv2 and SigLIP features are fused and projected into language-model space; a Llama 2 backbone generates action tokens. The paper illustrates seven-dimensional control actions. That does not make every seven-number vector compatible with the same robot. See [paper section 3](https://arxiv.org/html/2406.09246v3#S3).

```text
RGB observation + task text
  → processor: image tensors and text tokens
  → vision encoders and projector
  → visual and text embeddings combined
  → autoregressive action tokens
  → token IDs decoded to normalized values
  → dataset-statistics unnormalization
  → environment adapter / controller
```

Pay particular attention to the final two stages. Text can be displayed directly; an action vector needs environmental interpretation. Valid numbers can still mean the wrong action.

## 2. Four source entry points

| File / function | Question to answer |
| --- | --- |
| `experiments/robot/openvla_utils.py`: `get_vla_action` | Where does the image come from, and how is the prompt built? |
| `prismatic/extern/hf/processing_prismatic.py` | How are image and text converted into model inputs? |
| `prismatic/extern/hf/modeling_prismatic.py`: `forward`, `predict_action` | Where do visual embeddings enter, and how are outputs decoded? |
| `prismatic/vla/action_tokenizer.py` | How do continuous values and discrete indices map? |

The official [inference helper](https://github.com/openvla/openvla/blob/main/experiments/robot/openvla_utils.py) obtains an observation image, converts it to RGB, optionally crops it, and invokes the processor and `predict_action`. Original OpenVLA and v0.1 have different prompt branches. Arbitrarily rewriting the chat template does not preserve the training interface.

The [processor](https://github.com/openvla/openvla/blob/main/prismatic/extern/hf/processing_prismatic.py) handles visual preprocessing and text tokenization. Record original dimensions, crop policy and resulting tensor shapes. “The image file opens” is an insufficient input check.

## 3. An image does not first become a caption

In the multimodal path of the [model implementation](https://github.com/openvla/openvla/blob/main/prismatic/extern/hf/modeling_prismatic.py), projected visual embeddings are inserted after the first text token. The attention mask grows accordingly. No intermediate natural-language caption is required.

Reason about shapes: if text has N positions, vision produces P patch embeddings, and language hidden width is D, the combined sequence has N + P positions of width D. These are symbols, not asserted dimensions of a particular checkpoint.

A projection width different from D breaks concatenation. A mask still covering only N positions is also inconsistent. The image interface is a tensor contract, not just an upload widget.

## 4. Why actions can use tokens

Discretization maps continuous values to a finite set of indices, represented by vocabulary tokens. Next-token prediction can then train the action sequence. Here a token denotes an action interval rather than an ordinary word.

Boundary handling is easy to overlook. The [ActionTokenizer](https://github.com/openvla/openvla/blob/main/prismatic/vla/action_tokenizer.py) defaults to `linspace(-1, 1, 256)` and computes adjacent midpoints: **256 boundaries but 255 centers**. Digitization indices and center-array indices have different ranges. Decoding subtracts one and clips the upper bound; “256 bins” alone is insufficient to reproduce the implementation.

Shrink the example to four boundaries for hand calculation. This illustrates indexing only; it is **not a replacement OpenVLA tokenizer**:

```javascript
const edges = [-1, -1 / 3, 1 / 3, 1];
const centers = edges.slice(1).map((x, i) => (edges[i] + x) / 2);
function roundTrip(value) {
  const clipped = Math.max(-1, Math.min(1, value));
  const bin = edges.filter((edge) => clipped >= edge).length;
  const index = Math.max(0, Math.min(centers.length - 1, bin - 1));
  return { bin, index, decoded: centers[index] };
}
console.log(roundTrip(1));
// { bin: 4, index: 2, decoded: 0.6666666666666666 }
```

The boundary value 1 does not decode to 1 because reconstruction uses an interval center. Quantization loses precision. Also, `bin = 4` cannot directly index a three-element center array.

The real model must first translate generated vocabulary IDs back to action indices. Vocabulary size and alignment padding are distinct; inspect `predict_action` rather than guessing a constant from the model's name.

## 5. Unnormalization determines scale

`predict_action` uses dataset-specific `q01`, `q99` and a mask to recover action scale. For a dimension whose mask is true:

```text
action = 0.5 × (normalized + 1) × (q99 - q01) + q01
```

With **teaching assumptions** of -0.02 and 0.02 metres as an axis's bounds, a normalized value of 0.5 gives 0.01 metres. Bounds of -0.10 and 0.10 instead give 0.05 metres. The fivefold difference comes from statistics, not changed model intent. Actual units come from the dataset/controller contract; code does not automatically make every dimension metres.

`unnorm_key` selects checkpoint statistics, not a task instruction. Selecting a wrong but valid entry can be subtler than a missing field. Dimensions with a false mask keep their normalized values. Do not apply the formula indiscriminately. Check [predict_action and get_action_stats](https://github.com/openvla/openvla/blob/main/prismatic/extern/hf/modeling_prismatic.py).

## 6. Returning an array is not executing a task

Before connecting predictions to an environment, write down this contract:

| Check | Required definition | Possible mismatch |
| --- | --- | --- |
| Action meaning | End-effector delta, absolute pose or joint target | Unexpected direction or magnitude |
| Reference frame | World, base or tool | Different physical meaning of a positive axis |
| Rotation and units | Representation, angular and translation units | Scale errors or orientation jumps |
| Gripper | Open/close convention, continuous or binary | Releasing instead of grasping |
| Timing | Image timestamp, inference duration, execution interval | Acting on stale observations |
| Boundaries and termination | Limits, collision handling, stopping condition | Parseable actions that cannot finish safely |

These are engineering checks, not safety guarantees supplied by the model. First save inputs and predictions offline; check shape, finite values, bounds and frames in the adapter. Passing a type check establishes parseability. Successful manipulation needs environmental observations and a task criterion.

## 7. What is understood, and what remains untested?

The source explains visual embedding, action discretization and unnormalization. The small indexing example can be independently checked. These are reading and arithmetic evidence.

This site has not completed a simulation loop using that checkpoint. There are no claimed success rates, trajectories or measured effectiveness. The existing [action-representation experiment plan](/labs/action-representation) provides a next step: fix an environment and interface, retain inputs, predictions, resulting observations and termination reasons, then discuss performance.

For the autoregressive caching mechanism, continue to [KV Cache](/docs/llm/kv-cache). Repeating a task instruction across actions does not by itself justify reusing the entire cache across different camera observations. The input prefix still needs to match.
