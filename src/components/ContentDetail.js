import { uiLabel } from "@site/src/utils/ui-labels";
import { translate } from "@lab/runtime/Translate";
import useSiteConfig from "@lab/runtime/context";
import TranslationNotice from "./TranslationNotice";
import StructuredData from "./StructuredData";
import ProjectEvidence from "./ProjectEvidence";
import ReadingActions from "./ReadingActions";
import React from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import ExperimentDesign from "./ExperimentDesign";
import ContentProvenance, { Freshness } from "./ContentProvenance";
import { Related, Status, useEnglish } from "./ContentUI";
import ProjectShowcase from "@lab/components/ProjectShowcase";
export default function ContentDetail({ entry: e, children }) {
  const en = useEnglish();
  const locale = useSiteConfig().i18n.currentLocale;
  const tw = locale === "zh-TW";
  const lab = e.type === "lab";
  const title = en ? e.titleEn || e.title : tw ? e.titleTw || e.title : e.title;
  return (
    <Layout
      title={title}
      description={
        en
          ? e.descriptionEn || e.description
          : tw
            ? e.descriptionTw || e.description
            : e.description
      }
    >
      <main
        className="hh-page hh-reading"
        data-project-tone={
          e.type === "project"
            ? e.id === "project:hohoo-blog"
              ? "lavender"
              : "blue"
            : undefined
        }
      >
        {e.type === "project" && (
          <StructuredData
            entry={{
              ...e,
              title,
              description: en
                ? e.descriptionEn || e.description
                : tw
                  ? e.descriptionTw || e.description
                  : e.description,
            }}
          />
        )}
        <p className="hh-eyebrow">
          {uiLabel(e.type)} / {e.number}
        </p>
        <h1>{title}</h1>
        <p className="hh-lead">
          {en
            ? e.descriptionEn || e.description
            : tw
              ? e.descriptionTw || e.description
              : e.description}
        </p>
        <div className="hh-meta">
          <Status value={e.status} />
          {e.date && (
            <>
              {" "}
              · <time dateTime={e.date}>{e.date}</time>
            </>
          )}
          {e.updated && (
            <>
              {" "}
              · {uiLabel("UPDATED")} {e.updated}
            </>
          )}
        </div>
        <ContentProvenance kind={e.provenance} />
        <Freshness entry={e} />
        {e.stack && <p className="hh-meta">{e.stack.join(" · ")}</p>}
        {(e.repo || e.demo) && (
          <p>
            {e.repo && (
              <a href={e.repo} target="_blank" rel="noopener noreferrer">
                GitHub ↗
              </a>
            )}
            {e.repo && e.demo && " · "}
            {e.demo && <a href={e.demo}>{uiLabel("Website")} ↗</a>}
          </p>
        )}
        {e.type === "project" && <ProjectShowcase id={e.id} />}
        {e.type === "project" &&
          locale === "zh-CN" &&
          e.sections?.length > 0 && (
            <nav className="project-process" aria-label="项目过程">
              {e.sections.map((s, index) => (
                <a key={s.heading} href={`#project-section-${index}`}>
                  <span>0{index + 1}</span>
                  {uiLabel(s.heading)}
                </a>
              ))}
            </nav>
          )}
        {locale !== "zh-CN" ? (
          <TranslationNotice
            id={e.id}
            original={e.href.replace(/^\/(en|zh-TW)(?=\/)/, "")}
          />
        ) : lab ? (
          <>
            <section className="hh-section">
              <h2 className="hh-eyebrow">01 / {uiLabel("QUESTION")}</h2>
              <p>{en ? e.goalEn : e.goalZh}</p>
            </section>
            <ExperimentDesign entry={e} />
            {e.status === "planning" || e.status === "planned"
              ? null
              : [
                  "hypothesis",
                  "setup",
                  "method",
                  "result",
                  "observations",
                  "conclusion",
                  "limitations",
                  "reproduce",
                ]
                  .filter((key) => e[key])
                  .map((key) => (
                    <section className="hh-section" key={key}>
                      <h2>{uiLabel(key)}</h2>
                      <p>{e[key]}</p>
                    </section>
                  ))}
          </>
        ) : (
          e.sections?.map((s, index) => (
            <section
              className="hh-section project-section"
              id={`project-section-${index}`}
              data-section-kind={s.heading.toLowerCase()}
              key={s.heading}
            >
              <h2>{uiLabel(s.heading)}</h2>
              <p>{en ? s.en : s.zh}</p>
            </section>
          ))
        )}
        {locale === "zh-CN" && !!e.experimentLog?.length && (
          <section className="hh-section">
            <h2>{uiLabel("EXPERIMENT LOG")}</h2>
            <ol>
              {e.experimentLog.map((log) => (
                <li key={log.date + log.title}>
                  <time dateTime={log.date}>{log.date}</time> · {log.title}
                </li>
              ))}
            </ol>
          </section>
        )}
        {locale === "zh-CN" && e.type === "project" && (
          <ProjectEvidence entry={e} />
        )}
        {e.type === "note" && <ReadingActions id={e.id} en={en} />}
        {children}
        <Related ids={e.related} />
        <p>
          <Link to={lab ? "/labs" : e.type === "note" ? "/notes" : "/projects"}>
            {en
              ? "← Back to index"
              : translate({ id: "ui.0bb6b912b5", message: "← 返回目录" })}
          </Link>
        </p>
      </main>
    </Layout>
  );
}
