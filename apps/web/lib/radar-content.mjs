import { createHash } from "node:crypto";
import { validFeedContent } from "../../../src/utils/radar-content.mjs";

export function radarContentAsset(item) {
  if (!item.feedContent) return null;
  if (
    item.sourceId !== "aihot" ||
    !/^[a-f0-9]{20}$/.test(item.id) ||
    !validFeedContent(item.feedContent)
  )
    throw new Error("Invalid RSS content asset: " + item.id);
  const json = JSON.stringify({ id: item.id, ...item.feedContent });
  const hash = createHash("sha256").update(json).digest("hex").slice(0, 16);
  return { url: `/radar-content/${item.id}-${hash}.json`, json };
}
