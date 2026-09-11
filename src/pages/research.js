import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import topics from '@site/data/topics';
import papers from '@site/data/papers.json';
import styles from './research.module.css';

export default function Research() {
  const en = useDocusaurusContext().i18n.currentLocale === 'en';
  return (
    <Layout
      title={en ? 'Research' : '研究'}
      description={
        en ? 'Three connected research tracks.' : '三条主线的内容与研究入口。'
      }>
      <main className={styles.page}>
        <p className={styles.kicker}>LEARN / BUILD / UNDERSTAND</p>
        <h1>{en ? 'Follow a question.' : '从一个问题，深入一点。'}</h1>
        <p className={styles.lead}>
          {en
            ? 'Topics connect paper guides, learning plans and experiments. Start with a direction, then choose how to explore it.'
            : '将论文、阅读路线和实验串在同一个研究方向下。先选一个问题，再决定如何深入。'}
        </p>
        <section className={styles.topics}>
          {topics.map((topic, index) => (
            <article key={topic.id}>
              <small>
                0{index + 1} / {topic.tag}
              </small>
              <h2>
                <Link to={'/docs/' + topic.id}>
                  {en ? topic.en : topic.title} ↗
                </Link>
              </h2>
              <p>{en ? topic.english : topic.description}</p>
              <ul>
                {papers
                  .filter((p) => p.categories.includes(topic.id))
                  .map((p) => (
                    <li key={p.id}>
                      <Link to={'/papers#' + p.slug}>
                        {p.short} · {en ? 'Reading guide' : '论文导读'}
                      </Link>
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </section>
        <section className={styles.resources}>
          <h2>{en ? 'Ways to explore' : '接下来怎么读'}</h2>
          {[
            [
              '/learning',
              en ? 'Reading paths' : '阅读路线',
              en
                ? 'Prerequisites, stages and published notes.'
                : '按前置知识与阶段推进，查看已发布记录。',
            ],
            [
              '/papers',
              en ? 'Paper guides' : '论文阅读',
              en
                ? 'Questions, methods and the boundaries of evidence.'
                : '从研究问题、方法和证据边界入手。',
            ],
            [
              '/projects',
              en ? 'Projects' : '项目',
              en
                ? 'Working code and clearly marked experiment plans.'
                : '查看实际代码，以及明确标注的实验计划。',
            ],
          ].map(([to, title, description]) => (
            <Link key={to} to={to}>
              <strong>{title} →</strong>
              <span>{description}</span>
            </Link>
          ))}
        </section>
      </main>
    </Layout>
  );
}
