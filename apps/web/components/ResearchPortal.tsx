"use client";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import useResearchTrack from "./useResearchTrack";
import { researchCases, sceneForDomain } from "../lib/research-cases";
import evidence from "../generated/question-evidence.json";
import tracks from "@site/data/learning-paths.json";
import type { ContentEntry, Domain } from "../lib/site-types";

const introductions = {
  java: [
    "回复丢了，操作却已经执行。一次重试，为什么会变成两次？",
    "The reply was lost, but the action happened. Why can one retry produce two effects?",
    "回覆丟了，操作卻已經執行。一次重試，為何會變成兩次？",
  ],
  cache: [
    "一次小规模 CPU 实验：缓存命中了，查询却更慢。多出来的工作是什么？",
    "A small CPU experiment: the cache hit, yet the query slowed down. Where did the extra work come from?",
    "一次小規模 CPU 實驗：快取命中了，查詢卻更慢。多出來的工作是什麼？",
  ],
  robot: [
    "经过目标，不等于稳定停住。从一次 MuJoCo 调参实验说起。",
    "Passing a target is not the same as settling. Start with a MuJoCo tuning experiment.",
    "經過目標，不等於穩定停住。從一次 MuJoCo 調參實驗說起。",
  ],
  rag: [
    "引用存在，也可能用错版本。用配置核对理解回答的边界。",
    "A real quote can still cite the wrong revision. Explore the boundary with a configuration check.",
    "引用存在，也可能用錯版本。以配置核對理解回答的邊界。",
  ],
} as const;
export default function ResearchPortal({
  entries,
}: {
  entries: ContentEntry[];
}) {
  const t = useText();
  const [domain] = useResearchTrack("embodied-ai");
  const scene = researchCases.find(
    (scene) => scene.id === sceneForDomain[domain as Domain],
  )!;
  const source = evidence.sources[scene.id];
  const article = entries.find((entry) => entry.href === source.doc);
  return (
    <section className="notebook-cover" id="research-routes">
      <div className="notebook-masthead">
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
      <div className="quiet-cover">
        <header className="quiet-intro">
          <p className="obs-kicker">
            {t(
              "公开的学习与实践",
              "LEARNING, OUT IN THE OPEN",
              "公開的學習與實作",
            )}
          </p>
          <h1>
            {t("公开学习。", "Learn in public.", "公開學習。")}
            <br />
            {t("用代码回答问题。", "Think through code.", "用程式碼回答問題。")}
          </h1>
          <p>
            {t(
              "我是 Hohoo。从 Java 应用到模型机制，再到机器人仿真，记录做过的实验、没想通的问题，以及能重跑的代码。",
              "I’m Hohoo. From Java applications to model mechanics and robot simulation: experiments, open questions, and code you can run again.",
              "我是 Hohoo。從 Java 應用到模型機制，再到機器人模擬，記錄做過的實驗、沒想通的問題，以及能重跑的程式碼。",
            )}
          </p>
          <div className="quiet-actions">
            <Link className="obs-button" to="/learning">
              {t(
                "找到你的阅读起点",
                "Find your starting point",
                "找到你的閱讀起點",
              )}{" "}
              ↗
            </Link>
            <Link to="/articles">
              {t("找一篇文章", "Find an article", "找一篇文章")} ↗
            </Link>
          </div>
          <div className="notebook-signature">
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
        </header>
        <article className="quiet-feature">
          <Link
            className="notebook-record"
            to={source.doc}
            aria-labelledby="notebook-record-title"
          >
            <p className="obs-kicker">
              {t(
                "翻开一份实验记录",
                "FROM THE EXPERIMENT NOTEBOOK",
                "翻開一份實驗記錄",
              )}
              <span aria-hidden="true">↗</span>
            </p>
            {scene.id === "robot" && (
              <figure>
                <img
                  src="/media/practice/planar-gain.svg"
                  width="1200"
                  height="600"
                  fetchPriority="high"
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
            )}
            <h2 id="notebook-record-title">
              {scene.id === "robot"
                ? t(
                    "同一个目标，\n为什么有的控制器停不住？",
                    "One target.\nWhy won’t it settle?",
                    "同一個目標，\n為什麼有的控制器停不住？",
                  )
                : t(scene.question[0], scene.question[1], scene.question[2])}
            </h2>
            <p>
              {t(
                introductions[scene.id][0],
                introductions[scene.id][1],
                introductions[scene.id][2],
              )}
            </p>
            <span className="quiet-read">
              {t("看实验与复现方法", "Read and reproduce", "看實驗與重現方法")}
              {article?.minutes && (
                <small>
                  {" "}
                  · {article.minutes} {t("分钟", "min", "分鐘")}
                </small>
              )}
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        </article>
      </div>
      <nav
        className="notebook-paths"
        aria-label={t("选择学习方向", "Choose a learning path", "選擇學習方向")}
      >
        {tracks.map((track, index) => (
          <Link key={track.id} to={`/learning?track=${track.domain}`}>
            <span className="notebook-path-number" aria-hidden="true">
              0{index + 1}
            </span>
            <strong>{t(track.title, track.en, track.titleTw)}</strong>
            <p>{t(...(track.entryDescription as [string, string, string]))}</p>
            <span className="notebook-path-link">
              {t("看路线", "View path", "看路線")}{" "}
              <span aria-hidden="true">↗</span>
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
