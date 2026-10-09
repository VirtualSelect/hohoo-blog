---
title: "Java LLM practice (7): a real citation can still support a wrong answer"
description: "22 frozen configuration cases separate citation existence, revision scope, field support and completeness in a Java answer gate."
slug: "/ai-apps/java-grounded-claims"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "rag"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:retrieval-eval", "project:hohoo-ai-lab", "doc:ai-apps/java-retrieval-evidence", "doc:ai-apps/java-tool-boundary"]
---

[Pinned code](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ba75c55c53f6f5e30ac027bbf59f28a8202708d7/demos/07-grounded-claims) · [Raw evidence and audit](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ba75c55c53f6f5e30ac027bbf59f28a8202708d7/demos/07-grounded-claims/evidence/20261003) · [Experiment record](/labs/retrieval-eval)

The previous retrieval study left a gap: if a citation really appears in the supplied documents, does it support the answer?

Suppose the source says `read_timeout_ms=5000`, but the answer claims `2000` and appends that genuine quote. The document, quote and JSON can all be valid while the claim is wrong. Development settings and old revisions create similar failures.

This study narrows the problem to a Java configuration-answer contract. It accepts candidate claims and returns a verified field map. In 22 frozen synthetic cases, checking only citation existence accepts 10 contract violations. This is an application boundary after generation, not a general natural-language fact checker.

## 1. Turn support into explicit checks

The trusted request asks for two fields in payments / prod / v2: read timeout and retry status. The owned synthetic registry contains:

| Document | Service / environment / revision | read_timeout_ms | retry_enabled |
| --- | --- | ---: | --- |
| prod-v2 | payments / prod / v2 | 5000 | false |
| prod-v1 | payments / prod / v1 | 2000 | true |
| dev-v2 | payments / dev / v2 | 12000 | true |
| billing-v2 | billing / prod / v2 | 5000 | false |

These are teaching fixtures, not real service settings. The application request defines the required revision; the candidate answer cannot decide which revision is current. The default supplied set contains the first three documents. A separate case supplies billing evidence to test cross-service reuse even when values match.

Acceptance requires a supplied document, an existing quote, matching service and environment, matching revision, a requested field, matching value, a supporting quote, and complete coverage without duplicate claims.

## 2. Validate claims rather than an unrestricted answer

The input contains only `claims`, with exactly four strings per claim. A complete positive example is:

```json
{
  "claims": [
    {
      "field": "read_timeout_ms",
      "value": "5000",
      "doc": "prod-v2",
      "quote": "read_timeout_ms=5000"
    },
    {
      "field": "retry_enabled",
      "value": "false",
      "doc": "prod-v2",
      "quote": "retry_enabled=false"
    }
  ]
}
```

There is no separate `answer` property. Otherwise the claims could pass while unrestricted prose adds a contradictory conclusion. The UI should render only the returned `accepted` map, never forward the unchecked raw answer.

The parser uses the existing Gson `JsonReader` in strict mode. It rejects duplicate or unknown properties, non-string values and trailing JSON. Limits are 8192 Java UTF-16 code units per input, 2048 per field and eight claims. These are input bounds, not model token limits.

Duplicate JSON keys must be caught while reading. A map may already have overwritten the earlier value by the time ordinary deserialization finishes.

## 3. Three ways a real quote can fail

First, change the timeout claim to `2000` while retaining the correct `5000` quote. The result is `VALUE_MISMATCH`: genuine source text does not make the claim correct.

Second, cite the matching value and quote from dev-v2. The request concerns prod, so it returns `SCOPE_MISMATCH`. Using prod-v1 instead returns `STALE_REVISION`.

Third, cite `retry_enabled=false` for the timeout field. The quote exists in the correct document, but does not support that field. The result is `QUOTE_NOT_SUPPORTING`.

This excerpt shows the order of the final checks:

```java
if (!request.revision.equals(s.revision))
    return reject("STALE_REVISION", true);

String value = s.facts.get(field);
if (value == null || !value.equals(c.get("value")))
    return reject("VALUE_MISMATCH", true);

if (!(field + "=" + value).equals(c.get("quote")))
    return reject("QUOTE_NOT_SUPPORTING", true);

accepted.put(field, value);
```

The contract deliberately requires the canonical form `field=value`. It does not normalize `5s` into `5000` or accept paraphrases. That is explainable for a closed configuration table, but too restrictive for general document questions, which need a separately labeled semantic-support evaluation.

## 4. What happened in the 22 cases

Cases and expected labels were committed before execution. There are three positives and nineteen negatives. Positives cover complete answers, reordered claims and a one-field request. Negatives exercise scope, revision, value, evidence, field coverage and syntax.

<img src="/media/practice/claim-contract.png" alt="Of 22 frozen cases, 17 pass strict JSON, 13 have existing quotes and 3 pass the full contract; 10 cited violations are rejected by the full contract" width="1500" height="600" loading="lazy" />

| Admission check | Accepted | What it cannot establish |
| --- | ---: | --- |
| Strict JSON | 17 / 22 | Correct claims within valid syntax |
| Quote exists in supplied sources | 13 / 22 | Correct scope, revision, support or coverage |
| Complete field contract | 3 / 22 | Whether the registry itself is true and current |

All 22 full-contract outcomes match the frozen labels. This is a deliberately constructed fixture set, not “100% RAG accuracy.” No generation model, larger retrieval corpus or online RAG/no-RAG comparison was run.

Another case uses an instruction-like sentence embedded in the fixture as its quote. The citation-only baseline accepts the genuine text. The contract rejects it because it is not the canonical fact for the requested field. The program never executes source instructions. This tests one closed structure, not comprehensive prompt-injection resistance.

## 5. Return no partial success on failure

If one field is correct and the other fails, this implementation rejects the entire answer and returns an empty `accepted` map. This prevents a caller from treating a partial result as a complete response.

Successful output is copied into a sorted, unmodifiable map. Duplicate claims produce `DUPLICATE_CLAIM`, extra fields produce `UNREQUESTED_FIELD`, and missing fields produce `INCOMPLETE`. These outcomes do not trigger retries, change the requested revision or relax validation.

Partial answers are a different product contract. They need explicit per-field states and missing-information labels, rather than accidental data leakage from a failed result.

## 6. Reproduce it and create a counterexample

Requirements: Java 8, Maven and Python 3, with the existing Gson 2.10.1 dependency. This run used Java 8u171. From the `hohoo-ai-lab` repository:

```sh
python demos/07-grounded-claims/run.py --out demos/07-grounded-claims/evidence/MY-RUN
python demos/07-grounded-claims/audit.py demos/07-grounded-claims/evidence/MY-RUN
```

If Maven is outside PATH, add `--maven` and its executable path to the first command. Always use a new output directory. The manifest identifies the frozen inputs and source; results retain per-case outcomes. An independent Python audit recomputes the citation baseline and verifies labels, output and hashes.

Exercise: copy the fixtures and replace only a valid quote with another genuine field from the same source. Predict citation acceptance but contract rejection before running it. Then restore the quote and change only the claimed value. Explain why the rejection category changes. Keep the archived labels intact.

## 7. The boundary that remains

Both the requested scope and fact registry are trusted application inputs. An incorrect registry can make this program consistently accept an incorrect fact. The contract also does not authorize access to an environment.

The existing RAG study remains in progress. Its next step is labeled support, contradiction and insufficient-evidence cases over natural-language statements, followed by controlled model comparisons. String agreement in this closed configuration task should not be presented as natural-language understanding.
