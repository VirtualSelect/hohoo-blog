const quotaReasons = new Set([
  "daily-limit",
  "source-limit",
  "reserved-for-later",
  "source-reserved-for-later",
]);
export const isQuotaReason = (reason) => quotaReasons.has(reason);
const titleKey = (title) => title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const observationKey = ({ id, sourceId, publishedAt }) =>
  JSON.stringify([id, sourceId, publishedAt]);

// Diagnostics observe selection; they never relax its filters or consume quota.
export function collectionDiagnostics(report, relevant, existing, config) {
  const successful = report.sources.filter(
    (source) => source.status === "ok",
  ).length;
  const failed = report.sources.length - successful;
  const reasons = {};
  for (const item of report.notSelected)
    reasons[item.reason] = (reasons[item.reason] || 0) + 1;
  const quotaBlocked = report.notSelected.filter((item) =>
    isQuotaReason(item.reason),
  ).length;
  const outsideObservations = new Set(
    report.notSelected
      .filter((item) => item.reason === "outside-window")
      .map(observationKey),
  );
  const covered = [...existing, ...report.selected];
  const urls = new Set(covered.map((item) => item.url));
  const titles = new Set(covered.map((item) => titleKey(item.title)));
  const blocked = new Set(config.blockedUrls || []);
  // selectItems checks age before duplicates/blocked URLs. Do not call an old
  // archived, selected or blocked item a missing candidate just because its age won.
  const unarchived = relevant.filter((item) => {
    if (
      !outsideObservations.has(observationKey(item)) ||
      urls.has(item.url) ||
      titles.has(titleKey(item.title)) ||
      blocked.has(item.url)
    )
      return false;
    urls.add(item.url);
    titles.add(titleKey(item.title));
    return true;
  });
  return {
    schemaVersion: 1,
    sourceHealth:
      successful === 0 ? "failed" : failed ? "partial-failure" : "ok",
    successfulSources: successful,
    failedSources: failed,
    selectionOutcome:
      successful === 0
        ? "unknown"
        : report.selected.length
          ? "selected"
          : quotaBlocked
            ? "quota-blocked"
            : unarchived.length
              ? "outside-window"
              : "no-new-eligible",
    notSelectedReasons: reasons,
    quotaBlocked,
    outsideWindow: {
      relevantCount: reasons["outside-window"] || 0,
      unarchivedCount: unarchived.length,
      // No cross-run candidate history exists. Neither a feed pubDate nor the
      // current observation establishes when this source first exposed an item.
      firstSeenStatus: "not-recorded",
      arrivalStatus: "unknown",
      candidates: unarchived.slice(0, 10).map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        sourceId: item.sourceId,
        publishedAt: item.publishedAt,
        observedAt: report.runAt,
        firstSeenAt: null,
      })),
    },
  };
}

export function formatCollectionReport(report) {
  const diagnostic = report.diagnostics;
  if (!diagnostic)
    return "## AI 资讯采集诊断\n已有报告缺少本轮诊断字段，无法判断零新增原因；待下一次正常采集生成新报告。\n";
  const health = {
    ok: "正常",
    failed: "全部失败",
    "partial-failure": "部分失败",
  };
  const outcome = {
    unknown: "来源全部失败，无法判断是否有新内容",
    selected: "已选取候选，发布结果以后续构建与推送步骤为准",
    "quota-blocked": "有合格候选被配额或分时预留挡住",
    "outside-window": "有未归档的相关候选超出发布时窗，是否晚到无法确认",
    "no-new-eligible": "正常零新增：当前可见候选经筛选、去重后无可选新内容",
  };
  const lines = [
    "## AI 资讯采集诊断",
    `运行：${report.runAt}`,
    `来源：${health[diagnostic.sourceHealth]}（成功 ${diagnostic.successfulSources}/${report.sources.length}）。`,
    `选取结果：${outcome[diagnostic.selectionOutcome]}；选取 ${report.selected.length} 条，主题拒绝 ${report.rejected.length} 条。`,
    `发布时窗：${report.since} → ${report.runAt}（${report.windowHours} 小时）。`,
  ];
  if (diagnostic.sourceHealth === "partial-failure")
    lines.push(
      "部分来源失败，零新增判断仅适用于成功读取的来源，不能代表完整覆盖。",
    );
  if (report.budget)
    lines.push(
      `UTC 入库日：${report.budget.day}；已用 ${report.budget.used}/${report.budget.limit}，当前释放 ${report.budget.released}，当前可用 ${report.budget.available}。额度为零不等于本轮存在被额度挡住的候选。`,
    );
  for (const source of report.sources) {
    if (source.status !== "ok") {
      lines.push(`- ${source.source}：失败；${source.error}`);
      continue;
    }
    const coverage = source.feedCoverage;
    lines.push(
      `- ${source.source}：成功；时窗内 ${source.inWindow} 条，解析有效 ${source.eligible} 条，跳过 ${source.skipped} 条；解析版本 ${source.parserVersion || "未记录"}。`,
    );
    if (coverage)
      lines.push(
        `  返回 ${coverage.itemCount} 条，检查 ${coverage.inspectedCount} 条${coverage.truncated ? "（达到解析上限）" : ""}；已检查 RSS 日期范围 ${coverage.oldestPublishedAt || "无"} → ${coverage.newestPublishedAt || "无"}。`,
      );
  }
  for (const [reason, count] of Object.entries(diagnostic.notSelectedReasons))
    lines.push(`- 未选取 ${reason}：${count} 条。`);
  const outside = diagnostic.outsideWindow;
  lines.push(
    `超出时窗的相关候选 ${outside.relevantCount} 条，其中未归档且未明确屏蔽 ${outside.unarchivedCount} 条；以下最多列 10 条。首见时间未记录，是否晚到无法确认。`,
  );
  for (const item of outside.candidates)
    lines.push(
      `- ${item.id} / ${item.sourceId}；RSS 发布日期 ${item.publishedAt}；本次观察 ${item.observedAt}；首见时间未知。`,
    );
  lines.push(
    "RSS 日期范围仅描述本次实际返回的数据，不证明已覆盖完整回溯历史；本次观察时间不是首次发现时间。此报告不核验原始报道事实，也不将选取视为已发布。",
  );
  return lines.join("\n\n") + "\n";
}
