"use client";
import { useText } from "./Shell";
export default function PracticeEvidence() {
  const t = useText();
  return (
    <section
      className="practice-evidence"
      aria-label={t("代码与观察", "Code and observation", "程式碼與觀察")}
    >
      <p className="eyebrow">
        {t(
          "实践对照 · 来自本文记录",
          "Practice comparison · from this article",
          "實作對照 · 來自本文紀錄",
        )}
      </p>
      <h2>
        {t(
          "写进程序的，与实际观察到的。",
          "The code and the observation.",
          "寫進程式的，與實際觀察到的。",
        )}
      </h2>
      <div className="evidence-pair">
        <div>
          <h3>{t("01 / 保留历史", "01 / Keep history", "01 / 保留歷史")}</h3>
          <pre>
            <code>
              {
                'history.add(new ChatMessage("user", question));\nChatResponse response = request(history);\nhistory.add(new ChatMessage("assistant", response.content));'
              }
            </code>
          </pre>
          <p>
            {t(
              "简化流程；完整 Demo 还处理失败后的历史回退。",
              "Simplified flow; the full demo also rolls back history after failure.",
              "簡化流程；完整 Demo 還處理失敗後的歷史回退。",
            )}
          </p>
        </div>
        <div>
          <h3>
            {t(
              "观察 / 能接上前文",
              "Observation / Context retained",
              "觀察 / 能接上前文",
            )}
          </h3>
          <p>
            {t(
              "先输入“我正在学习Java”，下一轮只问“我正在学习什么”，得到“你正在学习 Java！”的回答。",
              "After “I am learning Java”, the next question “What am I learning?” received an answer identifying Java.",
              "先輸入「我正在学习Java」，下一輪只問「我正在学习什么」，得到「你正在学习 Java！」的回答。",
            )}
          </p>
          <p className="evidence-limit">
            {t(
              "结论边界：这是一次实际对话记录，不代表永久记忆或模型效果评测。",
              "Limit: one recorded conversation, not permanent memory or a model benchmark.",
              "結論邊界：這是一次實際對話紀錄，不代表永久記憶或模型效果評測。",
            )}
          </p>
        </div>
      </div>
      <details>
        <summary>
          {t(
            "错误 → 调整 → 再观察",
            "Error → change → observation",
            "錯誤 → 調整 → 再觀察",
          )}
        </summary>
        <ol className="error-comparison">
          <li>
            <strong>Read timed out</strong>
            <p>
              {t(
                "当时读取等待上限为 30 秒。",
                "The read timeout was 30 seconds.",
                "當時讀取等待上限為 30 秒。",
              )}
            </p>
          </li>
          <li>
            <strong>30s → 90s</strong>
            <p>
              {t(
                "仅增加读取等待时间，连接等待仍为 10 秒。",
                "Only the read timeout changed; connect timeout stayed at 10 seconds.",
                "僅增加讀取等待時間，連線等待仍為 10 秒。",
              )}
            </p>
          </li>
          <li>
            <strong>HTTP 200</strong>
            <p>
              {t(
                "手动重试后成功，不能由此断定最初超时的原因。",
                "A manual retry succeeded; that does not establish the original cause.",
                "手動重試後成功，不能由此斷定最初逾時的原因。",
              )}
            </p>
          </li>
        </ol>
      </details>
    </section>
  );
}
