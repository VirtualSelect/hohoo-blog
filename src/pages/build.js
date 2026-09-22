import React from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useContent, ContentRows } from "../components/ContentUI";
import CreativeWorkbench from "@lab/components/CreativeWorkbench";
import { useText } from "@lab/components/Shell";
import s from "@lab/components/Workshop.module.css";
export default function Build() {
  const { entries } = useContent(),
    t = useText();
  const labs = entries.filter((e) => e.type === "lab");
  const completed = labs.filter(
    (e) => !["planning", "planned"].includes(e.status),
  );
  return (
    <Layout
      title={t("实践", "Build", "實作")}
      description={t(
        "从一个问题出发，在浏览器里观察，再回到真实项目。",
        "Explore a question in your browser, then return to real projects.",
        "從一個問題出發，在瀏覽器裡觀察，再回到真實專案。",
      )}
    >
      <main className="hh-page">
        <header className={s.hero}>
          <div>
            <p className="eyebrow">
              {t("Hohoo 的实践桌", "Hohoo’s workbench", "Hohoo 的實作桌")}
            </p>
            <h1>
              {t(
                "读懂之前，\n先动手试试。",
                "Make it tangible.\nThen understand it.",
                "讀懂之前，\n先動手試試。",
              )}
            </h1>
            <p>
              {t(
                "把抽象的问题变成可检查的过程。拨动条件，看见变化，再带着证据回到代码。",
                "Make abstract questions inspectable. Change a condition, observe what happens and return to code with evidence.",
                "把抽象的問題變成可檢查的過程。撥動條件，看見變化，再帶著證據回到程式碼。",
              )}
            </p>
            <nav>
              <a className="primary-link" href="#workbench">
                {t("打开工作台", "Open the workbench", "開啟工作臺")} ↓
              </a>
              <a className="featured-action" href="#real-projects">
                {t("查看真实项目", "View real projects", "查看真實專案")} →
              </a>
            </nav>
          </div>
          <aside className={s.blueprint}>
            <p className="eyebrow">
              {t("一次实践的顺序", "A practice loop", "一次實作的順序")}
            </p>
            <span aria-hidden="true">? → [ ] → ↺</span>
            <p>
              {t(
                "提出问题 → 改变条件 → 检查结果",
                "Ask → Change → Inspect",
                "提出問題 → 改變條件 → 檢查結果",
              )}
            </p>
            <small>
              {t(
                "浏览器教学 / 项目代码 / 可复现证据",
                "Browser exercises / Project code / Reproducible evidence",
                "瀏覽器教學 / 專案程式碼 / 可重現證據",
              )}
            </small>
          </aside>
        </header>
        <CreativeWorkbench />
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
          <ContentRows items={entries.filter((e) => e.type === "project")} />
          <Link to="/projects">
            {t("全部项目", "All projects", "全部專案")} →
          </Link>
        </section>
        <section className="hh-section">
          <h2>{t("实验与研究", "Experiments and research", "實驗與研究")}</h2>
          {completed.length > 0 && <ContentRows items={completed} />}
          <details>
            <summary>
              {t("查看实验提案", "View experiment proposals", "查看實驗提案")}
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
      </main>
    </Layout>
  );
}
