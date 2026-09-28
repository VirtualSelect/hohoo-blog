"use client";
import { useId, useState } from "react";
import { useText } from "./Shell";
import { validateOutput } from "../lib/output-contract.mjs";
import styles from "./ResearchEvidence.module.css";

const recorded =
  '\n\n```json\n{"category":"ai-apps","tags":["LLM应用","API集成","多轮对话"]}\n```';
const presets = [
  recorded,
  '{"category":"llm","tags":["context"]}',
  '{"category":"finance","tags":["context"]}',
  '{"category":"llm","category":"ai-apps","tags":["context"]}',
];
export default function OutputValidation() {
  const t = useText(),
    id = useId();
  const [content, setContent] = useState(recorded);
  const [unwrap, setUnwrap] = useState(false);
  const [finish, setFinish] = useState("stop");
  const result = validateOutput(content, { unwrap, finish });
  const steps = [
    t("HTTP 200（已记录）", "HTTP 200 (recorded)", "HTTP 200（已記錄）"),
    t("输出已结束", "Finished output", "輸出已結束"),
    t("可解析的唯一 JSON", "Unambiguous JSON", "可解析的唯一 JSON"),
    t("分类业务契约", "Classification contract", "分類業務契約"),
  ];
  return (
    <section
      className={styles.panel}
      aria-label={t(
        "结构化输出校验台",
        "Output validation bench",
        "結構化輸出校驗台",
      )}
    >
      <p>
        {t(
          "从 Demo 04 的真实响应开始：HTTP 200 通过，为什么业务仍拒绝？修改内容，看它停在哪一层。",
          "Start with a recorded Demo 04 response. Why did the application reject HTTP 200? Edit the content to locate the failing layer.",
          "從 Demo 04 的真實回應開始：HTTP 200 通過，為什麼業務仍拒絕？修改內容，看它停在哪一層。",
        )}
      </p>
      <div className={styles.controls}>
        {[
          t("原始记录", "Recorded response", "原始紀錄"),
          t("有效示例", "Valid example", "有效範例"),
          t("错误分类", "Invalid category", "錯誤分類"),
          t("重复字段", "Duplicate key", "重複欄位"),
        ].map((label, i) => (
          <button
            type="button"
            key={i}
            onClick={() => {
              setContent(presets[i]);
              setFinish("stop");
              setUnwrap(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.layout}>
        <div>
          <label htmlFor={id}>
            {t(
              "模型正文（可编辑）",
              "Model content (editable)",
              "模型正文（可編輯）",
            )}
          </label>
          <textarea
            id={id}
            value={content}
            maxLength={8000}
            spellCheck={false}
            onChange={(e) => setContent(e.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={unwrap}
              onChange={(e) => setUnwrap(e.target.checked)}
            />{" "}
            {t(
              "显式允许移除一层完整 json 围栏",
              "Explicitly allow one complete json fence",
              "明確允許移除一層完整 json 圍欄",
            )}
          </label>
          <label htmlFor={`${id}-finish`}>finish_reason</label>
          <select
            id={`${id}-finish`}
            value={finish}
            onChange={(e) => setFinish(e.target.value)}
          >
            <option value="stop">stop</option>
            <option value="length">length</option>
          </select>
        </div>
        <div>
          <ol className={styles.steps}>
            {steps.map((label, i) => (
              <li
                key={label}
                data-state={
                  i < result.stage
                    ? "pass"
                    : i === result.stage
                      ? "fail"
                      : "pending"
                }
              >
                {i < result.stage ? "✓" : i === result.stage ? "×" : "○"}{" "}
                {label}
              </li>
            ))}
          </ol>
          <p role="status">
            {result.code === "accepted" ? (
              t(
                "通过契约；分类是否正确仍需人工或评测确认。",
                "Contract accepted; semantic correctness still needs review or evaluation.",
                "通過契約；分類是否正確仍需人工或評測確認。",
              )
            ) : (
              <>
                {t("拒绝原因", "Rejection reason", "拒絕原因")}:{" "}
                <code>{result.code}</code>
              </>
            )}
          </p>
          <small>
            {t(
              "只有“原始记录”来自实测，其余是教学输入。浏览器校验不调用模型、不保存输入；完整协议检查以 Java 工程为准。",
              "Only the recorded preset is an observed response. Other inputs are teaching examples. Local validation sends no requests and saves nothing; Java remains the full protocol implementation.",
              "只有「原始紀錄」來自實測，其餘是教學輸入。瀏覽器校驗不呼叫模型、不儲存輸入；完整協定檢查以 Java 工程為準。",
            )}
          </small>
        </div>
      </div>
    </section>
  );
}
