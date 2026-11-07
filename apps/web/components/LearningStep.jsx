"use client";
import Link from "../runtime/Link";
import { useText } from "./Shell";

export default function LearningStep({
  step,
  track,
  article,
  content,
  progress,
  index,
  question,
  compact = false,
}) {
  const t = useText();
  const prerequisites = (article.prerequisites || [])
    .map((id) => content.find((entry) => entry.id === id))
    .filter(Boolean);
  const related = (article.related || [])
    .map((id) => content.find((entry) => entry.id === id))
    .filter((entry) => entry && ["lab", "project"].includes(entry.type));
  const completed = progress.items[step.id]?.status === "completed";
  return (
    <li className="reading-step" id={"step-" + step.id}>
      <span className="reading-step-number" aria-hidden="true">
        {completed ? "✓" : String(index + 1).padStart(2, "0")}
      </span>
      <div>
        <h3>
          <Link
            to={article.permalink}
            onClick={() => {
              if (progress.ready && !completed)
                progress.update(step.id, "reading");
            }}
          >
            {question || article.title} <span aria-hidden="true">↗</span>
          </Link>
        </h3>
        {!compact && (
          <p>
            {question
              ? article.title
              : t(step.outcome, step.outcomeEn, step.outcomeTw)}
          </p>
        )}
        <div className="reading-step-meta">
          <span>
            {article.minutes} {t("分钟", "min", "分鐘")}
            {completed && " · " + t("已读", "Read", "已讀")}
          </span>
          <details>
            <summary>
              {t(
                "资料与阅读标记",
                "Resources and reading status",
                "資料與閱讀標記",
              )}
            </summary>
            <p>
              {t("先修：", "Prerequisites: ", "先修：")}
              {prerequisites.length
                ? prerequisites.map((entry, index) => (
                    <span key={entry.id}>
                      {index > 0 && " · "}
                      <Link to={entry.href}>{entry.title}</Link>
                    </span>
                  ))
                : t(...track.background)}
            </p>
            {related.length > 0 && (
              <nav
                aria-label={t(
                  "配套代码与证据",
                  "Code and evidence",
                  "配套程式碼與證據",
                )}
              >
                {related.map((entry) => (
                  <Link key={entry.id} to={entry.href}>
                    {entry.title} ↗
                  </Link>
                ))}
              </nav>
            )}
            <div className="reading-step-actions">
              <button
                disabled={!progress.ready}
                aria-pressed={completed}
                onClick={() =>
                  progress.update(step.id, completed ? "reading" : "completed")
                }
              >
                {completed
                  ? t("取消已读", "Mark unread", "取消已讀")
                  : t("标记已读", "Mark read", "標記已讀")}
              </button>
              <button
                disabled={!progress.ready}
                aria-pressed={progress.saved.includes(step.id)}
                onClick={() => progress.update(step.id, "saved")}
              >
                {progress.saved.includes(step.id)
                  ? t("取消想读", "Unsave", "取消想讀")
                  : t("加入想读", "Save for later", "加入想讀")}
              </button>
            </div>
          </details>
        </div>
      </div>
    </li>
  );
}
