"use client";
import Link from "../runtime/Link";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import { workshops, workshopText } from "../lib/workshop-catalog.mjs";
import s from "./Workshop.module.css";
export default function WorkshopEntry() {
  const t = useText(),
    { locale } = useSite();
  return (
    <section className={s.entry} aria-labelledby="workshop-entry-title">
      <div>
        <p className="eyebrow">
          {t("不妨，动一下手", "Think with your hands", "不妨，動一下手")}
        </p>
        <h2 id="workshop-entry-title">
          {t(
            "把“好像懂了”，变成一次观察。",
            "Turn an idea into an observation.",
            "把「好像懂了」，變成一次觀察。",
          )}
        </h2>
        <p>
          {t(
            "从一条重复消息、一段对话或一堵障碍开始。浏览器里的小实验，不需要 API Key。",
            "Start with a duplicate message, a conversation or an obstacle. Browser exercises, no API key required.",
            "從一條重複訊息、一段對話或一堵障礙開始。瀏覽器裡的小實驗，不需要 API Key。",
          )}
        </p>
      </div>
      <nav aria-label={t("精选交互实验", "Selected exercises", "精選互動實驗")}>
        {["failure", "memory", "robot"].map((id) => {
          const w = workshops.find((w) => w.id === id);
          return (
            <Link key={id} to={`/build?tool=${id}#workbench`}>
              <span>{workshopText(w.title, locale)}</span>
              <span aria-hidden="true">↗</span>
            </Link>
          );
        })}
        <Link to="/build#workbench">
          {t("查看全部工作台", "Explore all workbenches", "查看全部工作臺")} →
        </Link>
      </nav>
    </section>
  );
}
