"use client";
import Link from "../runtime/Link";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import current from "@site/data/current.json";
import { writingEntries } from "@site/src/utils/localization.cjs";
import { Status } from "@site/src/components/ContentUI";

export default function Home() {
  const { locale, globalData, items } = useSite(),
    t = useText();
  const entries = globalData["content-index"].entries;
  const latest = writingEntries(entries).slice(0, 4),
    projects = entries.filter((e) => e.type === "project").slice(0, 2);
  return (
    <main className="home">
      <section className="home-hero">
        <div>
          <p className="eyebrow">
            <span className="live-dot" />{" "}
            {t(
              "探索 AI，也记录每一步",
              "Exploring AI. Recording the journey.",
              "探索 AI，也記錄每一步",
            )}
          </p>
          <h1>
            {t("你好，我是", "Hello, I’m", "你好，我是")}
            <br />
            <span>Hohoo.</span>
          </h1>
          <p className="hero-description">
            {t(
              "从模型出发，向真实世界。",
              "From models to the real world.",
              "從模型出發，向真實世界。",
            )}
          </p>
          <div className="hero-links">
            <Link className="primary-link" to="/articles">
              {t("开始阅读", "Start reading", "開始閱讀")} ↗
            </Link>
            <Link to="/about">
              {t("认识一下我", "Meet Hohoo", "認識一下我")} →
            </Link>
          </div>
        </div>
        <aside className="current-panel">
          <div className="section-top">
            <span className="eyebrow">
              {t("最近在做", "Currently", "最近在做")}
            </span>
            <small>{current.updated}</small>
          </div>
          {current.items
            .filter((i) =>
              ["BUILDING", "LEARNING", "EXPLORING"].includes(i.kind),
            )
            .map((i, index) => (
              <Link key={i.kind} to={i.to}>
                <span className="current-number">0{index + 1}</span>
                <div>
                  <small>
                    {
                      [
                        t("构建", "Building", "構建"),
                        t("学习", "Learning", "學習"),
                        t("探索", "Exploring", "探索"),
                      ][index]
                    }
                  </small>
                  <p>
                    {locale === "en" ? i.en : locale === "zh-TW" ? i.tw : i.zh}
                  </p>
                </div>
                <span>↗</span>
              </Link>
            ))}
          <p className="panel-note">
            {t(
              "持续记录真实的问题、实验与进展。",
              "A living record of questions, experiments and progress.",
              "持續記錄真實的問題、實驗與進展。",
            )}
          </p>
        </aside>
      </section>
      <section className="home-section">
        <div className="section-top">
          <div>
            <p className="eyebrow">01 / {t("文字", "Writing", "文字")}</p>
            <h2>{t("最近写下的", "Latest writing", "最近寫下的")}</h2>
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
                  {e.type === "doc"
                    ? t("AI 应用开发", "AI Applications", "AI 應用開發")
                    : t("随笔", "Journal", "隨筆")}
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
      <section className="home-section">
        <div className="section-top">
          <div>
            <p className="eyebrow">02 / {t("作品", "Builds", "作品")}</p>
            <h2>{t("把想法做出来", "Ideas, made tangible", "把想法做出來")}</h2>
          </div>
          <Link to="/build">{t("全部实践", "All builds", "全部實作")} →</Link>
        </div>
        <div className="build-grid">
          {projects.map((p, i) => (
            <article className="build-feature" key={p.id}>
              <div className="build-visual" aria-hidden="true">
                <span>{i === 0 ? "Hohoo." : "{ Java → AI }"}</span>
                <div className="visual-path">
                  {i === 0
                    ? "Discover → Learn → Build"
                    : "HTTP → JSON → Conversation"}
                </div>
              </div>
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
              <small>{p.stack?.join(" · ")}</small>
            </article>
          ))}
        </div>
      </section>
      <section className="home-section tracks-section">
        <div>
          <p className="eyebrow">
            03 / {t("学习方向", "Learning tracks", "學習方向")}
          </p>
          <h2>
            {t(
              "沿着三个方向，深入一点。",
              "Three directions. Deeper understanding.",
              "沿著三個方向，深入一點。",
            )}
          </h2>
        </div>
        <div className="track-list">
          {[
            [
              "ai-apps",
              t("构建", "Build", "構建"),
              t("AI 应用开发", "AI Applications", "AI 應用開發"),
            ],
            ["llm", t("理解", "Understand", "理解"), "LLM"],
            [
              "embodied-ai",
              t("探索", "Explore", "探索"),
              t("具身智能", "Embodied AI", "具身智慧"),
            ],
          ].map(([id, verb, title], i) => (
            <Link key={id} to={"/docs/" + id}>
              <small>
                0{i + 1} / {verb}
              </small>
              <h3>{title}</h3>
              <span>↗</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="home-section radar-home">
        <div className="section-top">
          <div>
            <p className="eyebrow">
              04 / {t("外部信号", "External signals", "外部訊號")}
            </p>
            <h2>{t("AI 雷达", "AI Radar", "AI 雷達")}</h2>
          </div>
          <Link to="/radar">
            {t("查看雷达", "Explore Radar", "查看雷達")} →
          </Link>
        </div>
        {items.slice(0, 3).map((i) => (
          <article key={i.id}>
            <time>{i.publishedAt.slice(0, 10)}</time>
            <div>
              <a href={i.url}>
                <h3>{i.title} ↗</h3>
              </a>
              <p>{i.summary}</p>
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
    </main>
  );
}
