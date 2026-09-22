import { uiLabel } from "@site/src/utils/ui-labels";
import React, { useEffect, useState } from "react";
import Layout from "@lab/runtime/Layout";
import { translate } from "@lab/runtime/Translate";
import { useContent } from "../components/ContentUI";
import WritingList from "../components/WritingList";
import { writingEntries } from "../utils/localization.cjs";
import { useText } from "../../apps/web/components/Shell";
import LabSketch from "../../apps/web/components/LabSketch";
import Link from "@lab/runtime/Link";
export default function Articles() {
  const { entries } = useContent();
  const t = useText();
  const writing = writingEntries(entries);
  const [type, setType] = useState("all");
  const types = ["all", "doc", "note", "paper", "blog"];
  useEffect(() => {
    const sync = () => {
      const value = new URLSearchParams(location.search).get("type");
      setType(types.includes(value) ? value : "all");
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const labels = [
    translate({
      id: "filter.all",
      message: "全部",
    }),
    translate({
      id: "filter.doc",
      message: "技术文章",
    }),
    uiLabel("Notes"),
    translate({
      id: "filter.paper",
      message: "论文",
    }),
    translate({
      id: "filter.blog",
      message: "随笔",
    }),
  ];
  const description = translate({
    id: "articles.description",
    message: "我最近在学习、理解和构建什么。",
  });
  return (
    <Layout
      title={translate({
        id: "nav.articles",
        message: "文章",
      })}
      description={description}
    >
      <main className="hh-page editorial-articles">
        <p className="hh-eyebrow">{uiLabel("ARTICLES")}</p>
        <h1>{description}</h1>
        <div
          className="hh-controls"
          role="group"
          aria-label={translate({
            id: "articles.filters",
            message: "按内容类型筛选",
          })}
        >
          {types.map(
            (value, i) =>
              (value === "all" ||
                value === type ||
                writing.some((e) => e.type === value)) && (
                <button
                  type="button"
                  key={value}
                  aria-pressed={type === value}
                  onClick={() => {
                    setType(value);
                    const url = new URL(location.href);
                    value === "all"
                      ? url.searchParams.delete("type")
                      : url.searchParams.set("type", value);
                    history.replaceState(history.state, "", url);
                  }}
                >
                  {labels[i]}{" "}
                  <span className="filter-count">
                    {
                      writing.filter((e) => value === "all" || e.type === value)
                        .length
                    }
                  </span>
                </button>
              ),
          )}
        </div>
        {type !== "all" && !writing.some((e) => e.type === type) && (
          <button
            onClick={() => {
              setType("all");
              const url = new URL(location.href);
              url.searchParams.delete("type");
              history.replaceState(history.state, "", url);
            }}
          >
            {t("返回全部文章", "Show all writing", "返回全部文章")}
          </button>
        )}
        {type === "all" && writing[0] && (
          <article
            className="article-spotlight"
            data-domain={writing[0].domain}
          >
            <div>
              <p className="eyebrow">
                {t("最近发布", "Latest writing", "最近發布")}
              </p>
              <h2>
                <Link to={writing[0].href}>{writing[0].title}</Link>
              </h2>
              <p>{writing[0].description}</p>
              <div className="spotlight-meta">
                <time dateTime={writing[0].date}>{writing[0].date}</time>
                {writing[0].minutes && (
                  <span>
                    {writing[0].minutes} {t("分钟阅读", "min read", "分鐘閱讀")}
                  </span>
                )}
              </div>
              <Link className="featured-action" to={writing[0].href}>
                <span>{t("开始阅读", "Start reading", "開始閱讀")}</span>
                <span className="action-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
            <div className="article-sketch" aria-hidden="true">
              <LabSketch
                kind={
                  writing[0].domain === "llm"
                    ? "model"
                    : writing[0].domain === "embodied-ai"
                      ? "embodied"
                      : "application"
                }
              />
            </div>
          </article>
        )}
        {(type !== "all" || writing.length !== 1) && (
          <WritingList
            items={
              type === "all"
                ? writing.slice(1)
                : writing.filter((e) => e.type === type)
            }
          />
        )}
      </main>
    </Layout>
  );
}
