import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import tracks from '@site/data/learning-paths.json';
import LearningNavigation from '@site/src/components/LearningNavigation';
import styles from './learning.module.css';

export default function Learning() {
  const en = useDocusaurusContext().i18n.currentLocale === 'en';
  const {entries} = usePluginData('learning-index');
  const published = new Map(entries.map(entry => [entry.stepId, entry]));
  return <Layout title={en ? 'Reading paths' : '阅读路线'} description={en ? 'Two step-by-step learning paths for AI applications and embodied intelligence.' : 'AI 应用与 LLM、具身智能两条循序渐进的阅读路线。'}>
    <main className={styles.page}>
      <p className={styles.eyebrow}>LEARN WITH A DIRECTION</p>
      <h1>{en ? 'A starting point, and a next step.' : '知道从哪里开始，也知道下一步。'}</h1>
      <p className={styles.lead}>{en ? 'Follow the prerequisites at your own pace. Planned titles are not published articles; their reading times are editorial estimates, not practice durations.' : '按前置知识顺序阅读，不设固定完成日期。规划中的选题尚未发布，阅读时长为拟定篇幅的估计，不包含动手实践时间。'}</p>
      <LearningNavigation active="learning" en={en} />
      {tracks.map(track => <section key={track.id} className={styles.track} aria-labelledby={track.id}>
        <h2 id={track.id}>{en ? track.en : track.title}</h2>
        <p className={styles.lead}>{en ? track.english : track.intro}</p>
        <ol className={styles.steps}>{track.steps.map((step, index) => {
          const article = published.get(step.id);
          return <li key={step.id} className={styles.card}>
            <div className={styles.meta}><span>{en ? 'STAGE' : '阶段'} {index + 1}</span><span>{article ? (en ? 'Published' : '已发布') : (en ? 'Planned' : '规划中')}</span></div>
            <h3>{article ? <Link to={article.permalink}>{article.title}</Link> : (en ? step.en : step.title)}</h3>
            <dl><dt>{en ? 'Level' : '难度'}</dt><dd>{en ? (index < 2 ? 'Introductory' : 'Practice') : (index < 2 ? '入门' : '实践')}</dd>
              <dt>{en ? 'Prerequisites' : '前置知识'}</dt><dd>{en ? step.prerequisiteEn : step.prerequisite}</dd>
              <dt>{en ? (article ? 'Reading time' : 'Planned reading time') : (article ? '预计阅读时间' : '计划阅读时间')}</dt><dd>{article?.minutes || step.minutes} {en ? 'min' : '分钟'}</dd></dl>
            <p>{en ? step.outcomeEn : step.outcome}</p>
            {article && <Link to={article.permalink}>{en ? 'Read article →' : '开始阅读 →'}</Link>}
          </li>;
        })}</ol>
      </section>)}
    </main>
  </Layout>;
}
