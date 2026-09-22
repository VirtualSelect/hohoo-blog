import React, { useState } from "react";
import Layout from "@lab/runtime/Layout";
import { useContent, ContentRows } from "@site/src/components/ContentUI";
import { useText } from "@lab/components/Shell";
export default function Notes() {
  const t = useText(),
    { entries } = useContent();
  const [query, setQuery] = useState("");
  const notes = entries.filter(
    (e) => e.type === "note" && e.translationStatus !== "MISSING",
  );
  const matches = notes.filter((n) =>
    [n.title, n.description, ...(n.aliases || [])]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <Layout
      title={t("知识笔记", "Notes", "知識筆記")}
      description={t(
        "从具体问题出发，理解概念、证据与边界。",
        "Understand concepts, evidence and limits through concrete questions.",
        "從具體問題出發，理解概念、證據與邊界。",
      )}
    >
      <main className="hh-page">
        <p className="hh-eyebrow">
          {t("知识 / 短笔记", "Knowledge / Notes", "知識 / 短筆記")}
        </p>
        <h1>
          {t(
            "把一个问题，弄明白。",
            "Understand one question at a time.",
            "把一個問題，弄明白。",
          )}
        </h1>
        <p className="hh-lead">
          {t(
            "从真实问题和明确来源出发。每篇解释一个概念，留下一条可以继续验证的路径。",
            "Each note starts from a concrete question and traceable sources, with a next step you can verify.",
            "從真實問題和明確來源出發。每篇解釋一個概念，留下一條可以繼續驗證的路徑。",
          )}
        </p>
        {!!notes.length && (
          <label>
            {t("搜索笔记", "Search notes", "搜尋筆記")}{" "}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}
        <ContentRows
          items={matches}
          empty={
            query
              ? t(
                  "没有匹配的笔记，请换个关键词。",
                  "No matching notes. Try another term.",
                  "沒有符合的筆記，請換個關鍵字。",
                )
              : t("暂无笔记。", "No notes yet.", "尚無筆記。")
          }
        />
      </main>
    </Layout>
  );
}
