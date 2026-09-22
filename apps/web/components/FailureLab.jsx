"use client";
import { useReducer, useState } from "react";
import { useText } from "./Shell";
import {
  failureReducer,
  initialFailureState,
  outcomes,
} from "../lib/failure-lab.mjs";
import s from "./Workshop.module.css";

export default function FailureLab() {
  const t = useText();
  const [state, dispatch] = useReducer(
    failureReducer,
    undefined,
    initialFailureState,
  );
  const [outcome, setOutcome] = useState("timeout");
  const question = t(
    "测试项目代号是青石。",
    "The test project's code name is Bluestone.",
    "測試專案代號是青石。",
  );
  const labels = [
    t("读取超时", "Read timeout", "讀取逾時"),
    "HTTP 500",
    t("无效 JSON", "Invalid JSON", "無效 JSON"),
    t("缺少回答", "Missing answer", "缺少回答"),
    t("有效回答", "Valid answer", "有效回答"),
  ];
  const last = state.attempts.at(-1);
  const explanations = {
    timeout: t(
      "客户端停止等待，服务端是否完成未知。本地历史不提交；立即重试也可能造成服务端重复执行。",
      "The client stops waiting; server completion is unknown. Local history stays uncommitted. Retrying can still duplicate server execution.",
      "用戶端停止等待，伺服器是否完成未知。本機歷史不提交；立即重試也可能造成伺服器重複執行。",
    ),
    "http-error": t(
      "先处理 HTTP 错误，不能把错误正文当作助手回答。",
      "Handle the HTTP error before parsing the body as an assistant answer.",
      "先處理 HTTP 錯誤，不能把錯誤正文當作助手回答。",
    ),
    "invalid-json": t(
      "即使 HTTP 成功，解析失败也不能提交完整回合。",
      "Even with HTTP success, a parse failure must not commit a turn.",
      "即使 HTTP 成功，解析失敗也不能提交完整回合。",
    ),
    "empty-answer": t(
      "JSON 可解析不等于存在有效回答。先校验 choices 与 message。",
      "Valid JSON does not guarantee an answer. Validate choices and message.",
      "JSON 可解析不等於存在有效回答。先驗證 choices 與 message。",
    ),
    success: t(
      "有效回答通过校验后，问题和回答一起提交。左侧若先经历失败再重试，会留下重复问题。",
      "After validation, commit question and answer together. On the left, retrying after a failure leaves duplicate questions.",
      "有效回答通過驗證後，問題和回答一起提交。左側若先經歷失敗再重試，會留下重複問題。",
    ),
  };
  const describe = (m) =>
    m.content === "fixture-response"
      ? t(
          "已收到测试消息。（固定模拟回答）",
          "Test message received. (Fixed fixture)",
          "已收到測試訊息。（固定模擬回答）",
        )
      : m.content;
  return (
    <div>
      <p className={s.notice}>
        {t(
          "本地故障注入 · 没有网络请求、模型调用或真实耗时。两份历史在相同输入下并行更新。",
          "Local fault injection · No network, model call or measured latency. Both histories receive identical input.",
          "本機故障注入 · 沒有網路請求、模型呼叫或真實耗時。兩份歷史在相同輸入下並行更新。",
        )}
      </p>
      <div className={s.controls}>
        <label>
          {t("注入的结果", "Injected outcome", "注入的結果")}
          <select
            value={outcome}
            disabled={!!state.pending}
            onChange={(e) => setOutcome(e.target.value)}
          >
            {outcomes.map((o, i) => (
              <option key={o} value={o}>
                {labels[i]}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!!state.pending || state.attempts.length >= 8}
          onClick={() => dispatch({ type: "send", question })}
        >
          {state.attempts.length
            ? t(
                "再次发送同一问题",
                "Send the same question again",
                "再次傳送同一問題",
              )
            : t("① 准备发送", "① Prepare request", "① 準備傳送")}
        </button>
        <button
          disabled={!state.pending}
          onClick={() =>
            dispatch({ type: "resolve", id: state.pending?.id, outcome })
          }
        >
          {t("② 返回所选结果", "② Return selected outcome", "② 回傳所選結果")}
        </button>
        <button onClick={() => dispatch({ type: "reset" })}>
          {t("重置实验", "Reset experiment", "重設實驗")}
        </button>
      </div>
      <p className={s.feedback} role="status">
        {state.pending
          ? t(
              "请求已准备好。观察左侧：回答还没到，问题已经写入历史。现在执行第二步。",
              "Request prepared. On the left, the question is already in history before an answer arrives. Run step two.",
              "請求已準備好。觀察左側：回答還沒到，問題已經寫入歷史。現在執行第二步。",
            )
          : last
            ? explanations[last.outcome]
            : t(
                "第一次先试读取超时，再改为有效回答并重试。",
                "Try a timeout first. Then switch to a valid answer and retry.",
                "第一次先試讀取逾時，再改為有效回答並重試。",
              )}
      </p>
      <div className={s.compare}>
        {[
          [
            "naive",
            t(
              "发送前，直接写进历史",
              "Append before sending",
              "傳送前，直接寫進歷史",
            ),
          ],
          [
            "safe",
            t(
              "收到有效回答，再一起提交",
              "Commit after a valid answer",
              "收到有效回答，再一起提交",
            ),
          ],
        ].map(([key, title]) => (
          <section key={key} data-tone={key === "naive" ? "apricot" : "blue"}>
            <h3>{title}</h3>
            <p className="hh-meta">
              {t("已写入消息", "Stored messages", "已寫入訊息")} ·{" "}
              {state[key].length}
            </p>
            <ol className={s.messages}>
              {state[key].map((m, i) => (
                <li key={i}>
                  <small>{m.role}</small>
                  <span>{describe(m)}</span>
                </li>
              ))}
            </ol>
            {!state[key].length && (
              <p className={s.quiet}>
                {t("历史为空", "History is empty", "歷史為空")}
              </p>
            )}
          </section>
        ))}
      </div>
      {state.pending && (
        <details open className={s.request}>
          <summary>
            {t(
              "本次安全策略的请求内容",
              "Request with atomic commit",
              "本次安全策略的請求內容",
            )}
          </summary>
          <pre>
            {JSON.stringify(
              {
                messages: state.pending.request.map((m) => ({
                  ...m,
                  content: describe(m),
                })),
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
      {!!state.attempts.length && (
        <div className={s.log}>
          <h3>{t("本轮操作记录", "Attempt log", "本輪操作紀錄")}</h3>
          <ol>
            {state.attempts.map((a) => (
              <li key={a.id}>
                <span>
                  #{a.id} · {labels[outcomes.indexOf(a.outcome)]}
                </span>
                <span>
                  {t("历史消息", "History messages", "歷史訊息")} {a.naiveCount}{" "}
                  / {a.safeCount}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {state.attempts.length >= 8 && (
        <p role="status">
          {t(
            "已保留 8 次操作，请重置后继续。",
            "Eight attempts recorded. Reset to continue.",
            "已保留 8 次操作，請重設後繼續。",
          )}
        </p>
      )}
      <p className={s.quiet}>
        {t(
          "这解决的是客户端历史一致性，不保证服务端幂等、取消执行或不重复计费。真实 Java Demo 与 API 验证仍待共创。",
          "This protects client history consistency. It does not guarantee server idempotency, cancellation or billing behavior. Java and live API validation remain future work.",
          "這解決的是用戶端歷史一致性，不保證伺服器冪等、取消執行或不重複計費。真實 Java Demo 與 API 驗證仍待共創。",
        )}
      </p>
    </div>
  );
}
