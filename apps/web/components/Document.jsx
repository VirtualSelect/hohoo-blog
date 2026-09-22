"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import DocReadingContext from "@site/src/components/DocReadingContext";
import TranslationNotice from "@site/src/components/TranslationNotice";
import ArticleContents from "./ArticleContents";
const ConversationWorkbench = dynamic(() => import("./ConversationWorkbench"));
import ReadingReflection from "./ReadingReflection";
const RequestJourney = dynamic(() => import("./RequestJourney"));
import ReadingFork from "./ReadingFork";
import TryIt from "./TryIt";
const ErrorClinic = dynamic(() => import("./ErrorClinic"));
const PracticeCompanion = dynamic(() => import("./PracticeCompanion"));
import ArticleHistory from "./ArticleHistory";
import VisitorStats from "./VisitorStats";
import FlagshipExperience from "./FlagshipExperience";
import {
  readerSettingsKey,
  parseReaderSettings,
} from "../lib/reader-settings.mjs";
export default function Document({ children }) {
  const { document: d } = useSite(),
    t = useText(),
    ref = useRef(null);
  const [readerWidth, setReaderWidth] = useState("standard");
  const [storageError, setStorageError] = useState(false);
  const imageDialog = useRef(null);
  const imageTrigger = useRef(null);
  const [zoomImage, setZoomImage] = useState(null);
  useEffect(() => {
    try {
      setReaderWidth(
        parseReaderSettings(localStorage.getItem(readerSettingsKey)).width,
      );
    } catch {}
  }, []);
  function toggleWidth() {
    const width = readerWidth === "wide" ? "standard" : "wide";
    setReaderWidth(width);
    try {
      localStorage.setItem(
        readerSettingsKey,
        JSON.stringify({ version: 1, width }),
      );
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  useEffect(() => {
    const buttons = [];
    const cleanups = [];
    const timers = new Set();
    for (const pre of ref.current?.querySelectorAll("pre") || []) {
      const b = window.document.createElement("button");
      b.className = "copy-code";
      b.type = "button";
      b.setAttribute("aria-live", "polite");
      b.textContent = t("复制", "Copy", "複製");
      b.onclick = async () => {
        b.disabled = true;
        try {
          await navigator.clipboard.writeText(
            pre.querySelector("code")?.textContent || "",
          );
          b.textContent = t("已复制", "Copied", "已複製");
        } catch {
          b.textContent = t("复制失败", "Copy failed", "複製失敗");
        }
        if (!b.isConnected) return;
        const timer = setTimeout(() => {
          b.textContent = t("复制", "Copy", "複製");
          b.disabled = false;
          timers.delete(timer);
        }, 1800);
        timers.add(timer);
      };
      pre.append(b);
      buttons.push(b);
      if (
        (pre.querySelector("code")?.textContent || "").split("\n").length > 12
      ) {
        const expand = window.document.createElement("button");
        expand.type = "button";
        expand.className = "code-expand";
        pre.classList.add("code-collapsed");
        expand.setAttribute("aria-expanded", "false");
        expand.textContent = t(
          "展开完整代码",
          "Show full code",
          "展開完整程式碼",
        );
        expand.onclick = () => {
          const collapsed = pre.classList.toggle("code-collapsed");
          expand.setAttribute("aria-expanded", String(!collapsed));
          expand.textContent = collapsed
            ? t("展开完整代码", "Show full code", "展開完整程式碼")
            : t("收起代码", "Collapse code", "收起程式碼");
        };
        pre.after(expand);
        buttons.push(expand);
        cleanups.push(() => pre.classList.remove("code-collapsed"));
      }
    }
    for (const img of ref.current?.querySelectorAll(".prose img") || []) {
      const zoom = window.document.createElement("button");
      zoom.type = "button";
      zoom.className = "image-zoom";
      zoom.textContent = t("放大图片", "Enlarge image", "放大圖片");
      zoom.onclick = () => {
        imageTrigger.current = zoom;
        setZoomImage({ src: img.currentSrc || img.src, alt: img.alt });
        imageDialog.current.showModal();
      };
      img.after(zoom);
      buttons.push(zoom);
    }
    return () => {
      timers.forEach(clearTimeout);
      buttons.forEach((b) => b.remove());
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [d, t]);
  return (
    <main
      className="document-layout"
      data-domain={d.frontMatter.domain}
      data-reader-width={readerWidth}
      id="article-top"
    >
      <aside className="document-nav">
        {d.kind === "blog" ? (
          <>
            <Link to="/articles">
              ← {t("全部文章", "All writing", "全部文章")}
            </Link>
            <Link to="/blog">{t("随笔", "Journal", "隨筆")}</Link>
            <Link to="/timeline">
              {t("学习活动", "Learning activity", "學習活動")}
            </Link>
          </>
        ) : (
          <>
            <Link to="/learning">
              ← {t("学习路线", "Learning path", "學習路線")}
            </Link>
            <Link to="/docs/ai-apps">
              {t("AI 应用开发", "AI Applications", "AI 應用開發")}
            </Link>
            <Link to="/docs/llm">LLM</Link>
            <Link to="/docs/embodied-ai">
              {t("具身智能", "Embodied AI", "具身智慧")}
            </Link>
          </>
        )}
      </aside>
      <article className="document-body">
        <header>
          <p className="eyebrow">
            {d.kind === "blog"
              ? t("随笔", "Journal", "隨筆")
              : t("学习 / 实践", "Learn / Practice", "學習 / 實作")}
          </p>
          <h1>{d.metadata.title}</h1>
          {d.kind === "blog" && (
            <div className="journal-cover">
              <span>Hohoo.</span>
              <p>
                {d.metadata.description ||
                  t(
                    "写下经历，也留下思考。",
                    "Experiences and reflections.",
                    "寫下經歷，也留下思考。",
                  )}
              </p>
            </div>
          )}
          <TranslationNotice
            id={(d.kind === "blog" ? "blog:" : "doc:") + d.metadata.id}
            original={"/" + d.route}
          />
          {d.kind === "docs" ? (
            <DocReadingContext position="header" />
          ) : (
            <p className="hh-meta">
              {String(d.frontMatter.date).slice(0, 10)} · Hohoo
            </p>
          )}
          {d.sourceFallback && (
            <p className="translation-notice">
              {t(
                "当前显示原文。",
                "Showing the original text; this translation is not available.",
                "目前顯示原文，譯文尚未提供。",
              )}
            </p>
          )}
          <VisitorStats variant="article" path={d.route} />
        </header>
        <ArticleContents headings={d.headings} mobile />
        <nav
          className="mobile-reading-tools"
          aria-label={t("阅读工具", "Reading tools", "閱讀工具")}
        >
          <a
            href="#article-toc"
            onClick={() => {
              const toc = window.document.getElementById("article-toc");
              if (toc) toc.open = true;
            }}
          >
            {t("目录", "Contents", "目錄")}
          </a>
          <a href="#article-top">
            {t("回到顶部", "Back to top", "回到頂部")} ↑
          </a>
        </nav>
        <div className="reader-toolbar">
          <button
            type="button"
            aria-pressed={readerWidth === "wide"}
            onClick={toggleWidth}
          >
            {t("宽屏阅读", "Wide reading", "寬螢幕閱讀")}
          </button>
          <a href="#reading-content">
            {t("跳到正文", "Skip to article", "跳至正文")} ↓
          </a>
          {storageError && (
            <small role="status">
              {t(
                "偏好仅本次有效",
                "Preference applies for this visit",
                "偏好僅本次有效",
              )}
            </small>
          )}
        </div>
        {d.route === "docs/ai-apps/java-first-llm" && (
          <FlagshipExperience headings={d.headings} />
        )}
        <div id="reading-content" ref={ref}>
          {children}
        </div>
        {d.route === "docs/ai-apps/java-first-llm" && (
          <details className="manual-extras">
            <summary>
              {t(
                "进阶练习与实践自检",
                "Optional exercises and self-check",
                "進階練習與實作自檢",
              )}
            </summary>
            <TryIt
              id="request-exercise"
              anchors={["request-journey-title"]}
              title={t(
                "请求与错误排查",
                "Requests and troubleshooting",
                "請求與錯誤排查",
              )}
            >
              <RequestJourney />
              <ErrorClinic />
            </TryIt>
            <TryIt
              id="memory-exercise"
              anchors={["conversation-workbench"]}
              title={t("对话记忆", "Conversation memory", "對話記憶")}
            >
              <ConversationWorkbench />
            </TryIt>
            <TryIt
              id="practice-checklist"
              title={t("实践自检", "Practice checklist", "實作自檢")}
            >
              <PracticeCompanion />
            </TryIt>
          </details>
        )}
        <ReadingReflection
          key={d.route}
          route={d.route}
          title={d.metadata.title}
        />
        {d.kind === "docs" && <DocReadingContext position="footer" />}
        <ReadingFork key={d.route} />
        <ArticleHistory route={d.route} />
        <div className="article-end">
          <Link to="/articles">
            ← {t("全部文章", "All writing", "全部文章")}
          </Link>
        </div>
      </article>
      <dialog
        ref={imageDialog}
        className="figure-dialog"
        aria-label={t("图片查看", "Image viewer", "圖片檢視")}
        onClose={() => {
          setZoomImage(null);
          imageTrigger.current?.focus({ preventScroll: true });
        }}
      >
        <button onClick={() => imageDialog.current.close()}>
          {t("关闭", "Close", "關閉")} ×
        </button>
        {zoomImage && <img src={zoomImage.src} alt={zoomImage.alt} />}
      </dialog>
      <ArticleContents headings={d.headings} />
    </main>
  );
}
