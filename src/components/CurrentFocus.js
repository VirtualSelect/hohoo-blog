import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { translate } from '@docusaurus/Translate';
import React from 'react';
import Link from '@docusaurus/Link';
import current from '@site/data/current.json';
import { useEnglish } from './ContentUI';
export default function CurrentFocus({ full = false }) {
  const en = useEnglish();
  const tw = useDocusaurusContext().i18n.currentLocale === 'zh-TW';
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
              <Link to={i.to}>{en ? i.en : tw ? i.tw : i.zh}</Link>
            </dd>
          </div>
        ))}
      </dl>
      {!full && (
        <Link to="/now">
          {en
            ? 'More about now →'
            : translate({
                id: 'ui.a548e12420',
                message: '\u5B8C\u6574\u8FD1\u51B5 \u2192',
              })}
        </Link>
      )}
    </section>
  );
}
