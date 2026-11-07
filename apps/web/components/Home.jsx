"use client";
import Link from "../runtime/Link";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import { writingEntries } from "@site/src/utils/localization.cjs";
import VisitorStats from "./VisitorStats";
import ResearchPortal from "./ResearchPortal";
export default function Home() {
  const { globalData } = useSite(),
    t = useText();
  const entries = globalData["content-index"].entries;
  const latest = writingEntries(entries).slice(0, 2);
  return (
    <main className="home quiet-home">
      <ResearchPortal entries={entries} />
      <section className="quiet-recent" aria-labelledby="recent-writing">
        <header>
          <h2 id="recent-writing">
            {t("最近写下", "Recent writing", "最近寫下")}
          </h2>
          <Link to="/articles">
            {t("全部文章", "All writing", "全部文章")} →
          </Link>
        </header>
        <ol>
          {latest.map((entry) => (
            <li key={entry.id}>
              <Link to={entry.href}>
                {entry.title}
                <span aria-hidden="true">↗</span>
              </Link>
              <time dateTime={entry.date}>{entry.date}</time>
            </li>
          ))}
        </ol>
      </section>
      <details className="quiet-stats">
        <summary>{t("访客足迹", "Visitor statistics", "訪客足跡")}</summary>
        <VisitorStats />
      </details>
    </main>
  );
}
