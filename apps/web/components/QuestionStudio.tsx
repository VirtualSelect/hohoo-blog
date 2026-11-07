"use client";
import { useEffect, useState } from "react";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import QuestionScene, { resultFor, type QuestionId } from "./QuestionScenes";
import evidence from "../generated/question-evidence.json";
import s from "./QuestionStudio.module.css";
import {
  researchCases as scenes,
  researchFinding,
} from "../lib/research-cases";

export default function QuestionStudio({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const t = useText();
  const text = (copy: readonly [string, string, string]) =>
    t(copy[0], copy[1], copy[2]);
  const [active, setActive] = useState<QuestionId>("java");
  const [variant, setVariant] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [prediction, setPrediction] = useState<boolean | null>(null);
  useEffect(() => {
    const sync = () => {
      const id = new URLSearchParams(location.search).get("question");
      setActive(scenes.find((scene) => scene.id === id)?.id || "java");
      setVariant(0);
      setRevealed(false);
      setPrediction(null);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const scene = scenes.find((scene) => scene.id === active)!;
  const QuestionHeading = embedded ? "h3" : "h2";
  const source = evidence.sources[active];
  const correct = resultFor(active, variant);
  function choose(id: QuestionId) {
    if (id === active) return;
    setActive(id);
    setVariant(0);
    setRevealed(false);
    setPrediction(null);
    const url = new URL(location.href);
    url.searchParams.set("question", id);
    history.pushState(history.state, "", url);
  }
  function predict(value: boolean) {
    setPrediction(value);
    setRevealed(true);
  }
  const explanation = researchFinding(active, variant, t);
  return (
    <section
      className={s.root}
      id="question-studio"
      data-scene={active}
      data-layout={embedded ? "embedded" : "standalone"}
      aria-labelledby="studio-title"
    >
      {embedded ? (
        <header className={s.sectionIntro}>
          <div>
            <p className={s.eyebrow}>
              {t(
                "01 / 可交互的研究笔记",
                "01 / INTERACTIVE FIELD NOTES",
                "01 / 可互動的研究筆記",
              )}
            </p>
            <h2 id="studio-title">
              {t(
                "先试一遍，再读下去。",
                "A question you can get your hands on.",
                "先試一遍，再讀下去。",
              )}
            </h2>
          </div>
          <p>
            {t(
              "预测一次，换一个条件，再对照已经留下的证据。",
              "Predict, change a condition, and compare the recorded evidence.",
              "預測一次，換一個條件，再對照已經留下的證據。",
            )}
          </p>
        </header>
      ) : (
        <header className={s.intro}>
          <div>
            <p className={s.eyebrow}>
              HOHOO /{" "}
              {t("开放研究笔记", "OPEN RESEARCH NOTEBOOK", "開放研究筆記")}
            </p>
            <h1 id="studio-title">
              {t("先猜一个结果。", "Make a prediction.", "先猜一個結果。")}
              <br />
              <span>
                {t("再看证据。", "Then meet the evidence.", "再看證據。")}
              </span>
            </h1>
          </div>
          <div className={s.introAside}>
            <p>
              {t(
                "我是 Hohoo。这里从一个具体问题出发，写代码，保留失败，再把原因讲清楚。",
                "I’m Hohoo. Start with a concrete question, write code, keep the failures, and explain what happened.",
                "我是 Hohoo。這裡從一個具體問題出發，寫程式碼，保留失敗，再把原因講清楚。",
              )}
            </p>
            <Link to="/about">
              {t("认识一下我", "Meet Hohoo", "認識一下我")} ↗
            </Link>
          </div>
        </header>
      )}
      <div
        className={s.selector}
        role="group"
        aria-label={t(
          "选择一个研究问题",
          "Choose a research question",
          "選擇一個研究問題",
        )}
      >
        {scenes.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={active === item.id}
            onClick={() => choose(item.id)}
            aria-controls="question-exhibit"
          >
            <span className={s.index}>0{i + 1}</span>
            <span>
              <strong>{text(item.label)}</strong>
              <small>{text(item.cue)}</small>
            </span>
            <span className={s.selectorArrow} aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
      <div className={s.exhibit} id="question-exhibit">
        <div className={s.question}>
          <p className={s.eyebrow}>
            {t("问题现场", "AT THE QUESTION", "問題現場")} / 0
            {scenes.indexOf(scene) + 1}
          </p>
          <QuestionHeading>{text(scene.question)}</QuestionHeading>
          <p>{text(scene.context)}</p>
          <fieldset className={s.prediction}>
            <legend>{t("你的判断", "Your prediction", "你的判斷")}</legend>
            <button
              type="button"
              aria-pressed={prediction === true}
              onClick={() => predict(true)}
            >
              {text(scene.yes)} <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              aria-pressed={prediction === false}
              onClick={() => predict(false)}
            >
              {text(scene.no)} <span aria-hidden="true">→</span>
            </button>
          </fieldset>
          <button
            type="button"
            className={s.reveal}
            onClick={() => {
              setPrediction(null);
              setRevealed(!revealed);
            }}
          >
            {revealed
              ? t(
                  "收起结果，重新判断",
                  "Hide results and predict again",
                  "收起結果，重新判斷",
                )
              : t("直接查看结果", "Show the result", "直接查看結果")}
          </button>
        </div>
        <div className={s.instrument}>
          <div className={s.instrumentHeader}>
            <span>
              <i aria-hidden="true" />{" "}
              {active === "rag"
                ? t(
                    "配置核对 / 教学演示",
                    "CONFIGURATION CHECK / DEMO",
                    "配置核對 / 教學示範",
                  )
                : t(
                    "实验档案 / 结果切片",
                    "EXPERIMENT ARCHIVE / A CLOSER LOOK",
                    "實驗檔案 / 結果切片",
                  )}
            </span>
            <span>
              {revealed
                ? t("已展开", "REVEALED", "已展開")
                : t("待揭晓", "PREDICT", "待揭曉")}
            </span>
          </div>
          <QuestionScene
            id={active}
            variant={variant}
            revealed={revealed}
            onChange={(v) => {
              setVariant(v);
              setPrediction(null);
            }}
          />
        </div>
      </div>
      <div className={s.finding} aria-live="polite" aria-atomic="true">
        <div className={s.findingLabel}>
          {revealed
            ? prediction === null
              ? t("看见了什么", "What happened", "看見了什麼")
              : prediction === correct
                ? t(
                    "判断与结果一致",
                    "Your prediction matches",
                    "判斷與結果一致",
                  )
                : t(
                    "这里有一个反例",
                    "Here’s the counterexample",
                    "這裡有一個反例",
                  )
            : t("先留一个判断", "Make room for a prediction", "先留一個判斷")}
        </div>
        <p>
          {revealed
            ? explanation
            : t(
                "选一个答案，或直接揭晓。然后换一个条件，看看结论是否还成立。",
                "Choose an answer or reveal the result. Then change one condition and see whether the conclusion still holds.",
                "選一個答案，或直接揭曉。然後換一個條件，看看結論是否還成立。",
              )}
        </p>
      </div>
      <footer className={s.sources}>
        <Link className={s.readArticle} to={source.doc}>
          {t("把这个问题读透", "Read the full investigation", "把這個問題讀透")}{" "}
          ↗
        </Link>
        <a href={source.evidence} target="_blank" rel="noreferrer">
          {t("原始记录", "Source records", "原始記錄")} ↗
        </a>
        <a href={source.code} target="_blank" rel="noreferrer">
          {t("固定版本代码", "Pinned code", "固定版本程式碼")} ↗
        </a>
        <Link to={`/learning#track-${scene.domain}`}>
          {t("沿这条路线继续", "Follow this reading path", "沿這條路線繼續")} →
        </Link>
      </footer>
      <noscript>
        <p>
          {t(
            "交互需要 JavaScript；文章、代码和实验记录可直接阅读。",
            "Interaction needs JavaScript. The articles, code and records remain directly accessible.",
            "互動需要 JavaScript；文章、程式碼和實驗記錄可直接閱讀。",
          )}
        </p>
      </noscript>
    </section>
  );
}
