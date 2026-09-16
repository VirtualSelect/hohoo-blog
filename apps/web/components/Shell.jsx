"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Translate from "../runtime/Translate";
import ThemeToggle from "./ThemeToggle";
import { SiteContext, useSite } from "../runtime/context";
import Link from "../runtime/Link";
import { searchEntries } from "@site/src/utils/search.mjs";
import { writingEntries } from "@site/src/utils/localization.cjs";
import { uiLabel } from "@site/src/utils/ui-labels";
export function useText() {
  const { locale } = useSite();
  return useCallback(
    (zh, en, tw = zh) => (locale === "en" ? en : locale === "zh-TW" ? tw : zh),
    [locale],
  );
}
function Search({ onClose }) {
  const { search, globalData } = useSite(),
    t = useText(),
    ref = useRef(null),
    [query, setQuery] = useState("");
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    d.querySelector("input")?.focus({ preventScroll: true });
    return () => d.close();
  }, []);
  const hasQuery = Boolean(query.trim());
  const results = hasQuery
    ? searchEntries(search, query).slice(0, 18)
    : writingEntries(globalData["content-index"].entries).slice(0, 3);
  function closeSearch() {
    ref.current?.close();
    onClose();
  }
  return (
    <dialog
      ref={ref}
      className="lab-search"
      aria-labelledby="search-title"
      onCancel={(e) => {
        e.preventDefault();
        closeSearch();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSearch();
      }}
    >
      <div>
        <header>
          <h2 id="search-title">
            {t("搜索知识与实践", "Search the Lab", "搜尋知識與實作")}
          </h2>
          <button onClick={closeSearch} aria-label={t("关闭", "Close", "關閉")}>
            Esc ×
          </button>
        </header>
        <label htmlFor="lab-query">
          {t(
            "搜索标题、摘要，支持 type:paper 等筛选",
            "Search titles and summaries; try type:paper",
            "搜尋標題、摘要，支援 type:paper 等篩選",
          )}
        </label>
        <input
          id="lab-query"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            "想了解什么？",
            "What are you looking for?",
            "想瞭解什麼？",
          )}
        />
        {!hasQuery && (
          <div className="search-start">
            <p className="eyebrow">
              {t("从这里开始", "Start here", "從這裡開始")}
            </p>
            <div className="inline-links">
              <Link to="/journey" onClick={closeSearch}>
                <Translate id="journey.nav" /> →
              </Link>
              <Link to="/build" onClick={closeSearch}>
                {t("项目与实验", "Projects & labs", "專案與實驗")} →
              </Link>
              <Link to="/radar" onClick={closeSearch}>
                {t("AI 雷达", "AI Radar", "AI 雷達")} →
              </Link>
            </div>
            <p className="eyebrow">
              {t("最近发布", "Recent writing", "最近發佈")}
            </p>
          </div>
        )}
        <p className="hh-meta" role="status">
          {hasQuery
            ? t(
                `显示 ${results.length} 条结果（最多 18 条）`,
                `Showing ${results.length} results (up to 18)`,
                `顯示 ${results.length} 條結果（最多 18 條）`,
              )
            : ""}
        </p>
        <div>
          {hasQuery && !results.length ? (
            <p className="empty">
              {t(
                "没有匹配的内容，试试其他关键词。",
                "No matches. Try another keyword.",
                "沒有符合的內容，試試其他關鍵字。",
              )}
            </p>
          ) : (
            results.map((e) => (
              <Link
                onClick={closeSearch}
                className="search-result"
                key={e.id}
                to={e.href}
              >
                <span className="eyebrow">
                  {e.type === "learning" ? (
                    <Translate id="journey.roadmapLabel" />
                  ) : (
                    uiLabel(e.type.toUpperCase())
                  )}
                </span>
                <strong>{e.title}</strong>
                <small>{e.description}</small>
              </Link>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
}
function Frame({ children }) {
  const { locale, route } = useSite(),
    t = useText(),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false);
  const trigger = useRef(null);
  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    setMenu(false);
    setSearch(false);
    document.documentElement.lang = locale;
  }, [route, locale]);
  const nav = [
    ["articles", t("文章", "Writing", "文章")],
    ["journey", <Translate key="journey" id="journey.nav" />],
    ["build", t("实践", "Build", "實作")],
    ["radar", t("AI 雷达", "AI Radar", "AI 雷達")],
    ["about", t("关于", "About", "關於")],
  ];
  return (
    <div className="site-shell">
      <a className="skip" href="#main-content">
        {t("跳转到内容", "Skip to content", "跳至內容")}
      </a>
      <header className="site-header">
        <Link to="/" className="wordmark">
          Hohoo<span>.</span>
        </Link>
        <nav
          id="main-nav"
          className={menu ? "open" : ""}
          aria-label={t("主导航", "Main navigation", "主導覽")}
        >
          {nav.map(([p, label]) => (
            <Link
              key={p}
              to={"/" + p}
              aria-current={route === p ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            ref={trigger}
            onClick={() => setSearch(true)}
            aria-label={t("搜索", "Search", "搜尋")}
          >
            ⌕{" "}
            <span className="search-label">{t("搜索", "Search", "搜尋")}</span>
            <kbd>Ctrl + K</kbd>
          </button>
          <label className="sr-only" htmlFor="language">
            {t("语言", "Language", "語言")}
          </label>
          <select
            id="language"
            value={locale}
            onChange={(e) => {
              const prefix =
                e.target.value === "zh-CN" ? "" : "/" + e.target.value;
              window.location.assign(
                prefix +
                  "/" +
                  route +
                  window.location.search +
                  window.location.hash,
              );
            }}
          >
            <option value="zh-CN">简体</option>
            <option value="zh-TW">繁體</option>
            <option value="en">EN</option>
          </select>
          <ThemeToggle />
          <button
            className="menu-toggle"
            aria-expanded={menu}
            aria-controls="main-nav"
            onClick={() => setMenu(!menu)}
            aria-label={t("菜单", "Menu", "選單")}
          >
            {menu ? "×" : "☰"}
          </button>
        </div>
      </header>
      <div id="main-content" tabIndex={-1} className="site-content">
        {children}
      </div>
      <footer className="site-footer">
        <div className="footer-message">
          <p>
            {t(
              "让好奇心，变成作品。",
              "Make something of your curiosity.",
              "讓好奇心，變成作品。",
            )}
          </p>
          <a href="https://github.com/VirtualSelect">GitHub ↗</a>
        </div>
        <div className="footer-bottom">
          <Link className="wordmark" to="/">
            Hohoo.
          </Link>
          <span>
            {t(
              "公开学习，持续构建。",
              "Learning in public. Building in public.",
              "公開學習，持續構建。",
            )}
          </span>
          <nav aria-label={t("页脚", "Footer", "頁尾")}>
            <Link to="/now">{t("近况", "Now", "近況")}</Link>
            <Link to="/timeline">{t("时间轴", "Timeline", "時間軸")}</Link>
            <Link to="/subscribe">RSS</Link>
            <Link to="/changelog">{t("更新", "Changelog", "更新")}</Link>
          </nav>
          <small>© Hohoo · Next.js</small>
        </div>
      </footer>
      {search && (
        <Search
          onClose={() => {
            setSearch(false);
            trigger.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </div>
  );
}
export default function Shell({ value, children }) {
  return (
    <SiteContext.Provider value={value}>
      <Frame>{children}</Frame>
    </SiteContext.Provider>
  );
}
