import React, {useEffect, useState} from 'react';
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
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [saved, setSaved] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const steps = tracks.flatMap(track => track.steps);
  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem('hohoo-learning-v1') || '{}');
      const valid = value => Array.isArray(value) ? value.filter(id => steps.some(step => step.id === id)) : [];
      setSaved(valid(state?.saved)); setCompleted(valid(state?.completed));
    } catch { setStorageError(true); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem('hohoo-learning-v1', JSON.stringify({saved, completed})); }
    catch { setStorageError(true); }
  }, [saved, completed, ready]);
  const toggle = (id, setter) => setter(values => values.includes(id) ? values.filter(value => value !== id) : [...values, id]);
  const matches = step => (filter !== 'saved' || saved.includes(step.id)) &&
    (step.title + ' ' + step.en + ' ' + step.topic + ' ' + step.outcome + ' ' + step.outcomeEn).toLowerCase().includes(query.trim().toLowerCase());
  const visibleTracks = tracks.filter(track => !['applications', 'embodied'].includes(filter) || track.id === filter)
    .map(track => ({...track, steps: track.steps.filter(matches)})).filter(track => track.steps.length);
  const visible = visibleTracks.flatMap(track => track.steps);
  const finished = entries.filter(entry => completed.includes(entry.stepId)).length;
  const published = new Map(entries.map(entry => [entry.stepId, entry]));
  return <Layout title={en ? 'Reading paths' : '阅读路线'} description={en ? 'Two step-by-step learning paths for AI applications and embodied intelligence.' : 'AI 应用与 LLM、具身智能两条循序渐进的阅读路线。'}>
    <main className={styles.page}>
      <p className={styles.eyebrow}>LEARN WITH A DIRECTION</p>
      <h1>{en ? 'A starting point, and a next step.' : '知道从哪里开始，也知道下一步。'}</h1>
      <p className={styles.lead}>{en ? 'Follow the prerequisites at your own pace. Planned titles are not published articles; their reading times are editorial estimates, not practice durations.' : '按前置知识顺序阅读，不设固定完成日期。规划中的选题尚未发布，阅读时长为拟定篇幅的估计，不包含动手实践时间。'}</p>
      <LearningNavigation active="learning" en={en} />
      <section className={styles.toolbox} aria-label={en ? 'Your reading list' : '我的阅读清单'}>
        <div className={styles.meta}><strong>{en ? 'Your reading list' : '我的阅读清单'}</strong><span>{saved.length} {en ? 'saved' : '个想读'} · {finished}/{entries.length} {en ? 'published articles read' : '篇正式文章已读'}</span></div>
        <p>{storageError ? (en ? 'Browser storage is unavailable. Changes last for this visit only.' : '浏览器存储不可用，本次选择仅在当前页面保留。') : (en ? 'Saved on this browser only. Planned topics can be saved; only published articles can be marked as read.' : '清单只保存在当前浏览器。规划选题可以加入想读，正式发布后才能标记已读。')}</p>
        <label htmlFor="learning-search">{en ? 'Search topics' : '查找选题'}</label>
        <input id="learning-search" type="search" value={query} onChange={event => {setQuery(event.target.value); setSuggestion(null);}} placeholder={en ? 'Try Java, prompts or simulation' : '试试 Java、提示词、仿真'} />
        <div className={styles.controls}>{[['all', en ? 'All' : '全部'], ['applications', en ? 'AI & LLM' : 'AI 与 LLM'], ['embodied', en ? 'Embodied AI' : '具身智能'], ['saved', en ? 'Saved' : '只看想读']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => {setFilter(value); setSuggestion(null);}}>{label}</button>)}
          <button type="button" disabled={!visible.length} onClick={() => {
            const choices = visible.filter(step => step.id !== suggestion?.id);
            const pool = choices.length ? choices : visible;
            setSuggestion(pool[Math.floor(Math.random() * pool.length)]);
          }}>{en ? 'Surprise me ↗' : '随机探索 ↗'}</button>
        </div>
        <div aria-live="polite">{suggestion && <p className={styles.suggestion}><a href={'#step-' + suggestion.id}>{en ? suggestion.en : suggestion.title} →</a> · {published.has(suggestion.id) ? (en ? 'Published' : '已发布') : (en ? 'Planned topic' : '规划选题')}</p>}</div>
        <p role="status">{visible.length} {en ? 'topics match' : '个匹配选题'}</p>
      </section>
      {!visible.length && <div className={styles.empty}><h2>{en ? 'No matching topics yet' : '还没有匹配的选题'}</h2><p>{en ? 'Try another keyword or save a topic from All.' : '可以换个关键词，或回到全部选题添加想读内容。'}</p><button type="button" onClick={() => {setQuery(''); setFilter('all');}}>{en ? 'Show all topics' : '查看全部选题'}</button></div>}
      {visibleTracks.map(track => <section key={track.id} className={styles.track} aria-labelledby={track.id}>
        <h2 id={track.id}>{en ? track.en : track.title}</h2>
        <p className={styles.lead}>{en ? track.english : track.intro}</p>
        <ol className={styles.steps}>{track.steps.map((step, index) => {
          const article = published.get(step.id);
          return <li key={step.id} className={styles.card} id={'step-' + step.id}>
            <div className={styles.meta}><span>{en ? 'STAGE' : '阶段'} {tracks.find(item => item.id === track.id).steps.findIndex(item => item.id === step.id) + 1}</span><span>{article ? (en ? 'Published' : '已发布') : (en ? 'Planned' : '规划中')}</span></div>
            <h3>{article ? <Link to={article.permalink}>{article.title}</Link> : (en ? step.en : step.title)}</h3>
            <dl><dt>{en ? 'Level' : '难度'}</dt><dd>{en ? (tracks.find(item => item.id === track.id).steps.findIndex(item => item.id === step.id) < 2 ? 'Introductory' : 'Practice') : (index < 2 ? '入门' : '实践')}</dd>
              <dt>{en ? 'Prerequisites' : '前置知识'}</dt><dd>{en ? step.prerequisiteEn : step.prerequisite}</dd>
              <dt>{en ? (article ? 'Reading time' : 'Planned reading time') : (article ? '预计阅读时间' : '计划阅读时间')}</dt><dd>{article?.minutes || step.minutes} {en ? 'min' : '分钟'}</dd></dl>
            <p>{en ? step.outcomeEn : step.outcome}</p>
            <div className={styles.controls}>
              <button type="button" disabled={!ready} aria-pressed={saved.includes(step.id)} onClick={() => toggle(step.id, setSaved)}>{saved.includes(step.id) ? (en ? 'Saved ✓' : '已加入想读 ✓') : (en ? 'Save for later' : '加入想读')}</button>
              {article && <label><input type="checkbox" disabled={!ready} checked={completed.includes(step.id)} onChange={() => toggle(step.id, setCompleted)} /> {en ? 'Read' : '已读'}</label>}
            </div>
            {article && <Link to={article.permalink}>{en ? 'Read article →' : '开始阅读 →'}</Link>}
          </li>;
        })}</ol>
      </section>)}
    </main>
  </Layout>;
}
