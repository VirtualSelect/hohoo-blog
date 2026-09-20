import React, { useState } from "react";
import Layout from "@lab/runtime/Layout";
import useSiteConfig from "@lab/runtime/context";
import { useText } from "@lab/components/Shell";
export default function Subscribe() {
  const locale = useSiteConfig().i18n.currentLocale;
  const t = useText();
  const prefix = locale === "zh-CN" ? "" : "/" + locale;
  const [feedback, setFeedback] = useState("");
  const feeds = [
    {
      path: "/blog/rss.xml",
      name: t("随笔订阅", "Journal feed", "隨筆訂閱"),
      description: t(
        "已发布的 Blog 随笔，不包含全部 Docs 技术教程。",
        "Published blog posts; this feed does not include all Docs tutorials.",
        "已發布的 Blog 隨筆，不包含全部 Docs 技術教學。",
      ),
    },
    {
      path: "/news/rss.xml",
      name: t("AI 雷达订阅", "AI Radar feed", "AI 雷達訂閱"),
      description: t(
        "最近 100 条已发布外部资讯，保留来源和原文链接。",
        "The latest 100 published external signals, with source links.",
        "最近 100 條已發布外部資訊，保留來源和原文連結。",
      ),
    },
  ];
  return (
    <Layout
      title={t("RSS 订阅", "RSS subscriptions", "RSS 訂閱")}
      description={t(
        "在自己的阅读器里接收更新。",
        "Receive updates in your own reader.",
        "在自己的閱讀器裡接收更新。",
      )}
    >
      <main className="hh-page subscribe-page">
        <p className="eyebrow">
          RSS / {t("保持连接", "Stay connected", "保持連結")}
        </p>
        <h1>
          {t(
            "在自己的阅读器里，慢慢读。",
            "Read on your own schedule.",
            "在自己的閱讀器裡，慢慢讀。",
          )}
        </h1>
        <p>
          {t(
            "复制地址 → 添加到 RSS 阅读器 → 接收更新。无需账号或邮箱。",
            "Copy an address → Add it to your RSS reader → Receive updates. No account or email required.",
            "複製位址 → 加入 RSS 閱讀器 → 接收更新。無需帳號或信箱。",
          )}
        </p>
        <div className="feed-options">
          {feeds.map((feed, index) => (
            <section key={feed.path}>
              <span className="eyebrow">0{index + 1}</span>
              <h2>{feed.name}</h2>
              <p>{feed.description}</p>
              <a className="feed-url" href={prefix + feed.path}>
                {"https://huhohoo.com" + prefix + feed.path}
              </a>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      "https://huhohoo.com" + prefix + feed.path,
                    );
                    setFeedback(
                      t("已复制：", "Copied: ", "已複製：") + feed.name,
                    );
                  } catch {
                    setFeedback(
                      t(
                        "复制失败，请选择上方地址手动复制。",
                        "Copy failed. Select the address above to copy manually.",
                        "複製失敗，請選擇上方位址手動複製。",
                      ),
                    );
                  }
                }}
              >
                {t("复制订阅地址", "Copy feed address", "複製訂閱位址")}
              </button>
            </section>
          ))}
        </div>
        <p role="status">{feedback}</p>
        <p className="hh-meta">
          {t(
            "资讯通过自动规则筛选，不代表独立事实核验；暂无译文时保留来源语言。",
            "Automated filtering is not independent fact verification. Untranslated items retain their source language.",
            "資訊透過自動規則篩選，不代表獨立事實核驗；暫無譯文時保留來源語言。",
          )}
        </p>
      </main>
    </Layout>
  );
}
