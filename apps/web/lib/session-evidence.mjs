import {
  pinnedEvidenceLinks,
  readEvidenceTable,
} from "./question-evidence.mjs";

export function sessionStrategyEvidence(read) {
  const paths = {
    serial: "ai-apps/java-transactional-history",
    "first-commit": "ai-apps/java-concurrent-history",
    "latest-start": "ai-apps/java-stream-session-ownership",
  };
  const articles = Object.fromEntries(
    Object.entries(paths).map(([id, path]) => [
      id,
      read("docs/" + path + ".md"),
    ]),
  );
  const comparison = readEvidenceTable(articles["latest-start"], "产品要求");
  if (
    comparison.length !== 3 ||
    !comparison[0][1].includes("Demo 05") ||
    !comparison[1][1].includes("Demo 06") ||
    !comparison[2][1].includes("Demo 09")
  )
    throw Error("Session policy source comparison changed");
  const correction = articles["latest-start"].match(
    /\[修正版代码与回归命令\]\((https:\/\/github\.com\/[^)]+\/[a-f0-9]{40}\/[^)]+)\)/,
  );
  if (!correction) throw Error("Missing stream-session correction");
  return {
    sources: Object.fromEntries(
      Object.entries(paths).map(([id, path]) => [
        id,
        pinnedEvidenceLinks(articles[id], path),
      ]),
    ),
    correction: correction[1],
  };
}
