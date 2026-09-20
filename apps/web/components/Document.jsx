"use client";
import { useEffect, useRef } from "react";
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
export default function Document({ children }) {
  const { document: d } = useSite(),
    t = useText(),
    ref = useRef(null);
  useEffect(() => {
    const buttons = [];
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
    }
    return () => {
      timers.forEach(clearTimeout);
      buttons.forEach((b) => b.remove());
    };
  }, [d, t]);
  return (
    <main className="document-layout">
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
        <div ref={ref}>{children}</div>
        {d.route === "docs/ai-apps/java-first-llm" && (
          <>
            <TryIt
              id="request-exercise"
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
          </>
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
      <ArticleContents headings={d.headings} />
    </main>
  );
}
