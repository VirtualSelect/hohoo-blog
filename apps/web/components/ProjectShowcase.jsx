"use client";
import { useState } from "react";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import ExpandableFigure from "./ExpandableFigure";

function LiveSite() {
  const t = useText();
  const { locale } = useSite();
  const [route, setRoute] = useState("articles");
  const prefix = locale === "zh-CN" ? "" : "/" + locale;
  return (
    <div className="live-site-preview">
      <div
        className="hh-controls"
        role="group"
        aria-label={t("选择界面", "Choose a view", "選擇介面")}
      >
        {[
          ["articles", t("文章", "Writing", "文章")],
          ["learning", t("学习", "Learning", "學習")],
          ["radar", t("雷达", "Radar", "雷達")],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={route === id}
            onClick={() => setRoute(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="hh-meta">
        {t(
          "当前本地或线上版本的真实页面，可滚动浏览。",
          "The actual page in this deployment. Scroll to explore.",
          "目前本地或線上版本的真實頁面，可捲動瀏覽。",
        )}
      </p>
      <iframe
        key={route}
        src={`${prefix}/${route}`}
        title={t("博客实际界面", "Live blog interface", "部落格實際介面")}
        loading="lazy"
      />
    </div>
  );
}

export default function ProjectShowcase({ id }) {
  const t = useText();
  if (!["project:hohoo-blog", "project:hohoo-ai-lab"].includes(id)) return null;
  const blog = id === "project:hohoo-blog";
  const title = blog
    ? t("博客界面预览", "Explore the blog", "部落格介面預覽")
    : t(
        "多轮对话 · 真实运行记录",
        "Conversation · recorded run",
        "多輪對話 · 真實執行紀錄",
      );
  const terminal = (
    <div className="recorded-terminal">
      <p className="eyebrow">
        {t(
          "运行记录摘录 · 原始中文",
          "Recorded excerpt · original Chinese",
          "執行紀錄摘錄 · 原始中文",
        )}
      </p>
      <pre>
        <code>
          {
            "你：我正在学习Java\n助手：很好！Java 是一门非常实用且广泛应用的编程语言。\n\n你：我正在学习什么\n助手：你正在学习 Java！如果需要帮助或有任何问题，随时告诉我。"
          }
        </code>
      </pre>
      <p>
        {t(
          "摘自作者提供的调用记录，首条回答节选；不是当前在线调用。",
          "From the author's run; the first answer is excerpted. This is not a live API call.",
          "摘自作者提供的呼叫紀錄，首條回答節選；不是目前線上呼叫。",
        )}
      </p>
    </div>
  );
  return (
    <ExpandableFigure
      title={title}
      renderExpanded={blog ? () => <LiveSite /> : undefined}
    >
      {blog ? (
        <div className="site-preview-cover">
          <p className="eyebrow">Hohoo’s AI Lab</p>
          <strong>
            {t("从阅读，到动手。", "Read. Try. Build.", "從閱讀，到動手。")}
          </strong>
          <div className="preview-tabs">
            <span>{t("文章", "Writing", "文章")}</span>
            <span>{t("学习路线", "Learning paths", "學習路線")}</span>
            <span>AI Radar</span>
          </div>
          <p>
            {t(
              "打开真实界面，查看文章、路线与资讯如何连接。",
              "Open the real interface to explore writing, learning and signals.",
              "開啟真實介面，查看文章、路線與資訊如何連接。",
            )}
          </p>
        </div>
      ) : (
        terminal
      )}
    </ExpandableFigure>
  );
}
