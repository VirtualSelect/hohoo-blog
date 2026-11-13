"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import {
  defaultSessionView,
  readSessionView,
  sessionViewUrl,
  sessionTrace,
} from "../lib/session-strategies.mjs";
import evidence from "../generated/session-evidence.json";
import s from "./SessionStrategyGuide.module.css";

type Copy = readonly [string, string, string];
type View = { policy: string; scenario: string };
const policies: Record<
  string,
  { label: Copy; need: Copy; rule: Copy; failedB: Copy }
> = {
  serial: {
    label: ["同会话串行", "Serialize the conversation", "同會話串行"],
    need: [
      "两个问题都要回答，B需要接着A的上下文。",
      "Answer both questions; B must continue from A’s context.",
      "兩個問題都要回答，B需要接著A的上下文。",
    ],
    rule: [
      "B先排队，A提交后才取历史并发送。代价是慢A会挡住B。",
      "B queues, then takes its snapshot and sends after A commits. A slow A blocks B.",
      "B先排隊，A提交後才取歷史並傳送。代價是慢A會擋住B。",
    ],
    failedB: [
      "A已经提交；B失败只丢弃B的候选，不回滚A。",
      "A has already committed. B’s failure discards B’s candidate, not A’s committed turn.",
      "A已經提交；B失敗只丟棄B的候選，不回滾A。",
    ],
  },
  "first-commit": {
    label: ["先合法提交者获胜", "First valid commit wins", "先合法提交者獲勝"],
    need: [
      "允许从同一历史并行求解，但当前版本只接纳一个提交。",
      "Solve concurrently from the same snapshot, accepting one commit for that version.",
      "允許從同一歷史並行求解，但目前版本只接納一個提交。",
    ],
    rule: [
      "A、B都拿到版本0。先合法提交者推进版本，另一份结果因票据过期被拒绝。",
      "A and B both receive version 0. The first valid commit advances the version; the other ticket becomes stale.",
      "A、B都拿到版本0。先合法提交者推進版本，另一份結果因票據過期被拒絕。",
    ],
    failedB: [
      "B没有合法提交，版本仍为0；A后来成功仍能提交。",
      "B never commits, so the version stays at 0. A can still commit its later success.",
      "B沒有合法提交，版本仍為0；A後來成功仍能提交。",
    ],
  },
  "latest-start": {
    label: [
      "最新发起请求获胜",
      "Latest started request wins",
      "最新發起請求獲勝",
    ],
    need: [
      "B代表新的意图，A不应再修改当前会话。",
      "B represents a new intention; A must stop changing the current conversation.",
      "B代表新的意圖，A不應再修改目前會話。",
    ],
    rule: [
      "B发起时就撤销A的资格。即使A比B先成功，也不能提交。",
      "Starting B revokes A’s ownership. A cannot commit even if it finishes before B.",
      "B發起時就撤銷A的資格。即使A比B先成功，也不能提交。",
    ],
    failedB: [
      "B失败不会复活A的旧资格。这组推演最终没有新增问答；若希望保留A，需要另选产品策略。",
      "B’s failure does not revive A’s ownership. This scenario adds no turn. Keeping A requires a different product policy.",
      "B失敗不會復活A的舊資格。這組推演最終沒有新增問答；若希望保留A，需要另選產品策略。",
    ],
  },
};
const scenarios: Record<string, Copy> = {
  "a-first": ["A先成功返回", "A succeeds first", "A先成功回傳"],
  "b-first": ["B本可更快返回", "B could finish faster", "B本可更快回傳"],
  "b-fails": ["B失败，A返回成功", "B fails; A succeeds", "B失敗，A回傳成功"],
};
const actions: Record<string, Copy> = {
  start: [
    "取得历史快照并发送",
    "Take a snapshot and send",
    "取得歷史快照並傳送",
  ],
  queue: [
    "已提出，等待A结束；尚未发送",
    "Submitted; wait for A, not sent yet",
    "已提出，等待A結束；尚未傳送",
  ],
  commit: [
    "回复通过验收，提交整轮问答",
    "Reply validated; commit the complete turn",
    "回覆通過驗證，提交整輪問答",
  ],
  stale: [
    "回复成功，但已失去提交资格",
    "Successful reply, but no commit ownership",
    "回覆成功，但已失去提交資格",
  ],
  fail: [
    "请求失败，不提交候选",
    "Request failed; discard its candidate",
    "請求失敗，不提交候選",
  ],
};
function SessionUrlState({ onChange }: { onChange: (view: View) => void }) {
  const search = useSearchParams().toString();
  useEffect(() => onChange(readSessionView(search)), [search, onChange]);
  return null;
}

export default function SessionStrategyGuide() {
  const t = useText();
  const [view, setView] = useState<View>(defaultSessionView);
  const result = sessionTrace(view.policy, view.scenario);
  const policy = policies[view.policy];
  const source = evidence.sources[view.policy as keyof typeof evidence.sources];
  function choose(update: Partial<View>) {
    const next = { ...view, ...update };
    setView(next);
    history.pushState(null, "", sessionViewUrl(location.href, next));
  }
  const historyLabel = (history: string[]) =>
    history.length
      ? history.join(" → ")
      : t("没有新增问答", "No added turns", "沒有新增問答");
  return (
    <section
      id="java-session-guide"
      className={s.root}
      aria-labelledby="session-guide-title"
    >
      <Suspense fallback={null}>
        <SessionUrlState onChange={setView} />
      </Suspense>
      <header>
        <p className="hh-eyebrow">
          JAVA / {t("会话策略", "SESSION POLICIES", "會話策略")}
        </p>
        <h2 id="session-guide-title">
          {t(
            "B失败了，A还能写进历史吗？",
            "B failed. Can A still commit?",
            "B失敗了，A還能寫進歷史嗎？",
          )}
        </h2>
        <p>
          {t(
            "先提出A，再提出B。改变提交规则，看看同样的结果为何会留下不同的对话历史。",
            "Submit A, then B. Change the commit policy to see why the same replies can leave different conversation histories.",
            "先提出A，再提出B。改變提交規則，看看相同結果為何留下不同的對話歷史。",
          )}
        </p>
      </header>
      <p className={s.scope}>
        {t(
          "本地语义推演 · 空历史起步 · 历史中的A/B代表完整问答 · 步骤不是耗时测量，也不是Java实验回放",
          "Local semantic model · Empty initial history · History labels A/B denote complete turns · Steps are not timings or a Java run replay",
          "本機語義推演 · 空歷史起步 · 歷史中的A/B代表完整問答 · 步驟不是耗時測量，也不是Java實驗回放",
        )}
      </p>
      <div className={s.controls}>
        <label>
          {t(
            "希望产品怎样工作",
            "Choose the product behavior",
            "希望產品怎樣運作",
          )}
          <select
            value={view.policy}
            onChange={(e) => choose({ policy: e.target.value })}
          >
            {Object.entries(policies).map(([id, copy]) => (
              <option key={id} value={id}>
                {t(...copy.label)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("改变返回情况", "Change the reply scenario", "改變回傳情況")}
          <select
            value={view.scenario}
            onChange={(e) => choose({ scenario: e.target.value })}
          >
            {Object.entries(scenarios).map(([id, copy]) => (
              <option key={id} value={id}>
                {t(...copy)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <noscript>
        <p>
          {t(
            "切换推演需要JavaScript；下方三种策略摘要仍可展开阅读。",
            "Changing the model requires JavaScript. The three-policy summary below remains readable.",
            "切換推演需要JavaScript；下方三種策略摘要仍可展開閱讀。",
          )}
        </p>
      </noscript>
      <div className={s.result} role="status">
        <dl>
          <div>
            <dt>
              {t(
                "最终新增的完整问答",
                "Committed turns at the end",
                "最終新增的完整問答",
              )}
            </dt>
            <dd>{historyLabel(result.history)}</dd>
          </div>
          <div>
            <dt>
              {t(
                "B发送时的上下文",
                "Context when B is sent",
                "B傳送時的上下文",
              )}
            </dt>
            <dd>
              {result.snapshots.B.length
                ? t(
                    "包含A的完整问答",
                    "Includes A’s complete turn",
                    "包含A的完整問答",
                  )
                : t(
                    "不包含A的回答",
                    "Does not include A’s answer",
                    "不包含A的回答",
                  )}
            </dd>
          </div>
        </dl>
        <p>
          {t(...(view.scenario === "b-fails" ? policy.failedB : policy.rule))}
        </p>
      </div>
      {view.policy === "serial" && view.scenario === "b-first" && (
        <p className={s.scope}>
          {t(
            "串行时B尚未发送，即使它本可更快，也不能在A前返回。这里不让不可能的返回顺序发生。",
            "In serial mode B has not been sent. Even if it could be faster, it cannot return before A. The model preserves that dispatch constraint.",
            "串行時B尚未傳送，即使本可更快，也不能在A前回傳。這裡保留傳送先後的約束。",
          )}
        </p>
      )}
      <ol
        className={s.trace}
        aria-label={t("请求时序推演", "Request sequence model", "請求時序推演")}
      >
        {result.events.map((event, index) => (
          <li key={index}>
            <span className={s.step}>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{event.request}</strong>
              <span>
                {view.policy === "latest-start" &&
                event.request === "B" &&
                event.action === "start"
                  ? t(
                      "发起B，A的写入资格在此失效",
                      "Start B; A loses write ownership now",
                      "發起B，A的寫入資格在此失效",
                    )
                  : t(...actions[event.action])}
              </span>
            </div>
            <small>
              {t("历史", "History", "歷史")}: {historyLabel(event.history)}
            </small>
          </li>
        ))}
      </ol>
      <nav
        className={s.sources}
        aria-label={t(
          "当前策略的依据",
          "Sources for the selected policy",
          "目前策略的依據",
        )}
      >
        <Link to={source.doc}>
          {t(
            "原文与复现方法",
            "Article and reproduction steps",
            "原文與重現方法",
          )}{" "}
          →
        </Link>
        <a href={source.code} target="_blank" rel="noreferrer">
          {t("固定版本代码", "Pinned code", "固定版本程式碼")} ↗
        </a>
        <a href={source.evidence} target="_blank" rel="noreferrer">
          {t("已有实验记录", "Archived evidence", "既有實驗紀錄")} ↗
        </a>
      </nav>
      <details className={s.compare}>
        <summary>
          {t(
            "选哪种策略？并排看产品取舍",
            "Which policy? Compare the product trade-offs",
            "選哪種策略？並排看產品取捨",
          )}
        </summary>
        <dl>
          {Object.entries(policies).map(([id, copy]) => (
            <div key={id}>
              <dt>{t(...copy.label)}</dt>
              <dd>
                <p>{t(...copy.need)}</p>
                <p className={s.scope}>{t(...copy.rule)}</p>
                <Link
                  to={evidence.sources[id as keyof typeof evidence.sources].doc}
                >
                  {t("对应文章", "Read this policy", "對應文章")} →
                </Link>
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <p className={s.scope}>
        {t(
          "上下文示意假设发送前读取已提交历史；Demo09原实验只验证回调归属，不负责构造模型请求。",
          "The context illustration assumes committed history is read before sending. Demo 09 tests callback ownership; it does not construct model requests.",
          "上下文示意假設傳送前讀取已提交歷史；Demo09原實驗只驗證回呼歸屬，不負責構造模型請求。",
        )}
      </p>
      <p className={s.scope}>
        {t(
          "三种规则服务于不同产品语义，后篇不等于修复前篇。本推演不覆盖重试、历史裁剪、持久化或网络取消，也不证明所有并发交错正确。",
          "The policies serve different product semantics; later articles do not invalidate earlier ones. This model omits retries, trimming, persistence and transport cancellation, and is not a proof of all interleavings.",
          "三種規則服務於不同產品語義，後篇不等於修復前篇。本推演不涵蓋重試、歷史裁剪、持久化或網路取消，也不證明所有交錯均正確。",
        )}
      </p>
      <p className={s.scope}>
        {t(
          "Demo09归档解析器另有后续修订，复用流协议前请先核对。",
          "Demo 09’s archived parser has later corrections; check them before reusing the stream protocol.",
          "Demo09歸檔解析器另有後續修訂，重用串流協議前請先核對。",
        )}{" "}
        <a href={evidence.correction} target="_blank" rel="noreferrer">
          {t("修订说明", "Correction notes", "修訂說明")} ↗
        </a>
      </p>
    </section>
  );
}
