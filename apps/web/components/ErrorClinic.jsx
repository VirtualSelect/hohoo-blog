"use client";
import { useState } from "react";
import { useText } from "./Shell";
import styles from "./LearningExercises.module.css";
export default function ErrorClinic() {
  const t = useText(),
    [kind, setKind] = useState(0),
    [step, setStep] = useState(0);
  const cases = [
    {
      name: "401",
      checks: [
        t(
          "先确认 HTTP 状态码；不要把错误响应当作聊天回答解析。",
          "Check the HTTP status before treating an error body as a chat answer.",
          "先確認 HTTP 狀態碼；不要把錯誤回應當作聊天回答解析。",
        ),
        t(
          "检查环境变量是否存在、Bearer 前缀及 Key 是否有效；不要打印密钥。",
          "Check the environment variable, Bearer prefix and key validity. Never print the secret.",
          "檢查環境變數是否存在、Bearer 前綴及 Key 是否有效；不要印出金鑰。",
        ),
        t(
          "修正凭证后再手动重试；同一个失效 Key 反复重试没有帮助。",
          "Correct credentials before retrying manually. Repeating an invalid key will not help.",
          "修正憑證後再手動重試；同一個失效 Key 反覆重試沒有幫助。",
        ),
      ],
      code: 'String key = System.getenv("AGNES_API_KEY");\nif (key == null || key.trim().isEmpty()) {\n    throw new IllegalStateException("Missing API key");\n}\nconnection.setRequestProperty("Authorization", "Bearer " + key);',
    },
    {
      name: "429",
      checks: [
        t(
          "读取错误类型，区分请求频率、并发限制与账户额度。",
          "Read the error type: rate, concurrency and account quota need different fixes.",
          "讀取錯誤類型，區分請求頻率、並行限制與帳戶額度。",
        ),
        t(
          "查看 Retry-After（可能为秒数或 HTTP 日期），同时核对提供商文档。",
          "Inspect Retry-After (seconds or an HTTP date) and provider documentation.",
          "查看 Retry-After（可能為秒數或 HTTP 日期），同時核對供應商文件。",
        ),
        t(
          "限制重试次数，退避并加入抖动；额度不足先处理账户问题，不要无限重试。",
          "Bound retries and use backoff with jitter. Resolve quota issues rather than retrying indefinitely.",
          "限制重試次數，退避並加入抖動；額度不足先處理帳戶問題，不要無限重試。",
        ),
      ],
      code: 'int status = connection.getResponseCode();\nif (status == 429) {\n    String retryAfter = connection.getHeaderField("Retry-After");\n    // Return a retryable result to a bounded retry policy.\n    // Parse seconds OR HTTP-date; do not retry blindly here.\n}',
    },
    {
      name: t("读取超时", "Read timeout", "讀取逾時"),
      checks: [
        t(
          "区分连接超时与读取超时；它不是 HTTP 408 或 504 响应。",
          "Distinguish connect and read timeouts; this is not an HTTP 408 or 504 response.",
          "區分連線逾時與讀取逾時；它不是 HTTP 408 或 504 回應。",
        ),
        t(
          "核对读取等待配置、网络与提供商状态；读取超时不是整次请求总时限。",
          "Check the read timeout, network and provider status. A read timeout is not a total request deadline.",
          "核對讀取等待設定、網路與供應商狀態；讀取逾時不是整次請求總時限。",
        ),
        t(
          "客户端超时不能证明服务端未执行。重试前考虑重复执行与重复计费。",
          "A client timeout does not prove non-execution. Consider duplicate work and billing before retrying.",
          "用戶端逾時不能證明伺服器未執行。重試前考慮重複執行與重複計費。",
        ),
      ],
      code: "connection.setConnectTimeout(10_000);\nconnection.setReadTimeout(90_000);\ntry {\n    int status = connection.getResponseCode();\n} catch (java.net.SocketTimeoutException e) {\n    // Record the failure stage, not the API key.\n    // Check provider state before deciding to retry.\n}",
    },
    {
      name: t("JSON 解析失败", "JSON parsing failure", "JSON 解析失敗"),
      checks: [
        t(
          "先检查状态码和 Content-Type；错误页可能是 HTML，流式响应也不是单个 JSON。",
          "Check status and Content-Type first: an error page may be HTML and a stream is not one JSON document.",
          "先檢查狀態碼和 Content-Type；錯誤頁可能是 HTML，串流回應也不是單個 JSON。",
        ),
        t(
          "确认响应接收完整，再检查 choices、message、content 的存在与类型。",
          "Wait for a complete response, then validate choices, message and content types.",
          "確認回應接收完整，再檢查 choices、message、content 的存在與型別。",
        ),
        t(
          "使用项目已有 JSON 库，分别处理语法错误与字段缺失；保存脱敏诊断信息。",
          "Use your existing JSON library; distinguish syntax errors from missing fields and retain redacted diagnostics.",
          "使用專案已有 JSON 函式庫，分別處理語法錯誤與欄位缺失；保留去識別化診斷資訊。",
        ),
      ],
      code: 'int status = connection.getResponseCode();\nString contentType = connection.getContentType();\nif (status < 200 || status >= 300) {\n    throw new java.io.IOException("HTTP " + status);\n}\nif (contentType == null || !contentType.toLowerCase(java.util.Locale.ROOT).contains("json")) {\n    throw new java.io.IOException("Expected a JSON response");\n}\n// Parse the complete body with your JSON library, then validate fields.',
    },
  ];
  const c = cases[kind];
  return (
    <section className={styles.exercise}>
      <h2>{t("错误诊疗室", "Error clinic", "錯誤診療室")}</h2>
      <p>
        {t(
          "选择症状，逐步排查。以下是教学代码片段，不会发送请求，不包含完整重试实现。",
          "Pick a symptom and investigate step by step. Teaching snippets only: no requests and no complete retry implementation.",
          "選擇症狀，逐步排查。以下是教學程式碼片段，不會傳送請求，不包含完整重試實作。",
        )}
      </p>
      <div className={styles.choices}>
        {cases.map((c, i) => (
          <button
            key={i}
            aria-pressed={kind === i}
            onClick={() => {
              setKind(i);
              setStep(0);
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
      <ol>
        {c.checks.slice(0, step + 1).map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ol>
      <div className={styles.choices}>
        <button disabled={step === 2} onClick={() => setStep((s) => s + 1)}>
          {t("下一项检查", "Next check", "下一項檢查")}
        </button>
        <button onClick={() => setStep(0)}>
          {t("重新排查", "Start over", "重新排查")}
        </button>
      </div>
      <pre tabIndex={0}>
        <code>{c.code}</code>
      </pre>
      <p className={styles.muted}>
        <a href="https://docs.oracle.com/javase/8/docs/api/java/net/URLConnection.html">
          Java 8 URLConnection
        </a>{" "}
        ·{" "}
        <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429">
          HTTP 429
        </a>
      </p>
    </section>
  );
}
