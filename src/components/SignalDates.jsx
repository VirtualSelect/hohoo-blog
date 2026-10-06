import React from "react";
import { useSite } from "@lab/runtime/context";
import { publicationFacts } from "../utils/radar-provenance.cjs";
import { radarDateTime } from "../utils/radar-date.mjs";

export default function SignalDates({ item }) {
  const { locale } = useSite();
  return (
    <p className="hh-meta signal-dates">
      {publicationFacts(item, locale).map((fact) => (
        <span key={fact.label}>
          {fact.label}：
          {fact.href ? (
            <a href={fact.href} target="_blank" rel="noopener noreferrer">
              {fact.value} ↗
            </a>
          ) : /T\d/.test(fact.value || "") ? (
            <time dateTime={fact.value}>{radarDateTime(fact.value)} UTC+8</time>
          ) : (
            fact.value
          )}
        </span>
      ))}
    </p>
  );
}
