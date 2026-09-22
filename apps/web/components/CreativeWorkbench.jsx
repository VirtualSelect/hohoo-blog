"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useText } from "./Shell";
import { useSite } from "../runtime/context";
import Link from "../runtime/Link";
import {
  workshops,
  filterWorkshops,
  workshopText,
} from "../lib/workshop-catalog.mjs";
import s from "./Workshop.module.css";
function Loading() {
  const t = useText();
  return (
    <p role="status">
      {t("正在准备实验…", "Preparing exercise…", "正在準備實驗…")}
    </p>
  );
}

const instruments = {
  failure: dynamic(() => import("./FailureLab"), { loading: Loading }),
  memory: dynamic(() => import("./ConversationWorkbench"), {
    loading: Loading,
  }),
  retrieval: dynamic(() => import("./RetrievalDrawer"), { loading: Loading }),
  context: dynamic(() => import("./ContextSuitcase"), { loading: Loading }),
  robot: dynamic(() => import("./GridRobot"), { loading: Loading }),
  "trust-desk": dynamic(
    () => import("./WorkbenchTools").then((m) => m.TrustDesk),
    { loading: Loading },
  ),
  "json-desk": dynamic(
    () => import("./WorkbenchTools").then((m) => m.JsonDesk),
    { loading: Loading },
  ),
  "decision-desk": dynamic(
    () => import("./WorkbenchTools").then((m) => m.DecisionDesk),
    { loading: Loading },
  ),
};
export default function CreativeWorkbench() {
  const t = useText(),
    { locale } = useSite();
  const text = (v) => workshopText(v, locale);
  const [selected, setSelected] = useState(null),
    [domain, setDomain] = useState("all"),
    [query, setQuery] = useState("");
  const [invalid, setInvalid] = useState(false),
    [copied, setCopied] = useState("");
  const stage = useRef(null),
    focusStage = useRef(false),
    launchers = useRef({});
  useEffect(() => {
    function sync() {
      const url = new URL(location.href);
      const legacy = ["decision-desk", "trust-desk", "json-desk"].includes(
        url.hash.slice(1),
      )
        ? url.hash.slice(1)
        : null;
      const id = legacy || url.searchParams.get("tool");
      const found = workshops.some((w) => w.id === id);
      focusStage.current = found && Boolean(legacy);
      setSelected(found ? id : null);
      setInvalid(!!id && !found);
      setCopied("");
    }
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  useEffect(() => {
    if (selected && focusStage.current) {
      stage.current?.focus({ preventScroll: true });
      stage.current?.scrollIntoView({ block: "start", behavior: "instant" });
      focusStage.current = false;
    }
  }, [selected]);
  function open(event, id) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    const url = new URL(location.href);
    url.searchParams.set("tool", id);
    url.hash = "workbench";
    history.pushState(history.state, "", url);
    if (selected === id) {
      stage.current?.focus({ preventScroll: true });
      stage.current?.scrollIntoView({ block: "start", behavior: "instant" });
      return;
    }
    focusStage.current = true;
    setSelected(id);
    setInvalid(false);
    setCopied("");
  }
  function close() {
    const id = selected;
    const url = new URL(location.href);
    url.searchParams.delete("tool");
    url.hash = "workbench";
    history.pushState(history.state, "", url);
    setSelected(null);
    setCopied("");
    requestAnimationFrame(() =>
      (
        launchers.current[id] || document.getElementById("workbench-title")
      )?.focus(),
    );
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(t("链接已复制", "Link copied", "連結已複製"));
    } catch {
      setCopied(
        t(
          "无法自动复制，请复制浏览器地址。",
          "Copy the browser address to share this exercise.",
          "無法自動複製，請複製瀏覽器網址。",
        ),
      );
    }
  }
  const active = workshops.find((w) => w.id === selected),
    Instrument = instruments[selected];
  const filtered = filterWorkshops({ domain, query, locale });
  return (
    <section
      id="workbench"
      className={s.catalog}
      aria-labelledby="workbench-title"
    >
      <div className={s.top}>
        <div>
          <p className="eyebrow">
            {t("动手理解", "Learning by doing", "動手理解")}
          </p>
          <h2 id="workbench-title" tabIndex={-1}>
            {t(
              "选一个问题，亲手拆开。",
              "Take a question apart.",
              "選一個問題，親手拆開。",
            )}
          </h2>
        </div>
        <span className={s.quiet}>
          {t(
            "本地运行 · 无需密钥",
            "Local execution · No API key",
            "本機執行 · 無需金鑰",
          )}
        </span>
      </div>
      <p className={s.quiet}>
        {t(
          "这里是教学交互，不是已完成的研究成果。改变条件、查看依据，再把问题带回代码。输入不会上传，离开或切换实验会重置操作。",
          "Teaching interactions, not research results. Change a condition, inspect the evidence, then return to code. Inputs stay local; leaving or switching resets the exercise.",
          "這裡是教學互動，不是已完成的研究成果。改變條件、查看依據，再把問題帶回程式碼。輸入不會上傳，離開或切換實驗會重設操作。",
        )}
      </p>
      {invalid && (
        <p role="status">
          {t(
            "这个实验入口不存在，请从下方选择。",
            "That exercise is unavailable. Choose one below.",
            "這個實驗入口不存在，請從下方選擇。",
          )}
        </p>
      )}
      {active && Instrument && (
        <section
          ref={stage}
          tabIndex={-1}
          className={s.stage}
          aria-labelledby="active-workshop-title"
        >
          <header>
            <p className="eyebrow">
              {t("工作台已打开", "Workbench open", "工作臺已開啟")} /{" "}
              {active.mark}
            </p>
            <h2 id="active-workshop-title">{text(active.title)}</h2>
            <p className={s.task}>{text(active.task)}</p>
            <div className={s.controls}>
              <button onClick={close}>
                {t(
                  "关闭，选择其他问题",
                  "Close and choose another",
                  "關閉，選擇其他問題",
                )}
              </button>
              <button onClick={share}>
                {t("复制实验链接", "Copy exercise link", "複製實驗連結")}
              </button>
              <span role="status">{copied}</span>
            </div>
          </header>
          <Instrument key={active.id} locale={locale} />
          <footer>
            <span>
              {t(
                "把观察带回实际内容",
                "Continue with the underlying material",
                "把觀察帶回實際內容",
              )}
            </span>
            <Link to={active.href}>
              {t("查看教程 / 项目", "Open guide / project", "查看教學 / 專案")}{" "}
              →
            </Link>
          </footer>
        </section>
      )}
      <div className={s.controls}>
        <label>
          {t("找一个问题", "Find a question", "找一個問題")}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "记忆、JSON、机器人…",
              "Memory, JSON, robot…",
              "記憶、JSON、機器人…",
            )}
          />
        </label>
        <div
          className={s.controls}
          role="group"
          aria-label={t("按方向筛选", "Filter by track", "按方向篩選")}
          style={{ margin: 0 }}
        >
          {[
            ["all", t("全部", "All", "全部")],
            ["ai-apps", t("构建应用", "Build", "構建應用")],
            ["llm", t("理解模型", "Understand", "理解模型")],
            ["embodied-ai", t("探索具身", "Explore", "探索具身")],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={domain === id}
              onClick={() => setDomain(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className={s.quiet} role="status">
        {t(
          `找到 ${filtered.length} 个可操作的问题`,
          `${filtered.length} interactive questions`,
          `找到 ${filtered.length} 個可操作的問題`,
        )}
      </p>
      <div className={s.grid}>
        {filtered.map((w) => (
          <a
            ref={(el) => {
              launchers.current[w.id] = el;
            }}
            key={w.id}
            data-domain={w.domain}
            className={s.tile}
            href={`?tool=${w.id}#workbench`}
            onClick={(e) => open(e, w.id)}
          >
            <span className={s.mark} aria-hidden="true">
              {w.mark}
            </span>
            <div>
              <small>
                {w.domain === "llm"
                  ? "LLM"
                  : w.domain === "ai-apps"
                    ? t("AI 应用", "AI applications", "AI 應用")
                    : t("具身智能", "Embodied AI", "具身智慧")}
              </small>
              <strong>{text(w.title)}</strong>
              <p>{text(w.description)}</p>
            </div>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
      {!filtered.length && (
        <div className={s.task}>
          <p>
            {t(
              "没有匹配的问题。试试其他关键词，或查看全部实验。",
              "No matches. Try another keyword or show all exercises.",
              "沒有符合的問題。試試其他關鍵字，或查看全部實驗。",
            )}
          </p>
          <button
            onClick={() => {
              setQuery("");
              setDomain("all");
            }}
          >
            {t("清除筛选", "Clear filters", "清除篩選")}
          </button>
        </div>
      )}
    </section>
  );
}
