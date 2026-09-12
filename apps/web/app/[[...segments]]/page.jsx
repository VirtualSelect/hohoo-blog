import { notFound, permanentRedirect } from "next/navigation";
import {
  getContent,
  getMessages,
  resolveSegments,
  locales,
} from "../../lib/content";
import Shell from "../../components/Shell";
import Views from "../../components/Views";
const aliases = {
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
function read(segments) {
  const { locale, route } = resolveSegments(segments);
  return { locale, route, data: getContent(locale) };
}
export async function generateMetadata({ params }) {
  const { locale, route, data } = read((await params).segments);
  const entry = data.globalData["content-index"].entries.find(
    (e) => e.href === (locale === "zh-CN" ? "" : "/" + locale) + "/" + route,
  );
  const doc = data.documents.find((d) => d.route === route);
  const titles = {
    articles: ["文章", "Writing", "文章"],
    learning: ["学习路线", "Learning", "學習路線"],
    build: ["实践", "Build", "實作"],
    radar: ["AI 雷达", "AI Radar", "AI 雷達"],
    about: ["关于 Hohoo", "About Hohoo", "關於 Hohoo"],
    projects: ["项目", "Projects", "專案"],
    labs: ["实验", "Labs", "實驗"],
    notes: ["笔记", "Notes", "筆記"],
    papers: ["论文", "Papers", "論文"],
    reading: ["稍后读", "Saved reading", "稍後讀"],
    research: ["专题", "Topics", "專題"],
    timeline: ["学习活动", "Learning activity", "學習活動"],
    now: ["近况", "Now", "近況"],
    subscribe: ["RSS 订阅", "RSS subscriptions", "RSS 訂閱"],
    changelog: ["更新记录", "Changelog", "更新紀錄"],
    blog: ["随笔", "Journal", "隨筆"],
  };
  const title =
    doc?.metadata.title ||
    entry?.title ||
    titles[route]?.[locale === "en" ? 1 : locale === "zh-TW" ? 2 : 0] ||
    (route ? route : "Hohoo's AI Lab");
  const description =
    doc?.metadata.description ||
    entry?.description ||
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
    },
  };
}
export default async function Page({ params }) {
  const { locale, route, data } = read((await params).segments);
  if (aliases[route])
    permanentRedirect(
      (locale === "zh-CN" ? "" : "/" + locale) + "/" + aliases[route],
    );
  if (!data.routes.includes(route)) notFound();
  const document = data.documents.find((d) => d.route === route) || null;
  return (
    <Shell
      value={{
        locale,
        route,
        globalData: data.globalData,
        items: data.items,
        search: data.search,
        messages: getMessages(locale),
        document,
      }}
    >
      <Views />
    </Shell>
  );
}
