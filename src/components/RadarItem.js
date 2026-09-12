import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { translate } from '@docusaurus/Translate';
import React from 'react';
import Link from '@docusaurus/Link';
import ReadingActions from './ReadingActions';
import { localizedNews } from '@site/src/utils/news-locale.mjs';
import { useEnglish, Related } from './ContentUI';
import ContentProvenance, { Freshness } from './ContentProvenance';
export default function RadarItem({ item, compact = false }) {
  const en = useEnglish();
  const c = localizedNews(item, useDocusaurusContext().i18n.currentLocale);
  return (
    <article id={'signal-' + item.id}>
      <p className="hh-eyebrow">
        RADAR / SIGNAL · {item.domain.toUpperCase()} ·{' '}
        {item.sourceType.toUpperCase()} ·{' '}
        <time dateTime={item.publishedAt}>{item.publishedAt.slice(0, 10)}</time>
      </p>
      <p className="hh-meta">
        SOURCE STATUS ·{' '}
        {(item.verificationStatus || 'unverified')
          .replaceAll('-', ' ')
          .toUpperCase()}
      </p>
      <Freshness
        entry={{
          ...item,
          lastVerified: ['primary-confirmed', 'cross-checked'].includes(
            item.verificationStatus,
          )
            ? item.verification?.checkedAt
            : undefined,
        }}
      />
      <h3>
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {c.title} ↗
        </a>
      </h3>
      {item.originalTitle && item.originalTitle !== c.title && (
        <p className="hh-meta">ORIGINAL SOURCE TITLE · {item.originalTitle}</p>
      )}
      <p className="hh-meta">
        {c.fallback ? 'SOURCE LANGUAGE' : 'AI TRANSLATED'}
      </p>
      {c.summary && (
        <>
          <ContentProvenance
            kind={
              item.summaryKind === 'ai-summary'
                ? 'ai-summary'
                : 'source-excerpt'
            }
          />
          <p>{c.summary}</p>
        </>
      )}
      {!compact && item.whyItMatters && (
        <>
          <p className="hh-eyebrow">WHY IT MATTERS</p>
          <p>{item.whyItMatters}</p>
        </>
      )}
      <div className="hh-controls">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {item.sourceName} ·{' '}
          {item.sourceType === 'media'
            ? en
              ? 'Source page'
              : translate({
                  id: 'ui.05b0e77f21',
                  message: '\u6765\u6E90\u9875',
                })
            : en
              ? 'Source'
              : translate({
                  id: 'ui.c63f79e636',
                  message: '\u6765\u6E90',
                })}{' '}
          ↗
        </a>
        {!compact && <ReadingActions id={item.id} en={en} compact />}
      </div>
      {!compact && <Related ids={item.related || []} />}{' '}
      {!compact &&
        ['primary-confirmed', 'cross-checked'].includes(
          item.verificationStatus,
        ) && (
          <details>
            <summary>
              {en
                ? 'Verification evidence'
                : translate({
                    id: 'ui.8215f33a20',
                    message: '\u6838\u9A8C\u4F9D\u636E',
                  })}
            </summary>
            <ul>
              {item.verification.evidence.map((e) => (
                <li key={e.url}>
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    {e.note} ↗
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      {!!item.coverage?.length && (
        <details>
          <summary>
            {en
              ? 'Related coverage'
              : translate({
                  id: 'ui.6b698bddf4',
                  message: '\u76F8\u5173\u62A5\u9053',
                })}{' '}
            · {item.coverage.length}
          </summary>
          <ul>
            {item.coverage.map((i) => (
              <li key={i.id}>
                <a href={i.url} target="_blank" rel="noopener noreferrer">
                  {i.sourceName} · {i.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
