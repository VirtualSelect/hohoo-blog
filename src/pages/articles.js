import { uiLabel } from "@site/src/utils/ui-labels";
import React, { useEffect, useState } from "react";
import Layout from "@lab/runtime/Layout";
import { translate } from "@lab/runtime/Translate";
import { useContent } from "../components/ContentUI";
import WritingList from "../components/WritingList";
import { writingEntries } from "../utils/localization.cjs";
export default function Articles() {
  const { entries } = useContent();
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
      <main className="hh-page">
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
          {types.map((value, i) => (
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
              {labels[i]}
            </button>
          ))}
        </div>
        <WritingList
          items={writingEntries(entries).filter(
            (e) => type === "all" || e.type === type,
          )}
        />
      </main>
    </Layout>
  );
}
