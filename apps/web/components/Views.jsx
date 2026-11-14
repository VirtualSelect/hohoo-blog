"use client";
import dynamic from "next/dynamic";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import Home from "./Home";
import TryIt from "./TryIt";
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
const BlogTimeMachine = dynamic(() => import("./BlogTimeMachine"));
const RetrievalDrawer = dynamic(() => import("./RetrievalDrawer"));
const StreamWindow = dynamic(() => import("./StreamWindow"));
const Weekly = dynamic(() => import("@site/src/components/RadarWeekly"));
const Daily = dynamic(() => import("@site/src/components/NewsDigest"));
const About = dynamic(() => import("./AboutPage"), { loading: PageLoading });
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
          {route === "docs/rag" && (
            <TryIt
              id="retrieval-exercise"
              title={t("检索与排序", "Retrieval and ranking", "檢索與排序")}
            >
              <RetrievalDrawer />
            </TryIt>
          )}
          {route === "docs/ai-apps" && (
            <>
              <TryIt
                id="retrieval-exercise"
                title={t("检索与排序", "Retrieval and ranking", "檢索與排序")}
              >
                <RetrievalDrawer />
              </TryIt>
              <TryIt
                id="stream-exercise"
                title={t("流式输出", "Streaming output", "串流輸出")}
              >
                <StreamWindow />
              </TryIt>
            </>
          )}
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
  if (entry)
    return (
      <Detail entry={entry}>
        {entry.id === "project:hohoo-blog" && (
          <BlogTimeMachine
            repo={entry.repo || "https://github.com/VirtualSelect/hohoo-blog"}
          />
        )}
      </Detail>
    );
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
