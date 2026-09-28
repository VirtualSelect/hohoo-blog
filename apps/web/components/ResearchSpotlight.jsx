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
        {t("从运行记录出发", "From recorded runs", "從執行紀錄出發")}
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
              {i === 0
                ? "Java → JSON"
                : "MuJoCo → " +
                  t("接触与动作", "contact & action", "接觸與動作")}
            </span>
            {i === 1 && (
              <img
                src="/media/practice/vl01-lift.png"
                alt={t(
                  "真实仿真截图：夹爪抬起红色方块",
                  "Recorded simulation: the gripper lifts the red cube",
                  "真實模擬截圖：夾爪抬起紅色方塊",
                )}
                width="960"
                height="640"
              />
            )}
            <h2>{entry.title}</h2>
            <p>
              {i === 0
                ? t(
                    "HTTP 200 之后，还需要哪些验收？",
                    "What must be checked after HTTP 200?",
                    "HTTP 200 之後，還需要哪些驗證？",
                  )
                : t(
                    "同一段控制程序，为什么偏了 25 mm 就抓不到？",
                    "Why does a 25 mm offset break the same controller?",
                    "同一段控制程式，為什麼偏了 25 mm 就抓不到？",
                  )}
            </p>
            <span>
              {t("查看过程与证据", "Explore the evidence", "查看過程與證據")} ↗
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
