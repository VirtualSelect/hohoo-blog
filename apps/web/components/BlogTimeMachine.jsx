"use client";
import { useState } from "react";
import { useText } from "./Shell";
import buildLog from "@site/data/build-log.json";
import styles from "./LearningExercises.module.css";

export default function BlogTimeMachine({ repo }) {
  const t = useText();
  const [index, setIndex] = useState(0);
  const legacy = buildLog.find(
    (entry) => entry.commit === "64fbc8247924434f71ca838f507847e36bce46b3",
  );
  const stages = [
    {
      date: legacy.date,
      commit: legacy.commit,
      title: t("Docusaurus 阶段", "Docusaurus era", "Docusaurus 階段"),
      text: t(
        "当时根目录的启动、构建和预览脚本由 Docusaurus 驱动。查看提交中的 package.json，可以直接核对这些入口。",
        "Root start, build, and preview scripts were driven by Docusaurus. The committed package.json preserves that evidence.",
        "當時根目錄的啟動、建置和預覽腳本由 Docusaurus 驅動。查看提交中的 package.json，可以直接核對這些入口。",
      ),
      code: "start: docusaurus start\nbuild: docusaurus build",
    },
    {
      date: "2026-09-12",
      commit: "ed48fdbf39b9e4eb35bda73e636e49beaf63a2ca",
      title: t("迁移到 Next.js", "Move to Next.js", "遷移到 Next.js"),
      text: t(
        "根目录脚本改为委托 apps/web，框架迁移到 Next.js。原始文章和采集流程继续由仓库维护；这条记录证明代码变更，不证明当日部署时间。",
        "Root scripts began delegating to apps/web as the site moved to Next.js. Articles and collection remained in the repository. This records a code change, not the production deployment time.",
        "根目錄腳本改為委託 apps/web，框架遷移到 Next.js。原始文章和採集流程繼續由倉庫維護；這條記錄證明程式碼變更，不證明當日部署時間。",
      ),
      code: "start: npm run dev --prefix apps/web\nbuild: npm run build --prefix apps/web",
    },
    {
      date: "2026-09-17",
      commit: "46e3d8fc69a606dbb39aa47641cc130f8a48f867",
      title: t(
        "学习之旅进入代码",
        "The learning journey takes shape",
        "學習之旅進入程式碼",
      ),
      text: t(
        "这一提交加入 Journey、虚拟实验室、路线数据和关联校验。规划从页面说明变成可维护的数据结构；计划中的实验仍不是已完成成果。",
        "This commit added Journey, the virtual lab, route data, and relationship checks. Plans became maintainable data; planned experiments did not become completed results.",
        "這一提交加入 Journey、虛擬實驗室、路線資料和關聯驗證。規劃從頁面說明變成可維護的資料結構；計畫中的實驗仍不是已完成成果。",
      ),
      code: "data/journey.json\ndata/journey-labs.json\napps/web/tests/journey.test.mjs",
    },
  ];
  const stage = stages[index];
  return (
    <section className={styles.exercise} aria-labelledby="time-machine-title">
      <p className="eyebrow">
        {t("代码考古", "Code archaeology", "程式碼考古")}
      </p>
      <h2 id="time-machine-title">
        {t("博客时间机", "Blog time machine", "部落格時光機")}
      </h2>
      <p>
        {t(
          "切换一个时间点，看看这个站点如何改变。以下是提交证据展，不是历史页面截图。",
          "Choose a moment and inspect how the site changed. This is a commit exhibit, not a gallery of historical screenshots.",
          "切換一個時間點，看看這個站點如何改變。以下是提交證據展，不是歷史頁面截圖。",
        )}
      </p>
      <div className={styles.choices}>
        {stages.map((s, i) => (
          <button
            type="button"
            key={s.commit}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            {s.date} · {s.title}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        <h3>{stage.title}</h3>
        <p>{stage.text}</p>
        <pre>{stage.code}</pre>
        <a href={`${repo}/commit/${stage.commit}`}>
          {t("查看原始提交", "Inspect original commit", "查看原始提交")} ·{" "}
          {stage.commit.slice(0, 7)} ↗
        </a>
      </div>
    </section>
  );
}
