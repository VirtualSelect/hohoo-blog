import { appendFileSync } from "node:fs";

const minimumIntervalMs = 115 * 60 * 1000;
const collectionStep = "Collect a filtered batch";

export async function decideScheduledCollection({
  repository,
  branch,
  runId,
  token,
  now = Date.now(),
  fetcher = fetch,
}) {
  try {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !branch || !token) {
      throw new Error("Missing workflow context");
    }
    const cutoff = now - minimumIntervalMs;
    const api = `https://api.github.com/repos/${repository}/actions`;
    async function read(path) {
      const response = await fetcher(api + path, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Hohoo-Radar-schedule",
        },
        signal: AbortSignal.timeout(8000),
        redirect: "error",
      });
      if (!response.ok) throw new Error("Workflow history is unavailable");
      return response.json();
    }

    const query = new URLSearchParams({
      branch,
      status: "success",
      per_page: "20",
    });
    const { workflow_runs: runs } = await read(
      `/workflows/ai-news.yml/runs?${query}`,
    );
    if (!Array.isArray(runs)) throw new Error("Invalid workflow history");
    for (const run of runs) {
      if (
        !Number.isSafeInteger(run.id) ||
        String(run.id) === String(runId) ||
        run.conclusion !== "success" ||
        Date.parse(run.updated_at) <= cutoff
      )
        continue;
      const { jobs } = await read(`/runs/${run.id}/jobs?per_page=20`);
      if (!Array.isArray(jobs)) throw new Error("Invalid job history");
      const job = jobs.find(
        (job) => job.name === "collect" && job.conclusion === "success",
      );
      const step = job?.steps?.find(
        (step) => step.name === collectionStep && step.conclusion === "success",
      );
      const started = Date.parse(step?.started_at);
      if (started > cutoff && started <= now) {
        return {
          collect: false,
          reason: "recent-collection",
          lastRunId: run.id,
          lastStartedAt: step.started_at,
        };
      }
    }
    return { collect: true, reason: "no-recent-collection" };
  } catch {
    return { collect: true, reason: "history-unavailable" };
  }
}

if (import.meta.main) {
  const {
    GITHUB_REPOSITORY,
    GITHUB_RUN_ID,
    GITHUB_TOKEN,
    DEFAULT_BRANCH,
    GITHUB_OUTPUT,
    GITHUB_STEP_SUMMARY,
  } = process.env;
  const decision = await decideScheduledCollection({
    repository: GITHUB_REPOSITORY,
    branch: DEFAULT_BRANCH,
    runId: GITHUB_RUN_ID,
    token: GITHUB_TOKEN,
  });
  const message = {
    "recent-collection": `最近一次成功采集开始于 ${decision.lastStartedAt}（运行 ${decision.lastRunId}），距现在不足 115 分钟，本次跳过采集。`,
    "no-recent-collection": "最近 115 分钟未找到实际成功的采集，本次继续采集。",
    "history-unavailable": "无法核对工作流历史，本次继续串行采集。",
  }[decision.reason];
  if (decision.reason === "history-unavailable")
    console.warn(`::warning::${message}`);
  else console.log(message);
  if (GITHUB_OUTPUT)
    appendFileSync(GITHUB_OUTPUT, `should_collect=${decision.collect}\n`);
  if (GITHUB_STEP_SUMMARY)
    appendFileSync(GITHUB_STEP_SUMMARY, `## 定时采集检查\n\n${message}\n`);
}
