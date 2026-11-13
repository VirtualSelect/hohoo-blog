---
title: "Why a matching blog passage is still not an answer"
description: "Build traceable retrieval over real blog prose and use a false positive to examine tokenization, ranking, citations and evaluation boundaries."
slug: "/rag/blog-passage-search"
status: "published"
published_at: "2026-11-11"
updated: "2026-11-12"
domain: "rag"
article_kind: "case-study"
difficulty: "intermediate"
reading_minutes: 7
related: ["doc:ai-apps/java-retrieval-evidence", "doc:ai-apps/java-grounded-claims", "project:hohoo-blog"]
---

The frozen v1 acceptance run returns a concurrency article among its top five candidates for `缓存 保证成功`—roughly, “cache guarantee success.” The retrieved text says to commit only after response validation succeeds. It does not establish that caching guarantees success.

The page loaded, and its source link works. **Retrieval found text without finding the support the question requires.** This counterexample reveals more than a search box that merely returns results.

This article describes an unpublished local preview: open site search and choose “Article passages.” The implementation and acceptance runner belong to the blog repository; the existing Java teaching project is unchanged. AI-assisted preparation; relevance judgments await author review.

## Where the false overlap comes from

Chinese has no mandatory spaces between words. This lightweight baseline splits runs of Chinese characters into adjacent pairs:

```js
import { searchTerms } from "./apps/web/lib/section-search.mjs";
console.log(searchTerms("保证成功")); // 保证、证成、成功
console.log(searchTerms("验证成功")); // 验证、证成、成功
```

“Guarantee success” and “validation succeeds” share the pairs `证成` and `成功`. Partial matching can therefore score a passage that never discusses caching. The first shared pair crosses a word boundary; it is not even the intended concept.

Ranking uses term frequency, corpus frequency and passage length. Article titles have lower weight, and at least one term must occur in the passage or section heading. These rules produce an ordering. They do not understand a guarantee or establish claim support. Calling the first result an answer, or converting its score into confidence, would overstate the system's capability.

## Keep the route back to the source

The index uses published tutorials and essays. At build time, sanitized article HTML supplies the same h2/h3 anchors used on the page. Short neighboring paragraphs are grouped within a section; each block is at most 900 characters. Code blocks, tables, news, plans and fallback text for missing translations are excluded.

Why group paragraphs? Retrieving “90-second read timeout” alone can omit the nearby qualification that this is not a total request deadline. Grouping retains some context, but a 900-character limit can still split a longer argument. It is a bounded tradeoff, not a guarantee of complete evidence.

A local review exposed a specific context loss. The cache article asks whether reducing 864 projection rows to 432 means a 50% speedup. The old extractor read `p/li` but skipped the question in `summary`, then attached the answer “No” to the preceding paragraph. The words came from the article, yet their referent was missing.

The existing HTML parser now keeps the original question with its answer and separates them from prose outside the disclosure. Long answers repeat the question in each chunk, with a 900-character total limit. Results display the question separately; copied citations include it. This changes extraction boundaries, without rewriting the question, generating an answer or establishing that retrieval understands negation. The original v1 corpus and scores remain frozen; the current index receives a separate regression check.

The first prototype numbered passages by array position, so adding an earlier article renumbered later passages. IDs now derive from their source and content:

```text
Passage ID = document ID + first 20 hex digits of SHA-256(section URL + newline + full passage)
Content fingerprint = SHA-256(full passage)
```

An unrelated article does not change that ID; editing the passage does. **Text identity is not factual correctness.** The fingerprint identifies a particular excerpt version.

## Copy complete evidence with provenance

Search results show a shortened excerpt. “Copy citation” preserves the full passage, article and section, public source URL, hashed index-snapshot URL and complete content fingerprint. A clipboard failure exposes selectable text instead of claiming success.

The source URL supports continued reading; the fingerprint supports version checks. Snapshot assets are not permanent archives: later deployments may prune old hashes, and articles may be revised. Retain the quoted text and fingerprint for long-term use. This preview is unpublished, so its public snapshot URLs are not available yet.

The browser loads only the current language's passage index when that mode is selected. Queries are not sent to a model or uploaded to third parties. English and Traditional Chinese use their own prose rather than silently falling back to Simplified Chinese.

## Reproduce on the matching checkout

Run these commands from the root of **this preview checkout**. Production main does not yet contain the new files; obtain the corresponding changes first. Skip installation when dependencies are already installed:

```powershell
npm ci --prefix apps/web
npm run prepare:content --prefix apps/web
npm run search:evaluate --prefix apps/web
```

The recorded environment is Windows with Node.js 26.8.2. `reports/section-search-evaluation-v1.json` contains each query's raw candidates, expected evidence, rank and fingerprints.

The protocol is `apps/web/tests/fixtures/section-search-protocol.json`; its neighboring `section-search-snapshot.json` freezes the question, algorithm and corpus hashes. The original 513 text blocks are retained in `section-search-corpus-v1.json`, verified against the original corpus fingerprint. Later article edits do not replace that test corpus. The default command replays the frozen evaluation and stops on a version mismatch. This explanatory article stays excluded to avoid retrieving its own explanation as evidence.

To check current prose, run `node apps/web/scripts/evaluate-section-search.mjs --live`. It writes `reports/section-search-evaluation-current.json`, using the same development questions on the current corpus. This is a development regression, not a new independent evaluation; it does not overwrite v1. The test corpus is not shipped in the site's public index or browser scripts.

If the index is missing, prepare content first. On a snapshot mismatch, inspect the code, protocol and corpus versions. Do not overwrite v1 to obtain a passing run; use a new protocol version for new conditions and retain the old evidence.

## What the twelve questions actually show

The frozen corpus contains 61 tutorials and essays, split into 513 passages. Eight queries specify a relevant section and an exact supporting quotation; four are labeled as having no supported answer. These labels were prepared by AI and have not received independent author review.

All eight supported queries retrieved their designated passage in the top five, each at rank one. This is unsurprising: queries deliberately use source vocabulary, and the retriever had already been adjusted on other development examples. The result establishes these acceptance conditions, **not accuracy on reader questions or an independent held-out score**.

Three of the four unsupported queries returned no candidates. `缓存 保证成功` still returned five. The raw false positive is retained; thresholds were not raised to rerun for a cleaner result. Candidate retrieval is not itself a wrong generated answer. It exposes the boundary a future answer layer must enforce: candidates do not establish sufficient support.

## Try changing the meaning without changing the source

Before changing a threshold, paste this entire PowerShell block at the root of the preview checkout. It only reads the frozen v1 protocol and corpus: no model installation, index generation or report overwrite. It reads the original query from the protocol rather than asking you to retype it. This historical corpus is Simplified Chinese, so its results need not match live search in the current language.

```powershell
@'
import fs from "node:fs";
import { searchTerms, createSectionSearcher } from "./apps/web/lib/section-search.mjs";
const root = "apps/web/tests/fixtures/";
const read = (name) => JSON.parse(fs.readFileSync(root + name, "utf8"));
const protocol = read("section-search-protocol.json");
const corpus = read("section-search-corpus-v1.json");
const query = protocol.questions.find((q) => q.id === "absent-guarantee").query;
const queryTerms = [...new Set(searchTerms(query))];
const results = createSectionSearcher(corpus)(query, protocol.topK);
console.log(JSON.stringify({
  query,
  queryTerms,
  firstTwo: results.slice(0, 2).map((p) => {
    const present = new Set(searchTerms(p.heading + " " + p.text));
    return {
      id: p.id,
      href: p.href,
      matched: queryTerms.filter((term) => present.has(term)),
      missing: queryTerms.filter((term) => !present.has(term)),
    };
  }),
}, null, 2));
'@ | node --input-type=module
```

Expect `queryTerms` to contain `缓存`, `保证`, `证成`, `成功`. The first two candidates expose different problems:

| Frozen candidate | Terms shared with its section heading or text |
| --- | --- |
| [Concurrency article opening](/docs/ai-apps/java-concurrent-history) | 证成, 成功 |
| [Three indices in a sliding cache](/docs/llm/sliding-cache-positions#5-keep-three-indices-separate) | 缓存, 保证 |

In the first row, “commit only after response validation succeeds” concerns conversation commits, not caching. In the second, “does not guarantee that other architectures have the same properties” limits scope; removing the negation reverses its meaning.

Both rows share two terms. Even the second row's explicit caching term does not support the question. `matched` is a set intersection with section headings and text, not a decomposition of the ranking score; it excludes the article title. Title weighting, frequencies and length still affect rank. **Missing terms are a reason to inspect; complete overlap cannot establish meaning.**

For each row, state the narrow conclusion the original sentence permits, then write a broader claim it cannot support. If the output differs, check the working directory, frozen files and algorithm fingerprint before replacing anything.

Requiring every query term would delete both rows, but still would not recognize negation. Consider this constructed teaching sentence: `缓存不能保证成功。` (“Caching cannot guarantee success.”) It contains all four query terms while denying the guarantee. This sentence tests the reasoning; it is not added to the v1 corpus or score.

First search for source keywords, then paraphrase the question with different vocabulary. Compare the sections, not just result counts; this is exploration, outside v1. Next remove a qualifying condition from a claim and inspect why the same quotation may support a narrow statement without supporting the broader one.

A chunking comparison needs separately labeled supporting evidence, frozen questions, tokenization and retrieval, with only chunking varied. Answering adds generation, missing-evidence handling and support verification. These remain future work in the [RAG path](/learning?track=rag).

Start with [retrieval evidence validation](/docs/ai-apps/java-retrieval-evidence), then [real citations with unsupported claims](/docs/ai-apps/java-grounded-claims). This prototype uses real blog prose; it does not complete vector retrieval, semantic reranking or a full RAG product.
