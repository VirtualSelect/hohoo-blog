"use client";
import dynamic from "next/dynamic";
import TryIt from "./TryIt";
import { useText } from "./Shell";
import styles from "./CreativeWorkbench.module.css";
const DecisionDesk = dynamic(() =>
  import("./WorkbenchTools").then((m) => m.DecisionDesk),
);
const TrustDesk = dynamic(() =>
  import("./WorkbenchTools").then((m) => m.TrustDesk),
);
const JsonDesk = dynamic(() =>
  import("./WorkbenchTools").then((m) => m.JsonDesk),
);
export default function CreativeWorkbench() {
  const t = useText();
  return (
    <section
      id="workbench"
      className={styles.workbench}
      aria-labelledby="workbench-title"
    >
      <header className={styles.header}>
        <div>
          <p className="eyebrow">
            03 / {t("创意工坊", "Workbench", "創意工坊")}
          </p>
          <h2 id="workbench-title">
            {t(
              "把一个想法，拨动一下。",
              "Give an idea a little nudge.",
              "把一個想法，撥動一下。",
            )}
          </h2>
        </div>
        <p>
          {t(
            "三个小工具，探索 AI 如何判断、信任与理解结构。全部在浏览器本地运行，不调用模型，也不上传输入。",
            "Three small tools for decisions, trust and structure. Everything runs locally: no model calls or input uploads.",
            "三個小工具，探索 AI 如何判斷、信任與理解結構。全部在瀏覽器本機執行，不呼叫模型，也不上傳輸入。",
          )}
        </p>
      </header>
      <div className={styles.instruments}>
        <div data-tone="blue">
          <span className={styles.number} aria-hidden="true">
            01 ↗
          </span>
          <TryIt
            id="decision-desk"
            title={t("决策调音台", "Decision mixer", "決策調音台")}
          >
            <DecisionDesk />
          </TryIt>
        </div>
        <div data-tone="violet">
          <span className={styles.number} aria-hidden="true">
            02 ⊣
          </span>
          <TryIt
            id="trust-desk"
            title={t("信任边界剧场", "Trust boundary theatre", "信任邊界劇場")}
          >
            <TrustDesk />
          </TryIt>
        </div>
        <div data-tone="apricot">
          <span className={styles.number} aria-hidden="true">
            03 {}
          </span>
          <TryIt
            id="json-desk"
            title={t("JSON 结构透镜", "JSON structure lens", "JSON 結構透鏡")}
          >
            <JsonDesk />
          </TryIt>
        </div>
      </div>
    </section>
  );
}
