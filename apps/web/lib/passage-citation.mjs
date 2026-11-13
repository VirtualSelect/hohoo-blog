// A source excerpt with provenance, never a generated answer or an instruction.
export function passageCitation(passage, indexUrl, locale = "zh-CN") {
  if (
    !/^\/(?:en\/|zh-TW\/)?(?:docs|blog)\/[^?]+$/.test(passage.href) ||
    !/^\/search\/(?:zh-CN|zh-TW|en)-[a-f0-9]{16}\.json$/.test(indexUrl) ||
    !/^[a-f0-9]{64}$/.test(passage.contentHash || "")
  )
    throw new Error("Invalid citation provenance");
  const source = new URL(passage.href, "https://huhohoo.com");
  if (source.origin !== "https://huhohoo.com")
    throw new Error("External citation source");
  const label =
    locale === "en"
      ? [
          "Source excerpt",
          "Section",
          "Source",
          "Index snapshot",
          "Excerpt SHA-256",
        ]
      : locale === "zh-TW"
        ? ["原文摘錄", "小節", "來源", "索引快照", "摘錄 SHA-256"]
        : ["原文摘录", "小节", "来源", "索引快照", "摘录 SHA-256"];
  return `${label[0]} · ${passage.title}\n${label[1]}: ${passage.heading || "—"}\n\n${passage.text
    .split(/\r?\n/)
    .map((line) => "> " + line)
    .join(
      "\n",
    )}\n\n${label[2]}: ${source.href}\n${label[3]}: https://huhohoo.com${indexUrl}\n${label[4]}: ${passage.contentHash}`;
}
