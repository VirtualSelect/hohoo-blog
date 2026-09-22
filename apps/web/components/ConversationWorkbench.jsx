"use client";
import { useState } from "react";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import {
  memoryRun,
  recordedHistory,
  buildMemoryRequest,
  learningEvidence,
  recordedRequest,
} from "../lib/memory-lab.mjs";
import s from "./ConversationWorkbench.module.css";

export default function ConversationWorkbench() {
  const t = useText();
  const [mode, setMode] = useState("replay");
  const [turn, setTurn] = useState(0);
  const [ids, setIds] = useState(recordedHistory.map((m) => m.id));
  const request =
    mode === "replay" ? recordedRequest(turn) : buildMemoryRequest(ids);
  const evidence = learningEvidence(ids);
  const labels = [
    t("问候", "Greeting", "問候"),
    t("提供事实", "Add a fact", "提供事實"),
    t("追问", "Follow up", "追問"),
  ];
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            kind: "hohoo-memory-request",
            version: 1,
            execution: "not-executed",
            request,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "memory-request-not-executed.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      id="conversation-workbench"
      className={s.workbench}
      aria-label={t(
        "对话记忆实验室",
        "Conversation memory lab",
        "對話記憶實驗室",
      )}
    >
      <header className={s.header}>
        <p className="eyebrow">
          {t("实践现场 / 01", "Practice / 01", "實作現場 / 01")}
        </p>
        <h2>
          {t(
            "如果不带上前文，记忆还在吗？",
            "What remains when history is removed?",
            "如果不帶上前文，記憶還在嗎？",
          )}
        </h2>
        <p>
          {t(
            "先回放一次真实对话，再亲手拆开请求。看见界面中的历史，和模型这一次实际收到的内容之间的区别。",
            "Replay a real conversation, then take the request apart. Compare the visible conversation with the messages actually included in the next input.",
            "先回放一次真實對話，再親手拆開請求。看見介面中的歷史，和模型這一次實際收到的內容之間的區別。",
          )}
        </p>
        <p className={s.caption}>
          {t(
            "本地交互 · 不调用模型 · 原始记录保留中文 · 不上传输入",
            "Local interaction · No model calls · Original Chinese transcript · No input uploads",
            "本機互動 · 不呼叫模型 · 原始紀錄保留中文 · 不上傳輸入",
          )}
        </p>
      </header>
      <div
        className={s.toolbar}
        role="group"
        aria-label={t("体验方式", "Experience mode", "體驗方式")}
      >
        <button
          aria-pressed={mode === "replay"}
          onClick={() => setMode("replay")}
        >
          {t("01 真实记录回放", "01 Recorded run", "01 真實紀錄回放")}
        </button>
        <button aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>
          {t("02 裁剪请求", "02 Edit the request", "02 裁剪請求")}
        </button>
      </div>
      {mode === "replay" ? (
        <>
          <div
            className={s.steps}
            role="group"
            aria-label={t("选择轮次", "Choose a turn", "選擇輪次")}
          >
            {labels.map((label, i) => (
              <button
                key={i}
                aria-pressed={turn === i}
                onClick={() => setTurn(i)}
              >
                <span>0{i + 1}</span>
                {label}
              </button>
            ))}
          </div>
          <div className={s.columns}>
            <div className={s.panel}>
              <h3>{t("发出什么", "What was sent", "送出什麼")}</h3>
              <p className={s.caption}>
                {t(
                  "根据作者对话记录还原的消息列表，不是抓包原文。",
                  "Message list reconstructed from the author’s transcript; not a raw network capture.",
                  "根據作者對話紀錄還原的訊息列表，不是封包原文。",
                )}
              </p>
              <ol className={s.messages}>
                {request.messages.map((m, i) => (
                  <li key={i} data-role={m.role}>
                    <small>
                      {m.role === "user"
                        ? t("用户", "User", "使用者")
                        : t("助手", "Assistant", "助手")}
                    </small>
                    <p lang="zh-CN">{m.content}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className={s.observation}>
              <p className="eyebrow">
                {t(
                  "实际观察 / 作者记录",
                  "Observation / Author transcript",
                  "實際觀察 / 作者紀錄",
                )}
              </p>
              <blockquote lang="zh-CN">
                {memoryRun.turns[turn].answer}
              </blockquote>
              <dl className={s.usage}>
                {["Input", "Output", "Total"].map((label, i) => (
                  <div key={label}>
                    <dt>
                      {
                        [
                          t("输入", "Input", "輸入"),
                          t("输出", "Output", "輸出"),
                          t("合计", "Total", "合計"),
                        ][i]
                      }
                    </dt>
                    <dd>{memoryRun.turns[turn].usage[i]}</dd>
                  </div>
                ))}
              </dl>
              <p className={s.caption}>
                {t(
                  "Token 来自这一次运行，不是当前请求估算、固定价格或性能指标。",
                  "Token counts belong to this historical run, not a current estimate, price or benchmark.",
                  "Token 來自這一次執行，不是目前請求估算、固定價格或效能指標。",
                )}
              </p>
              <p>
                {turn === 2
                  ? t(
                      "当前问题没有 Java；此前用户消息与助手回答中都包含 Java。不能仅凭这一例证明模型每次都能正确利用历史。",
                      "The current question does not mention Java. Both prior user and assistant messages do. This single example does not establish reliable recall.",
                      "目前問題沒有 Java；此前使用者訊息與助手回答中都包含 Java。不能僅憑這一例證明模型每次都能正確利用歷史。",
                    )
                  : t(
                      "继续查看下一轮，观察已有回答如何进入下一次请求。",
                      "Move to the next turn to see how the answer becomes part of the next request.",
                      "繼續查看下一輪，觀察已有回答如何進入下一次請求。",
                    )}
              </p>
              {turn < 2 ? (
                <button onClick={() => setTurn(turn + 1)}>
                  {t("下一轮 →", "Next turn →", "下一輪 →")}
                </button>
              ) : (
                <button onClick={() => setMode("edit")}>
                  {t(
                    "亲手移除历史 →",
                    "Remove history yourself →",
                    "親手移除歷史 →",
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            className={s.toolbar}
            role="group"
            aria-label={t("历史策略", "History strategy", "歷史策略")}
          >
            <button onClick={() => setIds(recordedHistory.map((m) => m.id))}>
              {t("完整历史", "Full history", "完整歷史")}
            </button>
            <button onClick={() => setIds(["u1", "a1"])}>
              {t("最近一轮", "Last turn", "最近一輪")}
            </button>
            <button onClick={() => setIds([])}>
              {t("不带历史", "No history", "不帶歷史")}
            </button>
          </div>
          <div className={s.columns}>
            <fieldset className={s.panel}>
              <legend>
                {t("保留哪些消息？", "Which messages stay?", "保留哪些訊息？")}
              </legend>
              {recordedHistory.map((m, i) => (
                <label className={s.message} key={m.id}>
                  <input
                    type="checkbox"
                    checked={ids.includes(m.id)}
                    onChange={(e) =>
                      setIds(
                        e.target.checked
                          ? [...ids, m.id]
                          : ids.filter((id) => id !== m.id),
                      )
                    }
                  />
                  <span>
                    <small>
                      {i + 1} ·{" "}
                      {m.role === "user"
                        ? t("用户", "User", "使用者")
                        : t("助手", "Assistant", "助手")}
                    </small>
                    <span lang="zh-CN">{m.content}</span>
                  </span>
                </label>
              ))}
              <p className={s.question}>
                {t(
                  "当前问题始终保留：",
                  "Current question is always included:",
                  "目前問題一律保留：",
                )}
                <span lang="zh-CN">我正在学习什么</span>
              </p>
            </fieldset>
            <div className={s.observation}>
              <h3>
                {t(
                  "检查输入中的证据",
                  "Inspect input evidence",
                  "檢查輸入中的證據",
                )}
              </h3>
              <p role="status">
                {evidence.length
                  ? t(
                      `还有 ${evidence.length} 条消息包含 Java。`,
                      `Java remains in ${evidence.length} message(s).`,
                      `還有 ${evidence.length} 條訊息包含 Java。`,
                    )
                  : t(
                      "当前请求没有提供学习主题。",
                      "No learning topic is supplied in this request.",
                      "目前請求沒有提供學習主題。",
                    )}
              </p>
              <p>
                {t(
                  "删除用户的事实消息后，助手的回答也可能保留同一事实。要验证信息是否真的被移除，需要检查整个请求。",
                  "An assistant reply can repeat a fact after the user’s original message is removed. Inspect the entire request before concluding that a fact is absent.",
                  "刪除使用者的事實訊息後，助手的回答也可能保留同一事實。要驗證資訊是否真的被移除，需要檢查整個請求。",
                )}
              </p>
              <div className={s.empty}>
                <strong>
                  {t("尚未调用模型", "Model not called", "尚未呼叫模型")}
                </strong>
                <p>
                  {t(
                    "不会用原来的成功回答填充修改后的请求。这里仅检查固定记录中的事实，不预测模型回答。",
                    "The original successful answer is never reused for an edited request. This checks facts in a fixed transcript, not future model output.",
                    "不會用原來的成功回答填充修改後的請求。這裡僅檢查固定紀錄中的事實，不預測模型回答。",
                  )}
                </p>
              </div>
              <button onClick={download}>
                {t(
                  "导出请求 JSON ↓",
                  "Export request JSON ↓",
                  "匯出請求 JSON ↓",
                )}
              </button>
            </div>
          </div>
        </>
      )}
      <details className={s.json}>
        <summary>
          {t("查看消息 JSON", "Inspect message JSON", "檢視訊息 JSON")} ·{" "}
          {request.messages.length} {t("条", "messages", "條")}
        </summary>
        <pre tabIndex={0}>
          <code>{JSON.stringify(request, null, 2)}</code>
        </pre>
      </details>
      <footer className={s.footer}>
        <Link to="/docs/ai-apps/java-first-llm">
          {t(
            "阅读原始实践记录 →",
            "Read the original article →",
            "閱讀原始實作紀錄 →",
          )}
        </Link>
        <a
          href="https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/03-multi-turn-chat"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t(
            "运行配套 Java Demo ↗",
            "Run the Java demo ↗",
            "執行配套 Java Demo ↗",
          )}
        </a>
      </footer>
    </section>
  );
}
