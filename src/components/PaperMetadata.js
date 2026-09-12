import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import ContentProvenance, { Freshness } from './ContentProvenance';
import { useEnglish } from './ContentUI';
export default function PaperMetadata({ paper: p }) {
  const en = useEnglish();
  return (
    <>
      <p className="hh-eyebrow">
        PAPER / {p.number} {p.version && ' · ' + p.version}
      </p>
      {!!p.authors?.length && (
        <p className="hh-meta">
          {p.authors.join(', ')}
          {p.venue ? ' · ' + p.venue : ''}
        </p>
      )}
      {!p.authors?.length && p.venue && <p className="hh-meta">{p.venue}</p>}
      <Freshness entry={p} />
      <p className="hh-meta">
        {en ? 'ABSTRACT-BASED READING GUIDE' : '基于论文摘要的阅读导引'}
      </p>
      {(p.code || p.projectPage) && (
        <p>
          {p.code && (
            <a href={p.code} target="_blank" rel="noopener noreferrer">
              Code ↗
            </a>
          )}{' '}
          {p.projectPage && (
            <a href={p.projectPage} target="_blank" rel="noopener noreferrer">
              Project ↗
            </a>
          )}
        </p>
      )}
    </>
  );
}
export function PaperNotes({ paper: p }) {
  if (p.readingStatus !== 'read' || p.myNotes?.author !== 'Hohoo') return null;
  const keys = ['learned', 'surprised', 'disagree', 'openQuestions'];
  if (!keys.some((k) => p.myNotes[k])) return null;
  return (
    <section className="hh-section">
      <h3>{uiLabel("MY NOTES")}</h3>
      <ContentProvenance kind="author" />
      <dl className="hh-definition">
        {keys
          .filter((k) => p.myNotes[k])
          .map((k) => (
            <React.Fragment key={k}>
              <dt>
                {
                  {
                    learned: 'What I learned',
                    surprised: 'What surprised me',
                    disagree: 'What I disagree with',
                    openQuestions: 'What I still don’t understand',
                  }[k]
                }
              </dt>
              <dd>{p.myNotes[k]}</dd>
            </React.Fragment>
          ))}
      </dl>
    </section>
  );
}
