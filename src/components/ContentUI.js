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
    planning: ['规划', 'Planned'],
    production: ['已上线', 'Live'],
    building: ['构建中', 'Building'],
    completed: ['已完成', 'Completed'],
    running: ['实验中', 'Running'],
    'to-read': ['阅读入口', 'Reading guide'],
    published: ['已发布', 'Published'],
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
          <p className="hh-eyebrow">{label}</p>
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
export function ContentRows({ items, empty = '暂无已发布内容。' }) {
  const en = useEnglish();
  return items.length ? (
    <ol className="hh-rows">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <span className="hh-eyebrow">
              {item.type.toUpperCase()} {item.number && '/ ' + item.number}
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
            {item.minutes && <span>{item.minutes} MIN</span>}
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
      label="KEEP EXPLORING"
      title={title || (en ? 'Related content' : '继续探索')}>
      <ContentRows items={items} />
    </Section>
  ) : null;
}
