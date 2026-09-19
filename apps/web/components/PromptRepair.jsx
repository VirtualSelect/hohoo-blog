"use client";
import { useState } from "react";
import { useText } from "./Shell";
import styles from "./LearningExercises.module.css";
export default function PromptRepair() {
  const t = useText(),
    [included, setIncluded] = useState([false, false, false, false]);
  const parts = [
    [
      t("目标", "Goal", "目標"),
      t(
        "用 Java 8 编写一个读取聊天接口响应的示例。",
        "Write a Java 8 example that reads a chat API response.",
        "用 Java 8 編寫一個讀取聊天介面回應的範例。",
      ),
    ],
    [
      t("约束", "Constraints", "限制"),
      t(
        "API Key 从环境变量读取；不要写进代码；分别处理连接与读取超时。",
        "Read the API key from an environment variable, never hardcode it; handle connection and read timeouts separately.",
        "API Key 從環境變數讀取；不要寫進程式碼；分別處理連線與讀取逾時。",
      ),
    ],
    [
      t("输入", "Input", "輸入"),
      t(
        "输入为用户的一行问题；接口返回 JSON，回答字段为 choices[0].message.content。",
        "Input is one user question; the API returns JSON with the answer at choices[0].message.content.",
        "輸入為使用者的一行問題；介面回傳 JSON，回答欄位為 choices[0].message.content。",
      ),
    ],
    [
      t("验收条件", "Acceptance criteria", "驗收條件"),
      t(
        "给出运行步骤；正常响应只打印回答；非 200、字段缺失和超时分别提供明确提示。",
        "Include run instructions; print the answer on success; distinguish non-200 responses, missing fields and timeouts.",
        "給出執行步驟；正常回應只印出回答；非 200、欄位缺失和逾時分別提供明確提示。",
      ),
    ],
  ];
  const vague = t("帮我写代码。", "Help me write code.", "幫我寫程式碼。");
  return (
    <section className={styles.exercise} aria-labelledby="prompt-title">
      <h2 id="prompt-title">
        {t("提示词修理铺", "Prompt repair shop", "提示詞修理鋪")}
      </h2>
      <p>
        {t(
          "勾选补充条件，对比请求从模糊到可检查的变化。",
          "Add requirements and compare a vague request with a checkable one.",
          "勾選補充條件，對比請求從模糊到可檢查的變化。",
        )}
      </p>
      <p className={styles.muted}>
        {t(
          "本地结构演示，不调用模型，不给提示词打效果分，也不保证模型遵循要求。",
          "Local structure demo: no model calls or quality scores. Requirements do not guarantee compliance.",
          "本機結構演示，不呼叫模型，不給提示詞打效果分，也不保證模型遵循要求。",
        )}
      </p>
      <fieldset>
        <legend>{t("补充什么？", "What should we add?", "補充什麼？")}</legend>
        {parts.map(([label, body], i) => (
          <label key={i}>
            <input
              type="checkbox"
              checked={included[i]}
              onChange={(e) =>
                setIncluded((v) =>
                  v.map((x, j) => (i === j ? e.target.checked : x)),
                )
              }
            />
            <span>
              {label}
              <small>{body}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={styles.columns}>
        <div>
          <h3>{t("原始请求", "Before", "原始請求")}</h3>
          <pre>{vague}</pre>
        </div>
        <div>
          <h3>{t("修理后的请求", "After", "修理後的請求")}</h3>
          <pre>
            {parts
              .filter((_, i) => included[i])
              .map(([a, b]) => `${a}：${b}`)
              .join("\n\n") || vague}
          </pre>
        </div>
      </div>
      <p role="status">
        {t("仍需明确", "Still unspecified", "仍需明確")}：
        {parts
          .filter((_, i) => !included[i])
          .map(([a]) => a)
          .join(" / ") ||
          t(
            "示例条件已补齐，仍需实际运行验证。",
            "Example requirements complete; execution still needs testing.",
            "範例條件已補齊，仍需實際執行驗證。",
          )}
      </p>
      <button onClick={() => setIncluded([false, false, false, false])}>
        {t("重置", "Reset", "重設")}
      </button>
    </section>
  );
}
