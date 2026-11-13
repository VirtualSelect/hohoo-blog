import React from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useContent, ContentRows } from "../components/ContentUI";
import CreativeWorkbench from "@lab/components/CreativeWorkbench";
import { useText } from "@lab/components/Shell";
import s from "@lab/components/Workshop.module.css";
import editorial from "@site/data/editorial.json";
import GardenEntry from "@lab/components/GardenEntry";
import DiscoveryCompass from "@lab/components/DiscoveryCompass";
import QuestionStudio from "@lab/components/QuestionStudio";
export default function Build() {
  const { entries } = useContent(),
    t = useText();
  const labs = entries.filter((e) => e.type === "lab");
  const completed = editorial.featuredLabs
    .map((id) => labs.find((entry) => entry.id === id))
    .filter(Boolean);
  return (
    <Layout
      title={t("实践", "Build", "實作")}
      description={t(
        "从一个问题出发，在浏览器里观察，再回到真实项目。",
        "Explore a question in your browser, then return to real projects.",
        "從一個問題出發，在瀏覽器裡觀察，再回到真實專案。",
      )}
    >
      <main className="hh-page fieldwork-build atlas-build">
        <header className="atlas-page-heading">
          <div className="atlas-page-context">
            <p className="lab-page-label">WORKSPACE / 03</p>
            <p>
              {t(
                "操作、观察、验证",
                "Try, observe, verify",
                "操作、觀察、驗證",
              )}
            </p>
          </div>
          <div className="atlas-page-title">
            <h1>{t("实践工作台", "The workbench", "實作工作臺")}</h1>
            <p>
              {t(
                "在浏览器里拆解机制，按协议重现实验，再回到完整工程。",
                "Explore mechanisms in your browser, reproduce experiments, and return to the implementation.",
                "在瀏覽器裡拆解機制，依協議重現實驗，再回到完整工程。",
              )}
            </p>
          </div>
        </header>
        <div className="atlas-build-layout">
          <nav
            className="practice-paths"
            aria-label={t(
              "选择实践方式",
              "Choose how to practice",
              "選擇實作方式",
            )}
          >
            <a href="#workbench">
              <span>
                01 / {t("浏览器教学", "BROWSER EXERCISES", "瀏覽器教學")}
              </span>
              <strong>
                {t(
                  "先看一个机制怎样变化",
                  "Change a condition. See what moves.",
                  "先看一個機制怎樣變化",
                )}
              </strong>
              <small>
                {t(
                  "本地演示，帮助理解；不是研究结果。",
                  "Local teaching tools, not research results.",
                  "本機示範，幫助理解；不是研究結果。",
                )}
              </small>
            </a>
            <a href="#research-evidence">
              <span>
                02 / {t("可复现实验", "RECORDED EXPERIMENTS", "可重現實驗")}
              </span>
              <strong>
                {t(
                  "按协议重跑，检查证据",
                  "Rerun a protocol. Inspect the evidence.",
                  "依協議重跑，檢查證據",
                )}
              </strong>
              <small>
                {t(
                  "固定版本、原始记录与适用边界。",
                  "Pinned revisions, source records and limits.",
                  "固定版本、原始紀錄與適用邊界。",
                )}
              </small>
            </a>
            <a href="#real-projects">
              <span>03 / {t("工程代码", "PROJECT CODE", "工程程式碼")}</span>
              <strong>
                {t(
                  "回到完整工程与实现",
                  "Explore the implementation.",
                  "回到完整工程與實作",
                )}
              </strong>
              <small>
                {t(
                  "查看仓库结构、实现与当前交付状态。",
                  "Repository structure, implementation and delivery status.",
                  "查看倉庫結構、實作與目前交付狀態。",
                )}
              </small>
            </a>
          </nav>
          <div className="atlas-build-content">
            <CreativeWorkbench />
            <details className="practice-notes" id="research-questions">
              <summary>
                {t(
                  "先猜，再验证 · 四个研究问题",
                  "Predict, then inspect · four research questions",
                  "先猜，再驗證 · 四個研究問題",
                )}
              </summary>
              <QuestionStudio embedded />
            </details>
            <section id="real-projects" className="hh-section">
              <p className="eyebrow">
                {t(
                  "从交互走向实现",
                  "From interaction to implementation",
                  "從互動走向實作",
                )}
              </p>
              <h2>
                {t(
                  "代码里的真实项目",
                  "Projects with real code",
                  "程式碼裡的真實專案",
                )}
              </h2>
              <ContentRows
                items={editorial.featuredProjects
                  .map((id) => entries.find((entry) => entry.id === id))
                  .filter(Boolean)}
              />
              <Link to="/projects">
                {t("全部项目", "All projects", "全部專案")} →
              </Link>
            </section>
            <section className="hh-section" id="research-evidence">
              <h2>
                {t(
                  "代表实验与证据",
                  "Selected experiments and evidence",
                  "代表實驗與證據",
                )}
              </h2>
              {completed.length > 0 && <ContentRows items={completed} />}
              <details>
                <summary>
                  {t(
                    "查看实验提案",
                    "View experiment proposals",
                    "查看實驗提案",
                  )}
                </summary>
                <p className={s.quiet}>
                  {t(
                    "下面是待验证的问题，尚不代表研究成果。",
                    "These are questions to investigate, not established results.",
                    "下面是待驗證的問題，尚不代表研究成果。",
                  )}
                </p>
                <ul className="hh-rows">
                  {labs
                    .filter((e) => ["planning", "planned"].includes(e.status))
                    .map((e) => (
                      <li key={e.id}>
                        <Link to={e.href}>{e.title} →</Link>
                      </li>
                    ))}
                </ul>
              </details>
              <Link to="/labs">
                {t("全部实验", "All experiments", "全部實驗")} →
              </Link>
            </section>
            <details className="home-discovery">
              <summary>
                {t(
                  "轻松探索 · 花园与好奇心指南针",
                  "Explore freely · garden and curiosity compass",
                  "輕鬆探索 · 花園與好奇心指南針",
                )}
              </summary>
              <GardenEntry />
              <DiscoveryCompass />
            </details>
          </div>
        </div>
      </main>
    </Layout>
  );
}
