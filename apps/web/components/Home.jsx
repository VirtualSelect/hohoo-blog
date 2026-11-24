"use client";
import Link from "../runtime/Link";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import { writingEntries } from "@site/src/utils/localization.cjs";
import { selectedHomeArticle } from "../lib/home-selection.mjs";
import ResearchPortal from "./ResearchPortal";
import useResearchTrack from "./useResearchTrack";
import SignalSculpture from "./SignalSculpture";
import ExhibitionIndex from "./ExhibitionIndex";
import { ResearchTerrain, DocumentFlow, ArticleSketch } from "./AtlasArtwork";
import tracks from "@site/data/learning-paths.json";
import { ClassicRecord } from "./HomeVariations";
import {
  PhotoIntroduction,
  KnowledgeRelations,
  ChapterTabs,
} from "./HomeConcepts";

export default function Home() {
  const { globalData } = useSite(),
    t = useText();
  const entries = globalData["content-index"].entries;
  const [domain, selectDomain] = useResearchTrack("llm");
  const activeTrack =
    tracks.find((track) => track.domain === domain) || tracks[0];
  const writing = writingEntries(entries);
  const featured = selectedHomeArticle(entries, domain);
  const recent = writing.slice(0, 3);
  const work = ["project", "lab"]
    .map((type) => entries.find((entry) => entry.type === type))
    .filter(Boolean);
  const introduction = t(
    "我是 Hohoo。记录 AI 学习、代码实验与真实项目。",
    "I’m Hohoo. Notes on learning AI, experiments in code, and real projects.",
    "我是 Hohoo。記錄 AI 學習、程式碼實驗與真實專案。",
  );
  const directions = tracks.map((track) => ({
    domain: track.domain,
    title: t(track.title, track.en, track.titleTw),
    description: t(...track.entryDescription),
    article: selectedHomeArticle(entries, track.domain),
  }));
  return (
    <main>
      <div className="atlas-home">
        <section className="atlas-hero" aria-labelledby="atlas-title">
          <div className="atlas-classic-masthead">
            <span>
              {t("Hohoo 的研究手记", "Hohoo’s field notes", "Hohoo 的研究手記")}
            </span>
            <span>
              {t(
                "代码 · 解释 · 证据",
                "CODE · EXPLANATION · EVIDENCE",
                "程式碼 · 解釋 · 證據",
              )}
            </span>
          </div>
          <ResearchTerrain />
          <div className="atlas-hero-inner">
            <header className="atlas-intro">
              <p className="atlas-eyebrow">
                LEARNING IN PUBLIC · BUILDING IN PUBLIC
              </p>
              <h1 id="atlas-title">
                <span className="atlas-title-default">
                  {t("探索未知，", "Explore the unknown.", "探索未知，")}
                  <wbr />
                  {t("", " ", "")}
                  {t("亲手构建。", "Build it yourself.", "親手構建。")}
                </span>
                <span className="atlas-title-classic">
                  {t("公开学习。", "Learn in public.", "公開學習。")}
                  <br />
                  {t(
                    "用代码回答问题。",
                    "Think through code.",
                    "用程式碼回答問題。",
                  )}
                </span>
                <span className="concept-title concept-title-garden">
                  {t("公开学习，", "Learn in public.", "公開學習，")}
                  <br />
                  {t("亲手构建。", "Build with curiosity.", "親手構建。")}
                </span>
                <span className="concept-title concept-title-photo">
                  {t(
                    "公开学习，亲手构建。",
                    "Learning, in a different light.",
                    "公開學習，親手構建。",
                  )}
                </span>
                <span className="concept-title concept-title-construct">
                  {t("公开学习，", "LEARN IN PUBLIC.", "公開學習，")}
                  <br />
                  {t("亲手构建。", "BUILD IT YOURSELF.", "親手構建。")}
                </span>
                <span className="concept-title concept-title-map">
                  {t("连接问题与理解", "Connected ideas", "連接問題與理解")}
                </span>
                <span className="concept-title concept-title-chapters">
                  {t(
                    "公开学习，亲手构建。",
                    "Learning, chapter by chapter.",
                    "公開學習，親手構建。",
                  )}
                </span>
              </h1>
              <p className="atlas-description">{introduction}</p>
              <div className="atlas-hero-actions">
                <Link className="atlas-start" to="/learning">
                  {t("开始学习", "Start learning", "開始學習")}{" "}
                  <span aria-hidden="true">↗</span>
                </Link>
                <Link to="/projects">
                  {t("查看项目", "View projects", "查看專案")}{" "}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className="atlas-classic-signature">
                <span aria-hidden="true">✦</span>
                <span>
                  {t(
                    "保留失败，追问原因。",
                    "Keep the failure. Ask why.",
                    "保留失敗，追問原因。",
                  )}
                </span>
                <Link to="/about">{t("关于我", "About me", "關於我")} →</Link>
              </div>
            </header>
            <div className="atlas-document-art">
              <DocumentFlow />
              <span>
                {t(
                  "从问题，到代码，再到证据。",
                  "From questions to code to evidence.",
                  "從問題，到程式碼，再到證據。",
                )}
              </span>
            </div>
            <ClassicRecord />
          </div>
          <div
            className="atlas-map-controls"
            role="group"
            aria-label={t(
              "按研究方向切换推荐",
              "Filter recommendations by research direction",
              "按研究方向切換推薦",
            )}
          >
            {tracks.map((track) => (
              <button
                key={track.id}
                className={"atlas-map-node atlas-map-" + track.domain}
                type="button"
                aria-pressed={domain === track.domain}
                aria-controls="atlas-feature"
                onClick={() => selectDomain(track.domain)}
              >
                <span className="atlas-node-dot" aria-hidden="true" />
                <span>{t(track.title, track.en, track.titleTw)}</span>
              </button>
            ))}
          </div>
          <p className="atlas-terrain-caption">
            {t(
              "研究方向示意",
              "A landscape of research directions",
              "研究方向示意",
            )}
          </p>
        </section>
        <ExhibitionIndex />
        <div className="atlas-dashboard" id="research-routes">
          <PhotoIntroduction description={introduction} />
          <ResearchPortal domain={domain} onSelect={selectDomain} />
          <KnowledgeRelations
            directions={directions}
            domain={domain}
            onSelect={selectDomain}
          />
          <section
            className="atlas-featured"
            id="atlas-feature"
            aria-labelledby="atlas-feature-heading"
          >
            <header className="atlas-section-heading">
              <h2 id="atlas-feature-heading">
                {t("方向推荐", "Recommended reading", "方向推薦")}
              </h2>
              <Link
                to={"/learning?track=" + domain}
                aria-label={`${t("看学习路线", "View learning path", "看學習路線")} · ${t(activeTrack.title, activeTrack.en, activeTrack.titleTw)}`}
              >
                {t("看学习路线", "View learning path", "看學習路線")} ↗
              </Link>
            </header>
            {featured ? (
              <article>
                <Link to={featured.href} aria-labelledby="atlas-feature-title">
                  <div className="atlas-feature-art">
                    <ArticleSketch domain={domain} />
                    <span className="atlas-sketch-caption">
                      {t("概念示意", "CONCEPT SKETCH", "概念示意")}
                    </span>
                    <span className="concept-photo-caption">
                      {t("装饰配图", "ILLUSTRATIVE IMAGE", "裝飾配圖")}
                    </span>
                  </div>
                  <p className="atlas-eyebrow">
                    {t(activeTrack.title, activeTrack.en, activeTrack.titleTw)}
                  </p>
                  <h3 id="atlas-feature-title">
                    {featured.title}
                    <span aria-hidden="true"> ↗</span>
                  </h3>
                  <p className="atlas-feature-description">
                    {featured.description}
                  </p>
                  <span className="atlas-feature-read" aria-hidden="true">
                    {t("展开阅读", "Read the article", "展開閱讀")} →
                  </span>
                </Link>
              </article>
            ) : (
              <p>
                {t(
                  "这个方向的记录正在整理中。",
                  "Notes for this direction are being prepared.",
                  "這個方向的記錄正在整理中。",
                )}
              </p>
            )}
          </section>
          <section
            className="atlas-recent"
            aria-labelledby="atlas-recent-heading"
          >
            <header className="atlas-section-heading">
              <h2 id="atlas-recent-heading">
                {t("最近写下", "Recent writing", "最近寫下")}
              </h2>
              <Link to="/articles">{t("全部", "All", "全部")} ↗</Link>
            </header>
            <ol>
              {recent.map((entry) => (
                <li key={entry.id}>
                  <Link to={entry.href}>
                    <span className="atlas-entry-icon" aria-hidden="true">
                      ↗
                    </span>
                    <div>
                      <h3>{entry.title}</h3>
                      <p>{entry.description}</p>
                      {entry.date && (
                        <time dateTime={entry.date}>{entry.date}</time>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
          <section
            className="atlas-projects"
            aria-labelledby="atlas-project-heading"
          >
            <header className="atlas-section-heading">
              <h2 id="atlas-project-heading">
                {t("项目与实验", "Projects & experiments", "專案與實驗")}
              </h2>
              <Link to="/projects">
                {t("查看项目", "View projects", "查看專案")} ↗
              </Link>
            </header>
            {work.length ? (
              work.map((entry) => (
                <Link className="atlas-project" to={entry.href} key={entry.id}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    aria-hidden="true"
                  >
                    <path
                      d={
                        entry.type === "lab"
                          ? "M9 3h6m-5 0v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M8 15h8"
                          : "M3 6h7l2 3h9v11H3Z"
                      }
                    />
                  </svg>
                  <div>
                    <span className="atlas-work-kind">
                      {entry.type === "lab"
                        ? t("实验", "Experiment", "實驗")
                        : t("项目", "Project", "專案")}
                    </span>
                    <h3>{entry.title}</h3>
                    <p>{entry.description}</p>
                  </div>
                  <span aria-hidden="true">→</span>
                </Link>
              ))
            ) : (
              <p>
                {t(
                  "项目与实验记录正在整理中。",
                  "Project and experiment records are being prepared.",
                  "專案與實驗記錄正在整理中。",
                )}
              </p>
            )}
            <Link className="atlas-workbench-link" to="/labs">
              {t("进入实验室", "Enter the lab", "進入實驗室")} ↗
            </Link>
          </section>
        </div>
        <ChapterTabs
          directions={directions}
          domain={domain}
          onSelect={selectDomain}
        />
        <aside
          className="atlas-radar-strip"
          aria-label={t("外部 AI 信号", "External AI signals", "外部 AI 訊號")}
        >
          <Link to="/radar">
            <span className="atlas-radar-icon" aria-hidden="true">
              ◉
            </span>
            <strong>
              {t("外部信号", "Outside signals", "外部訊號")}{" "}
              <small>AI RADAR</small>
            </strong>
            <span>
              {t(
                "阅读外部 AI 资讯，查看每条信号的出处。",
                "Read external AI news and follow each signal to its source.",
                "閱讀外部 AI 資訊，查看每條訊號的出處。",
              )}
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
      <SignalSculpture />
    </main>
  );
}
