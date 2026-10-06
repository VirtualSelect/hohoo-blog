import React from "react";
import Layout from "@lab/runtime/Layout";
import CurrentFocus from "@site/src/components/CurrentFocus";
import { useText } from "@lab/components/Shell";
import current from "@site/data/current.json";
export default function Now() {
  const t = useText();
  return (
    <Layout
      title={t("近况", "Now", "近況")}
      description={t(
        "当前的构建、学习、阅读与探索。",
        "Current building, learning, reading and exploration.",
        "目前的構建、學習、閱讀與探索。",
      )}
    >
      <main className="hh-page hh-reading">
        <p className="hh-eyebrow">
          {t("近况", "Now", "近況")} / {current.updated.slice(0, 7)}
        </p>
        <h1>
          {t(
            "最近，把注意力放在这些事上。",
            "Where my attention goes.",
            "最近，把注意力放在這些事上。",
          )}
        </h1>
        <CurrentFocus full />
      </main>
    </Layout>
  );
}
