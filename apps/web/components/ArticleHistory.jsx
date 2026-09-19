"use client";
import history from "@site/data/article-history.json";
import { useText } from "./Shell";
import { useSite } from "../runtime/context";
import styles from "./LearningExercises.module.css";
export default function ArticleHistory({ route }) {
  const t = useText(),
    { locale } = useSite(),
    records = history[route];
  if (!records?.length) return null;
  return (
    <details className={styles.exercise}>
      <summary>
        {t("文章更新轨迹", "Article revision trail", "文章更新軌跡")}
      </summary>
      <ol>
        {records.map((r) => (
          <li key={r.commit}>
            <time dateTime={r.date}>{r.date}</time>
            <p>{r.summary[locale === "en" ? 1 : locale === "zh-TW" ? 2 : 0]}</p>
            <a
              href={
                "https://github.com/VirtualSelect/hohoo-blog/commit/" + r.commit
              }
            >
              {t("查看变更证据", "View change evidence", "查看變更證據")} ↗
            </a>
          </li>
        ))}
      </ol>
      <p className={styles.muted}>
        {t(
          "当前只有已核实的首次发布记录；日期来自 Git 提交，不代表部署时间或今天重新验证。服务端状态、模型行为及费用以实际调用为准。",
          "Only the verified first-publication record is available. Dates come from Git commits, not deployment time or revalidation today. Provider state, model behaviour and costs depend on actual calls.",
          "目前只有已核實的首次發佈記錄；日期來自 Git 提交，不代表部署時間或今天重新驗證。伺服器狀態、模型行為及費用以實際呼叫為準。",
        )}
      </p>
    </details>
  );
}
