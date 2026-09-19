"use client";
import { useState } from "react";
import { useText } from "./Shell";
import { streamSnapshot } from "../lib/stream-demo.mjs";
import styles from "./LearningExercises.module.css";
export default function StreamWindow() {
  const t = useText(),
    [json, setJson] = useState(false),
    [count, setCount] = useState(0),
    [state, setState] = useState("running");
  const parts = json
    ? ['{"answer":', '"Java', ' API"', "}"]
    : [
        t("先发送", "Send", "先傳送"),
        t("问题，", " a question,", "問題，"),
        t("再读取", " then read", "再讀取"),
        t("回答。", " the answer.", "回答。"),
      ];
  const view = streamSnapshot(parts, count, state);
  let valid = false;
  try {
    JSON.parse(view.partial);
    valid = true;
  } catch {}
  function reset() {
    setCount(0);
    setState("running");
  }
  return (
    <section className={styles.exercise}>
      <h2>{t("流式输出观察窗", "Streaming window", "串流輸出觀察窗")}</h2>
      <p>
        {t(
          "手动推进固定分段，比较逐段展示与等完整响应再展示。它是本地教学模拟，不是真实模型流速或协议抓包。",
          "Advance fixed chunks manually and compare incremental display with waiting for the full response. This is a local simulation, not model speed or a protocol capture.",
          "手動推進固定分段，比較逐段展示與等完整回應再展示。它是本機教學模擬，不是真實模型流速或協定封包。",
        )}
      </p>
      <label>
        <input
          type="checkbox"
          checked={json}
          onChange={(e) => {
            setJson(e.target.checked);
            reset();
          }}
        />
        {t("观察 JSON 分段", "Inspect JSON chunks", "觀察 JSON 分段")}
      </label>
      <div className={styles.columns}>
        <div>
          <h3>{t("逐段展示", "Incremental", "逐段展示")}</h3>
          <pre>{view.partial || "…"}</pre>
        </div>
        <div>
          <h3>{t("等待完整响应", "Buffered", "等待完整回應")}</h3>
          <pre>{view.buffered || "…"}</pre>
        </div>
      </div>
      <p role="status">
        {view.complete
          ? t("完整响应已到达", "Complete response received", "完整回應已到達")
          : state === "cancelled"
            ? t(
                "已取消：保留部分内容，不能标记为完成。",
                "Cancelled: partial content retained, not complete.",
                "已取消：保留部分內容，不能標記為完成。",
              )
            : state === "disconnected"
              ? t(
                  "连接中断：部分内容不等于完整回答。",
                  "Disconnected: partial content is not a complete answer.",
                  "連線中斷：部分內容不等於完整回答。",
                )
              : t(
                  `已接收 ${count} / 4 段`,
                  `Received ${count} / 4 chunks`,
                  `已接收 ${count} / 4 段`,
                )}
        {json &&
          " · " +
            (valid
              ? t(
                  "当前字符串可解析为 JSON",
                  "Current string parses as JSON",
                  "目前字串可解析為 JSON",
                )
              : t(
                  "当前片段尚不是完整 JSON",
                  "Not yet a complete JSON document",
                  "目前片段尚不是完整 JSON",
                ))}
      </p>
      <div className={styles.choices}>
        <button
          disabled={view.complete || state !== "running"}
          onClick={() => setCount((n) => n + 1)}
        >
          {t("接收下一段", "Receive next chunk", "接收下一段")}
        </button>
        <button
          disabled={view.complete || state !== "running"}
          onClick={() => setState("cancelled")}
        >
          {t("取消", "Cancel", "取消")}
        </button>
        <button
          disabled={view.complete || state !== "running"}
          onClick={() => setState("disconnected")}
        >
          {t("模拟断线", "Simulate disconnect", "模擬斷線")}
        </button>
        <button onClick={reset}>{t("重放", "Replay", "重播")}</button>
      </div>
      <details>
        <summary>{t("查看分段记录", "Inspect chunks", "查看分段紀錄")}</summary>
        <ol>
          {parts.slice(0, count).map((p, i) => (
            <li key={i}>
              <code>{JSON.stringify(p)}</code>
            </li>
          ))}
        </ol>
      </details>
      <p className={styles.muted}>
        {t(
          "真实网络分块不保证对应一个字、Token 或完整事件。实际实现还需处理解码、事件边界和结束标志；取消接收也不证明服务端停止计费。",
          "Network chunks need not align with words, tokens or events. Real implementations handle decoding, event boundaries and completion markers; cancelling reception does not prove server billing stopped.",
          "真實網路分塊不保證對應一個字、Token 或完整事件。實際實作還需處理解碼、事件邊界和結束標誌；取消接收也不證明伺服器停止計費。",
        )}
      </p>
    </section>
  );
}
