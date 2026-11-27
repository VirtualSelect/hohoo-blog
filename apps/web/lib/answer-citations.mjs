import { createHash } from "node:crypto";
import { passageCitation } from "./passage-citation.mjs";

const hash = (text) => createHash("sha256").update(text).digest("hex");
const digest = (value) => hash(JSON.stringify(value));

// Construct on the server from the exact passages sent in this request.
// Never accept a bundle or providedSourceIds supplied by a model or browser.
export function createEvidenceBundle(indexUrl, passages, providedSourceIds) {
  if (!Array.isArray(passages) || !Array.isArray(providedSourceIds))
    throw new Error("Invalid evidence bundle");
  const ids = new Set();
  const sources = passages.map((passage) => {
    if (
      !passage ||
      typeof passage.id !== "string" ||
      !passage.id ||
      ids.has(passage.id) ||
      typeof passage.text !== "string" ||
      !passage.text.trim() ||
      hash(passage.text) !== passage.contentHash
    )
      throw new Error("Invalid evidence source");
    ids.add(passage.id);
    passageCitation(passage, indexUrl);
    return {
      id: passage.id,
      text: passage.text,
      href: passage.href,
      contentHash: passage.contentHash,
    };
  });
  if (
    new Set(providedSourceIds).size !== providedSourceIds.length ||
    providedSourceIds.some((id) => !ids.has(id))
  )
    throw new Error("Invalid provided source set");
  const bundle = {
    indexUrl,
    sources,
    providedSourceIds: [...providedSourceIds],
  };
  return Object.freeze({
    ...bundle,
    sources: Object.freeze(sources.map(Object.freeze)),
    providedSourceIds: Object.freeze(bundle.providedSourceIds),
    digest: digest(bundle),
  });
}

export function validateAnswerCitations(candidate, bundle) {
  const { digest: expectedDigest, ...data } = bundle;
  if (digest(data) !== expectedDigest)
    throw new Error("Evidence bundle changed");
  const errors = [];
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !["answer", "insufficient_evidence"].includes(candidate.decision) ||
    typeof candidate.answer !== "string" ||
    !candidate.answer.trim() ||
    !Array.isArray(candidate.evidence)
  )
    errors.push({ code: "INVALID_ANSWER" });
  else {
    if (candidate.decision === "answer" && !candidate.evidence.length)
      errors.push({ code: "MISSING_CITATIONS" });
    const sources = new Map(
      bundle.sources.map((source) => [source.id, source]),
    );
    const provided = new Set(bundle.providedSourceIds);
    candidate.evidence.forEach((citation, index) => {
      const source = sources.get(citation?.source_id);
      let code;
      if (!source) code = "UNKNOWN_SOURCE";
      else if (!provided.has(source.id)) code = "SOURCE_NOT_PROVIDED";
      else if (typeof citation.quote !== "string" || !citation.quote.trim())
        code = "EMPTY_QUOTE";
      else if (!source.text.includes(citation.quote)) code = "QUOTE_NOT_EXACT";
      if (code) errors.push({ code, index });
    });
  }
  // A true quote does not prove that it entails the answer.
  return {
    status: errors.length
      ? "rejected"
      : candidate.decision === "insufficient_evidence"
        ? "insufficient_evidence"
        : "valid_provenance",
    semanticSupport: "unverified",
    bundleDigest: expectedDigest,
    indexUrl: bundle.indexUrl,
    answer: errors.length ? null : candidate.answer,
    evidence: errors.length
      ? []
      : candidate.evidence.map((citation) => ({
          source_id: citation.source_id,
          quote: citation.quote,
        })),
    errors,
  };
}
