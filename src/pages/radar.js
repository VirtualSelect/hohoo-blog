import { uiLabel } from '@site/src/utils/ui-labels';
import { translate } from '@docusaurus/Translate';
import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import items from '@generated/radar-pages/default/items.json';
import config from '@site/config/news-sources.json';
import { domains } from '@site/src/utils/radar.cjs';
import { timelineGroups } from '@site/src/utils/news-timeline.mjs';
import { useEnglish } from '@site/src/components/ContentUI';
import RadarItem from '@site/src/components/RadarItem';
import styles from './news-timeline.module.css';

export default function Radar() {
  const en = useEnglish();
  const [query, setQuery] = useState(''),
    [domain, setDomain] = useState('all'),
    [source, setSource] = useState('all'),
    [limit, setLimit] = useState(12),
    [mode, setMode] = useState('day');
  const filtered = items.filter(
    (i) =>
      (domain === 'all' || i.domain === domain) &&
      (source === 'all' || i.sourceId === source) &&
      [i.title, i.summary, i.searchText]
        .join(' ')
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Layout
      title={uiLabel("AI RADAR")}
      description={translate({
        id: 'ui.b9171eebbb',
        message:
          '\u8FDE\u63A5\u5B66\u4E60\u4E0E\u5B9E\u8DF5\u7684\u5916\u90E8 AI \u4FE1\u53F7\uFF0C\u4FDD\u7559\u6765\u6E90\u548C\u5185\u5BB9\u5F52\u5C5E\u3002',
      })}>
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>AI Radar</h1>
          <nav
            className={styles.tools}
            aria-label={
              en
                ? 'Reading tools'
                : translate({
                    id: 'ui.b0dfdeacae',
                    message: '\u9605\u8BFB\u5DE5\u5177',
                  })
            }>
            <Link to="/reading">
              {en
                ? 'Saved'
                : translate({
                    id: 'ui.a89b395637',
                    message: '\u7A0D\u540E\u8BFB',
                  })}
            </Link>
            <Link to="/subscribe">RSS</Link>
          </nav>
        </header>
        <p className={styles.lead}>
          {en
            ? 'Signals from the AI frontier, connected to what we study.'
            : translate({
                id: 'ui.aca5221c11',
                message:
                  '\u53D1\u73B0 AI \u4E16\u754C\u7684\u53D8\u5316\uFF0C\u8FDE\u63A5\u6B63\u5728\u7814\u7A76\u7684\u95EE\u9898\u3002',
              })}
        </p>
        <div className="hh-controls">
          <label>
            {en
              ? 'Topic'
              : translate({
                  id: 'ui.e848ddd482',
                  message: '\u4E3B\u9898',
                })}{' '}
            <select
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setLimit(12);
              }}>
              <option value="all">{uiLabel("ALL")}</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {uiLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <input
            aria-label={
              en
                ? 'Search news'
                : translate({
                    id: 'ui.55322770d4',
                    message: '\u641C\u7D22\u8D44\u8BAF',
                  })
            }
            type="search"
            value={query}
            placeholder={
              en
                ? 'Search signals…'
                : translate({
                    id: 'ui.3a63568a36',
                    message: '\u641C\u7D22\u6807\u9898\u6216\u6458\u8981\u2026',
                  })
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(12);
            }}
          />
        </div>
        <details className={styles.extra}>
          <summary>
            {en
              ? 'Sources and editorial approach'
              : translate({
                  id: 'ui.c2f3a6365a',
                  message:
                    '\u6765\u6E90\u7B5B\u9009\u4E0E\u6574\u7406\u8BF4\u660E',
                })}
          </summary>
          <label>
            {en
              ? 'Source'
              : translate({
                  id: 'ui.c63f79e636',
                  message: '\u6765\u6E90',
                })}{' '}
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setLimit(12);
              }}>
              <option value="all">
                {en
                  ? 'All'
                  : translate({
                      id: 'ui.f8d22fd22e',
                      message: '\u5168\u90E8\u6765\u6E90',
                    })}
              </option>
              {config.sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            {en
              ? 'AIHOT is the primary aggregation feed. Source excerpts are not personal opinions or independently verified reports. Automatic translation is paused. Dates use UTC.'
              : translate({
                  id: 'ui.ac9d14e1a1',
                  message:
                    'AIHOT \u4E3A\u4E3B\u8981\u805A\u5408\u6765\u6E90\u3002\u6765\u6E90\u6458\u5F55\u4E0D\u4EE3\u8868\u672C\u7AD9\u89C2\u70B9\u6216\u72EC\u7ACB\u4E8B\u5B9E\u6838\u9A8C\uFF1B\u81EA\u52A8\u7FFB\u8BD1\u6682\u505C\u3002\u65F6\u95F4\u6309 UTC \u5206\u7EC4\u3002',
                })}
          </p>
        </details>
        <div className={styles.metaBar}>
          <p role="status">
            {filtered.length}{' '}
            {en
              ? 'signals'
              : translate({
                  id: 'ui.fe8f7b1f08',
                  message: '\u6761\u4FE1\u53F7',
                })}
          </p>
          <div className={styles.mode}>
            {['day', 'week'].map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setLimit(12);
                }}>
                {m === 'day'
                  ? en
                    ? 'Daily'
                    : translate({
                        id: 'ui.5bbcddbccd',
                        message: '\u6309\u65E5',
                      })
                  : en
                    ? 'Weekly'
                    : translate({
                        id: 'ui.6ccceba5c4',
                        message: '\u6309\u5468',
                      })}
              </button>
            ))}
          </div>
          <Link to="/radar/weekly">
            {en
              ? 'Weekly archive'
              : translate({
                  id: 'ui.96c787d5aa',
                  message: '\u5468\u6C47\u603B',
                })}{' '}
            →
          </Link>
        </div>
        <div className={styles.results}>
          {timelineGroups(filtered, limit, mode).map(([date, rows]) => (
            <section className={styles.group} key={date}>
              <div className={styles.date}>
                <time dateTime={date}>{date.slice(5)}</time>
                <small>
                  {date.slice(0, 4)}
                  {mode === 'week'
                    ? ' · ' +
                      (en
                        ? 'Week of'
                        : translate({
                            id: 'ui.d9822ceebd',
                            message: '\u5468\u8D77\u59CB',
                          }))
                    : ''}
                </small>
              </div>
              <div className={styles.entries}>
                {rows.map((i) => (
                  <div key={i.id} className="hh-radar">
                    <RadarItem item={i} />
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!filtered.length && (
            <section className={styles.empty}>
              <p>
                {en
                  ? 'No matching signals.'
                  : translate({
                      id: 'ui.2ca8f5e005',
                      message:
                        '\u5F53\u524D\u6CA1\u6709\u5339\u914D\u7684\u8D44\u8BAF\u3002',
                    })}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setDomain('all');
                  setSource('all');
                  setLimit(12);
                }}>
                {en
                  ? 'Clear filters'
                  : translate({
                      id: 'ui.4bbc4e5fd9',
                      message: '\u6E05\u9664\u7B5B\u9009',
                    })}
              </button>
            </section>
          )}
          {limit < filtered.length && (
            <button
              className={styles.more}
              type="button"
              onClick={() => setLimit((v) => v + 12)}>
              {en
                ? 'Load more'
                : translate({
                    id: 'ui.3a0fab4978',
                    message: '\u52A0\u8F7D\u66F4\u591A',
                  })}
            </button>
          )}
        </div>
      </main>
    </Layout>
  );
}
