import React from "react";
import Link from "@lab/runtime/Link";
import papers from "@site/data/papers.json";
import { useText } from "@lab/components/Shell";

export default function TopicPapers({ category }) {
  const t = useText();
  const selected = papers.filter((p) => p.categories.includes(category));
  if (!selected.length) return null;
  return (
    <section>
      <h2>{t("论文阅读入口", "Paper reading guides", "論文閱讀入口")}</h2>
      <ul>
        {selected.map((p) => (
          <li key={p.id}>
            <Link to={"/papers#" + p.slug}>
              {p.short} ·{" "}
              {t(
                p.zh.question,
                p.en.question,
                p.zhTw?.question || p.zh.question,
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
