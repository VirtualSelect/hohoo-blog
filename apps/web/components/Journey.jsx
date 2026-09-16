import Link from "next/link";
import journey from "../../../data/journey.json";
import { getMessages } from "../lib/content";
import styles from "./Journey.module.css";
import JourneySimulation from "./JourneySimulation";
import { LabLinks, journeyView, JourneyRepository } from "./JourneyShared";

const symbols = {
  "not-started": "○",
  learning: "◐",
  building: "◇",
  completed: "✓",
};

export default function Journey({ locale }) {
  const messages = getMessages(locale);
  const { registry, term } = journeyView(locale);
  const t = (key) => messages["journey." + key]?.message || key;
  const href = (path) => (locale === "zh-CN" ? "" : "/" + locale) + path;
  const milestone = (id) => journey.milestones.find((m) => m.id === id);
  const current = milestone(journey.currentMilestone);
  const title = (m) => messages[m.titleKey].message;
  const refs = (ids) =>
    ids.map((id) => (
      <a key={id} href={"#" + id}>
        {id} · {title(milestone(id))}
      </a>
    ));
  return (
    <main id="main-content" className={styles.page}>
      <header className={styles.hero}>
        <p className="eyebrow">{t("title")}</p>
        <h1>{t("roadmap")}</h1>
        <p className={styles.lead}>{t("intro")}</p>
        <nav className={styles.links} aria-label={t("title")}>
          <a href="#roadmap">{t("roadmapLabel")} ↓</a>
          <a href="#milestones">{t("milestones")} ↓</a>
          <a href="#schedule">{t("schedule")} ↓</a>
          <Link href={href("/journey/virtual-lab")}>{t("virtual.nav")} →</Link>
          <Link href={href("/learning")}>{t("learning")} →</Link>
        </nav>
      </header>
      <section className={styles.focus} aria-labelledby="journey-focus">
        <div>
          <p className="eyebrow">
            {current.id} · {t("status." + current.status)}
          </p>
          <h2 id="journey-focus">{t("focus")}</h2>
          <p>{t("focusBody")}</p>
          <a href={"#" + current.id}>{title(current)} →</a>
          <p className={styles.metadata}>
            {t("schedule.current")} ·{" "}
            {journey.currentWeek
              ? t("week").replace("{number}", journey.currentWeek)
              : t("schedule.notStarted")}
          </p>
          <p className={styles.metadata}>
            {t("virtual.current")} ·{" "}
            {journey.currentLab
              ? registry.labs.find((lab) => lab.id === journey.currentLab).id
              : t("virtual.noCurrent")}
          </p>
        </div>
        <aside>
          <p className="eyebrow">{t("target")}</p>
          <strong>{journey.targetProject.name}</strong>
          <p>{t("targetNote")}</p>
          <div className={styles.links}>
            <JourneyRepository locale={locale} />
          </div>
          <a href="#architecture">{t("architecture.title")} ↓</a>
          <p className="eyebrow">{t("virtual.recommended")}</p>
          <LabLinks ids={[journey.recommendedLab]} locale={locale} />
        </aside>
      </section>
      <section
        id="roadmap"
        className={styles.section}
        aria-labelledby="roadmap-heading"
      >
        <h2 id="roadmap-heading">{t("roadmapLabel")}</h2>
        <p>{t("allocation")}</p>
        <div className={styles.tracks}>
          {journey.tracks.map((track) => (
            <section
              key={track.id}
              className={styles.track}
              aria-labelledby={"track-" + track.id}
            >
              <p className="eyebrow">
                {track.number} / {track.plannedWeight}%
              </p>
              <h3 id={"track-" + track.id}>{t("track." + track.id)}</h3>
              <ol>
                {track.nodes.map((node) => (
                  <li key={node}>{term(node)}</li>
                ))}
              </ol>
              <div className={styles.links}>{refs(track.milestones)}</div>
            </section>
          ))}
        </div>
        <div className={styles.convergence}>
          <strong>{t("convergenceLine")}</strong>
          <p>{t("converge")}</p>
          <a href="#M10">M10 →</a>
        </div>
      </section>
      <JourneySimulation locale={locale} />
      <section
        id="milestones"
        className={styles.section}
        aria-labelledby="milestones-heading"
      >
        <h2 id="milestones-heading">{t("milestones")}</h2>
        <ul className={styles.legend}>
          {Object.entries(symbols).map(([state, symbol]) => (
            <li key={state}>
              <span aria-hidden="true">{symbol} </span>
              {t("status." + state)}
            </li>
          ))}
        </ul>
        <ol className={styles.milestones}>
          {journey.milestones.map((m) => (
            <li id={m.id} key={m.id}>
              <details open={m.id === current.id}>
                <summary>
                  <span className={styles.number}>{m.id}</span>
                  <span className={styles.milestoneTitle}>{title(m)}</span>
                  <span className={styles.status}>
                    <span aria-hidden="true">{symbols[m.status]} </span>
                    {t("status." + m.status)}
                  </span>
                </summary>
                <div className={styles.detail}>
                  <p className={styles.metadata}>
                    {m.tracks.map((id) => t("track." + id)).join(" / ")}
                  </p>
                  <h3>{t("goal")}</h3>
                  <p>{messages[m.goalKey].message}</p>
                  <h3>{t("dependencies")}</h3>
                  <div className={styles.links}>
                    {m.prerequisites.length ? (
                      refs(m.prerequisites)
                    ) : (
                      <span>{t("noDependency")}</span>
                    )}
                  </div>
                  <h3>{t("knowledge")}</h3>
                  <ul className={styles.tags}>
                    {m.knowledge.map((item) => (
                      <li key={item}>{term(item)}</li>
                    ))}
                  </ul>
                  {registry.labs.some((lab) =>
                    lab.milestones.includes(m.id),
                  ) && (
                    <>
                      <h3>{t("virtual.nav")}</h3>
                      <LabLinks
                        ids={registry.labs
                          .filter((lab) => lab.milestones.includes(m.id))
                          .map((lab) => lab.id)}
                        locale={locale}
                      />
                    </>
                  )}
                  {m.startedAt && (
                    <p>
                      {t("started")}:{" "}
                      <time dateTime={m.startedAt}>{m.startedAt}</time>
                    </p>
                  )}
                  {m.completedAt && (
                    <p>
                      {t("finished")}:{" "}
                      <time dateTime={m.completedAt}>{m.completedAt}</time>
                    </p>
                  )}
                  {m.result ? (
                    <>
                      <h3>{t("result")}</h3>
                      <p>{m.result}</p>
                    </>
                  ) : (
                    <p className={styles.metadata}>{t("pending")}</p>
                  )}
                  {!!m.issues.length && (
                    <>
                      <h3>{t("issues")}</h3>
                      <ul>
                        {m.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {!!m.evidence.length && (
                    <>
                      <h3>{t("evidence")}</h3>
                      <ul>
                        {m.evidence.map((e) => (
                          <li key={e.href}>
                            <a href={e.href}>{e.title}</a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {!!m.articles.length && (
                    <Link href={href(m.articles[0])}>
                      {t("foundation")} · {t("article")} →
                    </Link>
                  )}
                  {!!m.next.length && (
                    <>
                      <h3>{t("next")}</h3>
                      <div className={styles.links}>{refs(m.next)}</div>
                    </>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>
      <section
        id="schedule"
        className={styles.section}
        aria-labelledby="schedule-heading"
      >
        <h2 id="schedule-heading">{t("schedule")}</h2>
        <p>{t("scheduleNote")}</p>
        <ol className={styles.weeks}>
          {journey.weeks.map((week) => (
            <li key={week.number}>
              <span className={styles.number}>
                {t("week").replace("{number}", week.number)}
              </span>
              <div>
                <div className={styles.links}>{refs(week.milestones)}</div>
                <p className={styles.metadata}>
                  {week.knowledge.map(term).join(" · ")}
                </p>
                <LabLinks ids={week.labs} locale={locale} />
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className={styles.section} aria-labelledby="foundation-heading">
        <h2 id="foundation-heading">{t("foundation")}</h2>
        <Link href={href("/docs/ai-apps/java-first-llm")}>
          {t("article")} →
        </Link>
        <p>{t("foundationNote")}</p>
      </section>
      <details className={styles.later}>
        <summary>{t("later")}</summary>
        <p>{t("laterNote")}</p>
        <ul className={styles.tags}>
          {journey.later.map((item) => (
            <li key={item}>{term(item)}</li>
          ))}
        </ul>
      </details>
    </main>
  );
}
