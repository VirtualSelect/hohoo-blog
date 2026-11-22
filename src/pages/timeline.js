import React from "react";
import Layout from "@lab/runtime/Layout";
import { useText } from "@lab/components/Shell";
import { useContent, ContentRows } from "@site/src/components/ContentUI";

export default function Timeline() {
  const t = useText();
  const { activity } = useContent();
  const title = t("学习活动", "Learning activity", "學習活動");
  const description = t(
    "按日期回看已发布的文章、笔记、实验、项目与周汇总。单条外部资讯留在雷达。",
    "Revisit published articles, notes, experiments, projects, and weekly digests by date. Individual external signals stay in Radar.",
    "按日期回顧已發表的文章、筆記、實驗、專案與每週彙整。單則外部資訊收錄於雷達。",
  );

  return (
    <Layout title={title} description={description}>
      <main className="hh-page">
        <p className="hh-eyebrow">{title}</p>
        <h1>
          {t(
            "学习与构建，留下真实足迹。",
            "A record of learning and building.",
            "學習與實作，留下真實足跡。",
          )}
        </h1>
        <p className="hh-lead">{description}</p>
        <ContentRows items={activity} />
      </main>
    </Layout>
  );
}
