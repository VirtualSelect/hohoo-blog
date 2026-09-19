"use client";
import { useEffect, useState } from "react";
import { useText } from "./Shell";
import { useSite } from "../runtime/context";
import Link from "../runtime/Link";
import {
  collectBackpack,
  parseBackpack,
  planRestore,
  restoreBackpack,
} from "../lib/backpack.mjs";
import styles from "./LearningExercises.module.css";
export default function LearningBackpack() {
  const t = useText(),
    { globalData } = useSite(),
    [snapshot, setSnapshot] = useState(null),
    [text, setText] = useState(""),
    [plan, setPlan] = useState(null),
    [replace, setReplace] = useState(false),
    [message, setMessage] = useState(""),
    [exportText, setExportText] = useState(""),
    [url, setUrl] = useState("");
  const entries = globalData["content-index"].entries;
  function refresh() {
    try {
      setSnapshot(collectBackpack(localStorage));
    } catch {
      setMessage(
        t(
          "本地数据无法完整读取，已停止导出以避免遗漏。",
          "Local data could not be read completely; export stopped to avoid omissions.",
          "本機資料無法完整讀取，已停止匯出以避免遺漏。",
        ),
      );
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (!exportText) return;
    const next = URL.createObjectURL(
      new Blob([exportText], { type: "application/json" }),
    );
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [exportText]);
  function preview() {
    try {
      const backup = parseBackpack(text);
      setPlan(planRestore(localStorage, backup, replace));
      setMessage("");
    } catch {
      setPlan(null);
      setMessage(
        t(
          "无法预览：检查 JSON、版本、数据范围或大小（最多 2 MB）。未修改本地数据。",
          "Cannot preview: check JSON, version, scope and size (max 2 MB). Local data is unchanged.",
          "無法預覽：檢查 JSON、版本、資料範圍或大小（最多 2 MB）。未修改本機資料。",
        ),
      );
    }
  }
  async function readFile(e) {
    setPlan(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2000000) throw Error();
      setText(await file.text());
      setMessage("");
    } catch {
      setMessage(
        t(
          "文件读取失败或超过 2 MB。",
          "File unreadable or larger than 2 MB.",
          "檔案讀取失敗或超過 2 MB。",
        ),
      );
    }
    e.target.value = "";
  }
  function restore() {
    try {
      const count = restoreBackpack(localStorage, plan);
      setPlan(null);
      refresh();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
      setMessage(
        t(
          `已恢复 ${count} 份记录；其余保持不变。`,
          `Restored ${count} records; others unchanged.`,
          `已還原 ${count} 份記錄；其餘保持不變。`,
        ),
      );
    } catch (error) {
      setPlan(null);
      setMessage(
        error.message === "rollback-failed"
          ? t(
              "恢复与回滚均未完全成功，请保留备份并检查当前记录。",
              "Restore and rollback were incomplete. Keep the backup and inspect current records.",
              "還原與回復均未完全成功，請保留備份並檢查目前記錄。",
            )
          : t(
              "未能恢复（数据可能已在另一标签页变化或存储空间不足）。请重新预览；已写入项已回滚。",
              "Restore failed (data may have changed in another tab or storage is full). Preview again; any writes were rolled back.",
              "未能還原（資料可能已在另一分頁變化或儲存空間不足）。請重新預覽；已寫入項已回復。",
            ),
      );
    }
  }
  const records = snapshot?.records || {};
  const learning = records["huhohoo.learning.v1"]
    ? JSON.parse(records["huhohoo.learning.v1"])
    : null;
  const recent =
    learning && entries.find((e) => e.stepId === learning.lastOpened);
  const notes = Object.entries(records).filter(([key]) =>
    key.startsWith("huhohoo.reflection.v1:"),
  );
  return (
    <section className={styles.exercise} id="learning-backpack">
      <h2>{t("我的学习背包", "My learning backpack", "我的學習背包")}</h2>
      <p>
        {t(
          "收藏仍在下方清单；这里汇总最近学习和私人便签。备份包含收藏、学习进度、实践清单与便签，不含账号或主题设置，不上传。",
          "Your saved list remains below. Here are recent learning and private notes. Backups contain saved items, learning progress, practice checklists and notes, not accounts or theme settings. Nothing is uploaded.",
          "收藏仍在下方清單；這裡彙整最近學習和私人便箋。備份包含收藏、學習進度、實作清單與便箋，不含帳號或主題設定，不上傳。",
        )}
      </p>
      <button onClick={refresh}>
        {t("刷新本地记录", "Refresh local records", "重新整理本機記錄")}
      </button>
      <h3>{t("最近学习", "Recent learning", "最近學習")}</h3>
      {recent ? (
        <Link to={recent.href}>{recent.title} →</Link>
      ) : (
        <p>
          {t(
            "还没有可继续的文章记录。",
            "No article to resume yet.",
            "還沒有可繼續的文章記錄。",
          )}
        </p>
      )}
      <h3>{t("私人便签", "Private notes", "私人便箋")}</h3>
      {notes.length ? (
        notes.map(([key, raw]) => {
          const route = key.slice("huhohoo.reflection.v1:".length),
            entry = entries.find((e) => e.href.endsWith("/" + route)),
            note = JSON.parse(raw);
          return (
            <details key={key}>
              <summary>{entry?.title || route}</summary>
              {["takeaway", "question", "next"].map(
                (field) =>
                  note[field] && (
                    <p key={field} style={{ whiteSpace: "pre-wrap" }}>
                      {note[field]}
                    </p>
                  ),
              )}
              {entry && (
                <Link to={entry.href}>
                  {t("回到文章", "Open article", "回到文章")} →
                </Link>
              )}
            </details>
          );
        })
      ) : (
        <p>
          {t(
            "还没有便签。在文章末尾写下第一条想法。",
            "No notes yet. Write your first thought at the end of an article.",
            "還沒有便箋。在文章末尾寫下第一條想法。",
          )}
        </p>
      )}
      <details>
        <summary>{t("备份与恢复", "Backup and restore", "備份與還原")}</summary>
        <p className={styles.muted}>
          {t(
            "文件可能包含私人文字，请自行妥善保存。当前版本只接受本站 v1 备份；历史收藏迁移沿用现有阅读清单机制。",
            "The file may contain private writing: keep it safe. Accepts site backup v1 only; older saved lists use the existing inbox migration.",
            "檔案可能包含私人文字，請自行妥善保存。目前版本只接受本站 v1 備份；歷史收藏遷移沿用現有閱讀清單機制。",
          )}
        </p>
        <button
          onClick={() => {
            try {
              const v = collectBackpack(localStorage);
              setSnapshot(v);
              setExportText(JSON.stringify(v, null, 2));
              setMessage("");
            } catch {
              setMessage(
                t(
                  "导出失败；请检查本地记录。",
                  "Export failed; inspect local records.",
                  "匯出失敗；請檢查本機記錄。",
                ),
              );
            }
          }}
        >
          {t("生成备份", "Create backup", "產生備份")}
        </button>
        {exportText && (
          <>
            <label>
              {t(
                "备份 JSON（可手动复制）",
                "Backup JSON (copy manually)",
                "備份 JSON（可手動複製）",
              )}
              <textarea readOnly rows={6} value={exportText} />
            </label>
            {url && (
              <a href={url} download="hohoo-learning-backpack.json">
                {t("下载备份文件", "Download backup", "下載備份檔案")}
              </a>
            )}
          </>
        )}
        <label>
          {t("选择备份文件", "Choose backup file", "選擇備份檔案")}
          <input
            type="file"
            accept="application/json,.json"
            onChange={readFile}
          />
        </label>
        <label>
          {t("或粘贴备份 JSON", "Or paste backup JSON", "或貼上備份 JSON")}
          <textarea
            rows={5}
            maxLength={2000000}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPlan(null);
            }}
          />
        </label>
        <label>
          {t(
            "冲突处理（按整份记录）",
            "Conflict policy (whole records)",
            "衝突處理（按整份記錄）",
          )}
          <select
            value={replace ? "replace" : "keep"}
            onChange={(e) => {
              setReplace(e.target.value === "replace");
              setPlan(null);
            }}
          >
            <option value="keep">
              {t("保留本地记录", "Keep local records", "保留本機記錄")}
            </option>
            <option value="replace">
              {t(
                "使用备份覆盖冲突记录",
                "Replace conflicts with backup",
                "使用備份覆寫衝突記錄",
              )}
            </option>
          </select>
        </label>
        <button disabled={!text.trim()} onClick={preview}>
          {t("预览导入", "Preview import", "預覽匯入")}
        </button>
        {plan && (
          <div className={styles.result}>
            <p>
              {t(
                `将写入 ${plan.filter((r) => r.action === "write").length} 份；保留 ${plan.filter((r) => r.action === "keep").length} 份；相同 ${plan.filter((r) => r.action === "same").length} 份。`,
                `Write ${plan.filter((r) => r.action === "write").length}; keep ${plan.filter((r) => r.action === "keep").length}; identical ${plan.filter((r) => r.action === "same").length}.`,
                `將寫入 ${plan.filter((r) => r.action === "write").length} 份；保留 ${plan.filter((r) => r.action === "keep").length} 份；相同 ${plan.filter((r) => r.action === "same").length} 份。`,
              )}
            </p>
            <ul>
              {plan.map((r) => (
                <li key={r.key}>
                  <code>{r.key}</code> ·{" "}
                  {r.action === "write"
                    ? t("写入", "Write", "寫入")
                    : r.action === "keep"
                      ? t("保留", "Keep", "保留")
                      : t("相同", "Identical", "相同")}
                </li>
              ))}
            </ul>
            <button
              disabled={!plan.some((r) => r.action === "write")}
              onClick={restore}
            >
              {t(
                "确认恢复这些记录",
                "Restore these records",
                "確認還原這些記錄",
              )}
            </button>
          </div>
        )}
      </details>
      <p role="status">{message}</p>
    </section>
  );
}
