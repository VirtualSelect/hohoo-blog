"use client";
import { useEffect, useState } from "react";
import { useText } from "./Shell";
import {
  practiceKey,
  practiceSteps,
  validateRecord,
} from "../lib/backpack.mjs";
import styles from "./LearningExercises.module.css";
export default function PracticeCompanion() {
  const t = useText(),
    [completed, setCompleted] = useState([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    const refresh = (event) => {
      if (event && event.key !== null && event.key !== practiceKey) return;
      try {
        const raw = localStorage.getItem(practiceKey);
        if (raw !== null) {
          validateRecord(practiceKey, raw);
          setCompleted(JSON.parse(raw).completed);
        } else setCompleted([]);
        setReady(true);
        setError(false);
      } catch {
        setError(true);
        setReady(false);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const labels = [
    t(
      "已配置 Java 环境与服务端环境变量",
      "Configured Java and server-side environment variables",
      "已設定 Java 環境與伺服器端環境變數",
    ),
    t(
      "已发送第一次请求并检查状态码",
      "Sent a first request and checked the status",
      "已傳送第一次請求並檢查狀態碼",
    ),
    t(
      "已提取回答，并验证错误处理",
      "Extracted the answer and checked error handling",
      "已擷取回答，並驗證錯誤處理",
    ),
    t(
      "已携带历史完成多轮对话",
      "Included history in a multi-turn conversation",
      "已攜帶歷史完成多輪對話",
    ),
  ];
  function update(id) {
    try {
      const raw = localStorage.getItem(practiceKey);
      if (raw !== null) validateRecord(practiceKey, raw);
      const current = raw === null ? [] : JSON.parse(raw).completed;
      const next = current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id];
      localStorage.setItem(
        practiceKey,
        JSON.stringify({ version: 1, completed: next }),
      );
      setCompleted(next);
      setError(false);
    } catch {
      setError(true);
    }
  }
  return (
    <section className={styles.exercise}>
      <h2>{t("文章实验伴侣", "Practice companion", "文章實驗伴侶")}</h2>
      <p>
        {t(
          "这是你的自检清单，只保存在此浏览器；勾选不代表自动验证，也不修改作者的学习成果。可在学习背包中备份。",
          "Your self-checklist stays in this browser. Checking a box is not automated verification and does not change the author’s progress. Back it up in the learning backpack.",
          "這是你的自檢清單，只儲存在此瀏覽器；勾選不代表自動驗證，也不修改作者的學習成果。可在學習背包中備份。",
        )}
      </p>
      {practiceSteps.map((id, i) => (
        <label key={id}>
          <input
            type="checkbox"
            disabled={!ready}
            checked={completed.includes(id)}
            onChange={() => update(id)}
          />
          {labels[i]}
        </label>
      ))}
      <p role="status">
        {error
          ? t(
              "无法读取或保存记录；旧数据不会被自动覆盖。",
              "Cannot read or save; existing data is not overwritten automatically.",
              "無法讀取或儲存記錄；舊資料不會被自動覆寫。",
            )
          : t(
              `已自检 ${completed.length} / 4 项`,
              `Self-checked ${completed.length} / 4`,
              `已自檢 ${completed.length} / 4 項`,
            )}
      </p>
    </section>
  );
}
