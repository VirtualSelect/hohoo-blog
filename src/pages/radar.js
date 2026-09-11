import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import news from '@site/data/news/items.json';
import config from '@site/config/news-sources.json';
import { domains, signals } from '@site/src/utils/radar.cjs';
import { timelineGroups } from '@site/src/utils/news-timeline.mjs';
import { useEnglish } from '@site/src/components/ContentUI';
import RadarItem from '@site/src/components/RadarItem';
import styles from './news-timeline.module.css';
const items = signals(news, config);
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
      [
        i.title,
        i.summary,
        ...Object.values(i.translations || {}).flatMap((t) => [
          t.title,
          t.summary,
        ]),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Layout
      title="AI Radar"
      description="连接学习与实践的外部 AI 信号，保留来源和内容归属。">
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>AI Radar</h1>
          <nav
            className={styles.tools}
            aria-label={en ? 'Reading tools' : '阅读工具'}>
            <Link to="/reading">{en ? 'Saved' : '稍后读'}</Link>
            <Link to="/subscribe">RSS</Link>
          </nav>
        </header>
        <p className={styles.lead}>
          {en
            ? 'Signals from the AI frontier, connected to what we study.'
            : '发现 AI 世界的变化，连接正在研究的问题。'}
        </p>
        <div className="hh-controls">
          <label>
            {en ? 'Topic' : '主题'}{' '}
            <select
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setLimit(12);
              }}>
              <option value="all">ALL</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <input
            aria-label={en ? 'Search news' : '搜索资讯'}
            type="search"
            value={query}
            placeholder={en ? 'Search signals…' : '搜索标题或摘要…'}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(12);
            }}
          />
        </div>
        <details className={styles.extra}>
          <summary>
            {en ? 'Sources and editorial approach' : '来源筛选与整理说明'}
          </summary>
          <label>
            {en ? 'Source' : '来源'}{' '}
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setLimit(12);
              }}>
              <option value="all">{en ? 'All' : '全部来源'}</option>
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
              : 'AIHOT 为主要聚合来源。来源摘录不代表本站观点或独立事实核验；自动翻译暂停。时间按 UTC 分组。'}
          </p>
        </details>
        <div className={styles.metaBar}>
          <p role="status">
            {filtered.length} {en ? 'signals' : '条信号'}
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
                {m === 'day' ? (en ? 'Daily' : '按日') : en ? 'Weekly' : '按周'}
              </button>
            ))}
          </div>
          <Link to="/news/weekly">{en ? 'Weekly archive' : '周汇总'} →</Link>
        </div>
        <div className={styles.results}>
          {timelineGroups(filtered, limit, mode).map(([date, rows]) => (
            <section className={styles.group} key={date}>
              <div className={styles.date}>
                <time dateTime={date}>{date.slice(5)}</time>
                <small>
                  {date.slice(0, 4)}
                  {mode === 'week' ? ' · ' + (en ? 'Week of' : '周起始') : ''}
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
              <p>{en ? 'No matching signals.' : '当前没有匹配的资讯。'}</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setDomain('all');
                  setSource('all');
                  setLimit(12);
                }}>
                {en ? 'Clear filters' : '清除筛选'}
              </button>
            </section>
          )}
          {limit < filtered.length && (
            <button
              className={styles.more}
              type="button"
              onClick={() => setLimit((v) => v + 12)}>
              {en ? 'Load more' : '加载更多'}
            </button>
          )}
        </div>
      </main>
    </Layout>
  );
}
