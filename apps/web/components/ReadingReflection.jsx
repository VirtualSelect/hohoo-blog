"use client";
import { useEffect, useId, useState } from "react";
import { useText } from "./Shell";
import {
  blankReflection,
  decodeReflection,
  reflectionKey,
  reflectionMarkdown,
} from "../lib/reflection.mjs";
import styles from "./ReadingReflection.module.css";

export default function ReadingReflection({ route, title }) {
  const t = useText();
  const id = useId();
  const [fields, setFields] = useState(blankReflection);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState("empty");
  const [blocked, setBlocked] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const labels = {
    takeaway: t(
      "用自己的话，记住一点",
      "One idea, in your own words",
      "用自己的話，記住一點",
    ),
    question: t(
      "还有什么没想明白？",
      "What is still unclear?",
      "還有什麼沒想明白？",
    ),
    next: t("下一次，我想试试", "Next time, I want to try", "下一次，我想試試"),
  };
  useEffect(() => {
    try {
      const saved = decodeReflection(
        localStorage.getItem(reflectionKey(route)),
      );
      setFields(saved);
      setState(Object.values(saved).some(Boolean) ? "saved" : "empty");
    } catch {
      setBlocked(true);
      setState("blocked");
    }
    setReady(true);
  }, [route]);
  function update(key, value) {
    const draft = { ...fields, [key]: value };
    setFields(draft);
    setCopied(false);
    if (blocked) return;
    try {
      localStorage.setItem(
        reflectionKey(route),
        JSON.stringify({ version: 1, ...draft }),
      );
      setState("saved");
    } catch {
      setState("error");
    }
  }
  const markdown = reflectionMarkdown(
    title,
    `https://huhohoo.com/${route}`,
    fields,
    labels,
  );
  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setExportError(false);
    } catch {
      setExportError(true);
    }
  }
  const hasText = Object.values(fields).some((text) => text.trim());
  return (
    <details className={styles.reflection}>
      <summary>
        <span aria-hidden="true" className={styles.stamp}>
          ↳
        </span>
        <span>
          <strong>
            {t(
              "写给未来的自己",
              "A note to your future self",
              "寫給未來的自己",
            )}
          </strong>
          <small>
            {t(
              "合上文章前，留下一点自己的理解。",
              "Before you move on, keep one thought of your own.",
              "合上文章前，留下一點自己的理解。",
            )}
          </small>
        </span>
        <span aria-hidden="true" className={styles.plus}>
          ＋
        </span>
      </summary>
      <div className={styles.body}>
        <p className={styles.hint}>
          {t(
            "你的私人学习便签，只存在当前浏览器，不会上传或公开。清理浏览器数据会丢失，请导出留存。三种语言共用这篇文章的便签。",
            "Your private reading note stays in this browser; it is never uploaded or published. Clearing browser data removes it, so export a copy to keep. This article’s translations share the same note.",
            "你的私人學習便箋，只存在目前瀏覽器，不會上傳或公開。清理瀏覽器資料會遺失，請匯出留存。三種語言共用這篇文章的便箋。",
          )}
        </p>
        {Object.entries(labels).map(([key, label], i) => (
          <div className={styles.field} key={key}>
            <label htmlFor={`${id}-${key}`}>
              <span aria-hidden="true">0{i + 1}</span> {label}
            </label>
            <textarea
              id={`${id}-${key}`}
              value={fields[key]}
              disabled={!ready}
              rows={3}
              maxLength={4000}
              onChange={(e) => update(key, e.target.value)}
            />
          </div>
        ))}
        <div className={styles.footer}>
          <p role="status">
            {!ready
              ? t("正在读取便签…", "Loading note…", "正在讀取便箋…")
              : state === "saved"
                ? t(
                    "已保存在此浏览器",
                    "Saved in this browser",
                    "已儲存在此瀏覽器",
                  )
                : state === "error"
                  ? t(
                      "浏览器未能保存，请先导出便签。",
                      "Could not save. Export your note before leaving.",
                      "瀏覽器未能儲存，請先匯出便箋。",
                    )
                  : state === "blocked"
                    ? t(
                        "无法读取本地记录，为保护旧数据，本次不覆盖保存。你仍可填写并导出。",
                        "The local record could not be read. To protect it, this draft will not overwrite it. You can still write and export.",
                        "無法讀取本機記錄，為保護舊資料，本次不覆寫儲存。你仍可填寫並匯出。",
                      )
                    : t(
                        "写下第一句话后自动保存",
                        "Saves as you write",
                        "寫下第一句話後自動儲存",
                      )}
          </p>
          <button
            type="button"
            disabled={!ready || !hasText}
            onClick={() => setExportOpen((value) => !value)}
            aria-expanded={exportOpen}
            aria-controls={`${id}-export`}
          >
            {t("导出 Markdown", "Export Markdown", "匯出 Markdown")} ↓
          </button>
        </div>
        <div id={`${id}-export`} hidden={!exportOpen} className={styles.field}>
          <label htmlFor={`${id}-markdown`}>
            {t(
              "Markdown 预览（可手动复制）",
              "Markdown preview (select to copy)",
              "Markdown 預覽（可手動複製）",
            )}
          </label>
          <textarea id={`${id}-markdown`} readOnly value={markdown} rows={8} />
          <button type="button" onClick={copyMarkdown}>
            {copied
              ? t("已复制", "Copied", "已複製")
              : t("复制 Markdown", "Copy Markdown", "複製 Markdown")}
          </button>
        </div>
        {exportError && (
          <p role="alert">
            {t(
              "导出失败，请手动复制文字留存。",
              "Export failed. Copy your text to keep it.",
              "匯出失敗，請手動複製文字留存。",
            )}
          </p>
        )}
      </div>
    </details>
  );
}
