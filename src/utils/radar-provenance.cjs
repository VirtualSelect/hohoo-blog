// publishedAt remains the source feed's timestamp; never infer an original event date.
function publicationFacts(item, locale = "zh-CN") {
  const index = locale === "en" ? 1 : locale === "zh-TW" ? 2 : 0;
  const t = (values) => values[index];
  const original = item.originalPublication;
  const aggregator =
    item.sourceType === "aggregator" || item.sourceId === "aihot";
  return [
    ...(original || aggregator
      ? [
          {
            label: t(["原公告", "Original announcement", "原公告"]),
            value:
              original?.date ||
              t(["日期未核实", "Date unverified", "日期未核實"]),
            href: original?.sourceUrl,
          },
        ]
      : []),
    {
      label: aggregator
        ? t(["聚合源发布", "Aggregator publication", "聚合源發布"])
        : t(["来源发布", "Source publication", "來源發布"]),
      value: item.publishedAt,
    },
    {
      label: t(["本站收录", "Collected here", "本站收錄"]),
      value: item.collectedAt,
    },
  ];
}
module.exports = { publicationFacts };
