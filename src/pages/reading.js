import { uiLabel } from "@site/src/utils/ui-labels";
import LearningBackpack from "@lab/components/LearningBackpack";
import React, { useState } from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import papers from "@site/data/papers.json";
import tracks from "@site/data/learning-paths.json";
import { localizedNews } from "@site/src/utils/news-locale.mjs";
import ReadingActions, {
  useNewsReading,
} from "@site/src/components/ReadingActions";
import useLearningProgress from "@site/src/components/useLearningProgress";
import { useContent } from "@site/src/components/ContentUI";
import { useText } from "@lab/components/Shell";
import { useSite } from "@lab/runtime/context";
import {
  savedLearningEntries,
  compareReadingEntries,
} from "@lab/lib/reading-list.mjs";
const typeLabels = {
  all: ["全部", "All", "全部"],
  radar: ["外部资讯", "Signals", "外部資訊"],
  paper: ["论文", "Papers", "論文"],
  learning: ["学习文章", "Learning articles", "學習文章"],
  note: ["笔记", "Notes", "筆記"],
};
const stageLabels = {
  inbox: ["待阅读", "To read", "待閱讀"],
  reading: ["阅读中", "Reading", "閱讀中"],
  done: ["已读", "Read", "已讀"],
  all: ["全部", "All", "全部"],
};
export default function Reading() {
  const { locale, items: news } = useSite();
  const t = useText();
  const en = locale === "en",
    state = useNewsReading(),
    learning = useLearningProgress(),
    { entries } = useContent();
  const [status, setStatus] = useState("inbox"),
    [sort, setSort] = useState("newest"),
    [type, setType] = useState("all"),
    [topic, setTopic] = useState("all");
  const catalog = [
    ...news.map((i) => ({
      ...i,
      type: "radar",
      topic: i.category,
      href: "/radar#signal-" + i.id,
      ...localizedNews(i, locale),
    })),
    ...papers.map((p) => ({
      id: p.id,
      type: "paper",
      title: p.title,
      description: p[en ? "en" : locale === "zh-TW" ? "zhTw" : "zh"]?.question,
      href: "/papers#" + p.slug,
      topics: p.categories,
    })),
    ...entries
      .filter((e) => e.type === "note")
      .map((e) => ({
        ...e,
        title: en ? e.titleEn || e.title : e.title,
        topic: e.domain,
      })),
  ]
    .filter((e) => state.saved.includes(e.id))
    .map((e) => ({
      ...e,
      savedAt: state.savedAt[e.id],
      stage: state.read.includes(e.id)
        ? "done"
        : state.reading.includes(e.id)
          ? "reading"
          : "inbox",
    }));
  const plans = savedLearningEntries(tracks, entries, learning, locale);
  const rows = [...catalog, ...plans]
    .filter(
      (e) =>
        (status === "all" || e.stage === status) &&
        (type === "all" || e.type === type) &&
        (topic === "all" || e.topic === topic || e.topics?.includes(topic)),
    )
    .sort((a, b) => compareReadingEntries(a, b, sort, locale));
  return (
    <Layout
      title={t("阅读清单", "Reading list", "閱讀清單")}
      description={t(
        "知识与资讯的本地阅读清单。",
        "Your local reading inbox for knowledge and signals.",
        "知識與資訊的本機閱讀清單。",
      )}
    >
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("READING INBOX")}</p>
        <h1>
          {t(
            "把下一次阅读，留在这里。",
            "Keep the next question close.",
            "把下一次閱讀，留在這裡。",
          )}
        </h1>
        <p className="hh-lead">
          {t(
            "保存在当前浏览器。没有保存日期的收藏排在有日期的记录之后。",
            "Saved in this browser. Migrated entries without a save date follow dated entries.",
            "儲存在目前瀏覽器。沒有儲存日期的收藏排在有日期的紀錄之後。",
          )}
        </p>
        <div className="hh-controls">
          <label>
            {t("状态", "Status", "狀態")}{" "}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {["inbox", "reading", "done", "all"].map((s) => (
                <option key={s} value={s}>
                  {t(...stageLabels[s])}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("类型", "Type", "類型")}{" "}
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {["all", "radar", "paper", "learning", "note"].map((s) => (
                <option key={s} value={s}>
                  {t(...typeLabels[s])}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("主题", "Topic", "主題")}{" "}
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="all">{uiLabel("ALL")}</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.domain}>
                  {t(track.title, track.en, track.titleTw)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("排序", "Sort", "排序")}{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">
                {t("最近收藏", "Newest saved", "最近收藏")}
              </option>
              <option value="oldest">
                {t("最早收藏", "Oldest saved", "最早收藏")}
              </option>
              <option value="shortest">
                {t("阅读时长最短", "Shortest read", "閱讀時間最短")}
              </option>
            </select>
          </label>
        </div>
        <p className="hh-meta">
          {t(
            "没有阅读时长的内容排在有时长的内容之后。",
            "Entries without reading-time metadata follow timed entries.",
            "沒有閱讀時間的內容排在有時間的內容之後。",
          )}
        </p>
        <p role="status">
          {state.ready && learning.ready
            ? `${rows.length} ${t("条内容", "entries", "條內容")}`
            : t("正在读取…", "Loading…", "正在讀取…")}
        </p>
        {(state.error || learning.error) && (
          <p role="status">
            {t(
              "存储不可用，仅本次访问保留。",
              "Storage unavailable; this visit only.",
              "儲存不可用，僅於本次造訪保留。",
            )}
          </p>
        )}
        {state.ready && learning.ready && !rows.length && (
          <section className="hh-empty">
            <h2>
              {t(
                "当前筛选下没有收藏。",
                "Nothing in this view yet.",
                "目前篩選下沒有收藏。",
              )}
            </h2>
            <Link to="/radar">{t("AI 雷达", "AI Radar", "AI 雷達")} →</Link>
            {" · "}
            <Link to="/learning">
              {t("阅读路线", "Learning Path", "閱讀路線")} →
            </Link>
          </section>
        )}
        <ol className="hh-rows">
          {rows.map((e) => (
            <li key={e.id}>
              <div>
                <p className="hh-eyebrow">
                  {t(...typeLabels[e.type])} · {t(...stageLabels[e.stage])}
                  {e.planned ? " · " + uiLabel("PLANNED") : ""}
                </p>
                <h2>
                  <Link to={e.href}>{e.title}</Link>
                </h2>
                {e.description && <p>{e.description}</p>}
                {e.type === "learning" ? (
                  <div className="hh-controls">
                    <button
                      type="button"
                      onClick={() => learning.update(e.id, "saved")}
                    >
                      {t("取消想读", "Remove from saved", "取消想讀")}
                    </button>
                  </div>
                ) : (
                  <ReadingActions id={e.id} en={en} />
                )}
              </div>
            </li>
          ))}
        </ol>
        <details className="reading-backpack">
          <summary>
            {t(
              "最近阅读、便签与备份",
              "Recent reading, notes and backups",
              "最近閱讀、便箋與備份",
            )}
          </summary>
          <LearningBackpack />
        </details>
      </main>
    </Layout>
  );
}
