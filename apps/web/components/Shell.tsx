"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import Brand from "./Brand";
import { SiteContext, useSite } from "../runtime/context";
import Link from "../runtime/Link";
import dynamic from "next/dynamic";
const Search = dynamic(() => import("./Search"));
import { languageUrl } from "../lib/navigation.ts";
import { isLocale, type SiteContextValue } from "../lib/site-types";
import type { PropsWithChildren, ReactNode } from "react";
export function useText() {
  const { locale } = useSite();
  return useCallback(
    (zh: string, en: string, tw = zh) =>
      locale === "en" ? en : locale === "zh-TW" ? tw : zh,
    [locale],
  );
}
function Frame({ children }: PropsWithChildren) {
  const router = useRouter();
  const { locale, route } = useSite(),
    t = useText(),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
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
  function closeNavigation() {
    if (!menu) return;
    setMenu(false);
    menuTrigger.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "Escape") {
        setMenu((open) => {
          if (open) menuTrigger.current?.focus();
          return false;
        });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    setMenu(false);
    setSearch(false);
    document.documentElement.lang = locale;
  }, [route, locale]);
  const nav: [string, ReactNode][] = [
    ["articles", t("文章", "Writing", "文章")],
    ["learning", t("学习", "Learn", "學習")],
    ["build", t("实践", "Build", "實作")],
    ["radar", t("AI 雷达", "AI Radar", "AI 雷達")],
    ["about", t("关于", "About", "關於")],
  ];
  return (
    <div className="site-shell observatory-shell">
      <a className="skip" href="#main-content">
        {t("跳转到内容", "Skip to content", "跳至內容")}
      </a>
      <header className="site-header">
        <Link
          to="/"
          onNavigate={closeNavigation}
          className="brand-link"
          aria-label={t("Hohoo · 首页", "Hohoo · Home", "Hohoo · 首頁")}
        >
          <Brand />
        </Link>
        <p className="rail-caption">
          {t(
            "公开学习的研究手记",
            "A notebook, kept in public",
            "公開學習的研究手記",
          )}
        </p>
        <nav
          id="main-nav"
          className={menu ? "open" : ""}
          aria-label={t("主导航", "Main navigation", "主導覽")}
        >
          {nav.map(([p, label], index) => (
            <Link
              key={p}
              to={"/" + p}
              onNavigate={closeNavigation}
              aria-current={
                route === p ||
                route.startsWith(p + "/") ||
                (p === "learning" &&
                  (route === "research" ||
                    route === "journey" ||
                    route.startsWith("journey/"))) ||
                (p === "build" && /^(projects|labs)(\/|$)/.test(route)) ||
                (p === "articles" && /^(blog|docs)(\/|$)/.test(route))
                  ? "page"
                  : undefined
              }
            >
              <span className="nav-index" aria-hidden="true">
                0{index + 1}
              </span>
              <span>{label}</span>
              <span className="nav-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </nav>
        <div className="rail-personal">
          <span>{t("你的书桌", "YOUR DESK", "你的書桌")}</span>
          <Link to="/reading">
            {t("阅读清单", "Reading list", "閱讀清單")} ↗
          </Link>
          <Link to="/subscribe">
            {t("订阅更新", "Subscribe", "訂閱更新")} ↗
          </Link>
        </div>
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
              if (!isLocale(e.target.value)) return;
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
            ref={menuTrigger}
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
        <div className="footer-inner">
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
            <Link
              className="brand-link"
              to="/"
              aria-label={t("Hohoo · 首页", "Hohoo · Home", "Hohoo · 首頁")}
            >
              <Brand />
            </Link>
            <span>
              {t(
                "公开学习，持续构建。",
                "Learning in public. Building in public.",
                "公開學習，持續構建。",
              )}
            </span>
            <nav aria-label={t("页脚", "Footer", "頁尾")}>
              <Link to="/reading">
                {t("阅读清单", "Reading list", "閱讀清單")}
              </Link>
              <Link to="/now">{t("近况", "Now", "近況")}</Link>
              <Link to="/journey">
                {t("研究计划", "Research plan", "研究計畫")}
              </Link>
              <Link to="/timeline">{t("时间轴", "Timeline", "時間軸")}</Link>
              <Link to="/subscribe">RSS</Link>
              <Link to="/changelog">{t("更新", "Changelog", "更新")}</Link>
            </nav>
            <small>© Hohoo · Next.js</small>
          </div>
        </div>
      </footer>
      {search && (
        <Search
          key={locale}
          onClose={() => {
            setSearch(false);
            trigger.current?.focus({ preventScroll: true });
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
