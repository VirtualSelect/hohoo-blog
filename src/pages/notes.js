import React, { useState } from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useContent, ContentRows } from "@site/src/components/ContentUI";
import { useText } from "@lab/components/Shell";
import styles from "./notes.module.css";

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
      title={t("知识与阅读", "Knowledge and reading", "知識與閱讀")}
      description={t(
        "查阅学习路线、论文导引和本站的短笔记。",
        "Browse learning paths, paper guides and short notes from the site.",
        "查閱學習路線、論文導讀和本站的短筆記。",
      )}
    >
      <main className="hh-page">
        <h1>{t("知识与阅读", "Knowledge and reading", "知識與閱讀")}</h1>
        <p className="hh-lead">
          {t(
            "按研究方向学习概念，或从论文和出处着手阅读。",
            "Learn a concept along a research path, or start with the papers and their sources.",
            "按研究方向學習概念，或從論文和出處著手閱讀。",
          )}
        </p>
        <nav
          className={styles.entries}
          aria-label={t("知识入口", "Knowledge links", "知識入口")}
        >
          <Link to="/papers">
            <strong>{t("论文阅读", "Paper guides", "論文閱讀")}</strong>
            <span aria-hidden="true">↗</span>
            <p>
              {t(
                "从摘要导引出发，了解研究问题，并回到所引论文。",
                "Use the abstract-based guides to identify the research question and find the original paper.",
                "從摘要導讀出發，了解研究問題，並回到所引論文。",
              )}
            </p>
          </Link>
          <Link to="/learning">
            <strong>{t("学习路线", "Learning paths", "學習路線")}</strong>
            <span aria-hidden="true">↗</span>
            <p>
              {t(
                "按方向查看前置知识、教程和对应实验。",
                "Find prerequisites, tutorials, and experiments by topic.",
                "按方向查看先備知識、教學和對應實驗。",
              )}
            </p>
          </Link>
        </nav>
        <section className={styles.notes} aria-labelledby="short-notes-title">
          <h2 id="short-notes-title">{t("短笔记", "Short notes", "短筆記")}</h2>
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
          {matches.length ? (
            <ContentRows items={matches} />
          ) : (
            <p className="hh-empty" role={notes.length ? "status" : undefined}>
              {query.trim()
                ? t(
                    "没有匹配的笔记，请换个关键词。",
                    "No matching notes. Try another term.",
                    "沒有符合的筆記，請換個關鍵字。",
                  )
                : t(
                    "本站暂未发布短笔记。",
                    "No short notes have been published yet.",
                    "本站暫未發表短筆記。",
                  )}
            </p>
          )}
        </section>
      </main>
    </Layout>
  );
}
