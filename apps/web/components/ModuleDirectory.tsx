"use client";

import Link from "../runtime/Link";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import tracks from "@site/data/learning-paths.json";

// A single directory of existing destinations; theme layouts decide how it is shown.
export default function ModuleDirectory() {
  const { route } = useSite();
  const t = useText();
  const group = ["learning", "research", "timeline"].includes(route)
    ? "learn"
    : ["articles", "blog"].includes(route)
      ? "writing"
      : ["build", "projects", "labs"].includes(route)
        ? "build"
        : ["notes", "papers", "reading"].includes(route)
          ? "knowledge"
          : null;
  if (!group) return null;
  const destinations: Record<string, [string, string][]> = {
    learn: [
      ["/learning", t("学习路线", "Learning paths", "學習路線")],
      ["/timeline", t("学习活动", "Learning activity", "學習活動")],
    ],
    writing: [
      ["/articles", t("全部文章", "All writing", "全部文章")],
      ["/blog", t("开发随笔", "Journal", "開發隨筆")],
      ["/reading", t("阅读清单", "Reading list", "閱讀清單")],
    ],
    build: [
      ["/build", t("实践工作台", "Workbench", "實作工作臺")],
      ["/projects", t("项目", "Projects", "專案")],
      ["/labs", t("实验记录", "Lab records", "實驗記錄")],
    ],
    knowledge: [
      ["/notes", t("短笔记", "Notes", "短筆記")],
      ["/papers", t("论文阅读", "Papers", "論文閱讀")],
      ["/reading", t("阅读清单", "Reading list", "閱讀清單")],
    ],
  };
  return (
    <aside className="module-directory" data-module={group}>
      <p className="module-directory-label">
        {group === "learn"
          ? "LEARN"
          : group === "build"
            ? "BUILD"
            : group === "writing"
              ? "WRITING"
              : "KNOWLEDGE"}{" "}
        / INDEX
      </p>
      <nav aria-label={t("栏目目录", "Section directory", "欄目目錄")}>
        {destinations[group].map(([href, label], index) => (
          <Link
            key={href}
            to={href}
            aria-current={href === "/" + route ? "page" : undefined}
          >
            <span aria-hidden="true">0{index + 1}</span>
            {label}
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </nav>
      {group !== "knowledge" && (
        <nav
          className="module-topics"
          aria-label={t("研究方向入口", "Research directions", "研究方向入口")}
        >
          <p>{t("研究方向", "RESEARCH DIRECTIONS", "研究方向")}</p>
          {tracks.map((track) => (
            <Link
              key={track.domain}
              to={
                group === "writing"
                  ? "/articles?domain=" + track.domain
                  : "/learning?track=" + track.domain
              }
            >
              {t(track.title, track.en, track.titleTw)}
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      )}
    </aside>
  );
}
