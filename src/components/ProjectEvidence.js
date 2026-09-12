import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import Link from '@lab/runtime/Link';
import ArchitectureDiagram from './ArchitectureDiagram';
import { useEnglish } from './ContentUI';
import history from '@site/data/build-log.json';
export default function ProjectEvidence({ entry }) {
  const en = useEnglish();
  const logs = history.filter((log) => log.project === entry.id);
  return (
    <>
      {!!entry.resources?.length && (
        <section className="hh-section">
          <h2>{en ? 'CODE & READING' : '代码与配套阅读'}</h2>
          <ul className="hh-rows">
            {entry.resources.map((resource) => (
              <li key={resource.href}>
                <div>
                  <h3>
                    <Link to={resource.href}>
                      {en ? resource.labelEn || resource.label : resource.label}{' '}
                      →
                    </Link>
                  </h3>
                  <p>
                    {en
                      ? resource.descriptionEn || resource.description
                      : resource.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ArchitectureDiagram steps={entry.architecture} />
      {!!entry.screenshots?.length && (
        <section className="hh-section">
          <h2>{uiLabel("PRODUCT EVIDENCE")}</h2>
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
          <h2>{uiLabel("DECISION LOG")}</h2>
          {entry.decisions.map((d) => (
            <article key={d.id}>
              <p className="hh-eyebrow">ADR / {d.id}</p>
              <h3>{d.title}</h3>
              <dl className="hh-definition">
                {['decision', 'context', 'alternatives', 'why', 'tradeoffs']
                  .filter((k) => d[k])
                  .map((k) => (
                    <React.Fragment key={k}>
                      <dt>{uiLabel(k)}</dt>
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
          <h2>{uiLabel("BUILD LOG")}</h2>
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
          <h2>{uiLabel("MEASURED RESULTS")}</h2>
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
