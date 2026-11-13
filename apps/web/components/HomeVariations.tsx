import Link from "../runtime/Link";
import { useText } from "./Shell";

export function ClassicRecord() {
  const t = useText();
  return (
    <article className="atlas-classic-record">
      <Link to="/docs/embodied-ai/mujoco-planar-pd">
        <p className="atlas-eyebrow">
          {t(
            "翻开一份实验记录",
            "FROM THE EXPERIMENT NOTEBOOK",
            "翻開一份實驗記錄",
          )}{" "}
          <span aria-hidden="true">↗</span>
        </p>
        <figure>
          <img
            src="/media/practice/planar-gain.svg"
            width="1200"
            height="600"
            loading="lazy"
            alt={t(
              "从 MuJoCo 实际轨迹生成的质量与阻尼对照图",
              "Mass and damping comparison from recorded MuJoCo trajectories",
              "從 MuJoCo 實際軌跡產生的質量與阻尼對照圖",
            )}
          />
          <figcaption>
            {t(
              "实际仿真记录 · 图中标签保留原文",
              "Recorded simulation · original chart labels",
              "實際模擬記錄 · 圖中標籤保留原文",
            )}
          </figcaption>
        </figure>
        <h2>
          {t(
            "同一个目标，为什么有的控制器停不住？",
            "One target. Why won’t it settle?",
            "同一個目標，為什麼有的控制器停不住？",
          )}
        </h2>
        <p>
          {t(
            "经过目标，不等于稳定停住。从一次 MuJoCo 调参实验说起。",
            "Passing a target is not the same as settling. Start with a MuJoCo tuning experiment.",
            "經過目標，不等於穩定停住。從一次 MuJoCo 調參實驗說起。",
          )}
        </p>
        <span className="atlas-classic-read">
          {t("看实验与复现方法", "Read and reproduce", "看實驗與重現方法")} →
        </span>
      </Link>
    </article>
  );
}
