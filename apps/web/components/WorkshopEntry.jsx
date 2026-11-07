"use client";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import s from "./Workshop.module.css";
export default function WorkshopEntry() {
  const t = useText();
  return (
    <section className={s.entry} aria-labelledby="workshop-entry-title">
      <div>
        <p className="eyebrow">02 / {t("动手理解", "Try it", "動手理解")}</p>
        <h2 id="workshop-entry-title">
          {t(
            "重试一次，为什么多了一条消息？",
            "One retry. Why two messages?",
            "重試一次，為什麼多了一條訊息？",
          )}
        </h2>
        <p>
          {t(
            "注入一次超时，对照两种历史提交方式。先看见区别，再回到代码理解原因。",
            "Inject a timeout and compare two ways to commit history. See the difference, then inspect the code.",
            "注入一次逾時，對照兩種歷史提交方式。先看見差異，再回到程式碼理解原因。",
          )}
        </p>
        <small>
          {t(
            "浏览器教学演示 · 无需密钥",
            "Browser exercise · no API key",
            "瀏覽器教學示範 · 無需金鑰",
          )}
        </small>
      </div>
      <nav aria-label={t("动手尝试", "Try an exercise", "動手嘗試")}>
        <Link to="/build?tool=failure#workbench">
          {t("打开超时实验", "Open the timeout exercise", "開啟逾時實驗")} →
        </Link>
        <Link to="/build#workbench">
          {t("查看其他工作台", "Explore other workbenches", "查看其他工作臺")} →
        </Link>
      </nav>
    </section>
  );
}
