import { uiLabel } from '@site/src/utils/ui-labels';
import PaperMetadata, { PaperNotes } from '@site/src/components/PaperMetadata';
import Heading from '@lab/runtime/Heading';
import React, { useState } from 'react';
import Layout from '@lab/runtime/Layout';
import Link from '@lab/runtime/Link';
import useSiteConfig from '@lab/runtime/context';
import papers from '@site/data/papers.json';
import ReadingActions from '@site/src/components/ReadingActions';
import styles from './news.module.css';

export default function Papers() {
  const en = useSiteConfig().i18n.currentLocale === 'en';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const visible = papers.filter(
    (p) =>
      (category === 'all' || p.categories.includes(category)) &&
      JSON.stringify([p.title, p.zh, p.en])
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Layout
      title="Papers"
      description={
        en
          ? 'Paper questions, methods and evidence boundaries.'
          : '论文的研究问题、方法与证据边界。'
      }>
      <main className={styles.page}>
        <p className={styles.eyebrow}>{uiLabel("READ / QUESTION / REPRODUCE")}</p>
        <h1>{en ? 'Read with a question.' : '带着问题读论文。'}</h1>
        <p>
          {en
            ? 'Foundational papers selected for AI engineering and embodied intelligence. These short guides are based on the linked abstracts; they are not full-paper reviews or personal experimental results.'
            : '围绕 AI 工程与具身智能精选基础论文。卡片基于所链接版本的摘要整理，是阅读入口，不是全文精读报告或个人实验结论。'}
        </p>
        <p>
          <Link to="/research">{en ? '← Research' : '← 研究总览'}</Link>
          {' · '}
          <Link to="/reading">{en ? 'Saved reading' : '稍后读'}</Link>
        </p>
        <div className={styles.filters}>
          <label>
            {en ? 'Topic' : '研究方向'}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}>
              <option value="all">{en ? 'All' : '全部'}</option>
              <option value="ai-apps">
                {en ? 'AI applications' : 'AI 应用开发'}
              </option>
              <option value="llm">LLM</option>
              <option value="embodied-ai">
                {en ? 'Embodied AI' : '具身智能'}
              </option>
            </select>
          </label>
          <label>
            {en ? 'Search' : '搜索'}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={en ? 'RAG, actions, retrieval…' : 'RAG、动作、检索…'}
            />
          </label>
        </div>
        <p role="status">
          {visible.length} {en ? 'papers' : '篇论文'}
        </p>
        {!visible.length && (
          <button
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}>
            {en ? 'Clear filters' : '清除筛选'}
          </button>
        )}
        <div className={styles.list}>
          {visible.map((p) => {
            const c = p[en ? 'en' : 'zh'];
            return (
              <article key={p.id} className={styles.card}>
                <PaperMetadata paper={p} />
                <small>
                  {p.short} · {p.year} · {en ? 'Abstract guide' : '摘要导读'}
                </small>
                <Heading as="h2" id={p.slug}>
                  {p.title}
                </Heading>
                <h3>{c.question}</h3>
                <dl>
                  {[
                    ['method', en ? 'Method' : '论文方法'],
                    ['evidence', en ? 'Reported evidence' : '作者报告的证据'],
                    ['boundary', en ? 'Reading boundary' : '阅读边界'],
                  ].map(([key, label]) => (
                    <React.Fragment key={key}>
                      <dt>
                        <strong>{label}</strong>
                      </dt>
                      <dd>{c[key]}</dd>
                    </React.Fragment>
                  ))}
                </dl>
                <details>
                  <summary>
                    {en ? 'Questions to investigate' : '展开阅读追问'}
                  </summary>
                  <p>{c.prompt}</p>
                </details>
                <p>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    {en
                      ? 'Source abstract and paper ↗'
                      : '查看原始摘要与论文 ↗'}
                  </a>
                  {' · '}
                  <Link to={'/labs/' + p.project}>
                    {en ? 'Planned experiment →' : '关联实验计划 →'}
                  </Link>
                </p>
                <PaperNotes paper={p} />
                <ReadingActions id={p.id} en={en} />
              </article>
            );
          })}
        </div>
      </main>
    </Layout>
  );
}
