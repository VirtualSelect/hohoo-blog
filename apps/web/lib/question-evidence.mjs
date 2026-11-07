// The exhibit reads the published tables; it never keeps a second set of results.
function table(markdown, firstHeader) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) =>
    line.startsWith(`| ${firstHeader} |`),
  );
  if (start < 0) throw Error(`Missing exhibit table: ${firstHeader}`);
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith("|")) break;
    rows.push(
      line
        .split("|")
        .slice(1, -1)
        .map((value) => value.trim()),
    );
  }
  if (!rows.length) throw Error(`Empty exhibit table: ${firstHeader}`);
  return rows;
}
function number(value) {
  const parsed = Number(value);
  if (value === "" || !Number.isFinite(parsed))
    throw Error(`Invalid exhibit measurement: ${value}`);
  return parsed;
}
function links(markdown, doc) {
  const urls = [
    ...markdown.matchAll(/\]\((https:\/\/github\.com\/[^)]+)\)/g),
  ].map((match) => match[1]);
  const code = urls.find(
    (url) => /\/tree\/[a-f0-9]{40}\//.test(url) && !url.includes("/evidence"),
  );
  const evidence = urls.find(
    (url) => /\/[a-f0-9]{40}\//.test(url) && url.includes("/evidence"),
  );
  if (!code || !evidence) throw Error(`Missing pinned source: ${doc}`);
  return { doc: `/docs/${doc}`, code, evidence };
}
export function questionEvidence(read) {
  const paths = {
    java: "ai-apps/java-idempotent-retry",
    cache: "llm/cache-cost-profile",
    robot: "embodied-ai/mujoco-planar-pd",
    rag: "ai-apps/java-grounded-claims",
  };
  const docs = Object.fromEntries(
    Object.entries(paths).map(([key, path]) => [key, read(`docs/${path}.md`)]),
  );
  const javaRows = table(docs.java, "条件");
  const javaCases = [
    "无 key，首次回复被丢弃",
    "同 key，首次回复被丢弃",
    "第一次已回复，重启服务，再重试",
  ].map((label) => {
    const row = javaRows.find((row) => row[0] === label);
    if (!row) throw Error(`Missing retry case: ${label}`);
    return { count: number(row[1]) };
  });
  const cache = table(docs.cache, "路径").filter((row) =>
    ["full", "rehash", "frozen"].includes(row[0]),
  );
  // The first table describes paths; measurements have their own header.
  const measuredCache = docs.cache.slice(docs.cache.indexOf("| 路径 | 总查询"));
  const measuredRows = table(measuredCache, "路径").map((row) => ({
    mode: row[0],
    total: number(row[1]),
  }));
  if (cache.length !== 3 || measuredRows.length !== 3)
    throw Error("Expected three measured cache paths");
  const cacheRows = ["full", "rehash", "frozen"].map((mode) => {
    const rows = measuredRows.filter((row) => row.mode === mode);
    if (rows.length !== 1)
      throw Error(`Missing or duplicate cache path: ${mode}`);
    return rows[0];
  });
  if (table(docs.robot, "质量").some((row) => !["是", "否"].includes(row[4])))
    throw Error("Invalid PD completion result");
  const robot = table(docs.robot, "质量").map((row) => ({
    mass: number(row[0].replace("kg", "")),
    damping: number(row[1]),
    overshoot: number(row[2].replace("mm", "")),
    error: row[3].replace("mm", ""),
    stable: row[4] === "是",
  }));
  if (
    robot.length !== 6 ||
    new Set(robot.map((row) => `${row.mass}/${row.damping}`)).size !== 6 ||
    robot.some(
      (row) => ![1, 2].includes(row.mass) || ![0, 18, 36].includes(row.damping),
    )
  )
    throw Error("Unexpected PD experiment grid");
  const registry = table(docs.rag, "文档").map((row) => {
    const [service, environment, revision] = row[1].split(" / ");
    return {
      id: row[0],
      service,
      environment,
      revision,
      timeout: number(row[2]),
    };
  });
  if (
    registry.length !== 4 ||
    ["prod-v2", "prod-v1", "dev-v2", "billing-v2"].some(
      (id) => registry.filter((row) => row.id === id).length !== 1,
    )
  )
    throw Error("Unexpected synthetic configuration registry");
  return {
    sources: Object.fromEntries(
      Object.entries(paths).map(([key, path]) => [key, links(docs[key], path)]),
    ),
    java: javaCases,
    cache: cacheRows,
    robot,
    registry,
  };
}

// Deliberately limited to one field from the article's synthetic configuration.
// This is not the full Java contract or natural-language fact checking.
export function checkTimeoutClaim(source, value) {
  if (source.service !== "payments" || source.environment !== "prod")
    return "scope";
  if (source.revision !== "v2") return "revision";
  if (source.timeout !== value) return "value";
  return "supported";
}
