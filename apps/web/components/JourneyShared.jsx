import Link from "next/link";
import journey from "../../../data/journey.json";
import registry from "../../../data/journey-labs.json";
import { getMessages } from "../lib/content";
import styles from "./Journey.module.css";

export function journeyView(locale) {
  const messages = getMessages(locale);
  const text = (key) => messages[key]?.message || key;
  return {
    journey,
    registry,
    text,
    t: (key) => text("journey." + key),
    href: (path) => (locale === "zh-CN" ? "" : "/" + locale) + path,
    term: (value) => messages["journey.term." + value]?.message || value,
  };
}

export function JourneyFlow({ steps, text }) {
  return (
    <ol className={styles.flow}>
      {steps.map((key, index) => (
        <li key={index}>
          <span>{text(key)}</span>
          {index < steps.length - 1 && (
            <span className={styles.flowArrow} aria-hidden="true">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export function LabLinks({ ids, locale }) {
  const { registry, text, href } = journeyView(locale);
  return (
    <div className={styles.links}>
      {ids.map((id) => {
        const lab = registry.labs.find((item) => item.id === id);
        return (
          <Link key={id} href={href("/journey/virtual-lab#" + lab.slug)}>
            {lab.id} · {text(lab.titleKey)} →
          </Link>
        );
      })}
    </div>
  );
}

export function LabStatus({ status, t }) {
  return (
    <span className={styles.status}>
      <span aria-hidden="true">
        {status === "completed" ? "✓" : status === "learning" ? "◐" : "○"}{" "}
      </span>
      {t("status." + status)}
    </span>
  );
}

export function JourneyRepository({ locale }) {
  const { journey, t } = journeyView(locale);
  if (!journey.targetProject.repository) return null;
  return <a href={journey.targetProject.repository}>{t("repository")} ↗</a>;
}
