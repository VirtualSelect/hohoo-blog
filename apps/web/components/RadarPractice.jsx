"use client";
import registry from "@site/data/radar-practice.json";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
export default function RadarPractice({ id }) {
  const t = useText(),
    { locale } = useSite(),
    item = registry.find((r) => r.signalId === id);
  if (!item) return null;
  const language = locale === "en" ? 1 : locale === "zh-TW" ? 2 : 0;
  return (
    <details>
      <summary>
        {t("从资讯到验证", "From signal to investigation", "從資訊到驗證")}
      </summary>
      <p>{item.question[language]}</p>
      <p>
        <a href={(locale === "zh-CN" ? "" : "/" + locale) + item.href}>
          {item.label[language]} →
        </a>
      </p>
      <p className="hh-meta">
        {t(
          "预设阅读问题，不是已验证结论，也不是作者个人评价。请保留原文中的实验限制。",
          "A prepared reading question, not a verified conclusion or personal take. Preserve the source’s experimental limitations.",
          "預設閱讀問題，不是已驗證結論，也不是作者個人評價。請保留原文中的實驗限制。",
        )}
      </p>
    </details>
  );
}
