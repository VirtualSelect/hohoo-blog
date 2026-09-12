import { uiLabel } from '@site/src/utils/ui-labels';
import React, { useState } from 'react';
import Layout from '@lab/runtime/Layout';
import Link from '@lab/runtime/Link';
import papers from '@site/data/papers.json';
import news from '@site/data/news/items.json';
import tracks from '@site/data/learning-paths.json';
import { localizedNews } from '@site/src/utils/news-locale.mjs';
import ReadingActions, {
  useNewsReading,
} from '@site/src/components/ReadingActions';
import useLearningProgress from '@site/src/components/useLearningProgress';
import { useEnglish, useContent } from '@site/src/components/ContentUI';
export default function Reading() {
  const en = useEnglish(),
    state = useNewsReading(),
    learning = useLearningProgress(),
    { entries } = useContent();
  const [status, setStatus] = useState('inbox'),
    [sort, setSort] = useState('newest'),
    [type, setType] = useState('all'),
    [topic, setTopic] = useState('all');
  const catalog = [
    ...news.map((i) => ({
      ...i,
      type: 'radar',
      topic: i.category,
      href: '/radar#signal-' + i.id,
      ...localizedNews(i, en ? 'en' : 'zh'),
    })),
    ...papers.map((p) => ({
      id: p.id,
      type: 'paper',
      title: p.title,
      description: p[en ? 'en' : 'zh'].question,
      href: '/papers#' + p.slug,
      topics: p.categories,
    })),
    ...entries
      .filter((e) => e.type === 'note')
      .map((e) => ({
        ...e,
        title: en ? e.titleEn || e.title : e.title,
        topic: e.domain,
      })),
  ]
    .filter((e) => state.saved.includes(e.id))
    .map((e) => ({
      ...e,
      savedAt: state.savedAt[e.id],
      stage: state.read.includes(e.id)
        ? 'done'
        : state.reading.includes(e.id)
          ? 'reading'
          : 'inbox',
    }));
  const plans = tracks.flatMap((t) =>
    t.steps
      .filter((s) => learning.saved.includes(s.id))
      .map((s) => {
        const doc = entries.find((e) => e.stepId === s.id);
        return {
          id: s.id,
          type: 'learning',
          topic: t.id,
          title: en ? s.en : s.title,
          href: doc?.href || '/learning#step-' + s.id,
          minutes: doc?.minutes,
          planned: !doc,
          stage:
            learning.items[s.id]?.status === 'completed'
              ? 'done'
              : learning.items[s.id]?.status === 'reading'
                ? 'reading'
                : 'inbox',
        };
      }),
  );
  const rows = [...catalog, ...plans]
    .filter(
      (e) =>
        (status === 'all' || e.stage === status) &&
        (type === 'all' || e.type === type) &&
        (topic === 'all' || e.topic === topic || e.topics?.includes(topic)),
    )
    .sort((a, b) =>
      sort === 'shortest'
        ? (a.minutes || Infinity) - (b.minutes || Infinity) ||
          a.title.localeCompare(b.title)
        : !a.savedAt
          ? !b.savedAt
            ? a.title.localeCompare(b.title)
            : 1
          : !b.savedAt
            ? -1
            : sort === 'oldest'
              ? a.savedAt.localeCompare(b.savedAt)
              : b.savedAt.localeCompare(a.savedAt),
    );
  return (
    <Layout
      title="Reading Inbox"
      description={
        en
          ? 'Your local reading inbox for knowledge and signals.'
          : '知识与资讯的本地阅读清单。'
      }>
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("READING INBOX")}</p>
        <h1>
          {en ? 'Keep the next question close.' : '把下一次阅读，留在这里。'}
        </h1>
        <p className="hh-lead">
          {en
            ? 'Saved in this browser. Migrated entries without a save date follow dated entries.'
            : '保存在当前浏览器。旧收藏没有保存日期时排在有日期的记录之后，不补造时间。'}
        </p>
        <div className="hh-controls">
          <label>
            {en ? 'Status' : '状态'}{' '}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {['inbox', 'reading', 'done', 'all'].map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            {en ? 'Type' : '类型'}{' '}
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {['all', 'radar', 'paper', 'learning', 'note'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            {en ? 'Topic' : '主题'}{' '}
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="all">{uiLabel("ALL")}</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {en ? t.en : t.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            {en ? 'Sort' : '排序'}{' '}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">{en ? 'Newest saved' : '最近收藏'}</option>
              <option value="oldest">{en ? 'Oldest saved' : '最早收藏'}</option>
              <option value="shortest">
                {en ? 'Shortest read' : '阅读时长最短'}
              </option>
            </select>
          </label>
        </div>
        <p className="hh-meta">
          {en
            ? 'Entries without reading-time metadata follow timed entries.'
            : '没有阅读时长的内容排在有时长的内容之后。'}
        </p>
        <p role="status">
          {state.ready && learning.ready
            ? `${rows.length} ${en ? 'entries' : '条内容'}`
            : en
              ? 'Loading…'
              : '正在读取…'}
        </p>
        {(state.error || learning.error) && (
          <p role="status">
            {en
              ? 'Storage unavailable; this visit only.'
              : '存储不可用，仅本次访问保留。'}
          </p>
        )}
        {state.ready && learning.ready && !rows.length && (
          <section className="hh-empty">
            <h2>{en ? 'Nothing in this view yet.' : '当前清单暂无内容。'}</h2>
            <Link to="/radar">AI Radar →</Link>
            {' · '}
            <Link to="/learning">{en ? 'Learning Path' : '阅读路线'} →</Link>
          </section>
        )}
        <ol className="hh-rows">
          {rows.map((e) => (
            <li key={e.id}>
              <div>
                <p className="hh-eyebrow">
                  {uiLabel(e.type)} · {uiLabel(e.stage)}
                  {e.planned ? ' · ' + uiLabel('PLANNED') : ''}
                </p>
                <h2>
                  <Link to={e.href}>{e.title}</Link>
                </h2>
                {e.description && <p>{e.description}</p>}
                {e.type === 'learning' ? (
                  <div className="hh-controls">
                    <button
                      type="button"
                      onClick={() => learning.update(e.id, 'saved')}>
                      {en ? 'Remove from saved' : '取消想读'}
                    </button>
                  </div>
                ) : (
                  <ReadingActions id={e.id} en={en} />
                )}
              </div>
            </li>
          ))}
        </ol>
      </main>
    </Layout>
  );
}
