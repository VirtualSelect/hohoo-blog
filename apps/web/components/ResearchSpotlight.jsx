"use client";
import Link from "../runtime/Link";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import editorial from "@site/data/editorial.json";
import s from "./ResearchEvidence.module.css";

export default function ResearchSpotlight() {
  const { globalData } = useSite();
  const t = useText();
  return (
    <aside
      className={s.spotlight}
      aria-label={t("最近的实践", "Recent practice", "最近的實作")}
    >
      <p className="eyebrow">
        {t("从代码与证据出发", "From code and evidence", "從程式碼與證據出發")}
      </p>
      {editorial.featuredArticles.map((id, i) => {
        const entry = globalData["content-index"].entries.find(
          (e) => e.id === id,
        );
        if (!entry) return null;
        return (
          <Link key={id} to={entry.href} className={s.feature}>
            <span className="eyebrow">
              0{i + 1} /{" "}
              {entry.domain === "llm"
                ? "LLM → " +
                  t("对照与验证", "comparison & validation", "對照與驗證")
                : "MuJoCo → " +
                  t("接触与动作", "contact & action", "接觸與動作")}
            </span>
            {entry.domain === "embodied-ai" && (
              <img
                src="/media/practice/grasp-guard-stop.png"
                alt={t(
                  "真实仿真截图：抓取失败后，夹爪停止搬运",
                  "Recorded simulation: transfer stops after failed pickup",
                  "真實模擬截圖：抓取失敗後，夾爪停止搬運",
                )}
                width="960"
                height="640"
              />
            )}
            <h2>{entry.title}</h2>
            <p>{entry.description}</p>
            <span>
              {t("查看过程与证据", "Explore the evidence", "查看過程與證據")} ↗
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
