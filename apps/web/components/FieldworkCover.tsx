"use client";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import type { ContentEntry } from "../lib/site-types";

export default function FieldworkCover({
  entries,
}: {
  entries: ContentEntry[];
}) {
  const t = useText();
  const feature = entries.find(
    (e) => e.id === "doc:embodied-ai/mujoco-planar-pd",
  );
  return (
    <header className="fieldwork-cover">
      <div className="cover-running-head">
        <span>
          {t("Hohoo 的研究手记", "Hohoo’s field notes", "Hohoo 的研究手記")}
        </span>
        <span>
          {t(
            "代码 · 解释 · 证据",
            "CODE · EXPLANATION · EVIDENCE",
            "程式碼 · 解釋 · 證據",
          )}
        </span>
      </div>
      <div className="cover-composition">
        <div className="cover-story">
          <p className="cover-kicker">
            {t(
              "公开的学习与实践",
              "LEARNING, OUT IN THE OPEN",
              "公開的學習與實作",
            )}
          </p>
          <h1>
            {t("公开学习。", "Learn in public.", "公開學習。")}
            <br />
            <em>
              {t(
                "用代码回答问题。",
                "Think through code.",
                "用程式碼回答問題。",
              )}
            </em>
          </h1>
          <p className="cover-description">
            {t(
              "我是 Hohoo。从 Java 应用到模型机制，再到机器人仿真，记录做过的实验、没想通的问题，以及能重跑的代码。",
              "I’m Hohoo. From Java applications to model mechanics and robot simulation: experiments, unresolved questions, and code you can run again.",
              "我是 Hohoo。從 Java 應用到模型機制，再到機器人模擬，記錄做過的實驗、沒想通的問題，以及能重跑的程式碼。",
            )}
          </p>
          <div className="cover-actions">
            <Link className="folio-button" to="/learning">
              {t(
                "找到你的阅读起点",
                "Find your starting point",
                "找到你的閱讀起點",
              )}{" "}
              <span aria-hidden="true">↗</span>
            </Link>
            <a href="#question-studio">
              {t(
                "先动手试一个问题",
                "Try a question first",
                "先動手試一個問題",
              )}{" "}
              ↓
            </a>
          </div>
          <div className="cover-signature">
            <span aria-hidden="true">✦</span>
            <p>
              {t(
                "保留失败，追问原因。",
                "Keep the failure. Ask why.",
                "保留失敗，追問原因。",
              )}
            </p>
            <Link to="/about">{t("关于我", "About me", "關於我")} →</Link>
          </div>
        </div>
        {feature && (
          <article className="cover-experiment">
            <div className="cover-note-head">
              <span>
                {t(
                  "翻开一份实验记录",
                  "FROM THE EXPERIMENT NOTEBOOK",
                  "翻開一份實驗記錄",
                )}
              </span>
              <span aria-hidden="true">↗</span>
            </div>
            <figure>
              <img
                src="/media/practice/planar-gain.svg"
                width="1200"
                height="600"
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
              <Link to={feature.href}>
                {t(
                  "同一个目标，\n为什么有的控制器停不住？",
                  "One target.\nWhy won’t it settle?",
                  "同一個目標，\n為什麼有的控制器停不住？",
                )}
              </Link>
            </h2>
            <p>
              {t(
                "改变质量和阻尼，对照六组已经运行的结果。经过目标，与稳定停住，是两件事。",
                "Change mass and damping across six recorded cases. Passing the target and settling there are different outcomes.",
                "改變質量和阻尼，對照六組已經執行的結果。經過目標，與穩定停住，是兩件事。",
              )}
            </p>
            <Link className="cover-note-link" to={feature.href}>
              {t(
                "看实验与复现方法",
                "Read the experiment and reproduce it",
                "看實驗與重現方法",
              )}{" "}
              <span aria-hidden="true">→</span>
            </Link>
          </article>
        )}
      </div>
    </header>
  );
}
