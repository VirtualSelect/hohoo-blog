"use client";
import { useState } from "react";
import { useText } from "./Shell";
import styles from "./RequestJourney.module.css";

export default function RequestJourney() {
  const t = useText();
  const [scenario, setScenario] = useState("success");
  const [step, setStep] = useState(0);
  const scenarios = [
    ["success", t("正常响应", "Successful response", "正常回應")],
    ["auth", t("鉴权失败", "Authentication failure", "驗證失敗")],
    ["timeout", t("读取超时", "Read timeout", "讀取逾時")],
  ];
  const stages = [
    {
      title: t("准备请求", "Prepare", "準備請求"),
      text: t(
        "程序从环境变量读取密钥，把模型名称与消息列表序列化成 JSON。密钥不属于消息正文。",
        "The program reads the key from an environment variable and serializes the model and messages as JSON. The key is not part of the conversation.",
        "程式從環境變數讀取金鑰，把模型名稱與訊息列表序列化成 JSON。金鑰不屬於訊息正文。",
      ),
      code: 'model: "agnes-2.5-flash"\nmessages: [{ role: "user", content: "Hello" }]',
    },
    {
      title: t("发送", "Send", "傳送"),
      text: t(
        "客户端通过 HTTPS 发送 POST 请求。Authorization 用于鉴权，Content-Type 告诉服务端正文是 JSON。这里仅展示结构，不发送网络请求。",
        "The client sends a POST request over HTTPS. Authorization supplies credentials; Content-Type identifies JSON. This demo shows the structure without making a network request.",
        "用戶端透過 HTTPS 傳送 POST 請求。Authorization 用於驗證，Content-Type 告訴伺服器正文是 JSON。這裡僅展示結構，不傳送網路請求。",
      ),
      code: "POST /v1/chat/completions\nAuthorization: Bearer <API_KEY>\nContent-Type: application/json",
    },
    {
      title: t("等待返回", "Wait", "等待回傳"),
      text: t(
        "客户端等待服务端返回数据。这时仅凭等待，不能判断是在网络传输、排队还是模型生成；需要日志与监控才能定位。",
        "The client waits for data. Waiting alone cannot tell us whether the delay is networking, queuing, or generation; diagnosis requires logs and monitoring.",
        "用戶端等待伺服器回傳資料。這時僅憑等待，不能判斷是在網路傳輸、排隊還是模型生成；需要日誌與監控才能定位。",
      ),
      code: t(
        "等待响应数据…（教学步骤，不是真实计时）",
        "Awaiting response data… (teaching step, not a live timer)",
        "等待回應資料…（教學步驟，不是真實計時）",
      ),
    },
  ];
  const outcomes = {
    success: [
      {
        title: t("收到响应", "Receive", "收到回應"),
        text: t(
          "本场景收到 HTTP 200，正文中有 choices。接下来仍要检查 JSON 结构，不能直接假定数组和字段都存在。",
          "This scenario receives HTTP 200 with choices in the body. Validate the JSON structure before assuming arrays and fields exist.",
          "本場景收到 HTTP 200，正文中有 choices。接下來仍要檢查 JSON 結構，不能直接假定陣列和欄位都存在。",
        ),
        code: 'HTTP 200\n{ "choices": [{ "message": { "role": "assistant", "content": "Hello!" } }] }',
      },
      {
        title: t("解析与核验", "Parse and verify", "解析與核驗"),
        text: t(
          "校验字段后，取 choices[0].message.content。HTTP 200 只说明请求成功，回答的事实、格式与适用性还需要单独检查。成功取得回答后，才把助手消息加入对话历史。",
          "After validation, read choices[0].message.content. HTTP 200 does not establish factual accuracy or format compliance. Add the assistant message to history only after obtaining a valid response.",
          "驗證欄位後，取 choices[0].message.content。HTTP 200 只說明請求成功，回答的事實、格式與適用性還需要單獨檢查。成功取得回答後，才把助手訊息加入對話歷史。",
        ),
        code: 'choices[0].message.content → "Hello!"',
      },
    ],
    auth: [
      {
        title: t("鉴权被拒绝", "Authentication rejected", "驗證被拒絕"),
        text: t(
          "本教学场景返回 HTTP 401。它是错误响应，不能按成功回答的 choices 结构提取文本。实际错误正文格式由服务提供方决定。",
          "This teaching scenario returns HTTP 401. It is an error response, not a successful choices payload. The provider determines the actual error-body format.",
          "本教學場景回傳 HTTP 401。它是錯誤回應，不能按成功回答的 choices 結構提取文字。實際錯誤正文格式由服務提供方決定。",
        ),
        code: "HTTP 401 Unauthorized",
      },
      {
        title: t("检查凭证", "Check credentials", "檢查憑證"),
        text: t(
          "检查密钥是否加载、Authorization 格式以及密钥是否仍有效。Java HttpURLConnection 可通过 getErrorStream() 读取错误正文（也可能为空）。日志中不要打印密钥；失败时不伪造助手消息。",
          "Check that the key is loaded, the Authorization format is correct, and the key is valid. Java HttpURLConnection can expose an error body through getErrorStream(), which may be null. Never log the key or fabricate an assistant reply.",
          "檢查金鑰是否載入、Authorization 格式以及金鑰是否仍有效。Java HttpURLConnection 可透過 getErrorStream() 讀取錯誤正文（也可能為空）。日誌中不要列印金鑰；失敗時不偽造助手訊息。",
        ),
        code: "getResponseCode() → 401\ngetErrorStream() → error body / null",
      },
    ],
    timeout: [
      {
        title: t("等待超时", "Read timed out", "等待逾時"),
        text: t(
          "本场景在读取阶段超过等待上限。读取超时不等同于 HTTP 408 或 504，也不能证明服务端没有处理请求。客户端可能还没有拿到状态码。",
          "This scenario exceeds the read waiting limit. A read timeout is not HTTP 408 or 504 and does not prove the server did not process the request. The client may not have received a status code.",
          "本場景在讀取階段超過等待上限。讀取逾時不等同於 HTTP 408 或 504，也不能證明伺服器沒有處理請求。用戶端可能還沒有拿到狀態碼。",
        ),
        code: "java.net.SocketTimeoutException: Read timed out",
      },
      {
        title: t("保留不确定性", "Handle uncertainty", "保留不確定性"),
        text: t(
          "检查网络、服务状态与超时设置。本教程失败时撤回本次用户消息，保留此前成功的历史；不自动重试。真实应用若增加重试，需要评估重复执行与费用风险。",
          "Check the network, service health, and timeout configuration. This tutorial removes the failed turn’s user message while keeping earlier successful history, without automatic retries. Production retries need duplicate-execution and cost considerations.",
          "檢查網路、服務狀態與逾時設定。本教學失敗時撤回本次使用者訊息，保留此前成功的歷史；不自動重試。真實應用若增加重試，需要評估重複執行與費用風險。",
        ),
        code: t(
          "保留成功历史 → 提示错误 → 等待用户决定",
          "Keep successful history → Report error → Await user decision",
          "保留成功歷史 → 提示錯誤 → 等待使用者決定",
        ),
      },
    ],
  };
  const steps = [...stages, ...outcomes[scenario]];
  const current = steps[step];
  return (
    <section className={styles.journey} aria-labelledby="request-journey-title">
      <p className="eyebrow">
        {t("动手理解 / HTTP", "Try it / HTTP", "動手理解 / HTTP")}
      </p>
      <h2 id="request-journey-title">
        {t("一次请求的旅行", "The journey of a request", "一次請求的旅行")}
      </h2>
      <p>
        {t(
          "从发送到解析，亲手走一遍。再换一个场景，看看流程在哪一步分岔。",
          "Walk from sending to parsing. Then change the scenario to see where the paths diverge.",
          "從傳送到解析，親手走一遍。再換一個場景，看看流程在哪一步分岔。",
        )}
      </p>
      <p className={styles.note}>
        {t(
          "固定教学示例 · 无网络调用、真实计时或费用 · 示例回答不是模型实测结果",
          "Fixed teaching examples · No network calls, live timing, or fees · Sample replies are not model results",
          "固定教學範例 · 無網路呼叫、真實計時或費用 · 範例回答不是模型實測結果",
        )}
      </p>
      <fieldset className={styles.scenarios}>
        <legend>{t("选择场景", "Choose a scenario", "選擇場景")}</legend>
        {scenarios.map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="request-scenario"
              checked={scenario === value}
              onChange={() => {
                setScenario(value);
                setStep(0);
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <ol className={styles.path}>
        {steps.map((item, i) => (
          <li key={i} aria-current={step === i ? "step" : undefined}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {item.title}
          </li>
        ))}
      </ol>
      <div className={styles.stage} aria-live="polite" aria-atomic="true">
        <h3>
          {String(step + 1).padStart(2, "0")} / {current.title}
        </h3>
        <p>{current.text}</p>
        <pre tabIndex={0}>
          <code>{current.code}</code>
        </pre>
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((value) => value - 1)}
        >
          ← {t("上一步", "Back", "上一步")}
        </button>
        <span>
          {step + 1} / {steps.length}
        </span>
        <button
          type="button"
          onClick={() =>
            setStep((value) => (value === steps.length - 1 ? 0 : value + 1))
          }
        >
          {step === steps.length - 1
            ? t("重新走一遍", "Start again", "重新走一遍")
            : step === 0
              ? t("模拟发送", "Simulate sending", "模擬傳送")
              : t("下一步", "Next", "下一步")}{" "}
          →
        </button>
      </div>
    </section>
  );
}
