"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import Brand from "./Brand";
import { SiteContext, useSite } from "../runtime/context";
import Link from "../runtime/Link";
import { languageUrl } from "../lib/navigation.ts";
import { isLocale, type SiteContextValue } from "../lib/site-types";
import type { PropsWithChildren } from "react";
const Search = dynamic(() => import("./Search"));
export function useText() {
  const { locale } = useSite();
  return useCallback(
    (zh: string, en: string, tw = zh) =>
      locale === "en" ? en : locale === "zh-TW" ? tw : zh,
    [locale],
  );
}
function NavigationIcon({ kind }: { kind: string }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "learning" && (
        <>
          <path d="m3 8 9-4 9 4-9 4-9-4Z" />
          <path d="M6 10v6c3 3 9 3 12 0v-6M21 8v7" />
        </>
      )}
      {kind === "build" && (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="m8 11-2 2 2 2m8-4 2 2-2 2m-3-6-2 8" />
        </>
      )}
      {kind === "notes" && (
        <>
          <path d="M4 5h6l2 2 2-2h6v14h-6l-2 2-2-2H4V5Z" />
          <path d="M12 7v14" />
        </>
      )}
      {kind === "articles" && (
        <>
          <path d="M6 3h9l4 4v14H6V3Z" />
          <path d="M14 3v5h5M9 12h7m-7 4h5" />
        </>
      )}
      {kind === "radar" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <path d="m12 12 6-6M3 12h2m14 0h2M12 3v2m0 14v2" />
        </>
      )}
    </svg>
  );
}
function Frame({ children }: PropsWithChildren) {
  const router = useRouter();
  const { locale, route } = useSite();
  const t = useText();
  const [search, setSearch] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const directoryTrigger = useRef<HTMLButtonElement>(null);
  const directory = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let frame: number | null = null;
    const adoptNativeEntry = () => {
      if (window.history.state !== null || frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        // Native fragment entries can lack router state. Adopt only those
        // entries through the public API, without copying Next's private
        // fields, adding a history entry, or changing the reader's scroll.
        if (window.history.state === null)
          router.replace(location.pathname + location.search + location.hash, {
            scroll: false,
          });
      });
    };
    window.addEventListener("hashchange", adoptNativeEntry);
    window.addEventListener("popstate", adoptNativeEntry);
    return () => {
      window.removeEventListener("hashchange", adoptNativeEntry);
      window.removeEventListener("popstate", adoptNativeEntry);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [router]);
  const nav = [
    { path: "learning", label: t("学习", "Learn", "學習") },
    { path: "build", label: t("实践", "Build", "實作") },
    { path: "notes", label: t("知识", "Knowledge", "知識") },
    { path: "articles", label: t("文章", "Articles", "文章") },
    { path: "radar", label: t("雷达", "Radar", "雷達") },
  ];
  function isCurrent(path: string) {
    return (
      route === path ||
      route.startsWith(path + "/") ||
      (path === "learning" && /^(research|journey)(\/|$)/.test(route)) ||
      (path === "build" && /^(projects|labs)(\/|$)/.test(route)) ||
      (path === "notes" && /^(notes|papers)(\/|$)/.test(route)) ||
      (path === "articles" && /^(blog|docs)(\/|$)/.test(route))
    );
  }
  const current =
    nav.find(({ path }) => isCurrent(path))?.label ??
    (route === "about"
      ? t("关于", "About", "關於")
      : route === "reading"
        ? t("阅读清单", "Reading list", "閱讀清單")
        : route
          ? t("研究档案", "Archive", "研究檔案")
          : t(
              "独立 AI 研究与实践",
              "Independent AI research & practice",
              "獨立 AI 研究與實作",
            ));
  function closeDirectory() {
    directory.current?.close();
  }
  function openSearch() {
    closeDirectory();
    setSearch(true);
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        directory.current?.close();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    directory.current?.close();
    setDirectoryOpen(false);
    setSearch(false);
    document.documentElement.lang = locale;
  }, [route, locale]);
  return (
    <div className="site-shell observatory-shell lab-shell atlas-shell">
      <a className="skip" href="#main-content">
        {t("跳转到内容", "Skip to content", "跳至內容")}
      </a>
      <header className="site-header">
        <Link
          to="/"
          onNavigate={closeDirectory}
          className="brand-link"
          aria-label={t("Hohoo · 首页", "Hohoo · Home", "Hohoo · 首頁")}
        >
          <Brand />
        </Link>
        <p className="atlas-location">
          <span aria-hidden="true">/</span>
          {current}
        </p>
        <nav
          id="main-nav"
          aria-label={t("主导航", "Main navigation", "主導覽")}
        >
          {nav.map(({ path, label }) => (
            <Link
              key={path}
              to={"/" + path}
              onNavigate={closeDirectory}
              aria-current={isCurrent(path) ? "page" : undefined}
            >
              <NavigationIcon kind={path} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <label className="sr-only" htmlFor="language">
            {t("语言", "Language", "語言")}
          </label>
          <select
            id="language"
            value={locale}
            onChange={(event) => {
              if (isLocale(event.target.value))
                window.location.assign(
                  languageUrl(event.target.value, route, window.location.href),
                );
            }}
          >
            <option value="zh-CN">简体</option>
            <option value="zh-TW">繁體</option>
            <option value="en">EN</option>
          </select>
          <button
            type="button"
            ref={searchTrigger}
            className="atlas-search-trigger"
            onClick={openSearch}
            aria-label={t(
              "搜索，快捷键 Ctrl 或 Command 加 K",
              "Search, Control or Command K",
              "搜尋，快捷鍵 Ctrl 或 Command 加 K",
            )}
            title={t(
              "搜索 · Ctrl / ⌘ K",
              "Search · Ctrl / ⌘ K",
              "搜尋 · Ctrl / ⌘ K",
            )}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
          </button>
          <button
            type="button"
            ref={directoryTrigger}
            className="atlas-directory-trigger"
            aria-label={t("打开目录", "Open directory", "開啟目錄")}
            aria-haspopup="dialog"
            aria-expanded={directoryOpen}
            aria-controls="atlas-directory"
            onClick={() => {
              directory.current?.showModal();
              setDirectoryOpen(true);
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="4" y="4" width="5" height="5" />
              <rect x="15" y="4" width="5" height="5" />
              <rect x="4" y="15" width="5" height="5" />
              <rect x="15" y="15" width="5" height="5" />
            </svg>
            <span>{t("目录", "Index", "目錄")}</span>
          </button>
        </div>
      </header>
      <div id="main-content" tabIndex={-1} className="site-content">
        {children}
      </div>
      <footer className="site-footer">
        <div className="footer-inner atlas-footer">
          <div>
            <span className="atlas-archive-mark">HOHOO / OPEN ARCHIVE</span>
            <p>
              {t(
                "公开学习的记录，持续更新。",
                "An ongoing record of learning in public.",
                "公開學習的記錄，持續更新。",
              )}
            </p>
          </div>
          <nav aria-label={t("页脚链接", "Footer links", "頁尾連結")}>
            <Link to="/about">{t("关于", "About", "關於")}</Link>
            <Link to="/reading">
              {t("阅读清单", "Reading list", "閱讀清單")}
            </Link>
            <Link to="/subscribe">RSS</Link>
            <a href="https://github.com/VirtualSelect">GitHub ↗</a>
          </nav>
          <small>© Hohoo</small>
        </div>
      </footer>
      <dialog
        ref={directory}
        id="atlas-directory"
        className="atlas-directory"
        aria-labelledby="atlas-directory-title"
        onCancel={(event) => {
          event.preventDefault();
          closeDirectory();
        }}
        onClose={() => {
          setDirectoryOpen(false);
          if (!document.querySelector("dialog[open]"))
            directoryTrigger.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDirectory();
        }}
      >
        <div className="atlas-directory-inner">
          <header>
            <div>
              <span className="atlas-archive-mark">HOHOO’S AI LAB</span>
              <h2 id="atlas-directory-title">
                {t("探索目录", "The index", "探索目錄")}
              </h2>
            </div>
            <button
              autoFocus
              type="button"
              className="atlas-directory-close"
              onClick={closeDirectory}
              aria-label={t("关闭目录", "Close index", "關閉目錄")}
            >
              <span aria-hidden="true">×</span>
              <span>Esc</span>
            </button>
          </header>
          <nav
            className="atlas-directory-main"
            aria-label={t("主要栏目", "Main sections", "主要欄目")}
          >
            {nav.map(({ path, label }, index) => (
              <Link
                key={path}
                to={"/" + path}
                onClick={closeDirectory}
                aria-current={isCurrent(path) ? "page" : undefined}
              >
                <span className="atlas-directory-number">0{index + 1}</span>
                <strong>{label}</strong>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </nav>
          <nav
            className="atlas-directory-extra"
            aria-label={t("更多入口", "More to explore", "更多入口")}
          >
            <Link to="/" onClick={closeDirectory}>
              {t("首页", "Home", "首頁")}
            </Link>
            <Link to="/about" onClick={closeDirectory}>
              {t("关于 Hohoo", "About Hohoo", "關於 Hohoo")}
            </Link>
            <Link to="/reading" onClick={closeDirectory}>
              {t("阅读清单", "Reading list", "閱讀清單")}
            </Link>
            <Link to="/journey" onClick={closeDirectory}>
              {t("研究计划", "Research plan", "研究計畫")}
            </Link>
            <Link to="/timeline" onClick={closeDirectory}>
              {t("时间轴", "Timeline", "時間軸")}
            </Link>
            <Link to="/papers" onClick={closeDirectory}>
              {t("论文阅读", "Paper notes", "論文閱讀")}
            </Link>
            <Link to="/subscribe" onClick={closeDirectory}>
              {t("订阅更新", "Subscribe", "訂閱更新")}
            </Link>
            <a href="https://github.com/VirtualSelect">GitHub ↗</a>
          </nav>
          <p className="atlas-directory-note">
            {t(
              "选择一个方向，接着探索。",
              "Choose a direction. Keep exploring.",
              "選擇一個方向，接著探索。",
            )}
          </p>
        </div>
      </dialog>
      {search && (
        <Search
          key={locale}
          onClose={() => {
            setSearch(false);
            searchTrigger.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </div>
  );
}
export default function Shell({
  value,
  children,
}: PropsWithChildren<{ value: SiteContextValue }>) {
  return (
    <SiteContext.Provider value={value}>
      <Frame>{children}</Frame>
    </SiteContext.Provider>
  );
}
