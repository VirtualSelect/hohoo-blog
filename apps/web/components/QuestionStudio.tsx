"use client";
import { useEffect, useState } from "react";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import QuestionScene, { resultFor, type QuestionId } from "./QuestionScenes";
import evidence from "../generated/question-evidence.json";
import s from "./QuestionStudio.module.css";

const scenes = [
  {
    id: "java",
    domain: "ai-apps",
    label: ["AI 应用", "AI applications", "AI 應用"],
    cue: ["重试之后", "After a retry", "重試之後"],
    question: [
      "没收到回复，再试一次就好？",
      "No reply. Just try again?",
      "沒收到回覆，再試一次就好？",
    ],
    context: [
      "服务端已经完成一次加一。客户端再次发送请求，最终只执行一次吗？",
      "The server has already applied +1. If the client sends again, will the effect occur only once?",
      "伺服器已經完成一次加一。用戶端再次傳送請求，最終只執行一次嗎？",
    ],
    yes: ["只执行一次", "One effect", "只執行一次"],
    no: ["会执行两次", "Two effects", "會執行兩次"],
  },
  {
    id: "cache",
    domain: "llm",
    label: ["LLM", "LLM", "LLM"],
    cue: ["省下的计算", "Saved computation", "省下的計算"],
    question: [
      "少算了，为什么还更慢？",
      "Less work. Still slower?",
      "少算了，為什麼還更慢？",
    ],
    context: [
      "12 Token 的输入复用前 8 个 Token。只续算剩下 4 个，总查询会比完整重算更快吗？",
      "Reuse the first 8 of 12 tokens and continue with 4. Will the total query beat a full recompute?",
      "12 Token 的輸入重用前 8 個 Token。只續算剩下 4 個，總查詢會比完整重算更快嗎？",
    ],
    yes: ["缓存更快", "Cache is faster", "快取更快"],
    no: ["这次反而更慢", "Slower in this run", "這次反而更慢"],
  },
  {
    id: "robot",
    domain: "embodied-ai",
    label: ["具身智能", "Embodied AI", "具身智能"],
    cue: ["到达与停住", "Arrive or settle", "到達與停住"],
    question: [
      "经过目标，就算到达了吗？",
      "Passing the target is enough?",
      "經過目標，就算到達了嗎？",
    ],
    context: [
      "把一个球形执行器推向 0.6 米处。改变质量和阻尼，观察它能否在最后 0.3 秒持续保持低误差、低速度。",
      "Drive a spherical actuator toward 0.6 m. Change mass and damping: can it maintain low error and speed for the final 0.3 seconds?",
      "把一個球形執行器推向 0.6 公尺處。改變質量和阻尼，觀察它能否在最後 0.3 秒持續保持低誤差、低速度。",
    ],
    yes: ["能稳定停住", "It settles", "能穩定停住"],
    no: ["还停不住", "It does not settle", "還停不住"],
  },
  {
    id: "rag",
    domain: "rag",
    label: ["RAG", "RAG", "RAG"],
    cue: ["引用与依据", "Citation or support", "引用與依據"],
    question: [
      "引用是真的，答案就对吗？",
      "A real quote. A correct answer?",
      "引用是真的，答案就對嗎？",
    ],
    context: [
      "一份回答附上了真实存在的配置原文。它是否属于当前服务、环境和版本，数值也与回答相符？",
      "An answer includes an exact configuration quote. Does it match the requested service, environment, revision and value?",
      "一份回答附上了真實存在的配置原文。它是否屬於目前服務、環境和版本，數值也與回答相符？",
    ],
    yes: ["这一字段可接受", "Accept this field", "這一欄位可接受"],
    no: ["应该拒绝", "Reject it", "應該拒絕"],
  },
] as const;

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
  const explanation =
    active === "java"
      ? [
          t(
            "丢的是回复，不是已经发生的操作。没有幂等身份，第二次请求又执行了加一。",
            "The reply was lost, not the completed effect. Without an idempotency identity, the retry applies +1 again.",
            "遺失的是回覆，不是已經發生的操作。沒有冪等身分，第二次請求又執行了加一。",
          ),
          t(
            "相同键与相同请求体命中已有记录，返回之前的结果。这一条件下，执行次数仍为一。",
            "The same key and body find the existing record and return its result. Under this condition, the effect occurs once.",
            "相同鍵與相同請求內容命中已有記錄，回傳先前的結果。這一條件下，執行次數仍為一。",
          ),
          t(
            "这份实现把幂等记录放在内存。服务重启后记录消失，同一个键也可能再次执行；持久副作用与持久回执需要一起设计。",
            "This implementation keeps idempotency records in memory. Restarting loses them, so even the same key can execute again. Durable effects and receipts need a joint design.",
            "這份實作把冪等記錄放在記憶體。服務重啟後記錄消失，同一個鍵也可能再次執行；持久副作用與持久回執需要一起設計。",
          ),
        ][variant]
      : active === "cache"
        ? t(
            "命中缓存省下部分投影，却增加签名、查找、复制和续算工作。固定签名改善了结果，但这组小规模 CPU 实验仍未胜过完整重算。",
            "A hit saves some projection work but adds signature, lookup, copying and continuation costs. Freezing the signature helps, yet this small CPU workload still loses to full recomputation.",
            "命中快取省下部分投影，卻增加簽章、查找、複製和續算工作。固定簽章改善了結果，但這組小規模 CPU 實驗仍未勝過完整重算。",
          )
        : active === "robot"
          ? t(
              "位置误差接近零时，速度未必为零。阻尼帮助减速，质量改变相同力下的响应；有超调也可能最终稳定。比较过程与完成判据，不能只看一帧。",
              "Near-zero position error does not imply zero speed. Damping helps decelerate; mass changes the response to the same force. Overshoot can still end in settling. Inspect the process and completion criteria together.",
              "位置誤差接近零時，速度未必為零。阻尼幫助減速，質量改變相同力下的響應；有超調也可能最終穩定。比較過程與完成判據，不能只看一幀。",
            )
          : t(
              "找到原文只完成第一步。还要核对环境、修订和字段值；引用存在不能替答案的正确性作保证。这里的规则适用于闭合配置表，不是自由文本事实核查器。",
              "Finding the quote is only the first step. Scope, revision and field value must also match. These rules apply to a closed configuration table, not arbitrary natural-language fact checking.",
              "找到原文只完成第一步。還要核對環境、修訂和欄位值；引用存在不能替答案的正確性作保證。這裡的規則適用於閉合配置表，不是自由文字事實核查器。",
            );
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
