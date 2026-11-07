"use client";
import { useEffect, useRef, useState } from "react";
import { radarDateTime } from "@site/src/utils/radar-date.mjs";
import { localizedNews } from "@site/src/utils/news-locale.mjs";
import { domains } from "@site/src/utils/radar.cjs";
import { uiLabel } from "@site/src/utils/ui-labels";
import RadarItem from "@site/src/components/RadarItem";
import { useNewsReading } from "@site/src/components/ReadingActions";
import {
  readRadarDesk,
  deskSignals,
  radarDeskUrl,
  signalFromHash,
} from "../lib/radar-desk.mjs";
import {
  signalDays,
  adjacentSignal,
  firstUnreadSignal,
  milestoneType,
  readRadarSection,
} from "../lib/radar-flow.mjs";
import { useSite } from "../runtime/context";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import useRadarArchive from "./useRadarArchive";

const defaults = {
  query: "",
  domain: "all",
  source: "all",
  inbox: "all",
  order: "latest",
};
export default function Radar() {
  const { items: initial, radarArchive, locale } = useSite();
  const t = useText();
  const reading = useNewsReading();
  const { items, status, load, complete } = useRadarArchive(
    initial,
    radarArchive,
  );
  const [filters, setFilters] = useState(defaults);
  const [collectionView, setCollectionView] = useState("news");
  const [selectedId, setSelectedId] = useState(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [limit, setLimit] = useState(12);
  const listFocus = useRef(null),
    reader = useRef(null),
    pendingMore = useRef(false),
    returnFocus = useRef(null),
    opener = useRef(null),
    browseScroll = useRef(0);
  const matched = deskSignals(items, filters, reading);
  const filtered =
    collectionView === "milestones" ? matched.filter(milestoneType) : matched;
  const selected = selectedId ? items.find((i) => i.id === selectedId) : null;
  const selectedIndex = filtered.findIndex((i) => i.id === selectedId);
  const outsideResults = selected && selectedIndex === -1;
  const active =
    filters.query ||
    filters.domain !== "all" ||
    filters.source !== "all" ||
    filters.inbox !== "all" ||
    filters.order !== "latest";
  const waiting =
    !complete &&
    Boolean(
      active ||
        collectionView === "milestones" ||
        (selectedId && !items.some((i) => i.id === selectedId)),
    );
  const sources = radarArchive.sources;
  const visible = filtered.slice(0, limit);
  const resultCount =
    active || collectionView === "milestones"
      ? filtered.length
      : radarArchive.total;

  useEffect(() => {
    function restore() {
      setCollectionView(readRadarSection(location.search));
      setFilters(
        readRadarDesk(
          location.search,
          domains,
          sources.map(([id]) => id),
        ),
      );
      const id = signalFromHash(location.hash);
      if (!id) returnFocus.current = opener.current;
      setSelectedId(id);
      setReaderOpen(Boolean(id));
    }
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, [sources]);
  useEffect(() => {
    if (waiting && status === "idle") void load(true);
  }, [waiting, status, load]);
  useEffect(() => {
    if (selectedIndex >= limit) setLimit(selectedIndex + 1);
  }, [selectedIndex, limit]);
  useEffect(() => {
    if (!readerOpen) return;
    reader.current?.focus({ preventScroll: true });
    reader.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [selected?.id, readerOpen]);
  useEffect(() => {
    if (readerOpen || !returnFocus.current) return;
    const target =
      listFocus.current?.querySelector(
        `[data-signal="${returnFocus.current}"]`,
      ) || document.getElementById("radar-query");
    target?.focus({ preventScroll: true });
    window.scrollTo({ top: browseScroll.current, behavior: "instant" });
    returnFocus.current = null;
  }, [readerOpen]);
  useEffect(() => {
    if (!pendingMore.current || status === "loading") return;
    pendingMore.current = false;
    listFocus.current
      ?.querySelector("button[data-more-start]")
      ?.focus({ preventScroll: true });
  }, [limit, status]);
  function update(next, replace = false) {
    const value = { ...filters, ...next };
    setFilters(value);
    setSelectedId(null);
    setReaderOpen(false);
    setLimit(12);
    opener.current = null;
    returnFocus.current = null;
    const url = radarDeskUrl(location.href, value);
    if (url !== location.pathname + location.search + location.hash)
      history[replace ? "replaceState" : "pushState"](history.state, "", url);
  }
  function open(item, replace = false) {
    if (!item) return;
    if (!readerOpen) {
      opener.current = item.id;
      browseScroll.current = window.scrollY;
    }
    setSelectedId(item.id);
    setReaderOpen(true);
    const hash = "#signal-" + item.id;
    if (location.hash !== hash)
      history[replace ? "replaceState" : "pushState"](
        history.state,
        "",
        location.pathname + location.search + hash,
      );
  }
  function closeReader() {
    returnFocus.current = opener.current || selectedId;
    setReaderOpen(false);
    setSelectedId(null);
    history.replaceState(
      history.state,
      "",
      location.pathname + location.search,
    );
  }
  function move(direction) {
    open(adjacentSignal(filtered, selectedId, direction), true);
  }
  function chooseCollection(value) {
    setCollectionView(value);
    setReaderOpen(false);
    setSelectedId(null);
    setLimit(12);
    opener.current = null;
    returnFocus.current = null;
    const url = new URL(location.href);
    url.hash = "";
    if (value === "milestones") url.searchParams.set("section", value);
    else url.searchParams.delete("section");
    history.pushState(history.state, "", url.pathname + url.search);
  }
  const more = !complete || filtered.length > limit;
  return (
    <main
      className="radar-flow"
      data-collection={collectionView}
      data-mode={readerOpen ? "focus" : "browse"}
    >
      <header className="flow-header">
        <div>
          <p className="obs-kicker">
            RADAR / {t("AIHOT 中文精选", "CURATED VIA AIHOT", "AIHOT 中文精選")}
          </p>
          <h1>
            AI {t("雷达", "Radar", "雷達")}
            <span aria-hidden="true" className="flow-orbit">
              ⌁
            </span>
          </h1>
          <p>
            {t(
              "发现一个线索，沿着它读下去。",
              "Find a signal. Follow your curiosity.",
              "發現一個線索，沿著它讀下去。",
            )}
          </p>
        </div>
        <nav aria-label={t("资讯归档", "Signal archives", "資訊歸檔")}>
          <a
            href="https://aihot.news/"
            target="_blank"
            rel="noopener noreferrer"
          >
            AIHOT ↗
          </a>
          <Link to="/subscribe">RSS ↗</Link>
        </nav>
      </header>
      <nav
        className="flow-sections"
        aria-label={t("资讯模块", "News collections", "資訊模組")}
      >
        <button
          aria-pressed={collectionView === "news"}
          onClick={() => chooseCollection("news")}
        >
          {t("精选动态", "Selected signals", "精選動態")}
        </button>
        <button
          aria-pressed={collectionView === "milestones"}
          onClick={() => chooseCollection("milestones")}
        >
          {t("AI 大事记", "AI milestones", "AI 大事記")}
        </button>
        <Link to="/radar/weekly">
          {t("每周回顾", "Weekly archive", "每週回顧")} ↗
        </Link>
      </nav>
      {collectionView === "milestones" && (
        <p className="flow-collection-note">
          {t(
            "模型发布、开源与工具更新。依据标题规则归类，按 AIHOT 发布日期整理，原始事件日期见详情。",
            "Model releases, open source and tool updates, grouped by title rules and AIHOT publication date. See each record for original event dates.",
            "模型發佈、開源與工具更新。依標題規則歸類，按 AIHOT 發佈日期整理，原始事件日期見詳情。",
          )}
        </p>
      )}
      <div className="flow-caption">
        <span>
          {t(
            "外部资讯 · 保留出处",
            "EXTERNAL NEWS · SOURCES INCLUDED",
            "外部資訊 · 保留出處",
          )}
        </span>
        {radarArchive.lastCollected && (
          <span>
            {t("最近收录", "Latest addition", "最近收錄")}{" "}
            <time dateTime={radarArchive.lastCollected}>
              {radarDateTime(radarArchive.lastCollected)} UTC+8
            </time>
          </span>
        )}
      </div>
      <div hidden={readerOpen} className="flow-browse">
        <div className="flow-tools">
          <label className="flow-search" htmlFor="radar-query">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">
              {t("搜索资讯", "Search signals", "搜尋資訊")}
            </span>
            <input
              id="radar-query"
              type="search"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value }, true)}
              placeholder={t(
                "搜索一个问题、模型或工具",
                "A question, model or tool…",
                "搜尋一個問題、模型或工具",
              )}
            />
          </label>
          <details
            className="flow-options"
            open={
              filters.source !== "all" ||
              filters.order !== "latest" ||
              filters.inbox !== "all"
            }
          >
            <summary>
              {t("筛选", "Filters", "篩選")}
              {(filters.source !== "all" ||
                filters.order !== "latest" ||
                filters.inbox !== "all") &&
                " ·"}
            </summary>
            <div>
              <label>
                {t("阅读状态", "Reading state", "閱讀狀態")}
                <select
                  value={filters.inbox}
                  onChange={(e) => update({ inbox: e.target.value })}
                >
                  <option value="all">{t("全部", "All", "全部")}</option>
                  <option value="unread">{t("未读", "Unread", "未讀")}</option>
                  <option value="saved">
                    {t("已收藏", "Saved", "已收藏")}
                  </option>
                </select>
              </label>
              <label hidden={sources.length < 2}>
                {t("来源", "Source", "來源")}
                <select
                  id="radar-source"
                  value={filters.source}
                  onChange={(e) => update({ source: e.target.value })}
                >
                  <option value="all">
                    {t("全部来源", "All sources", "全部來源")}
                  </option>
                  {sources.map(([id, name]) => (
                    <option value={id} key={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("排序", "Sort", "排序")}
                <select
                  id="radar-order"
                  value={filters.order}
                  onChange={(e) => update({ order: e.target.value })}
                >
                  <option value="latest">
                    {t("从新到旧", "Newest first", "從新到舊")}
                  </option>
                  <option value="oldest">
                    {t("从旧到新", "Oldest first", "從舊到新")}
                  </option>
                </select>
              </label>
            </div>
          </details>
        </div>
        <nav
          className="flow-channels"
          aria-label={t("资讯方向", "Signal channels", "資訊方向")}
        >
          {["all", ...domains].map((domain) => (
            <button
              key={domain}
              aria-pressed={filters.domain === domain}
              onClick={() => update({ domain })}
            >
              {domain === "all" ? t("全部", "All", "全部") : uiLabel(domain)}
            </button>
          ))}
        </nav>
        <div className="flow-browsebar">
          <p role="status">
            {waiting
              ? t(
                  status === "error" ? "档案加载失败" : "正在读取完整档案…",
                  status === "error"
                    ? "Archive unavailable"
                    : "Loading the complete archive…",
                  status === "error" ? "檔案載入失敗" : "正在讀取完整檔案…",
                )
              : t(
                  `${resultCount} 条信号 · 当前展开 ${visible.length} 条`,
                  `${resultCount} signals · ${visible.length} shown`,
                  `${resultCount} 條訊號 · 目前展開 ${visible.length} 條`,
                )}
          </p>
          <div>
            {active && (
              <button onClick={() => update(defaults)}>
                {t("清除筛选", "Clear filters", "清除篩選")}
              </button>
            )}
            <button
              className="flow-cruise"
              disabled={waiting || !filtered.length}
              onClick={() => open(firstUnreadSignal(filtered, reading.read))}
            >
              {t("开始巡航", "Start cruising", "開始巡航")}{" "}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
        <section
          ref={listFocus}
          className="flow-feed"
          aria-label={t("资讯信号流", "Signal feed", "資訊訊號流")}
          aria-busy={waiting && status !== "error"}
        >
          {!waiting &&
            signalDays(visible).map(({ day, signals }) => (
              <section key={day} className="flow-day" aria-label={day}>
                <header>
                  <time dateTime={day}>{day.slice(5).replace("-", ".")}</time>
                  <span>
                    {day.slice(0, 4)} /{" "}
                    {t("AIHOT 发布", "AIHOT DATE", "AIHOT 發佈")}
                  </span>
                </header>
                <div className="flow-cards">
                  {signals.map((item) => {
                    const copy = localizedNews(item, locale);
                    return (
                      <article
                        className="flow-card"
                        key={item.id}
                        data-read={reading.read.includes(item.id)}
                      >
                        <div className="flow-card-meta">
                          <span>
                            {collectionView === "milestones"
                              ? {
                                  model: t(
                                    "模型发布",
                                    "Model release",
                                    "模型發佈",
                                  ),
                                  tool: t(
                                    "工具更新",
                                    "Tool update",
                                    "工具更新",
                                  ),
                                  embodied: t(
                                    "具身进展",
                                    "Robotics",
                                    "具身進展",
                                  ),
                                }[milestoneType(item)]
                              : item.sourceName}
                          </span>
                          <span>{uiLabel(item.domain)}</span>
                        </div>
                        <button
                          data-signal={item.id}
                          data-more-start={
                            visible.indexOf(item) === limit - 12
                              ? "true"
                              : undefined
                          }
                          onClick={() => open(item)}
                          aria-controls="radar-reader"
                          aria-label={copy.title}
                        >
                          <strong>{copy.title}</strong>
                          <span className="flow-excerpt">
                            {copy.summary ||
                              t(
                                "来源未提供摘要，可前往 AIHOT 查看详情。",
                                "No excerpt is available. Read the details on AIHOT.",
                                "來源未提供摘要，可前往 AIHOT 查看詳情。",
                              )}
                          </span>
                          <span className="flow-open">
                            {item.feedContentUrl
                              ? t(
                                  "站内阅读全文",
                                  "Read RSS text here",
                                  "站內閱讀全文",
                                )
                              : t("聚焦阅读", "Read in focus", "聚焦閱讀")}{" "}
                            <span aria-hidden="true">↗</span>
                          </span>
                        </button>
                        <div className="flow-card-foot">
                          <span>
                            {reading.saved.includes(item.id)
                              ? t("已收藏", "Saved", "已收藏")
                              : reading.read.includes(item.id)
                                ? t("已读", "Read", "已讀")
                                : !copy.summary
                                  ? t(
                                      "原文可读",
                                      "Source available",
                                      "原文可讀",
                                    )
                                  : item.summaryKind === "ai-summary"
                                    ? t("AI 摘要", "AI summary", "AI 摘要")
                                    : t(
                                        "来源摘录",
                                        "Source excerpt",
                                        "來源摘錄",
                                      )}
                          </span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t(
                              `查看来源页：${copy.title}`,
                              `Open source page: ${copy.title}`,
                              `查看來源頁：${copy.title}`,
                            )}
                          >
                            {t("来源页", "Source page", "來源頁")} ↗
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          {!waiting && !filtered.length && (
            <div className="flow-empty">
              <span aria-hidden="true">∅</span>
              <h2>
                {t(
                  "这个频段，暂时没有信号。",
                  "No signals on this frequency.",
                  "這個頻段，暫時沒有訊號。",
                )}
              </h2>
              <p>
                {t(
                  "试试更短的关键词，或清除方向、来源与阅读状态筛选。",
                  "Try a shorter query, or clear the topic, source and reading filters.",
                  "試試更短的關鍵字，或清除方向、來源與閱讀狀態篩選。",
                )}
              </p>
              <button onClick={() => update(defaults)}>
                {t("清除筛选", "Clear filters", "清除篩選")} →
              </button>
            </div>
          )}
        </section>
        {status === "error" ? (
          <button className="flow-more" onClick={() => load(Boolean(waiting))}>
            {t("重新加载档案", "Retry archive", "重新載入檔案")} ↻
          </button>
        ) : (
          !waiting &&
          more && (
            <button
              className="flow-more"
              disabled={status === "loading"}
              onClick={async () => {
                pendingMore.current = true;
                if (filtered.length <= limit && !complete) await load(false);
                setLimit((n) => n + 12);
              }}
            >
              {status === "loading"
                ? t("正在加载…", "Loading…", "正在載入…")
                : t(
                    "沿时间线继续",
                    "Continue along the timeline",
                    "沿時間線繼續",
                  )}{" "}
              ↓
            </button>
          )
        )}
      </div>
      <section
        hidden={!readerOpen}
        id="radar-reader"
        ref={reader}
        tabIndex={-1}
        className="flow-focus"
        aria-label={t("聚焦阅读", "Focus reader", "聚焦閱讀")}
        onKeyDown={(e) => {
          if (
            e.target.closest(
              "input,select,textarea,[contenteditable='true']",
            ) ||
            e.altKey ||
            e.ctrlKey ||
            e.metaKey
          )
            return;
          if (e.key === "Escape") {
            e.preventDefault();
            closeReader();
          } else if (e.key.toLowerCase() === "j") {
            e.preventDefault();
            move(1);
          } else if (e.key.toLowerCase() === "k") {
            e.preventDefault();
            move(-1);
          }
        }}
      >
        <div className="flow-focusbar">
          <button onClick={closeReader}>
            ← {t("返回信号流", "Back to the feed", "返回訊號流")}
          </button>
          <span>
            {t("聚焦", "FOCUS", "聚焦")} /{" "}
            {selectedIndex < 0
              ? "—"
              : String(selectedIndex + 1).padStart(2, "0")}
          </span>
          <nav aria-label={t("快速巡航", "Quick navigation", "快速巡航")}>
            <button
              aria-label={t("上一条资讯", "Previous signal", "上一條資訊")}
              disabled={!adjacentSignal(filtered, selectedId, -1) || waiting}
              onClick={() => move(-1)}
            >
              ←
            </button>
            <button
              aria-label={t("下一条资讯", "Next signal", "下一條資訊")}
              disabled={!adjacentSignal(filtered, selectedId, 1) || waiting}
              onClick={() => move(1)}
            >
              →
            </button>
          </nav>
        </div>
        {outsideResults && !waiting && (
          <p className="flow-notice" role="status">
            {t(
              "这条已离开当前筛选结果，你仍可继续阅读或查看下一条。",
              "This signal is outside the current results. Keep reading or continue to the next one.",
              "此訊號已離開目前篩選結果，仍可繼續閱讀或查看下一條。",
            )}
          </p>
        )}
        {waiting ? (
          <p className="flow-notice" role="status">
            {t(
              status === "error"
                ? "暂时无法读取档案，请重试。"
                : "正在读取档案…",
              status === "error"
                ? "The archive is unavailable. Please retry."
                : "Loading the archive…",
              status === "error"
                ? "暫時無法讀取檔案，請重試。"
                : "正在讀取檔案…",
            )}
          </p>
        ) : selected ? (
          <RadarItem
            key={selected.id}
            item={selected}
            contextFirst
            headingAs="h2"
            showFullContent
          />
        ) : (
          <div className="flow-empty">
            <h2>
              {t(
                "这条信号没有找到。",
                "This signal was not found.",
                "找不到此訊號。",
              )}
            </h2>
            <button onClick={closeReader}>
              {t("返回信号流", "Back to the feed", "返回訊號流")} →
            </button>
          </div>
        )}
        {status === "error" && (
          <button className="flow-more" onClick={() => load(true)}>
            {t("重新加载档案", "Retry archive", "重新載入檔案")} ↻
          </button>
        )}
        <nav
          className="flow-next"
          aria-label={t("巡航控制", "Cruise controls", "巡航控制")}
        >
          <button
            disabled={!adjacentSignal(filtered, selectedId, -1) || waiting}
            onClick={() => move(-1)}
          >
            ← {t("上一条", "Previous", "上一條")} <kbd>K</kbd>
          </button>
          <span>
            {t(
              "不自动标记已读",
              "You decide when it is read",
              "不自動標記已讀",
            )}
          </span>
          <button
            disabled={!adjacentSignal(filtered, selectedId, 1) || waiting}
            onClick={() => move(1)}
          >
            {t("下一条", "Next", "下一條")} → <kbd>J</kbd>
          </button>
        </nav>
        {!waiting && selectedIndex === filtered.length - 1 && !complete && (
          <button
            className="flow-more"
            disabled={status === "loading"}
            onClick={() => load(false)}
          >
            {t("加载后续信号", "Load more signals", "載入後續訊號")} ↓
          </button>
        )}
        <p className="flow-keyboard">
          {t(
            "J / K 切换 · Esc 返回",
            "J / K to navigate · Esc to return",
            "J / K 切換 · Esc 返回",
          )}
        </p>
      </section>
      {reading.error && (
        <p className="flow-notice" role="status">
          {t(
            "浏览器存储不可用，本次阅读状态仅在当前访问有效。",
            "Browser storage is unavailable. Reading state lasts for this visit only.",
            "瀏覽器儲存不可用，閱讀狀態僅於本次造訪有效。",
          )}
        </p>
      )}
      <details className="flow-method">
        <summary>
          {t("关于这些信号", "About these signals", "關於這些訊號")}
        </summary>
        <p>
          {t(
            "这里是外部资讯，不代表本站观点。摘要保留原语言与来源标记，收录不等于事实核验。时间线按来源 feed 发布时间排列；原公告、聚合与本站收录时间在每条详情中分开。巡航仅切换现有条目，不产生摘要或自动标记已读。",
            "These are external signals, not this site's views. Summaries retain language and provenance labels; inclusion is not verification. The timeline follows feed publication dates. Original, aggregation and collection dates remain separate in each record. Cruising navigates existing records without generating summaries or marking them read.",
            "這裡是外部資訊，不代表本站觀點。摘要保留原語言與來源標記，收錄不等於事實核驗。時間線依來源 feed 發佈時間排列；原公告、聚合與本站收錄時間在詳情分開。巡航只切換既有條目，不產生摘要或自動標記已讀。",
          )}
        </p>
      </details>
    </main>
  );
}
