import assert from "node:assert/strict";
import { createSectionSearcher } from "../../apps/web/lib/section-search.mjs";

export function evaluateReviewedHoldout({
  holdout,
  holdoutHash,
  corpus,
  review,
}) {
  assert.equal(review?.holdoutHash, holdoutHash, "留出题指纹不匹配。");
  const date = review.reviewedAt;
  assert(
    typeof date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date,
    "复核日期必须是有效的 YYYY-MM-DD。",
  );
  assert(
    Array.isArray(review.questions) &&
      review.questions.length === holdout.questions.length,
    "复核必须覆盖每一道留出题。",
  );
  const labels = new Map(
    review.questions.map((question) => [question?.id, question]),
  );
  assert.equal(labels.size, review.questions.length, "存在重复的复核题号。");
  const byId = new Map(corpus.map((passage) => [passage.id, passage]));
  const questions = holdout.questions.map(({ id, query }) => {
    const label = labels.get(id);
    assert(Array.isArray(label?.evidence), `${id} 缺少复核证据。`);
    const evidence = label.evidence.map((entry) => {
      const passage = byId.get(entry?.id);
      assert(
        passage &&
          typeof entry.quote === "string" &&
          entry.quote.trim() &&
          passage.text.includes(entry.quote),
        `${id} 的引文缺失或与归档段落不符。`,
      );
      return { id: passage.id, quote: entry.quote };
    });
    assert.equal(
      new Set(evidence.map((item) => item.id)).size,
      evidence.length,
      `${id} 存在重复的证据段落。`,
    );
    if (evidence.length) {
      assert(
        !Object.hasOwn(label, "missing"),
        `${id} 有据题不应填写缺失条件。`,
      );
      return { id, query, evidence };
    }
    assert(
      typeof label.missing === "string" && label.missing.trim(),
      `${id} 无据题必须填写缺失条件。`,
    );
    return { id, query, evidence, missing: label.missing.trim() };
  });

  const search = createSectionSearcher(corpus);
  const rows = questions.map((question) => {
    const candidates = search(question.query, holdout.topK).map(
      ({ id, href, heading, text, contentHash }) => ({
        id,
        href,
        heading,
        text,
        contentHash,
      }),
    );
    const rank = candidates.findIndex(({ id }) =>
      question.evidence.some((item) => item.id === id),
    );
    return {
      ...question,
      firstRelevantRank: rank < 0 ? null : rank + 1,
      candidates,
    };
  });
  const answerable = rows.filter(({ evidence }) => evidence.length > 0);
  const unanswerable = rows.filter(({ evidence }) => evidence.length === 0);
  const withCandidates = unanswerable.filter(
    ({ candidates }) => candidates.length > 0,
  ).length;
  return {
    summary: {
      answerableHitAtK: {
        hits: answerable.filter(
          ({ firstRelevantRank }) => firstRelevantRank !== null,
        ).length,
        total: answerable.length,
      },
      unanswerableWithCandidates: {
        withCandidates,
        total: unanswerable.length,
      },
      unanswerableFirstCandidateExplainsBoundary: {
        count: null,
        total: withCandidates,
        status: withCandidates ? "awaiting-review" : "not-applicable",
      },
    },
    rows,
  };
}
