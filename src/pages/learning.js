import LearningOverview from '@site/src/components/LearningOverview';
import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import { usePluginData } from '@docusaurus/useGlobalData';
import tracks from '@site/data/learning-paths.json';
import useLearningProgress from '@site/src/components/useLearningProgress';
import { useEnglish } from '@site/src/components/ContentUI';
import { learningSymbols } from '@site/src/utils/learning-progress.mjs';
export default function Learning() {
  const en = useEnglish();
  const { entries } = usePluginData('learning-index');
  const progress = useLearningProgress();
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [suggestion, setSuggestion] = useState(null);
  const published = new Map(entries.map((e) => [e.stepId, e]));
  const resume = published.get(progress.lastOpened);
  const visible = tracks
    .filter((t) => !tracks.some((t) => t.id === filter) || t.id === filter)
    .map((t) => ({
      ...t,
      steps: t.steps.filter(
        (s) =>
          (filter !== 'saved' || progress.saved.includes(s.id)) &&
          [s.title, s.en, s.area, s.prerequisite, s.outcome]
            .join(' ')
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    }));
  const pool = visible.flatMap((t) => t.steps);
  return (
    <Layout
      title="Learning Path"
      description="BUILD / UNDERSTAND / EXPLORE：三个方向的学习路径与本地阅读状态。">
      <main className="hh-page">
        <p className="hh-eyebrow">LEARNING PATH</p>
        <h1>
          {en
            ? 'A direction, and a next step.'
            : '知道从哪里开始，也知道下一步。'}
        </h1>
        <p className="hh-lead">
          {en
            ? 'Follow prerequisites at your pace. Planned topics are marked; reading-time estimates for plans are not completed learning time.'
            : '按前置知识循序推进。选题标注 Planned；计划阅读时间是篇幅估计，不代表实际学习时长。'}
        </p>
        <LearningOverview entries={entries} progress={progress} />
        <section className="hh-section">
          <h2 className="hh-eyebrow">CONTINUE LEARNING</h2>
          {resume ? (
            <Link to={resume.permalink}>{resume.title} →</Link>
          ) : (
            <Link to="#paths">
              {en ? 'Choose your first topic →' : '选择第一个主题 →'}
            </Link>
          )}
        </section>
        <div className="hh-tracks">
          {tracks.map((t) => {
            const available = t.steps.filter((s) => published.has(s.id));
            const finished = available.filter(
              (s) => progress.items[s.id]?.status === 'completed',
            );
            return (
              <div key={t.id}>
                <p className="hh-eyebrow">{t.brand}</p>
                {available.length ? (
                  <p>
                    {finished.length} / {available.length}{' '}
                    {en ? 'completed' : '已完成'}
                  </p>
                ) : (
                  <p className="hh-meta">PLANNED</p>
                )}
              </div>
            );
          })}
        </div>
        <section className="hh-section">
          <label htmlFor="learning-search">
            {en ? 'Search topics' : '查找选题'}
          </label>
          <div className="hh-controls">
            <input
              id="learning-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSuggestion(null);
              }}
              placeholder={en ? 'Java, MCP, simulation…' : 'Java、MCP、仿真…'}
            />
            {[
              ['all', en ? 'All' : '全部'],
              ...tracks.map((t) => [t.id, en ? t.en : t.title]),
              ['saved', en ? 'Saved' : '☆ 想读'],
            ].map(([id, title]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id);
                  setSuggestion(null);
                }}>
                {title}
              </button>
            ))}
            <button
              type="button"
              disabled={!pool.length}
              onClick={() => {
                const choices = pool.filter((s) => s.id !== suggestion?.id);
                const options = choices.length ? choices : pool;
                setSuggestion(
                  options[Math.floor(Math.random() * options.length)],
                );
              }}>
              {en ? 'Random explore' : '随机探索'}
            </button>
          </div>
          <p className="hh-meta">
            {progress.error
              ? en
                ? 'Storage unavailable; this visit only.'
                : '存储不可用，仅本次访问保留。'
              : en
                ? 'Saved in this browser only.'
                : '状态仅保存在当前浏览器。'}
          </p>
          <p role="status">
            {pool.length} {en ? 'matching topics' : '个匹配选题'}
            {suggestion && (
              <>
                {' '}
                ·{' '}
                <a href={'#step-' + suggestion.id}>
                  {en ? suggestion.en : suggestion.title} →
                </a>
              </>
            )}
          </p>
          {!pool.length && (
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setQuery('');
              }}>
              {en ? 'Clear filters' : '清除筛选'}
            </button>
          )}
        </section>
        <Heading as="h2" id="paths">
          {en ? 'Three learning tracks' : '三条学习主线'}
        </Heading>
        {visible
          .filter((t) => t.steps.length)
          .map((t) => (
            <section className="hh-section" key={t.id}>
              <p className="hh-eyebrow">{t.brand}</p>
              <h2>{en ? t.en : t.title}</h2>
              <p className="hh-lead">{en ? t.english : t.intro}</p>
              {t.steps.map((s) => {
                const article = published.get(s.id);
                const status = article
                  ? progress.items[s.id]?.status || 'not-started'
                  : 'not-started';
                return (
                  <article className="hh-step" key={s.id}>
                    <p className="hh-eyebrow">
                      {s.area.toUpperCase()} ·{' '}
                      {article ? 'PUBLISHED' : 'PLANNED'}
                    </p>
                    <Heading as="h3" id={'step-' + s.id}>
                      {en ? s.en : s.title}
                    </Heading>
                    <dl>
                      <dt>{en ? 'Level' : '难度'}</dt>
                      <dd>
                        {s.difficulty === 'beginner'
                          ? en
                            ? 'Beginner'
                            : '入门'
                          : en
                            ? 'Intermediate'
                            : '进阶'}
                      </dd>
                      <dt>{en ? 'Prerequisites' : '前置知识'}</dt>
                      <dd>{en ? s.prerequisiteEn : s.prerequisite}</dd>
                      {(article?.minutes || s.minutes) && (
                        <>
                          <dt>
                            {article
                              ? en
                                ? 'Reading time'
                                : '阅读时间'
                              : en
                                ? 'Planned reading time'
                                : '计划阅读时间'}
                          </dt>
                          <dd>{article?.minutes || s.minutes} MIN</dd>
                        </>
                      )}
                    </dl>
                    {s.outcome && <p>{en ? s.outcomeEn : s.outcome}</p>}
                    <div className="hh-controls">
                      <button
                        type="button"
                        disabled={!progress.ready}
                        aria-pressed={progress.saved.includes(s.id)}
                        onClick={() => progress.update(s.id, 'saved')}>
                        ☆{' '}
                        {progress.saved.includes(s.id)
                          ? en
                            ? 'Saved'
                            : '已想读'
                          : en
                            ? 'Want to read'
                            : '想读'}
                      </button>
                      {article && (
                        <>
                          <Link
                            to={article.permalink}
                            onClick={() => {
                              if (status !== 'completed')
                                progress.update(s.id, 'reading');
                            }}>
                            {learningSymbols[status]}{' '}
                            {en ? 'Read article' : '阅读文章'} →
                          </Link>
                          <button
                            type="button"
                            disabled={!progress.ready}
                            aria-pressed={status === 'completed'}
                            onClick={() =>
                              progress.update(
                                s.id,
                                status === 'completed'
                                  ? 'reading'
                                  : 'completed',
                              )
                            }>
                            ✓ {en ? 'Completed' : '已完成'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        <section className="hh-section">
          <Heading as="h2" id="engineering">
            AI Engineering
          </Heading>
          <p>
            {en
              ? 'The engineering branch of AI Applications: coding, tooling, evaluation and delivery.'
              : 'AI Applications 内的工程子方向：编码、工具、评估与交付。'}
          </p>
          <Link to="/timeline">
            {en ? 'Learning activity →' : '学习活动 →'}
          </Link>
        </section>
      </main>
    </Layout>
  );
}
