"use client";
import { useEffect, useRef, useState } from "react";
import { useText } from "./Shell";
import styles from "./ConversationWorkbench.module.css";

export default function ConversationWorkbench() {
  const t = useText();
  const section = useRef(null);
  useEffect(() => {
    if (window.location.hash !== "#conversation-workbench") return;
    const frame = requestAnimationFrame(() =>
      section.current?.scrollIntoView({ behavior: "instant", block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  const [included, setIncluded] = useState([true, true]);
  const [summary, setSummary] = useState(false);
  const history = [
    {
      role: "user",
      content: t(
        "我正在学习 Java。",
        "I am learning Java.",
        "我正在學習 Java。",
      ),
    },
    {
      role: "assistant",
      content: t(
        "我们可以从接口开始。",
        "We can start with interfaces.",
        "我們可以從介面開始。",
      ),
    },
  ];
  const question = {
    role: "user",
    content: t(
      "我正在学习什么？你建议从哪里开始？",
      "What am I learning? Where did you suggest starting?",
      "我正在學習什麼？你建議從哪裡開始？",
    ),
  };
  const selected = history.filter((_, i) => included[i]);
  const messages = [
    ...(summary && selected.length
      ? [
          {
            role: "user",
            content:
              t("历史摘要：", "History summary: ", "歷史摘要：") +
              selected.map((m) => m.content).join(" "),
          },
        ]
      : selected),
    question,
  ];
  return (
    <section
      id="conversation-workbench"
      ref={section}
      className={styles.workbench}
      aria-labelledby="workbench-title"
    >
      <p className="eyebrow">
        {t(
          "动手理解 / 对话上下文",
          "Try it / Conversation context",
          "動手理解 / 對話上下文",
        )}
      </p>
      <h2 id="workbench-title">
        {t(
          "模型的“记忆”，由谁带上？",
          "Who brings the model’s “memory”?",
          "模型的「記憶」，由誰帶上？",
        )}
      </h2>
      <p>
        {t(
          "取消一条历史消息，观察右侧请求。聊天界面里的记录，只有被放进这次请求，才能成为这次输入的一部分。",
          "Uncheck a past message and inspect the request. A message in the chat history becomes part of this input only when it is included in this request.",
          "取消一條歷史訊息，觀察右側請求。聊天介面裡的記錄，只有被放進這次請求，才能成為這次輸入的一部分。",
        )}
      </p>
      <p className={styles.caption}>
        {t(
          "本地教学演示 · 固定示例 · 不调用 API · 不生成模型回答",
          "Local teaching demo · Fixed examples · No API calls or model responses",
          "本機教學演示 · 固定範例 · 不呼叫 API · 不生成模型回答",
        )}
      </p>
      <div className={styles.columns}>
        <div>
          <h3>
            {t("对话记忆侦探", "Conversation memory detective", "對話記憶偵探")}
          </h3>
          <label className={styles.message}>
            <input
              type="checkbox"
              checked={summary}
              onChange={(e) => setSummary(e.target.checked)}
            />
            {t(
              "把选中历史改为摘要",
              "Summarize selected history",
              "把選中歷史改為摘要",
            )}
          </label>
          <p className={styles.caption}>
            {t(
              "摘要只保留勾选的事实，不会找回已移除的信息。这里用固定规则拼接，不由模型生成。",
              "The summary keeps selected facts only; removed information cannot be recovered. This is a rule-based summary, not model output.",
              "摘要只保留勾選的事實，不會找回已移除的資訊。這裡用固定規則串接，不由模型生成。",
            )}
          </p>
          <fieldset className={styles.history}>
            <legend>
              {t(
                "带上哪些历史？",
                "Which history should we send?",
                "帶上哪些歷史？",
              )}
            </legend>
            {history.map((message, i) => (
              <label key={message.role} className={styles.message}>
                <input
                  type="checkbox"
                  checked={included[i]}
                  onChange={(e) =>
                    setIncluded(
                      included.map((value, j) =>
                        i === j ? e.target.checked : value,
                      ),
                    )
                  }
                />
                <span>
                  <small>
                    {i === 0
                      ? t(
                          "上一轮 · 用户",
                          "Previous turn · User",
                          "上一輪 · 使用者",
                        )
                      : t(
                          "上一轮 · 助手",
                          "Previous turn · Assistant",
                          "上一輪 · 助手",
                        )}
                  </small>
                  <span>{message.content}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className={styles.question}>
            <small>
              {t(
                "当前问题 · 始终发送",
                "Current question · Always included",
                "目前問題 · 一律傳送",
              )}
            </small>
            <p>{question.content}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIncluded([true, true]);
              setSummary(false);
            }}
          >
            {t("恢复完整上下文", "Restore full context", "恢復完整上下文")}
          </button>
        </div>
        <div className={styles.request}>
          <p className={styles.caption}>
            {t("请求预览", "Request preview", "請求預覽")} · {messages.length}{" "}
            {t("条消息", "messages", "條訊息")}
          </p>
          <pre
            tabIndex={0}
            aria-label={t("请求 JSON", "Request JSON", "請求 JSON")}
          >
            <code>
              {JSON.stringify({ model: "agnes-2.5-flash", messages }, null, 2)}
            </code>
          </pre>
        </div>
      </div>
      <div className={styles.evidence} role="status">
        <strong>
          {t(
            "这次请求里的线索",
            "Evidence in this request",
            "這次請求裡的線索",
          )}
        </strong>
        <ul>
          <li>
            {included[0]
              ? t(
                  "包含学习主题：Java。",
                  "Learning topic included: Java.",
                  "包含學習主題：Java。",
                )
              : t(
                  "没有提供学习主题，无法据此确定你正在学什么。",
                  "No learning topic is supplied, so this input does not establish what you are learning.",
                  "沒有提供學習主題，無法據此確定你正在學什麼。",
                )}
          </li>
          <li>
            {included[1]
              ? t(
                  "包含助手之前的建议：从接口开始。",
                  "Previous suggestion included: start with interfaces.",
                  "包含助手之前的建議：從介面開始。",
                )
              : t(
                  "没有提供助手之前的建议。",
                  "The assistant’s previous suggestion is absent.",
                  "沒有提供助手之前的建議。",
                )}
          </li>
        </ul>
        <p>
          {t(
            "这是对输入的检查，不是对模型输出的预测。真实模型仍可能答错；缺少信息时，也不保证它会主动说不知道。",
            "This checks the input, not the model’s future output. A real model can still make mistakes or guess when information is missing.",
            "這是對輸入的檢查，不是對模型輸出的預測。真實模型仍可能答錯；缺少資訊時，也不保證它會主動說不知道。",
          )}
        </p>
      </div>
    </section>
  );
}
