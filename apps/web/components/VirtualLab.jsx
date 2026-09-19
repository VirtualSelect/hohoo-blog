import Link from "next/link";
import {
  journeyView,
  JourneyFlow,
  LabStatus,
  JourneyRepository,
} from "./JourneyShared";
import styles from "./Journey.module.css";
import GridRobot from "./GridRobot";
import RobotProgram from "./RobotProgram";
import RobotPrediction from "./RobotPrediction";
import TryIt from "./TryIt";

export default function VirtualLab({ locale }) {
  const { journey, registry, t, text, href, term } = journeyView(locale);
  return (
    <main id="main-content" className={styles.page}>
      <header className={styles.hero}>
        <p className="eyebrow">{t("title")}</p>
        <h1>{t("virtual.title")}</h1>
        <p className={styles.lead}>{t("virtual.intro")}</p>
        <div className={styles.links}>
          <Link href={href("/journey")}>← {t("virtual.back")}</Link>
          <Link href={href("/journey#architecture")}>
            {t("architecture.title")} →
          </Link>
        </div>
      </header>
      <p className={styles.metadata}>{t("simulation.intro")}</p>
      <TryIt
        id="grid-exercise"
        title={
          locale === "en"
            ? "Grid planning"
            : locale === "zh-TW"
              ? "網格規劃"
              : "网格规划"
        }
      >
        <GridRobot locale={locale} />
      </TryIt>
      <TryIt
        id="robot-exercise"
        title={
          locale === "en"
            ? "Robot instructions"
            : locale === "zh-TW"
              ? "機器人指令"
              : "机器人指令"
        }
      >
        <RobotProgram locale={locale} />
        <RobotPrediction />
      </TryIt>
      <nav className={styles.links} aria-label={t("virtual.nav")}>
        {registry.labs.map((lab) => (
          <a key={lab.id} href={"#" + lab.slug}>
            {lab.id} · {registry.engines.find((e) => e.id === lab.engine).name}{" "}
            ↓
          </a>
        ))}
      </nav>
      {registry.labs.map((lab) => (
        <article
          key={lab.id}
          id={lab.slug}
          className={styles.labEntry}
          aria-labelledby={lab.id + "-title"}
        >
          <header className={styles.labHeader}>
            <p className="eyebrow">{lab.id}</p>
            <h2 id={lab.id + "-title"}>{text(lab.titleKey)}</h2>
            <LabStatus status={lab.status} t={t} />
          </header>
          <div className={styles.labBody}>
            <dl className={styles.labFacts}>
              <dt>{t("virtual.engine")}</dt>
              <dd>
                {
                  registry.engines.find((engine) => engine.id === lab.engine)
                    .name
                }
              </dd>
              <dt>{t("virtual.robot")}</dt>
              <dd>{text(lab.robotKey)}</dd>
              <dt>{t("virtual.environment")}</dt>
              <dd>{text(lab.environmentKey)}</dd>
              <dt>{t("virtual.project")}</dt>
              <dd>
                <Link href={href("/journey#architecture")}>
                  {lab.project} →
                </Link>
                <div className={styles.links}>
                  <JourneyRepository locale={locale} />
                </div>
              </dd>
              <dt>{t("virtual.milestones")}</dt>
              <dd className={styles.links}>
                {lab.milestones.map((id) => (
                  <Link key={id} href={href("/journey#" + id)}>
                    {id} ·{" "}
                    {text(journey.milestones.find((m) => m.id === id).titleKey)}
                  </Link>
                ))}
              </dd>
            </dl>
            <div>
              <h3>{t("virtual.goal")}</h3>
              <p>{text(lab.descriptionKey)}</p>
              {lab.status === "future" && (
                <p className={styles.metadata}>{t("virtual.futureNote")}</p>
              )}
              <h3>{t("virtual.flow")}</h3>
              <JourneyFlow steps={lab.steps} text={text} />
              <details>
                <summary>{t("virtual.technology")}</summary>
                <ul className={styles.tags}>
                  {lab.skills.map((skill) => (
                    <li key={skill}>{term(skill)}</li>
                  ))}
                </ul>
              </details>
              {lab.result ? (
                <>
                  <h3>{t("result")}</h3>
                  <p>{text(lab.result)}</p>
                </>
              ) : (
                <p className={styles.metadata}>{t("virtual.empty")}</p>
              )}
              {lab.evidence.length > 0 && (
                <div className={styles.links}>
                  {lab.evidence.map((e) => (
                    <a key={e.href} href={e.href}>
                      {text(e.titleKey)} →
                    </a>
                  ))}
                </div>
              )}
              {[...lab.articles, ...lab.demos, ...lab.github].length > 0 && (
                <>
                  <h3>{t("virtual.sources")}</h3>
                  <div className={styles.links}>
                    {[...lab.articles, ...lab.demos, ...lab.github].map(
                      (ref) => (
                        <Link
                          key={ref.href}
                          href={
                            ref.href.startsWith("/") ? href(ref.href) : ref.href
                          }
                        >
                          {text(ref.titleKey)} →
                        </Link>
                      ),
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </article>
      ))}
      <div className={styles.convergence}>
        <p>{t("future.hardware")}</p>
        <Link href={href("/journey#future")}>{t("future.title")} →</Link>
      </div>
    </main>
  );
}
