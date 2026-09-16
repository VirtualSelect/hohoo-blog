import Link from "next/link";
import {
  journeyView,
  JourneyFlow,
  LabStatus,
  JourneyRepository,
} from "./JourneyShared";
import styles from "./Journey.module.css";

export default function JourneySimulation({ locale }) {
  const { journey, registry, t, text, href, term } = journeyView(locale);
  return (
    <section
      id="simulation"
      className={styles.section}
      aria-labelledby="simulation-heading"
    >
      <h2 id="simulation-heading">{t("simulation.title")}</h2>
      <p>{t("simulation.intro")}</p>
      <ol className={styles.simulationStages}>
        {journey.simulation.labOrder.map((id) => {
          const lab = registry.labs.find((item) => item.id === id);
          const engine = registry.engines.find(
            (item) => item.id === lab.engine,
          );
          return (
            <li key={id}>
              <p className="eyebrow">{lab.id}</p>
              <Link href={href("/journey/virtual-lab#" + lab.slug)}>
                {engine.name} →
              </Link>
              <LabStatus status={lab.status} t={t} />
            </li>
          );
        })}
      </ol>
      <div className={styles.links}>
        <Link href={href("/journey/virtual-lab")}>{t("virtual.title")} →</Link>
        <a href="#future">Sim2Real ↓</a>
      </div>
      <details className={styles.later} id="architecture">
        <summary>
          {t("architecture.title")} · {journey.targetProject.name}
        </summary>
        <p>{t("architecture.request")}</p>
        <p className={styles.metadata}>{t("architecture.note")}</p>
        <div className={styles.links}>
          <JourneyRepository locale={locale} />
        </div>
        <JourneyFlow steps={journey.targetProject.architecture} text={text} />
        <h3>{text("journey.node.platform")}</h3>
        <JourneyFlow steps={journey.simulation.dataArchitecture} text={text} />
      </details>
      <section className={styles.section} aria-labelledby="loop-heading">
        <h3 id="loop-heading">{t("loop.title")}</h3>
        <p className={styles.metadata}>{t("loop.note")}</p>
        <h4>{t("loop.control")}</h4>
        <JourneyFlow steps={journey.simulation.executionLoop} text={text} />
        <h4>{t("loop.training")}</h4>
        <JourneyFlow steps={journey.simulation.trainingLoop} text={text} />
      </section>
      <details id="future" className={styles.later}>
        <summary>{t("future.title")} · Sim2Real</summary>
        <p>{t("future.gap")}</p>
        <JourneyFlow steps={journey.simulation.sim2real} text={text} />
        {journey.simulation.futurePhases.map((phase) => (
          <section key={phase.id}>
            <h3>{text(phase.titleKey)}</h3>
            <LabStatus status={phase.status} t={t} />
            <ul className={styles.tags}>
              {phase.topics.map((topic) => (
                <li key={topic}>{term(topic)}</li>
              ))}
            </ul>
          </section>
        ))}
        <p>{t("future.hardware")}</p>
      </details>
    </section>
  );
}
