---
title: "Does TypeScript validate model output? A 32-case comparison with Java"
description: "Assertions, unknown and raw JSON: 22 false accepts, four object-validation blind spots and a bounded Java/TypeScript comparison."
slug: /ai-apps/typescript-output-boundary
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 11
domain: ai-apps
article_kind: case-study
difficulty: intermediate
related: ["doc:ai-apps/java-structured-output", "doc:ai-apps/java-transactional-history", "lab:typescript-output-boundary", "project:hohoo-ai-lab"]
---

[The Java structured-output article](/docs/ai-apps/java-structured-output) checks a response after HTTP 200. TypeScript does not remove that boundary.

```typescript
const result = JSON.parse(raw) as Classification;
```

This gives the editor a type without establishing that the model returned it. We ran the same 32 inputs through Java and TypeScript, comparing assertions, decoded-object validation and raw-JSON validation. There were no new model calls.

[TypeScript project](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/experiments/03-typescript-boundary) · [Inputs and results](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/experiments/03-typescript-boundary/evidence/20260930-boundary) · [Existing Java validator](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/04-structured-output/src/main/java/com/hohoo/ailab/structured/Classification.java)

## 1. Where TypeScript belongs

Java remains the main LLM practice stack. TypeScript supplements AI Engineering for browser/Node.js adapters and interactions that share a business contract.

This is an independent experiment, not a Java rewrite or a blog-wide migration. TypeScript is a development dependency; validation uses native language features. Actual versions: Node.js 26.8.2, TypeScript 7.0.2, Java 1.8.0_171 and Gson 2.10.1. Maven follows JAVA_HOME, which can differ from another terminal's Java.

## 2. What an assertion does

The [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions) explains that assertions do not perform runtime validation.

```json
{"category":"llm","tags":[42]}
```

This is valid JSON. Asserting a string-array type does not change the numeric element; calling a string method can fail later. Start with `unknown`, validate, and return the trusted type only afterwards.

## 3. The exact contract

| Boundary | Rule |
|---|---|
| Root | Exactly category and tags |
| Category | ai-apps / llm / embodied-ai / needs-review |
| Tags | One to three unique strings |
| Each tag | Nonempty, no leading/trailing ASCII whitespace or control characters |
| Tag length | At most 20 Unicode code points |
| Raw length | At most 8000 UTF-16 code units |
| Repeated root keys | Rejected, including escaped equivalent names |
| Returned value | Detached, frozen object and tag array |

Code points and UTF-16 units are different. Twenty emoji code points pass; 21 fail. The raw limit intentionally matches the Java string-length boundary. Grapheme clusters are not counted separately.

Whitespace follows Java `String.trim` compatibility. The NBSP case is accepted by both implementations. That recorded choice does not mean all Unicode whitespace is forbidden.

## 4. Why object validation misses evidence

```json
{"category":"ai-apps","category":"llm","tags":["json"]}
```

After `JSON.parse`, the object retains the final property value. An object validator cannot discover the duplicate from the decoded value.

```typescript
const decoded: unknown = JSON.parse(raw);
uniqueRootKeys(raw);
return validateClassification(decoded);
```

The raw entry checks length and JSON syntax, then scans decoded root-key names while tracking string escapes and nesting. It is deliberately limited to this flat contract, whose business values reject nested objects. It is not a general JSON parser or JSON Schema engine.

## 5. The 32 fixtures

Twenty cases come from existing Java tests; 12 add escaped duplicate names, repeated tags fields, root arrays, nested tags, quoted delimiters, Unicode boundaries, NBSP and oversized input.

Six cases should pass; 26 should fail. They are constructed counterexamples, not 32 model responses or a representative error distribution. One case deliberately has a semantically wrong but structurally valid classification.

## 6. Measured results

| Entry | Invalid inputs accepted | Contract agreement |
|---|---:|---:|
| JSON.parse plus assertion | 22 | 10 / 32 |
| Decoded object only | 4 | 28 / 32 |
| Raw JSON plus object validation | 0 | 32 / 32 |
| Existing Java validator | 0 | 32 / 32 |

The object-only misses are duplicate category, escaped duplicate category, duplicate tags field and an oversized but otherwise valid object. Raw text length, like duplicate-key evidence, is unavailable at that entry.

The raw TypeScript and Java decisions agree on 32/32 fixtures. This is a bounded differential check, not proof for every JSON input, and certainly not a model error rate.

## 7. Replaying a real historical response

An existing response from 2026-09-28 includes one JSON code fence. Strict parsing rejects it. Explicitly unwrapping a single whole-content json fence, then applying the same validator, passes.

This is offline replay with no provider request. Historical `agnes-2.5-flash` metadata remains unchanged; future new calls use `agnes-3.0-flash`.

The adapter does not infer categories, fill fields, coerce values, select JSON from surrounding explanations or silently handle multiple fences. Preserve the original input and make adaptation explicit.

## 8. Running .ts is not typechecking

Node executes the erasable syntax used here, but execution is distinct from checking types; see the [Node TypeScript documentation](https://nodejs.org/api/typescript.html).

```bash
npm run typecheck
npm test
npm run experiment -- evidence/my-run
node audit.mjs evidence/my-run
```

Compile-time tests use `@ts-expect-error` to check that unknown cannot flow directly into Classification. Thirty-seven runtime tests cover boundaries, immutable snapshots, adaptation and semantic limits. Neither layer substitutes for the other.

## 9. Reproduce the comparison

```bash
mvn -q -f demos/04-structured-output/pom.xml compile
cd experiments/03-typescript-boundary
npm ci
npm run typecheck
npm test
npm run experiment -- evidence/my-run
```

The Java probe uses JAVA_HOME and Gson 2.10.1 from Maven's repository. Set the process variable `GSON_JAR` if that repository is in a custom location. No API key is needed.

Evidence retains fixtures, four decisions per case, versions, commit and source/replay hashes. The audit allows only LF/CRLF checkout differences, not arbitrary content changes.

## 10. What to use in an application

Treat model output, HTTP bodies and stored client data as unknown. Object validation checks shape; the raw entry protects conditions lost during decoding. Semantic truth, provenance and authorization need separate checks.

A native validator is manageable for this single flat contract. Multiple nested outputs, shared service schemas and richer diagnostics would justify evaluating a mature schema library. Establish the boundary before standardizing the stack.

Next: [transactional chat history](/docs/ai-apps/java-transactional-history). Once an output passes validation, when should it enter persistent session state?
