"use client";
import { useEffect, useRef, useState } from "react";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import { canonicalPath } from "../lib/visitor-stats.mjs";
let pending;
let expires = 0;
function loadStats() {
  if (!pending || Date.now() > expires) {
    expires = Date.now() + 600000;
    pending = fetch("/api/visitors", { signal: AbortSignal.timeout(9000) })
      .then((r) => (r.ok ? r.json() : { status: "unavailable" }))
      .catch(() => ({ status: "unavailable" }));
  }
  return pending;
}
export default function VisitorStats({ variant = "overview", path }) {
  const t = useText(),
    { locale, globalData } = useSite();
  const ref = useRef(null),
    [data, setData] = useState(null);
  useEffect(() => {
    let active = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        loadStats().then((value) => {
          if (active) setData(value);
        });
      },
      { rootMargin: "100px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);
  const ready = data?.status === "ready";
  if (variant === "article") {
    const count = ready ? data.paths[canonicalPath("/" + path)] : undefined;
    return (
      <p ref={ref} className="visitor-count">
        {count === undefined
          ? t("浏览统计暂不可用", "View count unavailable", "瀏覽統計暫不可用")
          : t(
              `近 7 天 ${count} 次浏览`,
              `${count} views in the last 7 days`,
              `近 7 天 ${count} 次瀏覽`,
            )}
      </p>
    );
  }
  const entries = globalData["content-index"].entries;
  const articles = ready
    ? entries
        .filter(
          (e) => ["doc", "blog"].includes(e.type) && e.status === "published",
        )
        .map((e) => ({ ...e, views: data.paths[canonicalPath(e.href)] }))
        .filter((e) => e.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
    : [];
  const modules = [
    ["/journey", t("学习旅程", "Journey", "學習旅程")],
    ["/docs", t("教程", "Tutorials", "教學")],
    ["/projects", t("项目", "Projects", "專案")],
    ["/labs", t("实验", "Labs", "實驗")],
    ["/radar", t("AI 资讯", "AI Radar", "AI 資訊")],
    ["/blog", t("随笔", "Journal", "隨筆")],
  ];
  const ranked = ready
    ? modules
        .map(([href, title]) => ({
          href: href === "/docs" ? "/learning" : href,
          title,
          views: Object.entries(data.paths)
            .filter(([p]) => p === href || p.startsWith(href + "/"))
            .reduce((sum, [, n]) => sum + n, 0),
        }))
        .filter((e) => e.views > 0)
        .sort((a, b) => b.views - a.views)
    : [];
  const empty = t(
    "还没有可展示的数据。",
    "No data to display yet.",
    "還沒有可展示的資料。",
  );
  return (
    <section
      ref={ref}
      className="visitor-stats"
      aria-label={t("访客足迹", "Visitor footprints", "訪客足跡")}
    >
      <div className="section-top">
        <h2>{t("访客足迹", "Visitor footprints", "訪客足跡")}</h2>
        <small>
          {t(
            "匿名汇总 · Vercel",
            "Anonymous aggregates · Vercel",
            "匿名彙總 · Vercel",
          )}
        </small>
      </div>
      {!ready ? (
        <p>
          {!data
            ? t("统计加载中…", "Loading statistics…", "統計載入中…")
            : data.status === "unconfigured"
              ? t(
                  "访问统计尚未启用。",
                  "Visitor statistics are not enabled yet.",
                  "訪問統計尚未啟用。",
                )
              : t(
                  "统计暂时不可用，请稍后再看。",
                  "Statistics are temporarily unavailable.",
                  "統計暫時不可用，請稍後再看。",
                )}
        </p>
      ) : (
        <>
          <p className="visitor-totals">
            {t("自启用以来", "Since tracking began", "自啟用以來")} ·{" "}
            {data.totals.pageviews.toLocaleString(locale)}{" "}
            {t("次浏览", "views", "次瀏覽")} ·{" "}
            {data.totals.visitors.toLocaleString(locale)}{" "}
            {t("匿名访客", "anonymous visitors", "匿名訪客")}
          </p>
          <p>
            {t(
              "以下为近 7 天统计；语言版本合并计算，数据有延迟。",
              "Below: last 7 days, combined across languages. Data is delayed.",
              "以下為近 7 天統計；語言版本合併計算，資料有延遲。",
            )}
          </p>
          <div className="visitor-columns">
            {[
              [t("热门文章", "Popular writing", "熱門文章"), articles],
              [t("热门模块", "Popular sections", "熱門模組"), ranked],
            ].map(([title, rows]) => (
              <div key={title}>
                <h3>{title}</h3>
                {rows.length ? (
                  <ol>
                    {rows.map((e) => (
                      <li key={e.href}>
                        <Link to={e.href}>{e.title}</Link>
                        <span>
                          {e.views} {t("次浏览", "views", "次瀏覽")}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>{empty}</p>
                )}
              </div>
            ))}
            <div>
              <h3>{t("访客来自", "Visitors from", "訪客來自")}</h3>
              {data.countries.length ? (
                <ul>
                  {data.countries.map((c) => (
                    <li key={c.country}>
                      <span>
                        {new Intl.DisplayNames([locale], { type: "region" }).of(
                          c.country,
                        )}
                      </span>
                      <span>{c.visitors}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{empty}</p>
              )}
              <small>
                {t(
                  "仅展示至少 3 位匿名访客的国家或地区。",
                  "Countries or regions with at least 3 anonymous visitors only.",
                  "僅展示至少 3 位匿名訪客的國家或地區。",
                )}
              </small>
            </div>
          </div>
        </>
      )}
      <details>
        <summary>{t("统计说明", "About these statistics", "統計說明")}</summary>
        <p>
          {t(
            "不公开 IP、城市或个人轨迹。访客数由 Vercel 匿名识别，不等于真实人数。仅记录生产页面访问，查询参数和页面锚点不发送；搜索词、私人便签和学习记录不作为统计事件上传。",
            "No public IPs, cities or individual trails. Vercel anonymous visitor estimates are not a count of real people. Only production page views are tracked, without query strings or fragments; search text, private notes and learning records are not analytics events.",
            "不公開 IP、城市或個人軌跡。訪客數由 Vercel 匿名識別，不等於真實人數。僅記錄正式頁面訪問，不傳送查詢參數和頁面錨點；搜尋詞、私人便箋和學習記錄不作為統計事件上傳。",
          )}
        </p>
        <a href="https://vercel.com/docs/analytics/privacy-policy">
          {t(
            "Vercel 隐私说明",
            "Vercel privacy documentation",
            "Vercel 隱私說明",
          )}{" "}
          ↗
        </a>
      </details>
    </section>
  );
}
