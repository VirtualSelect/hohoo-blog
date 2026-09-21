"use client";
import { useState } from "react";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import s from "./FlagshipExperience.module.css";

const revision =
  "https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/";
const folders = [
  "01-first-llm-call",
  "02-parse-llm-response",
  "03-multi-turn-chat",
];
const snippets = [
  'String apiKey = System.getenv("AGNES_API_KEY");\nconnection.setRequestMethod("POST");\nconnection.setDoOutput(true);\nconnection.setRequestProperty(\n    "Authorization", "Bearer " + apiKey);',
  'JsonObject root = JsonParser.parseString(responseBody)\n    .getAsJsonObject();\nString answer = root.getAsJsonArray("choices")\n    .get(0).getAsJsonObject()\n    .getAsJsonObject("message")\n    .get("content").getAsString();\nSystem.out.println(answer.trim());',
  'history.add(new ChatMessage("user", question));\nChatResponse response = request(history);\nhistory.add(new ChatMessage(\n    "assistant", response.content));',
];
export default function FlagshipExperience({ mode = "guide", headings = [] }) {
  const t = useText();
  const [stage, setStage] = useState(0),
    [field, setField] = useState("messages");
  const [revealed, setRevealed] = useState(false);
  const stages = [
    t("发出请求", "Request", "發出請求"),
    t("取出回答", "Parse", "取出回答"),
    t("接上前文", "Remember", "接上前文"),
  ];
  const goals = [
    t(
      "用 Java 把问题发给模型。",
      "Send a question from Java.",
      "用 Java 把問題傳給模型。",
    ),
    t(
      "从响应中取出真正的回答。",
      "Extract the answer from the response.",
      "從回應中取出真正的回答。",
    ),
    t(
      "让下一次请求带上对话历史。",
      "Carry history into the next request.",
      "讓下一次請求帶上對話歷史。",
    ),
  ];
  const chapters = headings.filter(
    (h) => h.depth === 2 && /^0[123]/.test(h.text),
  );
  const article = "/docs/ai-apps/java-first-llm";
  if (mode === "cover")
    return (
      <aside className={s.cover} aria-labelledby="cover-title">
        <p className={s.eyebrow}>
          {t("实践手册 / 001", "FIELD GUIDE / 001", "實作手冊 / 001")}{" "}
          <span>Java → AI</span>
        </p>
        <h2 id="cover-title">
          {t(
            "从第一声你好，\n到一段有上下文的对话。",
            "From hello\nto a conversation with context.",
            "從第一聲你好，\n到一段有上下文的對話。",
          )}
        </h2>
        <p>
          {t(
            "用三个真实运行的 Java Demo，看懂请求、响应与记忆。",
            "Three verified Java demos: requests, responses and memory.",
            "用三個真實執行的 Java Demo，看懂請求、回應與記憶。",
          )}
        </p>
        <ol className={s.coverSteps}>
          {stages.map((label, i) => (
            <li key={label}>
              <span>0{i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <div className={s.transcript}>
          <small>
            {t(
              "真实运行摘录 · 非在线调用",
              "Recorded excerpt · not a live call",
              "真實執行摘錄 · 非線上呼叫",
            )}
          </small>
          <p>「我正在学习什么」</p>
          <strong>「你正在学习 Java！」</strong>
        </div>
        <Link className={s.cta} to={article}>
          {t("打开实践手册", "Open the field guide", "開啟實作手冊")}{" "}
          <span aria-hidden="true">↗</span>
        </Link>
        <small>
          Java 8 · HTTP · Gson ·{" "}
          {t("15 分钟阅读", "15 min read", "15 分鐘閱讀")}
        </small>
      </aside>
    );
  const evidence = [
    t(
      "首次 Java 调用返回 HTTP 200；用量为 293 + 104 = 397 Token。记录证明请求成功，不代表模型始终满足提示要求。",
      "The first Java call returned HTTP 200 with 293 + 104 = 397 tokens. Success does not prove instruction compliance.",
      "首次 Java 呼叫回傳 HTTP 200；用量為 293 + 104 = 397 Token。紀錄證明請求成功，不代表模型始終滿足提示要求。",
    ),
    t(
      "输入含双引号的 Java“接口”问题，成功解析并展示回答。该次记录的用量是 299 / 246 / 545。",
      "A question containing quotation marks was sent and its answer parsed successfully. That run reported 299 / 246 / 545 tokens.",
      "輸入含雙引號的 Java「介面」問題，成功解析並顯示回答。該次紀錄的用量是 299 / 246 / 545。",
    ),
    t(
      "先输入“我正在学习Java”，下一轮问“我正在学习什么”，模型回答“你正在学习 Java！”。这是历史被重新发送后的实际记录。",
      "After “I am learning Java”, the next question “What am I learning?” received “You are learning Java!”. The request included the previous messages.",
      "先輸入「我正在学习Java」，下一輪問「我正在学习什么」，模型回答「你正在学习 Java！」。這是歷史被重新傳送後的實際紀錄。",
    ),
  ];
  const questions = [
    t(
      "HTTP 200 是否说明回答一定正确？",
      "Does HTTP 200 guarantee a correct answer?",
      "HTTP 200 是否說明回答一定正確？",
    ),
    t(
      "content 与 total_tokens 是同一层的字段吗？",
      "Are content and total_tokens at the same level?",
      "content 與 total_tokens 是同一層的欄位嗎？",
    ),
    t(
      "关掉 Java 程序再启动，它还记得吗？",
      "Will it remember after restarting Java?",
      "關掉 Java 程式再啟動，它還記得嗎？",
    ),
  ];
  const answers = [
    t(
      "不一定。它表示 HTTP 请求成功，内容质量需要另外验证。",
      "No. It indicates HTTP success; answer quality needs separate checks.",
      "不一定。它表示 HTTP 請求成功，內容品質需要另外驗證。",
    ),
    t(
      "不是。回答在 choices[0].message.content，用量在 usage.total_tokens。",
      "No. The answer is at choices[0].message.content; usage is at usage.total_tokens.",
      "不是。回答在 choices[0].message.content，用量在 usage.total_tokens。",
    ),
    t(
      "本 Demo 的历史仅在进程内存中，重启后不会自动恢复。",
      "History lives in process memory in this demo. Restarting does not restore it.",
      "本 Demo 的歷史僅在處理程序記憶體中，重新啟動後不會自動恢復。",
    ),
  ];
  return (
    <section
      className={s.manual}
      id="practice-manual"
      aria-labelledby="manual-title"
    >
      <header className={s.heading}>
        <p className={s.eyebrow}>
          {t("实践手册 / 001", "FIELD GUIDE / 001", "實作手冊 / 001")}
        </p>
        <h2 id="manual-title">
          {mode === "project"
            ? t(
                "三个阶段，一份可运行的交付。",
                "Three stages. Runnable work.",
                "三個階段，一份可執行的交付。",
              )
            : t(
                "目标：亲手接通一次对话。",
                "Your goal: connect a conversation.",
                "目標：親手接通一次對話。",
              )}
        </h2>
        <p>
          {t(
            "准备 Java 8、IDEA 与自己的 API Key。密钥仅配置在本机环境变量中，不要输入本站。",
            "Bring Java 8, IDEA and your own API key. Store the key in your local environment; never enter it on this site.",
            "準備 Java 8、IDEA 與自己的 API Key。金鑰僅設定在本機環境變數中，不要輸入本站。",
          )}
        </p>
      </header>
      <div
        className={s.selector}
        role="group"
        aria-label={t("选择实践阶段", "Choose a stage", "選擇實作階段")}
      >
        {stages.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-pressed={stage === i}
            onClick={() => {
              setStage(i);
              setRevealed(false);
            }}
          >
            <span>0{i + 1}</span>
            <strong>{label}</strong>
            <small>{goals[i]}</small>
          </button>
        ))}
      </div>
      <div className={s.spread}>
        <div className={s.codePane}>
          <p className={s.eyebrow}>
            {t(
              "关键代码 · 简化片段",
              "Key code · simplified excerpt",
              "關鍵程式碼 · 簡化片段",
            )}
          </p>
          <h3>{goals[stage]}</h3>
          <pre>
            <code>{snippets[stage]}</code>
          </pre>
          <a href={revision + folders[stage]}>
            {t(
              "完整代码与运行说明",
              "Full code and run instructions",
              "完整程式碼與執行說明",
            )}{" "}
            ↗
          </a>
          <p className={s.note}>
            {t(
              "片段用于理解流程；字段校验、资源关闭和错误处理以固定版本的完整 Demo 为准。",
              "Excerpts explain the flow. See the pinned demo for validation, cleanup and error handling.",
              "片段用於理解流程；欄位校驗、資源關閉和錯誤處理以固定版本的完整 Demo 為準。",
            )}
          </p>
        </div>
        <div className={s.observation}>
          <p className={s.eyebrow}>
            {t(
              "运行证据 / 作者记录",
              "EVIDENCE / Recorded run",
              "執行證據 / 作者紀錄",
            )}
          </p>
          <h3>
            {t(
              "实际观察到了什么？",
              "What actually happened?",
              "實際觀察到了什麼？",
            )}
          </h3>
          <p>{evidence[stage]}</p>
          <div className={s.check}>
            <strong>{questions[stage]}</strong>
            <button
              type="button"
              aria-expanded={revealed}
              onClick={() => setRevealed(!revealed)}
            >
              {revealed
                ? t("收起解释", "Hide explanation", "收起解釋")
                : t(
                    "想一想，再看解释",
                    "Think, then reveal",
                    "想一想，再看解釋",
                  )}
            </button>
            {revealed && <p>{answers[stage]}</p>}
          </div>
        </div>
      </div>
      <details className={s.inspect}>
        <summary>
          {t(
            "字段透视：点击一个字段，看它负责什么",
            "Field lens: explore the parts of a request",
            "欄位透視：點擊一個欄位，看它負責什麼",
          )}
        </summary>
        <div className={s.fields}>
          {["model", "messages", "content"].map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={field === key}
              onClick={() => setField(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <p>
          {field === "model"
            ? t(
                "选择调用的模型，不是会话编号。",
                "Selects the model, not a conversation ID.",
                "選擇呼叫的模型，不是對話編號。",
              )
            : field === "messages"
              ? t(
                  "本次发送的消息列表；多轮对话需要在这里包含此前的问题与回答。",
                  "The messages sent this time. Multi-turn chat includes earlier questions and answers here.",
                  "本次傳送的訊息清單；多輪對話需要在這裡包含此前的問題與回答。",
                )
              : t(
                  "一条消息的正文。用户输入和助手回答分别属于不同角色的消息。",
                  "The text of one message. User input and assistant replies have different roles.",
                  "一則訊息的正文。使用者輸入和助手回答分別屬於不同角色的訊息。",
                )}
        </p>
      </details>
      <details className={s.inspect}>
        <summary>
          {t(
            "失败现场：Read timed out",
            "Failure notebook: Read timed out",
            "失敗現場：Read timed out",
          )}
        </summary>
        <p>
          {t(
            "实际遇到读取超时后，将读取等待上限从 30 秒改为 90 秒，连接等待保持 10 秒。手动重试成功，但这不能证明最初失败的原因，也不说明可以无限重试。",
            "After a read timeout, the read limit changed from 30s to 90s; connect timeout stayed at 10s. A manual retry succeeded, but did not establish the cause or justify unlimited retries.",
            "實際遇到讀取逾時後，將讀取等待上限從 30 秒改為 90 秒，連線等待保持 10 秒。手動重試成功，但這不能證明最初失敗的原因，也不說明可以無限重試。",
          )}
        </p>
      </details>
      <footer className={s.footer}>
        {mode === "project" ? (
          <Link to={article}>
            {t(
              "跟着完整教程开始",
              "Start the full tutorial",
              "跟著完整教學開始",
            )}{" "}
            →
          </Link>
        ) : (
          <a
            href={
              chapters[stage] ? "#" + chapters[stage].id : "#reading-content"
            }
          >
            {t(
              "阅读这一阶段的完整解释",
              "Read the full chapter",
              "閱讀這一階段的完整解釋",
            )}{" "}
            ↓
          </a>
        )}
        {stage < 2 && (
          <button
            type="button"
            onClick={() => {
              setStage(stage + 1);
              setRevealed(false);
            }}
          >
            {t("下一阶段", "Next stage", "下一階段")} →
          </button>
        )}
      </footer>
    </section>
  );
}
