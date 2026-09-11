import React from 'react';
import Link from '@docusaurus/Link';
import current from '@site/data/current.json';
import { useEnglish } from './ContentUI';
export default function CurrentFocus({ full = false }) {
  const en = useEnglish();
  const items = current.items.filter(
    (i) => full || ['BUILDING', 'LEARNING', 'EXPLORING'].includes(i.kind),
  );
  return (
    <section className="hh-section">
      <div className="hh-section-heading">
        <p className="hh-eyebrow">{full ? 'NOW' : 'CURRENTLY'}</p>
        <span className="hh-meta">
          UPDATED <time dateTime={current.updated}>{current.updated}</time>
        </span>
      </div>
      <dl className={full ? 'hh-current-full' : 'hh-current'}>
        {items.map((i) => (
          <div key={i.kind}>
            <dt className="hh-eyebrow">{i.kind}</dt>
            <dd>
              <Link to={i.to}>{en ? i.en : i.zh}</Link>
            </dd>
          </div>
        ))}
      </dl>
      {!full && <Link to="/now">{en ? 'More about now →' : '完整近况 →'}</Link>}
    </section>
  );
}
