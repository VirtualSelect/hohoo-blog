import useBrokenLinks from '@docusaurus/useBrokenLinks';
import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { translate } from '@docusaurus/Translate';
import { usePluginData } from '@docusaurus/useGlobalData';
import tracks from '@site/data/learning-paths.json';
import useLearningProgress from '../components/useLearningProgress';
import { useEnglish } from '../components/ContentUI';
export default function Learning() {
  const en = useEnglish();
  const { collectAnchor } = useBrokenLinks();
  collectAnchor('engineering');
  tracks.forEach((t) => t.steps.forEach((s) => collectAnchor('step-' + s.id)));
  const { entries } = usePluginData('learning-index');
  const progress = useLearningProgress();
  const [full, setFull] = useState(false),
    [query, setQuery] = useState(''),
    [saved, setSaved] = useState(false),
    [suggestion, setSuggestion] = useState(null);
  useEffect(() => {
    const openHash = () => {
      if (location.hash) setFull(true);
    };
    openHash();
    window.addEventListener('hashchange', openHash);
    return () => window.removeEventListener('hashchange', openHash);
  }, []);
  const available = new Map(entries.map((e) => [e.stepId, e]));
  const resume = available.get(progress.lastOpened);
  const visible = tracks
    .flatMap((t) => t.steps)
    .filter(
      (s) =>
        (!saved || progress.saved.includes(s.id)) &&
        [s.title, s.en].join(' ').toLowerCase().includes(query.toLowerCase()),
    );
  const label = (s) => available.get(s.id)?.title || (en ? s.en : s.title);
  const render = (s, compact = false) => {
    const article = available.get(s.id);
    return (
      <li
        id={compact ? undefined : 'step-' + s.id}
        key={s.id}
        className={article ? 'hh-step' : 'hh-planned'}>
        {article ? (
          <>
            <p className="hh-eyebrow">CURRENT / 01 BUILD</p>
            <h3>
              <Link
                to={article.permalink}
                onClick={() =>
                  progress.items[s.id]?.status !== 'completed' &&
                  progress.update(s.id, 'reading')
                }>
                {article.title} →
              </Link>
            </h3>
            <p className="hh-meta">
              {article.minutes} MIN ·{' '}
              {translate({
                id: 'learning.beginner',
                message: '入门',
              })}
            </p>
            <button
              type="button"
              disabled={!progress.ready}
              aria-pressed={progress.items[s.id]?.status === 'completed'}
              onClick={() =>
                progress.update(
                  s.id,
                  progress.items[s.id]?.status === 'completed'
                    ? 'reading'
                    : 'completed',
                )
              }>
              ✓{' '}
              {translate({
                id: 'learning.completed',
                message: '已完成',
              })}
            </button>
          </>
        ) : (
          <span>○ {label(s)}</span>
        )}
        {full && (
          <button
            type="button"
            disabled={!progress.ready}
            aria-pressed={progress.saved.includes(s.id)}
            onClick={() => progress.update(s.id, 'saved')}>
            ☆{' '}
            {translate({
              id: 'learning.save',
              message: '想读',
            })}
          </button>
        )}
      </li>
    );
  };
  return (
    <Layout
      title={translate({
        id: 'nav.learning',
        message: '学习',
      })}
      description={translate({
        id: 'learning.description',
        message: '从当前路线开始，按自己的节奏逐步深入。',
      })}>
      <main className="hh-page">
        <p className="hh-eyebrow">LEARNING</p>
        <h1>
          {translate({
            id: 'learning.description',
            message: '从当前路线开始，按自己的节奏逐步深入。',
          })}
        </h1>
        <p className="hh-meta">
          {entries.length
            ? `${entries.filter((e) => progress.items[e.stepId]?.status === 'completed').length} / ${entries.length}`
            : translate({
                id: 'learning.none',
                message: '正式路线文章尚未发布',
              })}{' '}
          ·{' '}
          {translate({
            id: 'learning.local',
            message: '进度仅保存在当前浏览器。',
          })}
        </p>
        {resume && (
          <p>
            CONTINUE LEARNING ·{' '}
            <Link to={resume.permalink}>{resume.title} →</Link>
          </p>
        )}
        <section className="hh-section">
          <h2>CURRENT PATH</h2>
          <p className="hh-eyebrow">01 / BUILD · AI APPLICATIONS</p>
          {!full && (
            <ol className="hh-roadmap">
              {tracks[0].steps.slice(0, 7).map((s) => render(s, true))}
            </ol>
          )}
        </section>
        <details open={full} onToggle={(e) => setFull(e.currentTarget.open)}>
          <summary>
            {translate({
              id: 'learning.full',
              message: '查看完整路线',
            })}{' '}
            →
          </summary>
          <div className="hh-controls">
            <input
              type="search"
              aria-label={translate({
                id: 'learning.search',
                message: '查找选题',
              })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              aria-pressed={saved}
              onClick={() => setSaved(!saved)}>
              ☆{' '}
              {translate({
                id: 'learning.saved',
                message: '只看想读',
              })}
            </button>
            <button
              type="button"
              disabled={!visible.length}
              onClick={() =>
                setSuggestion(
                  visible[Math.floor(Math.random() * visible.length)],
                )
              }>
              {translate({
                id: 'learning.random',
                message: '随机探索',
              })}
            </button>
          </div>
          {suggestion && (
            <p role="status">
              <a href={'#step-' + suggestion.id}>{label(suggestion)} →</a>
            </p>
          )}
          {!visible.length && (
            <p role="status">
              {translate({
                id: 'writing.empty',
                message: '当前语言暂无匹配的已发布内容。',
              })}
            </p>
          )}
          {tracks.map((t) => (
            <section className="hh-section" key={t.id}>
              <h2>
                {t.brand} · {en ? t.en : t.title}
              </h2>
              <ol className="hh-roadmap">
                {t.steps
                  .filter((s) => visible.includes(s))
                  .map((s) => render(s))}
              </ol>
            </section>
          ))}
        </details>
        <section id="engineering" className="hh-section">
          <h2>ENGINEERING FOUNDATIONS</h2>
          <ul className="hh-foundations">
            <li>
              Java <small>PRIMARY STACK</small>
            </li>
            <li>
              Python <small>LEARNING</small>
            </li>
            <li>
              Frontend <small>LEARNING</small>
            </li>
          </ul>
        </section>
        <p>
          <Link to="/research">
            {translate({
              id: 'learning.research',
              message: '研究总览',
            })}{' '}
            →
          </Link>{' '}
          ·{' '}
          <Link to="/reading">
            {translate({
              id: 'learning.inbox',
              message: '阅读清单',
            })}{' '}
            →
          </Link>
        </p>
      </main>
    </Layout>
  );
}
