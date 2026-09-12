import { uiLabel } from '@site/src/utils/ui-labels';
import { translate } from '@docusaurus/Translate';
import React from 'react';
import Link from '@docusaurus/Link';
import { usePluginData } from '@docusaurus/useGlobalData';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
export function useContent() {
  return usePluginData('content-index');
}
export function useEnglish() {
  return useDocusaurusContext().i18n.currentLocale === 'en';
}
export function Status({ value }) {
  const en = useEnglish();
  const labels = {
    planning: [uiLabel('PLANNED'), 'PLANNED'],
    planned: [uiLabel('PLANNED'), 'PLANNED'],
    inconclusive: [uiLabel('INCONCLUSIVE'), 'INCONCLUSIVE'],
    archived: [uiLabel('ARCHIVED'), 'ARCHIVED'],
    production: [
      translate({
        id: 'ui.fa30c2b4cb',
        message: '\u5DF2\u4E0A\u7EBF',
      }),
      'Live',
    ],
    building: [
      translate({
        id: 'ui.556441e259',
        message: '\u6784\u5EFA\u4E2D',
      }),
      'Building',
    ],
    completed: [
      translate({
        id: 'ui.e99b48a29b',
        message: '\u5DF2\u5B8C\u6210',
      }),
      'Completed',
    ],
    running: [
      translate({
        id: 'ui.22133c81a1',
        message: '\u5B9E\u9A8C\u4E2D',
      }),
      'Running',
    ],
    'to-read': [
      translate({
        id: 'ui.204508c457',
        message: '\u9605\u8BFB\u5165\u53E3',
      }),
      'Reading guide',
    ],
    published: [
      translate({
        id: 'ui.176a2eb4eb',
        message: '\u5DF2\u53D1\u5E03',
      }),
      'Published',
    ],
  };
  return (
    <span className="hh-meta">
      {(labels[value] || [value, value])[en ? 1 : 0]}
    </span>
  );
}
export function Section({ label, title, to, children }) {
  return (
    <section className="hh-section">
      <div className="hh-section-heading">
        <div>
          <p className="hh-eyebrow">{uiLabel(label)}</p>
          <h2>{title}</h2>
        </div>
        {to && (
          <Link to={to} aria-label={title}>
            →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
export function ContentRows({
  items,
  empty = translate({
    id: 'ui.2935251044',
    message: '\u6682\u65E0\u5DF2\u53D1\u5E03\u5185\u5BB9\u3002',
  }),
}) {
  const en = useEnglish();
  return items.length ? (
    <ol className="hh-rows">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <span className="hh-eyebrow">
              {uiLabel(item.type)} {item.number && '/ ' + item.number}
            </span>
            <h3>
              <Link to={item.href}>
                {en ? item.titleEn || item.title : item.title}
              </Link>
            </h3>
            {(item.description || item.descriptionEn) && (
              <p>
                {en ? item.descriptionEn || item.description : item.description}
              </p>
            )}
          </div>
          <div className="hh-row-meta">
            {item.date && <time dateTime={item.date}>{item.date}</time>}
            {item.minutes && <span>{item.minutes} {uiLabel("MIN")}</span>}
            <Status value={item.status} />
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <p className="hh-empty">{en ? 'No published entries yet.' : empty}</p>
  );
}
export function Related({ ids = [], title }) {
  const { entries } = useContent();
  const en = useEnglish();
  const items = ids
    .map((id) => entries.find((e) => e.id === id))
    .filter(Boolean);
  return items.length ? (
    <Section
      label={uiLabel("KEEP EXPLORING")}
      title={
        title ||
        (en
          ? 'Related content'
          : translate({
              id: 'ui.47206b4f17',
              message: '\u7EE7\u7EED\u63A2\u7D22',
            }))
      }>
      <ContentRows items={items} />
    </Section>
  ) : null;
}
