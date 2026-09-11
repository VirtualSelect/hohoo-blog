import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import LearningNavigation from '@site/src/components/LearningNavigation';
import styles from './learning.module.css';
export default function Timeline() {
  const en = useDocusaurusContext().i18n.currentLocale === 'en';
  const {entries} = usePluginData('learning-index');
  return <Layout title={en ? 'Learning timeline' : '学习时间轴'} description={en ? 'Published learning notes, newest first.' : '按真实发布日期，回看已发布的学习记录。'}>
    <main className={styles.page}><p className={styles.eyebrow}>A RECORD OF LEARNING</p>
      <h1>{en ? 'Learning, one entry at a time.' : '让每一步学习，留下记录。'}</h1>
      <p className={styles.lead}>{en ? 'Published reading-path articles, newest first. Plans and personal journal entries are kept separate.' : '按发布日期倒序收录阅读路线中的正式文章。规划选题和生活随笔不计入学习记录。'}</p>
      <LearningNavigation active="timeline" en={en} />
      {entries.length ? <ol className={styles.timeline}>{entries.map(entry => <li key={entry.stepId} className={styles.card}>
        <time dateTime={entry.date}>{entry.date}</time><h2><Link to={entry.permalink}>{entry.title}</Link></h2>
        <p>{entry.description}</p><span>{entry.minutes} {en ? 'min read' : '分钟阅读'}</span>
      </li>)}</ol> : <section className={styles.empty}>
        <h2>{en ? 'The first entry is still ahead.' : '第一篇学习记录，正在路上。'}</h2>
        <p>{en ? 'No reading-path articles have been published yet. Explore the planned stages while this timeline waits for its first real entry.' : '目前还没有正式发布的路线文章。先看看选题和学习顺序，实际发布后会在这里按日期呈现。'}</p>
        <Link to="/learning">{en ? 'Explore reading paths →' : '查看阅读路线 →'}</Link>
      </section>}
    </main>
  </Layout>;
}
