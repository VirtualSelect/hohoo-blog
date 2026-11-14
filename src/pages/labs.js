import { uiLabel } from "@site/src/utils/ui-labels";
import React, { useEffect } from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useContent, ContentRows } from "@site/src/components/ContentUI";
import { useText } from "@lab/components/Shell";
export default function Labs() {
  const t = useText();
  const { entries } = useContent();
  const labs = entries.filter((e) => e.type === "lab");
  useEffect(() => {
    const slug = window.location.hash.slice(1);
    const entry = labs.find((e) => e.slug === slug);
    if (entry) window.location.replace(entry.href + window.location.search);
  }, []);
  return (
    <Layout
      title={t("实验", "Labs", "實驗")}
      description={t(
        "以问题、方法和证据为中心的实验记录。",
        "Experiments centered on questions, methods and evidence.",
        "以問題、方法和證據為中心的實驗記錄。",
      )}
    >
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("EXPERIMENT / LABS")}</p>
        <h1>
          {t(
            "让判断，有证据可循。",
            "A question. A method. Evidence.",
            "讓判斷，有證據可循。",
          )}
        </h1>
        <p className="hh-lead">
          {t(
            "区分观察与结论，记录方法、环境和适用边界。",
            "Observations and conclusions are recorded separately.",
            "區分觀察與結論，記錄方法、環境和適用邊界。",
          )}
        </p>
        <ContentRows
          items={labs.filter((e) => e.status !== "planning")}
          empty={t(
            "暂无已完成的实验记录。",
            "No completed experiments yet.",
            "尚無已完成的實驗記錄。",
          )}
        />
        <details className="hh-section">
          <summary>{t("实验提案", "Experiment proposals", "實驗提案")}</summary>
          <ContentRows items={labs.filter((e) => e.status === "planning")} />
        </details>
        <p>
          <Link to="/projects">
            {t("查看项目 →", "Projects →", "查看專案 →")}
          </Link>
        </p>
      </main>
    </Layout>
  );
}
