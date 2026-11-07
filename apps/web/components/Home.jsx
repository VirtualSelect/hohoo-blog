"use client";
import { radarDay, radarDateTime } from "@site/src/utils/radar-date.mjs";

import Link from "../runtime/Link";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import { writingEntries } from "@site/src/utils/localization.cjs";
import { Status } from "@site/src/components/ContentUI";
import VisitorStats from "./VisitorStats";
import ProjectShowcase from "./ProjectShowcase";
import QuestionStudio from "./QuestionStudio";
import editorial from "@site/data/editorial.json";
import topics from "@site/data/topics";
import WritingKind from "@site/src/components/WritingKind";

export default function Home() {
  const { globalData, items } = useSite(),
    t = useText();
  const entries = globalData["content-index"].entries;
  const latest = writingEntries(entries).slice(0, 3),
    projects = editorial.featuredProjects
      .map((id) => entries.find((e) => e.id === id))
      .filter(Boolean);
  return (
    <main className="home editorial-home">
      <QuestionStudio />
      <nav
        className="home-reading-directions"
        aria-label={t("选择阅读方向", "Choose a reading path", "選擇閱讀方向")}
      >
        <p>
          {t(
            "从一个问题，走进一条主线。",
            "One question opens a reading path.",
            "從一個問題，走進一條主線。",
          )}
        </p>
        <div>
          {topics.map((topic, i) => (
            <Link key={topic.id} to={"/learning#track-" + topic.id}>
              <span>0{i + 1}</span>
              <strong>{t(topic.title, topic.en, topic.titleTw)}</strong>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </nav>
      <section className="home-section">
        <div className="section-top">
          <div>
            <p className="eyebrow">01 / {t("作品", "Builds", "作品")}</p>
            <h2>{t("把想法做出来", "Ideas, made tangible", "把想法做出來")}</h2>
          </div>
          <Link to="/build">{t("全部实践", "All builds", "全部實作")} →</Link>
        </div>
        <div className="build-grid">
          {projects.map((p) => (
            <article className="build-feature" key={p.id}>
              <div
                className="project-schematic"
                data-tone={p.href.endsWith("/hohoo-blog") ? "lavender" : "blue"}
              >
                <p className="eyebrow">
                  {t(
                    "项目结构 / 简图",
                    "Project structure / Schematic",
                    "專案結構 / 簡圖",
                  )}
                </p>
                <span className="project-wordmark">
                  {p.domain === "embodied-ai"
                    ? "MuJoCo → " + t("行动", "Action", "行動")
                    : "Java → AI"}
                </span>
                <ol>
                  {(p.domain === "embodied-ai"
                    ? [
                        t("接触抓取", "Contact", "接觸抓取"),
                        t("偏移对照", "Compare offsets", "偏移對照"),
                        t("轨迹复核", "Audit trajectories", "軌跡複核"),
                      ]
                    : [
                        t("发送请求", "Request", "傳送請求"),
                        t("解析响应", "Parse", "解析回應"),
                        t("输出验收", "Validate output", "輸出驗證"),
                      ]
                  ).map((label, i) => (
                    <li key={label}>
                      <span>0{i + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>
              </div>
              <ProjectShowcase id={p.id} />
              <div className="section-top">
                <small>
                  {t("项目", "Project", "專案")} / {p.number}
                </small>
                <Status value={p.status} />
              </div>
              <h3>
                <Link to={p.href}>{p.title} ↗</Link>
              </h3>
              <p>{p.description}</p>
              {p.id === "project:hohoo-ai-lab" && (
                <p>
                  <Link to="/projects/hohoo-ai-lab#conversation-workbench">
                    {t(
                      "进入对话记忆实验室 →",
                      "Explore conversation memory →",
                      "進入對話記憶實驗室 →",
                    )}
                  </Link>
                </p>
              )}
              <small>{p.stack?.join(" · ")}</small>
            </article>
          ))}
        </div>
      </section>
      {latest.length > 0 && (
        <section className="home-section">
          <div className="section-top">
            <div>
              <p className="eyebrow">02 / {t("文字", "Writing", "文字")}</p>
              <h2>{t("近期文章", "Recent writing", "近期文章")}</h2>
            </div>
            <Link to="/articles">
              {t("全部文章", "All writing", "全部文章")} →
            </Link>
          </div>
          <div className="writing-list">
            {latest.map((e, i) => (
              <Link className="writing-row" key={e.id} to={e.href}>
                <span className="row-number">0{i + 1}</span>
                <div>
                  <small>
                    <WritingKind entry={e} />
                  </small>
                  <h3>{e.title}</h3>
                  <p>{e.description}</p>
                </div>
                <div className="row-meta">
                  <time>{e.date}</time>
                  {e.minutes && (
                    <small>
                      {e.minutes} {t("分钟", "min", "分鐘")}
                    </small>
                  )}
                  <span>↗</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="home-section radar-home">
        <div className="section-top">
          <div>
            <p className="eyebrow">
              03 / {t("外部信号", "External signals", "外部訊號")}
            </p>
            <h2>{t("AI 雷达", "AI Radar", "AI 雷達")}</h2>
          </div>
          <Link to="/radar">
            {t("查看雷达", "Explore Radar", "查看雷達")} →
          </Link>
        </div>
        {items.slice(0, 2).map((i) => (
          <article key={i.id}>
            <time
              dateTime={i.publishedAt}
              title={radarDateTime(i.publishedAt) + " UTC+8"}
            >
              {radarDay(i.publishedAt)}
            </time>
            <div>
              <a href={i.url}>
                <h3>{i.title} ↗</h3>
              </a>
              <small>
                {i.sourceName} ·{" "}
                {t(
                  "来源摘录 / 外部资讯",
                  "Source excerpt / External coverage",
                  "來源摘錄 / 外部資訊",
                )}
              </small>
            </div>
          </article>
        ))}
      </section>
      <nav
        className="home-secondary-links"
        aria-label={t("更多", "More", "更多")}
      >
        <Link to="/now">
          {t("最近在做什么", "What I’m working on", "最近在做什麼")} →
        </Link>
        <Link to="/reading">
          {t("我的阅读清单", "My reading list", "我的閱讀清單")} →
        </Link>
        <Link to="/subscribe">
          {t("通过 RSS 订阅", "Subscribe by RSS", "透過 RSS 訂閱")} →
        </Link>
      </nav>
      <details className="home-discovery">
        <summary>{t("访客足迹", "Visitor statistics", "訪客足跡")}</summary>
        <VisitorStats />
      </details>
    </main>
  );
}
