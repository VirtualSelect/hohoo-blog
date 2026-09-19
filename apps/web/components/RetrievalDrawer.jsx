"use client";
import { useState } from "react";
import { useText } from "./Shell";
import styles from "./LearningExercises.module.css";
import RetrievalRanking from "./RetrievalRanking";

export default function RetrievalDrawer() {
  const t = useText();
  const [selected, setSelected] = useState([]);
  const [reveal, setReveal] = useState(false);
  const docs = [
    [
      "A",
      t("当前配置", "Current configuration", "目前設定"),
      t(
        "示例客户端读取等待上限为 90 秒。超时后仍不能确定服务端有没有处理请求。",
        "The example client’s read waiting limit is 90 seconds. A timeout does not establish whether the server processed the request.",
        "範例用戶端讀取等待上限為 90 秒。逾時後仍不能確定伺服器有沒有處理請求。",
      ),
      t(
        "直接支持等待上限，也说明了结论边界。",
        "Supports the limit directly and states its uncertainty boundary.",
        "直接支持等待上限，也說明了結論邊界。",
      ),
    ],
    [
      "B",
      t("连接配置", "Connection configuration", "連線設定"),
      t(
        "建立连接的等待上限为 10 秒。",
        "The connection waiting limit is 10 seconds.",
        "建立連線的等待上限為 10 秒。",
      ),
      t(
        "连接超时和读取超时不是同一件事。",
        "Connection and read timeouts are different.",
        "連線逾時和讀取逾時不是同一件事。",
      ),
    ],
    [
      "C",
      t("已弃用配置", "Superseded configuration", "已棄用設定"),
      t(
        "旧示例使用 30 秒读取上限，后来已调整。",
        "An older example used a 30-second read limit, since changed.",
        "舊範例使用 30 秒讀取上限，後來已調整。",
      ),
      t(
        "包含相同关键词，但版本已经过时。",
        "Matching keywords, but the version is outdated.",
        "包含相同關鍵詞，但版本已經過時。",
      ),
    ],
    [
      "D",
      t("产品宣传", "Promotional copy", "產品宣傳"),
      t(
        "极速响应，让等待成为过去。",
        "Lightning-fast responses. Waiting is a thing of the past.",
        "極速回應，讓等待成為過去。",
      ),
      t(
        "宣传语没有提供可核实的配置或保证。",
        "A slogan supplies no verifiable configuration or guarantee.",
        "宣傳語沒有提供可核實的設定或保證。",
      ),
    ],
  ];
  return (
    <section className={styles.exercise} aria-labelledby="retrieval-title">
      <p className="eyebrow">
        {t("动手理解 / RAG", "Try it / RAG", "動手理解 / RAG")}
      </p>
      <h2 id="retrieval-title">
        {t("打开检索抽屉", "Open the retrieval drawer", "打開檢索抽屜")}
      </h2>
      <p>
        {t(
          "问题：当前示例的读取等待上限是多少？超过上限能否证明服务端没有执行？",
          "Question: What is the current example’s read waiting limit? Does exceeding it prove the server did not execute?",
          "問題：目前範例的讀取等待上限是多少？超過上限能否證明伺服器沒有執行？",
        )}
      </p>
      <p className={styles.muted}>
        {t(
          "以下是固定教学资料，不进行真实检索或模型生成。选择能支持回答的资料，再查看解释。",
          "Fixed teaching material; no live retrieval or generation. Select evidence, then inspect the explanation.",
          "以下是固定教學資料，不進行真實檢索或模型生成。選擇能支持回答的資料，再查看解釋。",
        )}
      </p>
      <fieldset>
        <legend>{t("挑选证据", "Select evidence", "挑選證據")}</legend>
        {docs.map(([id, title, body]) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={() => {
                setSelected((v) =>
                  v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
                );
                setReveal(false);
              }}
            />
            <span>
              {id} / {title}
              <small>{body}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={styles.choices}>
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => setReveal(true)}
        >
          {t("核对证据", "Check evidence", "核對證據")}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelected([]);
            setReveal(false);
          }}
        >
          {t("重新选择", "Start over", "重新選擇")}
        </button>
      </div>
      {reveal && (
        <div className={styles.result} role="status">
          <strong>
            {selected.length === 1 && selected[0] === "A"
              ? t("证据选择恰当", "Evidence fits", "證據選擇恰當")
              : t(
                  "再检查相关性和版本",
                  "Check relevance and version",
                  "再檢查相關性和版本",
                )}
          </strong>
          <ul>
            {docs.map(([id, , , why]) => (
              <li key={id}>
                {id}：{why}
              </li>
            ))}
          </ul>
          <p>
            {t(
              "依据 A：读取上限为 90 秒；不能因此认定服务端没有处理。检索匹配只是第一步，还要核对版本、含义和结论边界。",
              "From A: the read limit is 90 seconds; a timeout does not prove non-execution. Matching is only the first step—check version, meaning, and uncertainty.",
              "依據 A：讀取上限為 90 秒；不能因此認定伺服器沒有處理。檢索匹配只是第一步，還要核對版本、含義和結論邊界。",
            )}
          </p>
        </div>
      )}
      <RetrievalRanking docs={docs} />
    </section>
  );
}
