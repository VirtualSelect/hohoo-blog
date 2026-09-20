"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
export default function NotFound() {
  const pathname = usePathname() || "/";
  // The global 404 is prerendered once without a requested path.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const locale = mounted ? pathname.split("/")[1] : "zh-CN";
  const prefix = ["en", "zh-TW"].includes(locale) ? `/${locale}` : "";
  const t = (zh, en, tw) =>
    locale === "en" ? en : locale === "zh-TW" ? tw : zh;
  return (
    <main className="hh-page not-found-page" lang={prefix ? locale : "zh-CN"}>
      <p className="eyebrow">404</p>
      <h1>
        {t(
          "这页还没有留下足迹。",
          "No footsteps on this page yet.",
          "這頁還沒有留下足跡。",
        )}
      </h1>
      <p>
        {t(
          "地址可能发生了变化，从已有内容继续探索。",
          "The address may have changed. Explore the published content below.",
          "位址可能發生了變化，從既有內容繼續探索。",
        )}
      </p>
      <Link href={prefix || "/"}>
        {t("返回首页", "Back home", "返回首頁")} →
      </Link>
      <nav
        aria-label={t("继续探索", "Keep exploring", "繼續探索")}
        className="not-found-links"
      >
        <Link href={`${prefix}/articles`}>
          {t("阅读已发布文章", "Read published writing", "閱讀已發布文章")} →
        </Link>
        <Link href={`${prefix}/learning`}>
          {t("选择学习路线", "Choose a learning path", "選擇學習路線")} →
        </Link>
        <Link href={`${prefix}/projects`}>
          {t("查看实际项目", "Explore real projects", "查看實際專案")} →
        </Link>
      </nav>
    </main>
  );
}
