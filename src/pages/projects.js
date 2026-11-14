import { uiLabel } from "@site/src/utils/ui-labels";
import React from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useContent, ContentRows } from "@site/src/components/ContentUI";
import { useText } from "@lab/components/Shell";
export default function Projects() {
  const t = useText();
  const { entries } = useContent();
  return (
    <Layout
      title={t("项目", "Projects", "專案")}
      description={t(
        "真实项目、实现选择与代码入口。",
        "Real projects, implementation choices and source code.",
        "真實專案、實作選擇與程式碼入口。",
      )}
    >
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("BUILD / PROJECTS")}</p>
        <h1>
          {t(
            "把想法做成能用的东西。",
            "Ideas, made useful.",
            "把想法做成能用的東西。",
          )}
        </h1>
        <p className="hh-lead">
          {t(
            "从真实问题出发，留下实现、选择与边界。",
            "Working code, architecture and trade-offs.",
            "從真實問題出發，留下實作、選擇與邊界。",
          )}
        </p>
        <p>
          <Link to="/labs">
            {t("实验记录 →", "Experiments →", "實驗記錄 →")}
          </Link>
        </p>
        <ContentRows items={entries.filter((e) => e.type === "project")} />
      </main>
    </Layout>
  );
}
