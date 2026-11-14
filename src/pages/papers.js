import { PaperNotes } from "@site/src/components/PaperMetadata";
import { Freshness } from "@site/src/components/ContentProvenance";
import Heading from "@lab/runtime/Heading";
import React, { useState } from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useSite } from "@lab/runtime/context";
import { useText } from "@lab/components/Shell";
import papers from "@site/data/papers.json";
import ReadingActions from "@site/src/components/ReadingActions";
import styles from "./news.module.css";

// Keep this page's interface localized without changing the shared two-language
// metadata component or translating source summaries that have no stored version.
function PaperCardMetadata({ paper: p }) {
  const t = useText();
  return (
    <>
      <p className="hh-eyebrow">
        PAPER / {p.number} {p.version && " · " + p.version}
      </p>
      {(!!p.authors?.length || p.venue) && (
        <p className="hh-meta">
          {(p.authors || []).join(", ")}
          {p.venue && (p.authors?.length ? " · " : "") + p.venue}
        </p>
      )}
      <Freshness entry={p} />
      <p className="hh-meta">
        {t(
          "基于论文摘要的阅读导引",
          "ABSTRACT-BASED READING GUIDE",
          "基於論文摘要的閱讀導引",
        )}
      </p>
      {(p.code || p.projectPage) && (
        <p>
          {p.code && (
            <a href={p.code} target="_blank" rel="noopener noreferrer">
              {t("代码", "Code", "程式碼")} ↗
            </a>
          )}{" "}
          {p.projectPage && (
            <a href={p.projectPage} target="_blank" rel="noopener noreferrer">
              {t("项目主页", "Project", "專案首頁")} ↗
            </a>
          )}
        </p>
      )}
    </>
  );
}

export default function Papers() {
  const { locale } = useSite();
  const t = useText();
  const en = locale === "en";
  const tw = locale === "zh-TW";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const visible = papers.filter(
    (p) =>
      (category === "all" || p.categories.includes(category)) &&
      JSON.stringify([p.title, p.zh, p.en, p.zhTw])
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Layout
      title={t("论文阅读", "Papers", "論文閱讀")}
      description={t(
        "论文的研究问题、方法与证据边界。",
        "Paper questions, methods and evidence boundaries.",
        "論文的研究問題、方法與證據邊界。",
      )}
    >
      <main className={styles.page}>
        <p className={styles.eyebrow}>
          {t(
            "阅读 / 提问 / 复现",
            "READ / QUESTION / REPRODUCE",
            "閱讀 / 提問 / 重現",
          )}
        </p>
        <h1>
          {t("带着问题读论文。", "Read with a question.", "帶著問題讀論文。")}
        </h1>
        <p>
          {t(
            "围绕 AI 工程与具身智能精选基础论文。卡片基于所链接版本的摘要整理，是阅读入口，不是全文精读报告或个人实验结论。",
            "Foundational papers selected for AI engineering and embodied intelligence. These short guides are based on the linked abstracts; they are not full-paper reviews or personal experimental results.",
            "圍繞 AI 工程與具身智慧精選基礎論文。卡片基於所連結版本的摘要整理，是閱讀入口，不是全文精讀報告或個人實驗結論。",
          )}
        </p>
        {tw && (
          <p className="hh-meta">
            導讀優先顯示既有繁體欄位；其餘沿用本站已有簡體中文摘要內容。
          </p>
        )}
        <p>
          <Link to="/research">
            {t("← 研究总览", "← Research", "← 研究總覽")}
          </Link>
          {" · "}
          <Link to="/reading">{t("稍后读", "Saved reading", "稍後讀")}</Link>
        </p>
        <div className={styles.filters}>
          <label>
            {t("研究方向", "Topic", "研究方向")}
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">{t("全部", "All", "全部")}</option>
              <option value="ai-apps">
                {t("AI 应用开发", "AI applications", "AI 應用開發")}
              </option>
              <option value="llm">LLM</option>
              <option value="rag">RAG</option>
              <option value="embodied-ai">
                {t("具身智能", "Embodied AI", "具身智慧")}
              </option>
            </select>
          </label>
          <label>
            {t("搜索", "Search", "搜尋")}
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(
                "RAG、动作、检索…",
                "RAG, actions, retrieval…",
                "RAG、動作、檢索…",
              )}
            />
          </label>
        </div>
        <p role="status">
          {visible.length} {t("篇论文", "papers", "篇論文")}
        </p>
        {!visible.length && (
          <div>
            <p>
              {t(
                "没有匹配的论文。试试其他关键词或研究方向。",
                "No matching papers. Try another term or topic.",
                "沒有符合的論文。試試其他關鍵字或研究方向。",
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              {t("清除筛选", "Clear filters", "清除篩選")}
            </button>
          </div>
        )}
        <div className={styles.list}>
          {visible.map((p) => {
            const c = en ? p.en : tw ? { ...p.zh, ...p.zhTw } : p.zh;
            return (
              <article key={p.id} className={styles.card}>
                <PaperCardMetadata paper={p} />
                <small>
                  {p.short} · {p.year} ·{" "}
                  {t("摘要导读", "Abstract guide", "摘要導讀")}
                </small>
                <Heading as="h2" id={p.slug}>
                  {p.title}
                </Heading>
                <h3>{c.question}</h3>
                <dl>
                  {[
                    ["method", t("论文方法", "Method", "論文方法")],
                    ["boundary", t("阅读边界", "Reading boundary", "閱讀邊界")],
                  ].map(([key, label]) => (
                    <React.Fragment key={key}>
                      <dt>
                        <strong>{label}</strong>
                      </dt>
                      <dd>{c[key]}</dd>
                    </React.Fragment>
                  ))}
                </dl>
                <details>
                  <summary>
                    {t(
                      "展开阅读追问",
                      "Questions to investigate",
                      "展開閱讀追問",
                    )}
                  </summary>
                  <p>{c.prompt}</p>
                </details>
                <p>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    {t(
                      "查看原始摘要与论文 ↗",
                      "Source abstract and paper ↗",
                      "查看原始摘要與論文 ↗",
                    )}
                  </a>
                  {" · "}
                  <Link
                    to={
                      p.project === "action-representation"
                        ? "/learning?track=embodied-ai#plans-embodied-ai"
                        : "/labs/" + p.project
                    }
                  >
                    {t(
                      "关联实验计划 →",
                      "Planned experiment →",
                      "關聯實驗計畫 →",
                    )}
                  </Link>
                </p>
                <PaperNotes paper={p} />
                <ReadingActions id={p.id} en={en} />
              </article>
            );
          })}
        </div>
      </main>
    </Layout>
  );
}
