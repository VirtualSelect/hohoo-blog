"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Translate from "../runtime/Translate";
import ThemeToggle from "./ThemeToggle";
import { SiteContext, useSite } from "../runtime/context";
import Link from "../runtime/Link";
import dynamic from "next/dynamic";
const Search = dynamic(() => import("./Search"));
import { languageUrl } from "../lib/navigation.mjs";
export function useText() {
  const { locale } = useSite();
  return useCallback(
    (zh, en, tw = zh) => (locale === "en" ? en : locale === "zh-TW" ? tw : zh),
    [locale],
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
              window.location.assign(
                languageUrl(e.target.value, route, window.location.href),
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
