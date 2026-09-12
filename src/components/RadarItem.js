import React from 'react';
import Link from '@docusaurus/Link';
import ReadingActions from './ReadingActions';
import { localizedNews } from '@site/src/utils/news-locale.mjs';
import { useEnglish, Related } from './ContentUI';
import ContentProvenance, { Freshness } from './ContentProvenance';
export default function RadarItem({ item, compact = false }) {
  const en = useEnglish();
  const c = localizedNews(item, en ? 'en' : 'zh');
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
              : '来源页'
            : en
              ? 'Source'
              : '来源'}{' '}
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
            <summary>{en ? 'Verification evidence' : '核验依据'}</summary>
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
            {en ? 'Related coverage' : '相关报道'} · {item.coverage.length}
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
