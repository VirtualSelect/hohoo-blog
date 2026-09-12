import React from 'react';
import ArchitectureDiagram from './ArchitectureDiagram';
import { useEnglish } from './ContentUI';
import history from '@site/data/build-log.json';
export default function ProjectEvidence({ entry }) {
  const en = useEnglish();
  const logs = history.filter((log) => log.project === entry.id);
  return (
    <>
      <ArchitectureDiagram steps={entry.architecture} />
      {!!entry.screenshots?.length && (
        <section className="hh-section">
          <h2>PRODUCT EVIDENCE</h2>
          {entry.screenshots.map((s) => (
            <figure key={s.src}>
              <img
                src={s.src}
                alt={s.alt}
                width={s.width}
                height={s.height}
                loading="lazy"
              />
              <figcaption>{s.alt}</figcaption>
            </figure>
          ))}
        </section>
      )}
      {!!entry.decisions?.length && (
        <section className="hh-section">
          <h2>DECISION LOG</h2>
          {entry.decisions.map((d) => (
            <article key={d.id}>
              <p className="hh-eyebrow">ADR / {d.id}</p>
              <h3>{d.title}</h3>
              <dl className="hh-definition">
                {['decision', 'context', 'alternatives', 'why', 'tradeoffs']
                  .filter((k) => d[k])
                  .map((k) => (
                    <React.Fragment key={k}>
                      <dt>{k.toUpperCase()}</dt>
                      <dd>{d[k]}</dd>
                    </React.Fragment>
                  ))}
              </dl>
            </article>
          ))}
        </section>
      )}
      {!!logs.length && (
        <section className="hh-section">
          <h2>BUILD LOG</h2>
          <p className="hh-meta">
            {en
              ? 'Repository commits; not deployment dates or release versions.'
              : '来自仓库提交记录，不代表部署时间或发行版本。'}
          </p>
          <ol className="hh-rows">
            {logs.map((l) => (
              <li key={l.commit}>
                <div>
                  <time dateTime={l.date}>{l.date}</time>
                  <h3>
                    <a
                      href={entry.repo + '/commit/' + l.commit}
                      target="_blank"
                      rel="noopener noreferrer">
                      {l.title} ↗
                    </a>
                  </h3>
                </div>
                <code>{l.commit.slice(0, 7)}</code>
              </li>
            ))}
          </ol>
        </section>
      )}
      {!!entry.metrics?.length && (
        <section className="hh-section">
          <h2>MEASURED RESULTS</h2>
          <dl className="hh-definition">
            {entry.metrics
              .filter((m) => m.evidence)
              .map((m) => (
                <React.Fragment key={m.label}>
                  <dt>{m.label}</dt>
                  <dd>
                    {m.value} · {m.evidence}
                  </dd>
                </React.Fragment>
              ))}
          </dl>
        </section>
      )}
    </>
  );
}
