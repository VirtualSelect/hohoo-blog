"use client";

import {
  useCallback,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useSite } from "../runtime/context";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import ThemeArtwork from "./ThemeArtwork";
import UrlStateSync from "./UrlStateSync";
import AstraParticleHero from "@site/src/components/AstraParticleHero";
import tracks from "@site/data/learning-paths.json";
import current from "@site/data/current.json";
import "./about-page.css";

type Experience = "stars" | "theme";
function subscribeDesign(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-design"],
  });
  return () => observer.disconnect();
}
function currentDesign() {
  return document.documentElement.dataset.design || "clear";
}

export default function AboutPage() {
  const t = useText();
  const { globalData, locale } = useSite();
  const design = useSyncExternalStore(
    subscribeDesign,
    currentDesign,
    () => "space",
  );
  const [selectedExperience, setExperience] = useState<Experience | null>(null);
  const [initialized, setInitialized] = useState(false);
  const syncExperience = useCallback(() => {
    const value = new URLSearchParams(location.search).get("experience");
    setExperience(value === "stars" || value === "theme" ? value : null);
    setInitialized(true);
  }, []);
  useLayoutEffect(syncExperience, [syncExperience]);
  const experience =
    selectedExperience || (design === "space" ? "stars" : "theme");
  function chooseExperience(value: Experience) {
    setExperience(value);
    const url = new URL(location.href);
    if (url.searchParams.get("experience") === value) return;
    url.searchParams.set("experience", value);
    history.pushState(null, "", url.pathname + url.search + url.hash);
  }
  const projects = globalData["content-index"].entries.filter(
    (entry) => entry.type === "project" && entry.status !== "archived",
  );
  const focus = current.items.filter((item) =>
    ["BUILDING", "LEARNING", "EXPLORING"].includes(item.kind),
  );
  const focusLabels: Record<string, string> = {
    BUILDING: t("构建", "BUILDING", "構建"),
    LEARNING: t("理解", "LEARNING", "理解"),
    EXPLORING: t("探索", "EXPLORING", "探索"),
  };
  const process = [
    t("遇到问题", "Ask a question", "遇到問題"),
    t("查阅资料", "Read the sources", "查閱資料"),
    t("小步实验", "Run an experiment", "小步實驗"),
    t("做成作品", "Build something", "做成作品"),
    t("写下经验", "Share what happened", "寫下經驗"),
  ];

  return (
    <main className="about-fusion" data-experience={experience}>
      <UrlStateSync onChange={syncExperience} />
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-experience-bar">
          <p>{t("选择互动体验", "Choose an experience", "選擇互動體驗")}</p>
          <div
            className="about-experiences"
            role="group"
            aria-label={t(
              "关于页互动体验",
              "About page experience",
              "關於頁互動體驗",
            )}
          >
            <button
              type="button"
              aria-pressed={experience === "theme"}
              aria-controls="about-visual-stage"
              onClick={() => chooseExperience("theme")}
            >
              {t("主题场景", "Theme scene", "主題場景")}
            </button>
            <button
              type="button"
              aria-pressed={experience === "stars"}
              aria-controls="about-visual-stage"
              onClick={() => chooseExperience("stars")}
            >
              <span aria-hidden="true">✦</span>{" "}
              {t("原版星空", "Original star field", "原版星空")}
            </button>
          </div>
        </div>
        <div className="about-hero-inner">
          <header className="about-hero-copy">
            <p className="about-eyebrow">
              {t("关于", "ABOUT", "關於")} / HOHOO’S AI LAB
            </p>
            <h1 id="about-title">
              Hohoo<span aria-hidden="true">.</span>
            </h1>
            <h2>
              {t("保持好奇，", "Stay curious.", "保持好奇，")}
              <wbr />
              {t("也动手去做。", " Keep building.", "也動手去做。")}
            </h2>
            <p className="about-bio">
              {t(
                "平时主要写 Java，喜欢把感兴趣的想法做出来。这里记录 AI 应用、LLM 机制与 MuJoCo 仿真实验，也保留失败与尚未验证的问题。",
                "I usually write Java and enjoy making things from ideas. I document AI applications, LLM mechanics and MuJoCo experiments, including failures and open questions.",
                "平時主要寫 Java，喜歡把感興趣的想法做出來。這裡記錄 AI 應用、LLM 機制與 MuJoCo 模擬實驗，也保留失敗與尚未驗證的問題。",
              )}
            </p>
            <p className="about-visual-note">
              <span aria-hidden="true" />
              {experience === "stars"
                ? t(
                    "原版互动星空",
                    "THE ORIGINAL INTERACTIVE STAR FIELD",
                    "原版互動星空",
                  )
                : t(
                    "互动主题场景",
                    "AN INTERACTIVE THEME STUDY",
                    "互動主題場景",
                  )}
              <span className="about-map-boundary">
                {t("不表示知识关系", "Not a knowledge graph", "不表示知識關係")}
              </span>
            </p>
          </header>
          <div
            id="about-visual-stage"
            className="about-art-stage"
            data-experience={experience}
          >
            {initialized ? (
              experience === "stars" ? (
                <AstraParticleHero
                  en={locale === "en"}
                  embedded
                  className="about-original-stars"
                />
              ) : (
                <ThemeArtwork context="about" className="about-theme-artwork" />
              )
            ) : (
              <p className="about-scene-placeholder">
                {t(
                  "星空与好奇心。",
                  "A space for curiosity.",
                  "星空與好奇心。",
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      <div id="about-content" className="about-content">
        <div className="about-directory">
          <section aria-labelledby="about-directions-title">
            <p className="about-section-number">01 / LEARN</p>
            <h2 id="about-directions-title">
              {t("我在记录什么", "What I explore", "我在記錄什麼")}
            </h2>
            <nav aria-label={t("研究方向", "Research directions", "研究方向")}>
              {tracks.map((track) => (
                <Link key={track.id} to={"/learning?track=" + track.domain}>
                  {t(track.title, track.en, track.titleTw)}
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </nav>
          </section>
          <section aria-labelledby="about-projects-title">
            <p className="about-section-number">02 / BUILD</p>
            <h2 id="about-projects-title">
              {t("可以查看的作品", "Explore the work", "可以查看的作品")}
            </h2>
            <div className="about-project-links">
              {projects.length ? (
                projects.map((project) => (
                  <Link key={project.id} to={project.href}>
                    {project.title}
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))
              ) : (
                <p>
                  {t(
                    "项目记录正在整理中。",
                    "Project notes are being prepared.",
                    "專案記錄正在整理中。",
                  )}
                </p>
              )}
            </div>
          </section>
          <section aria-labelledby="about-contact-title">
            <p className="about-section-number">03 / CONNECT</p>
            <h2 id="about-contact-title">
              {t("在其他地方", "Elsewhere", "在其他地方")}
            </h2>
            <nav
              aria-label={t(
                "联系与订阅",
                "Find me and subscribe",
                "聯繫與訂閱",
              )}
            >
              <a
                href="https://github.com/VirtualSelect"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub <span aria-hidden="true">↗</span>
              </a>
              <a
                href="https://x.com/HuHohoo1997"
                target="_blank"
                rel="noopener noreferrer"
              >
                X <span aria-hidden="true">↗</span>
              </a>
              <Link to="/subscribe">
                RSS <span aria-hidden="true">↗</span>
              </Link>
            </nav>
          </section>
        </div>

        <section
          className="about-current"
          aria-labelledby="about-current-title"
        >
          <header>
            <p className="about-section-number">FIELD NOTES</p>
            <h2 id="about-current-title">
              {t("近况手记", "Notes from the desk", "近況手記")}
            </h2>
            <p className="about-current-date">
              {t("上次手动整理", "Last written", "上次手動整理")}{" "}
              <time dateTime={current.updated}>{current.updated}</time>
            </p>
            <Link to="/now">
              {t("完整近况", "Read the full update", "完整近況")} →
            </Link>
          </header>
          <ul>
            {focus.map((item) => (
              <li key={item.kind}>
                <span className="about-section-number">
                  {focusLabels[item.kind]}
                </span>
                <Link to={item.to}>
                  {t(item.zh, item.en, item.tw)}
                  <span aria-hidden="true"> ↗</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-method" aria-labelledby="about-method-title">
          <header>
            <p className="about-section-number">LEARNING IN PUBLIC</p>
            <h2 id="about-method-title">
              {t(
                "把一个问题，往前推进。",
                "Take a question further.",
                "把一個問題，往前推進。",
              )}
            </h2>
            <p>
              {t(
                "记录查过的资料、验证过的方法，以及暂时没有答案的地方。",
                "Keep the sources, the tested methods, and the questions that remain open.",
                "記錄查過的資料、驗證過的方法，以及暫時沒有答案的地方。",
              )}
            </p>
          </header>
          <ol>
            {process.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">0{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="about-record-links">
            <Link to="/timeline">
              {t("学习活动", "Learning activity", "學習活動")} ↗
            </Link>
            <Link to="/changelog">
              {t("站点更新", "Site updates", "網站更新")} ↗
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
