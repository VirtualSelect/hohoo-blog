"use client";
import dynamic from "next/dynamic";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import Home from "./Home";
import ProfileCard from "./ProfileCard";
import CurrentFocus from "@site/src/components/CurrentFocus";
import { ContentRows } from "@site/src/components/ContentUI";
import { isoWeek } from "@site/src/utils/radar.cjs";
const Document = dynamic(() => import("./Document"), { loading: PageLoading });
const Radar = dynamic(() => import("./Radar"), { loading: PageLoading });
function PageLoading() {
  const t = useText();
  return (
    <p className="hh-page" role="status">
      {t("正在打开内容…", "Opening content…", "正在開啟內容…")}
    </p>
  );
}
const pages = {
  articles: dynamic(() => import("@site/src/pages/articles")),
  learning: dynamic(() => import("@site/src/pages/learning")),
  build: dynamic(() => import("@site/src/pages/build")),
  projects: dynamic(() => import("@site/src/pages/projects")),
  labs: dynamic(() => import("@site/src/pages/labs")),
  notes: dynamic(() => import("@site/src/pages/notes")),
  papers: dynamic(() => import("@site/src/pages/papers")),
  reading: dynamic(() => import("@site/src/pages/reading")),
  research: dynamic(() => import("@site/src/pages/research")),
  timeline: dynamic(() => import("@site/src/pages/timeline")),
  now: dynamic(() => import("@site/src/pages/now")),
  subscribe: dynamic(() => import("@site/src/pages/subscribe")),
  changelog: dynamic(() => import("@site/src/pages/changelog")),
  "radar/weekly": dynamic(() => import("@site/src/pages/radar/weekly")),
};
const Detail = dynamic(() => import("@site/src/components/ContentDetail"));
const Topic = dynamic(() => import("@site/src/components/TopicLanding"));
const Weekly = dynamic(() => import("@site/src/components/RadarWeekly"));
const Daily = dynamic(() => import("@site/src/components/NewsDigest"));
const AstraParticleHero = dynamic(
  () => import("@site/src/components/AstraParticleHero"),
);
function About() {
  const t = useText(),
    { globalData, locale } = useSite();
  return (
    <main>
      <AstraParticleHero en={locale === "en"} />
      <div id="about-content" className="hh-page about-page">
        <div className="about-intro-grid">
          <header className="page-intro">
            <p className="eyebrow">Hohoo / {t("关于我", "About", "關於我")}</p>
            <h2>
              {t("保持好奇，", "Stay curious.", "保持好奇，")}
              <br />
              {t("也动手去做。", "Keep building.", "也動手去做。")}
            </h2>
            <p>
              {t(
                "平时主要写 Java，喜欢把感兴趣的想法做出来。最近把更多注意力放在 AI 应用，也开始读大语言模型与具身智能的资料。",
                "I usually write Java and enjoy turning ideas into small projects. I’m exploring AI applications, language models and embodied intelligence.",
                "平時主要寫 Java，喜歡把感興趣的想法做出來。最近把更多注意力放在 AI 應用，也開始讀大語言模型與具身智慧的資料。",
              )}
            </p>
          </header>
          <ProfileCard />
        </div>
        <CurrentFocus />
        <section className="hh-section">
          <h2>{t("我怎样学习与构建", "How I work", "我怎樣學習與構建")}</h2>
          <p>
            {t(
              "遇到问题 → 查阅资料 → 小步实验 → 做成作品 → 写下经验。",
              "Ask a question → Read → Experiment → Build → Write.",
              "遇到問題 → 查閱資料 → 小步實驗 → 做成作品 → 寫下經驗。",
            )}
          </p>
          <p>
            {t(
              "这里记录查过的资料和验证过的方法，也保留暂时没有答案的问题。",
              "This site records sources, tested methods and questions that remain open.",
              "這裡記錄查過的資料和驗證過的方法，也保留暫時沒有答案的問題。",
            )}
          </p>
        </section>
        <section className="hh-section">
          <h2>{t("可以查看的作品", "Selected builds", "可以查看的作品")}</h2>
          <ContentRows
            items={globalData["content-index"].entries.filter(
              (e) => e.type === "project",
            )}
          />
        </section>
        <section className="hh-section">
          <h2>{t("在其他地方", "Elsewhere", "在其他地方")}</h2>
          <div className="inline-links">
            <a href="https://github.com/VirtualSelect">GitHub ↗</a>
            <a href="https://x.com/HuHohoo1997">X ↗</a>
            <Link to="/subscribe">RSS ↗</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
export default function Views() {
  const { route, document, globalData, items, locale } = useSite(),
    t = useText();
  if (!route) return <Home />;
  if (route === "about") return <About />;
  if (route === "radar") return <Radar />;
  if (document) {
    if (document.kind === "news/daily")
      return (
        <main className="hh-page">
          <h1>{document.metadata.title}</h1>
          <Daily day={route.split("/").pop()} />
        </main>
      );
    if (document.frontMatter.landing)
      return (
        <main className="hh-page">
          <h1>{document.metadata.title}</h1>
          <Topic category={route.split("/")[1]} />
        </main>
      );
    return <Document />;
  }
  if (pages[route]) {
    const Page = pages[route];
    return <Page />;
  }
  const entry = globalData["content-index"].entries.find(
    (e) => e.href === (locale === "zh-CN" ? "" : "/" + locale) + "/" + route,
  );
  if (entry) return <Detail entry={entry} />;
  if (route.startsWith("radar/weekly/"))
    return (
      <Weekly
        digest={{
          week: route.split("/").pop(),
          items: items.filter(
            (i) => isoWeek(i.publishedAt) === route.split("/").pop(),
          ),
        }}
      />
    );
  if (route.startsWith("blog")) {
    const blogs = globalData["content-index"].entries.filter(
      (e) => e.type === "blog" && e.translationStatus !== "MISSING",
    );
    return (
      <main className="hh-page">
        <p className="eyebrow">Hohoo / {t("随笔", "Journal", "隨筆")}</p>
        <h1>
          {route.includes("tags")
            ? t("文章标签", "Tags", "文章標籤")
            : route.includes("archive")
              ? t("文章归档", "Archive", "文章歸檔")
              : t(
                  "技术之外，也记录自己。",
                  "Notes on the journey.",
                  "技術之外，也記錄自己。",
                )}
        </h1>
        <div className="inline-links">
          <Link to="/blog">{t("随笔", "Journal", "隨筆")}</Link>
          <Link to="/blog/archive">{t("归档", "Archive", "歸檔")}</Link>
          <Link to="/blog/tags/blog">blog</Link>
        </div>
        <ContentRows items={blogs} />
      </main>
    );
  }
  return null;
}
