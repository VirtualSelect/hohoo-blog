import Parser from "rss-parser";
import {
  isRadarSnapshot,
  radarSnapshot,
} from "../../apps/web/lib/radar-snapshot.mjs";

const repository = "VirtualSelect/hohoo-blog";
const api = `https://api.github.com/repos/${repository}`;
const raw = `https://raw.githubusercontent.com/${repository}`;
const parser = new Parser();

async function read(url, fetcher) {
  const response = await fetcher(url, {
    headers: {
      "User-Agent": "Hohoo-Radar-status",
      "Cache-Control": "no-cache",
    },
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  if (!response.body) throw Error("Empty response");
  const reader = response.body.getReader();
  const parts = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8 * 1024 * 1024) throw Error("Response exceeds 8 MB");
      parts.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(parts).toString("utf8");
}
const attempt = async (work) => {
  try {
    return { status: "available", value: await work() };
  } catch (error) {
    return { status: "unavailable", reason: error.message };
  }
};

export function compareSnapshots(a, b) {
  if (!a || !b) return "unknown";
  return a.dataHash === b.dataHash ? "same" : "different";
}

export function siteOrigin(value) {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw Error("Use an HTTPS site origin or an HTTP loopback preview");
  return url.origin;
}

// Read-only: no credentials, writes, collection, workflow dispatch or deployment.
export async function inspectNews({
  records,
  config,
  site = "https://huhohoo.com",
  fetcher = fetch,
}) {
  const origin = siteOrigin(site);
  const local = radarSnapshot(records, config);
  const [remote, snapshot, rss, workflow] = await Promise.all([
    attempt(async () => {
      const commit = JSON.parse(await read(`${api}/commits/main`, fetcher));
      if (!/^[a-f0-9]{40}$/.test(commit.sha))
        throw Error("Invalid main commit");
      const [items, settings] = await Promise.all([
        read(`${raw}/${commit.sha}/data/news/items.json`, fetcher),
        read(`${raw}/${commit.sha}/config/news-sources.json`, fetcher),
      ]);
      return {
        commit: commit.sha,
        snapshot: radarSnapshot(JSON.parse(items), JSON.parse(settings)),
      };
    }),
    attempt(async () => {
      const value = JSON.parse(
        await read(`${origin}/radar/snapshot.json`, fetcher),
      );
      if (!isRadarSnapshot(value)) throw Error("Invalid news snapshot");
      return value;
    }),
    attempt(async () => {
      const feed = await parser.parseString(
        await read(`${origin}/news/rss.xml`, fetcher),
      );
      const dates = feed.items.map((item) =>
        Date.parse(item.isoDate || item.pubDate),
      );
      if (dates.some((date) => !Number.isFinite(date)))
        throw Error("Invalid RSS date");
      return {
        signalCount: feed.items.length,
        latestFeedPublishedAt: dates.length
          ? new Date(Math.max(...dates)).toISOString()
          : null,
      };
    }),
    attempt(async () => {
      const response = JSON.parse(
        await read(`${api}/actions/runs?per_page=20`, fetcher),
      );
      const run = response.workflow_runs?.find(
        (entry) => entry.path === ".github/workflows/ai-news.yml",
      );
      if (!run || !Number.isInteger(run.id))
        throw Error("No recent collection run in the returned history");
      return {
        url: `https://github.com/${repository}/actions/runs/${run.id}`,
        status: run.status,
        conclusion: run.conclusion,
        startedAt: run.run_started_at,
        updatedAt: run.updated_at,
        commit: run.head_sha,
      };
    }),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    site: origin,
    local,
    remote,
    siteSnapshot: snapshot,
    rss,
    workflow,
    comparisons: {
      localToMain: compareSnapshots(local, remote.value?.snapshot),
      mainToSite: compareSnapshots(remote.value?.snapshot, snapshot.value),
      siteToRss:
        snapshot.value && rss.value
          ? snapshot.value.signalCount === rss.value.signalCount &&
            snapshot.value.latestFeedPublishedAt ===
              rss.value.latestFeedPublishedAt
            ? "same-summary"
            : "different-summary"
          : "unknown",
    },
  };
}

export function formatNewsStatus(report) {
  const snapshotLine = (value) =>
    `${value.recordCount} 条原始记录 / ${value.signalCount} 条聚合信号；最近收录 ${value.latestCollectedAt || "无"}；数据 ${value.dataHash.slice(0, 12)}`;
  const available = (check, format) =>
    check.value ? format(check.value) : `无法核实（${check.reason}）`;
  const names = { same: "相同", different: "不同", unknown: "无法核实" };
  return [
    `AI Radar 只读核对 · ${report.checkedAt}`,
    `目标网站：${report.site}`,
    `本地：${snapshotLine(report.local)}`,
    `远端 main：${available(report.remote, (r) => snapshotLine(r.snapshot) + "；提交 " + r.commit.slice(0, 12))}`,
    `网站快照：${available(report.siteSnapshot, snapshotLine)}`,
    `网站 RSS：${available(report.rss, (r) => `${r.signalCount} 条聚合信号；最新 feed 日期 ${r.latestFeedPublishedAt || "无"}`)}`,
    `最近采集任务：${available(report.workflow, (r) => `${r.status} / ${r.conclusion || "尚无结论"}；${r.startedAt}\n${r.url}`)}`,
    `数据比对：本地与 main ${names[report.comparisons.localToMain]}；main 与网站 ${names[report.comparisons.mainToSite]}`,
    `网站快照与 RSS 摘要：${{ "same-summary": "条数和最新日期相同", "different-summary": "条数或最新日期不同，需进一步检查", unknown: "无法核实" }[report.comparisons.siteToRss]}`,
    "快照指纹只代表归档数据，不代表代码版本或最近扫描时间。RSS 的条数和日期只是摘要核对，不能证明内容完全一致。",
    "零新增可能是去重或筛选结果；任务成功不等于有新条目。详情查看该次 Actions 报告。此命令不会拉取合并、补采或发布。",
  ].join("\n");
}
