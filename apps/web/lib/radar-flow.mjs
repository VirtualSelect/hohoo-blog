import { radarDay } from "../../../src/utils/radar-date.mjs";

export function signalDays(items) {
  const days = new Map();
  for (const item of items) {
    const day = radarDay(item.publishedAt);
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(item);
  }
  return [...days].map(([day, signals]) => ({ day, signals }));
}

export function adjacentSignal(items, id, direction) {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return direction === 1 ? items[0] : undefined;
  return items[index + direction];
}

export function firstUnreadSignal(items, read) {
  const ids = new Set(read);
  return items.find((item) => !ids.has(item.id)) || items[0];
}

export function readRadarSection(search) {
  return new URLSearchParams(search).get("section") === "milestones"
    ? "milestones"
    : "news";
}

// A release index, not an importance score or independent factual verification.
export function milestoneType(item) {
  const title = item.title || "";
  if (
    /融资|估值|股价|诉讼|传闻|据传|fundrais|valuation|lawsuit|rumou?r/i.test(
      title,
    ) ||
    !/发布|推出|开源|上线|升级|更新|release|launch|open.source/i.test(title)
  )
    return null;
  if (/机器人|具身|robot|embodied/i.test(title)) return "embodied";
  if (
    /工具|SDK|CLI|Codex|Claude Code|Cursor|框架|MCP|Agent|智能体|OpenClaw|OpenRouter|平台|API/i.test(
      title,
    )
  )
    return "tool";
  if (/模型|多模态|GPT|Gemini|Claude|Qwen|Llama|DeepSeek|Ling-/i.test(title))
    return "model";
  return null;
}
