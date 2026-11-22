import { notFound, permanentRedirect } from "next/navigation";
import {
  getContent,
  getMessages,
  resolveSegments,
  locales,
  toClientDocument,
} from "../../lib/content";
import Shell from "../../components/Shell";
import RouteContent from "../../components/RouteContent";
import AboutPage from "../../components/AboutPage";
import Journey from "../../components/Journey";
import VirtualLab from "../../components/VirtualLab";
import type { Metadata } from "next";
import { brandShareImage } from "../../lib/brand";
import {
  pageGlobalData,
  pageSignals,
  clientMessages,
} from "../../lib/client-content";
type RouteProps = { params: Promise<{ segments?: string[] }> };
const aliases: Record<string, string | undefined> = {
  aboutMe: "about",
  news: "radar",
  lab: "labs",
  "news/weekly": "radar/weekly",
  "blog/a new milestone": "blog/a-new-milestone",
};
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    [...getContent(locale).routes, ...Object.keys(aliases)].map((route) => ({
      segments: [
        ...(locale === "zh-CN" ? [] : [locale]),
        ...route.split("/").filter(Boolean),
      ],
    })),
  );
}
function read(segments?: string[]) {
  const { locale, route } = resolveSegments(segments);
  return { locale, route, data: getContent(locale) };
}
export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { locale, route, data } = read((await params).segments);
  const entry = data.globalData["content-index"].entries.find(
    (e) => e.href === (locale === "zh-CN" ? "" : "/" + locale) + "/" + route,
  );
  const doc = data.documents.find((d) => d.route === route);
  const titles: Record<string, string[]> = {
    articles: ["文章", "Writing", "文章"],
    journey: Array(3).fill(
      getMessages(locale)["journey.title"]?.message || "AI Journey",
    ),
    "journey/virtual-lab": Array(3).fill(
      getMessages(locale)["journey.virtual.title"]?.message || "Virtual Lab",
    ),
    learning: ["学习路线", "Learning", "學習路線"],
    build: ["实践", "Build", "實作"],
    radar: ["AI 雷达", "AI Radar", "AI 雷達"],
    about: ["关于 Hohoo", "About Hohoo", "關於 Hohoo"],
    projects: ["项目", "Projects", "專案"],
    labs: ["实验", "Labs", "實驗"],
    notes: ["知识与阅读", "Knowledge and reading", "知識與閱讀"],
    papers: ["论文", "Papers", "論文"],
    reading: ["阅读清单", "Reading list", "閱讀清單"],
    research: ["学习路线", "Learning paths", "學習路線"],
    timeline: ["学习活动", "Learning activity", "學習活動"],
    now: ["近况", "Now", "近況"],
    subscribe: ["RSS 订阅", "RSS subscriptions", "RSS 訂閱"],
    changelog: ["站点演进", "Site evolution", "網站演進"],
    blog: ["随笔", "Journal", "隨筆"],
  };
  const title =
    doc?.metadata.title ||
    entry?.title ||
    titles[route]?.[locale === "en" ? 1 : locale === "zh-TW" ? 2 : 0] ||
    (route ? route : "Hohoo's AI Lab");
  const descriptions: Record<string, [string, string, string]> = {
    notes: [
      "查阅学习路线、论文导引和本站的短笔记。",
      "Browse learning paths, paper guides and short notes from the site.",
      "查閱學習路線、論文導讀和本站的短筆記。",
    ],
    timeline: [
      "按日期回看已发布的文章、笔记、实验、项目与周汇总。",
      "Browse published articles, notes, experiments, projects, and weekly digests by date.",
      "按日期回顧已發表的文章、筆記、實驗、專案與每週彙整。",
    ],
  };
  const description =
    (route === "journey/virtual-lab"
      ? getMessages(locale)["journey.virtual.intro"]?.message
      : null) ||
    (route === "journey"
      ? getMessages(locale)["journey.intro"]?.message
      : null) ||
    doc?.metadata.description ||
    entry?.description ||
    descriptions[route]?.[locale === "en" ? 1 : locale === "zh-TW" ? 2 : 0] ||
    (locale === "en"
      ? "Learning, experimenting and building, from Java to AI."
      : "从 Java 到 AI，公开学习、实验与构建。");
  const url = (locale === "zh-CN" ? "" : "/" + locale) + "/" + route;
  const untranslated = doc?.sourceFallback && !doc.frontMatter.landing;
  const availableLocales = locales.filter((l) => {
    const other = getContent(l).documents.find((d) => d.route === route);
    return !other || !other.sourceFallback || other.frontMatter.landing;
  });
  return {
    title,
    description,
    alternates: {
      canonical: untranslated ? "/" + route : url,
      languages: Object.fromEntries(
        availableLocales.map((l) => [
          l,
          (l === "zh-CN" ? "" : "/" + l) + "/" + route,
        ]),
      ),
    },
    ...(untranslated ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url,
      locale,
      type: doc ? "article" : "website",
      siteName: "Hohoo's AI Lab",
      images: [brandShareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [brandShareImage.url],
    },
  };
}
export default async function Page({ params }: RouteProps) {
  const { locale, route, data } = read((await params).segments);
  if (aliases[route])
    permanentRedirect(
      (locale === "zh-CN" ? "" : "/" + locale) + "/" + aliases[route],
    );
  if (!data.routes.includes(route)) notFound();
  const document = data.documents.find((d) => d.route === route) || null;
  const items = pageSignals(
    route.startsWith("news/daily/") ||
      route === "reading" ||
      /^docs\/(ai-apps|llm|embodied-ai)$/.test(route)
      ? data.dailyItems
      : data.items,
    route,
  );
  return (
    <Shell
      value={{
        locale,
        route,
        globalData: pageGlobalData(
          data.globalData,
          locale,
          route,
          document,
          route === "radar" ? data.items : items,
        ),
        items,
        searchUrl: data.searchUrl,
        sectionSearchUrl: data.sectionSearchUrl,
        radarArchive: ["radar", "radar/weekly"].includes(route)
          ? data.radarArchive
          : null,
        messages: clientMessages(getMessages(locale), route),
        document: document ? toClientDocument(document) : null,
      }}
    >
      {document &&
      !document.frontMatter.landing &&
      ["docs", "blog"].includes(document.kind) ? (
        <RouteContent kind="document">
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: document.html }}
          />
        </RouteContent>
      ) : route === "about" ? (
        <AboutPage />
      ) : route === "journey" ? (
        <Journey locale={locale} />
      ) : route === "journey/virtual-lab" ? (
        <VirtualLab locale={locale} />
      ) : (
        <RouteContent kind="views" />
      )}
    </Shell>
  );
}
