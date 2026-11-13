---
title: "Profiling KV reuse: saved work versus added overhead"
description: "Profile 909 queries across signatures, lookup, copying and continuation, including the remaining slowdown."
slug: "/llm/cache-cost-profile"
status: "published"
published_at: "2026-10-07"
updated: "2026-11-12"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:cache-cost-profile", "project:hohoo-ai-lab", "doc:llm/prefix-cache-admission"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [Raw evidence](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [Lab record](/labs/cache-cost-profile)

The preceding admission experiment saved projected rows yet ran slower. Total timings alone could not identify the cause. This study isolates an always-hit eight-token prefix in the existing untrained two-layer, width-16 NumPy decoder. A full request has 12 tokens. There is no GPU, provider call or answer-quality claim.

## Three paths

full recomputes all 12 tokens and returns the last four outputs. rehash reads source bytes and hashes weights/configuration on every cached query. frozen computes that identity during initialization, then uses the same lookup, copying and continuation. Keys retain scope, identity and prefix tokens. Frozen arrays are read-only; changed weights require a new instance and identity. This is a trusted-code lifetime contract, not a security boundary.

~~~text
Total query = signature + lookup + copy + continuation + residual
~~~

Three seeds, five excluded warmups per path and 101 shuffled rounds per seed produce 909 measured queries. BLAS thread variables are set to one. Outputs are compared against fresh computation at tolerance 1e-12.

## What the local timing supports

Each column below is an independently computed median in microseconds. Their sum is not the median total.

| Path | Total | Signature | Lookup | Copy | Compute |
| --- | --- | --- | --- | --- | --- |
| full | 252.7 | — | — | — | 250.9 |
| rehash | 682.7 | 365.2 | 2.8 | 12.0 | 290.4 |
| frozen | 273.6 | 0.6 | 2.2 | 9.0 | 257.1 |

Removing per-request source/weight hashing reduces measured cost substantially, but frozen reuse still exceeds fresh computation by 20.9µs at the median. Internal NumPy overhead was not further decomposed. Residual time is bookkeeping between measured segments, not an identified hardware bottleneck.

This does not revise the earlier 4,860-request experiment: that workload included cold starts, eviction and working sets. Do not combine these different workloads into one speedup claim.

## Ownership remains part of correctness

A cache hit is copied before continuation. Removing that copy requires proving that shared state cannot be mutated across requests. The experiment deliberately does not trade request isolation for a smaller timing number.

## Read the archived timings before rerunning

This AI-assisted exercise recomputes archived statistics; it does not collect new timings. Paste the entire PowerShell block at the root of the pinned `hohoo-ai-lab` checkout below, not the blog repository. It needs only the Python standard library: no NumPy installation, model or key, and no writes to the evidence directory.

It checks `profile.json` against its archived manifest fingerprint, selects only the `rehash` path, and verifies each row's five components against its total. Every output value is in nanoseconds.

~~~powershell
@'
import hashlib
import json
from pathlib import Path
from statistics import median

folder = Path("experiments/10-attention-costs/evidence/20261007")
payload = (folder / "profile.json").read_bytes()
manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
if hashlib.sha256(payload).hexdigest() != manifest["files"]["profile.json"]:
    raise SystemExit("profile fingerprint mismatch")
rows = [r for r in json.loads(payload) if r["mode"] == "rehash"]
parts = ("signature_ns", "lookup_ns", "copy_ns", "compute_ns", "residual_ns")
if not rows or any(sum(r[k] for k in parts) != r["total_ns"] for r in rows):
    raise SystemExit("missing rows or inconsistent timing accounting")
first = rows[0]
print(json.dumps({
    "mode": "rehash",
    "rows": len(rows),
    "first_seed": first["seed"],
    "first_repeat": first["repeat"],
    "first_parts_ns": {k: first[k] for k in parts},
    "first_sum_ns": sum(first[k] for k in parts),
    "first_total_ns": first["total_ns"],
    "sum_of_column_medians_ns": sum(median(r[k] for r in rows) for k in parts),
    "median_of_row_sums_ns": median(sum(r[k] for k in parts) for r in rows),
    "median_total_ns": median(r["total_ns"] for r in rows),
}, indent=2))
'@ | python -
~~~

Expect 303 archived rows. The first has `seed=7, repeat=0`; divide nanoseconds by 1,000 to check its signature, lookup, copy, compute and residual components in that order:

~~~text
403.9 + 2.8 + 12.6 + 290.3 + 5.7
= 715.3 microseconds
~~~

The sum of the five column medians is 676.1 microseconds. The median of per-row sums is 682.7 microseconds, equal to `median_total_ns / 1000`. Each column's middle value may come from a different request. Exact accounting in every row does not imply additive medians across columns.

The 6.6-microsecond difference is not an unidentified bottleneck, and 676.1 must not replace the total-query median. Residual is already included in each row. The difference comes from the order of aggregation, not a further explanation of NumPy internals. Predict whether the two calculations must agree, then check using integer nanoseconds rather than adding rounded table values.

For missing files, check the repository root and pinned commit. On a fingerprint mismatch, stop and inspect whether records from different runs were mixed; do not edit the manifest to silence it. Only rerun with a larger input in a new output directory when testing a genuinely new condition. Define the reused prefix carefully and do not assume caching will win.

For timing differences check BLAS versions, threads, background work and measurement scope. For numerical disagreement check model identity and positions before discussing speed. Continue with [tiled online softmax](/docs/llm/tiled-online-softmax).

## Reproduce from a clean checkout

Python 3.12. The runner executes all three comparisons; each article discusses its own subset.

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
~~~

For archive inspection, stop here and run the exercise above. To collect new measurements, install dependencies and execute the full study below; it runs all three topics rather than merely recomputing statistics.

~~~sh
python -m pip install numpy==2.2.6
python experiments/10-attention-costs/run.py --out outputs/my-run
python experiments/10-attention-costs/audit.py outputs/my-run
~~~

Use a new output directory. Windows was exercised; Linux/macOS were not rerun. No model API or key is required. The source commit in the manifest precedes the evidence commit linked above; source hashes bind the executed files.
