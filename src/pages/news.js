import React, {useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import ReadingActions, {useNewsReading} from '@site/src/components/ReadingActions';
import {localizedNews} from '@site/src/utils/news-locale.mjs';
import {timelineGroups} from '@site/src/utils/news-timeline.mjs';
import news from '@site/data/news/items.json';
import config from '@site/config/news-sources.json';
import styles from './news-timeline.module.css';
const names={'ai-apps':['AI 应用','AI apps'],llm:['LLM','LLM'],'embodied-ai':['具身智能','Embodied AI']};
export default function News(){
  const en=useDocusaurusContext().i18n.currentLocale==='en';const t=(zh,english)=>en?english:zh;
  const [category,setCategory]=useState('all');const [source,setSource]=useState('all');const [query,setQuery]=useState('');const [limit,setLimit]=useState(12);const [mode,setMode]=useState('day');
  const reading=useNewsReading();
  const filtered=news.filter(item=>(category==='all'||item.category===category)&&(source==='all'||item.sourceId===source)&&[item.title,item.summary,...Object.values(item.translations||{}).flatMap(v=>[v.title,v.summary])].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const reset=()=>{setCategory('all');setSource('all');setQuery('');setLimit(12);};
  return <Layout title={t('AI 资讯','AI news')} description={t('按时间浏览 AI 应用、LLM 与具身智能的精选资讯摘要。','A timeline of selected AI applications, LLM and embodied intelligence news.')}><main className={styles.page}>
    <header className={styles.header}><h1>{t('AI 资讯','AI news')}</h1><nav className={styles.tools} aria-label={t('阅读工具','Reading tools')}><Link to="/reading">{t('稍后读','Saved')}</Link><Link to="/subscribe">RSS ↗</Link></nav></header>
    <p className={styles.lead}>{t('关注值得深入的变化，留下继续阅读的线索。','Follow meaningful changes. Keep a path to the source.')}</p>
    <section className={styles.filters} aria-label={t('资讯筛选','Filter news')}>
      {[['all',[t('全部','All'),t('全部','All')]],...Object.entries(names)].map(([id,labels])=><button key={id} type="button" aria-pressed={category===id} onClick={()=>{setCategory(id);setLimit(12);}}>{labels[en?1:0]}</button>)}
      <label><input aria-label={t('搜索资讯','Search news')} type="search" placeholder={t('搜索标题或摘要…','Search news…')} value={query} onChange={e=>{setQuery(e.target.value);setLimit(12);}}/></label>
    </section>
    <details className={styles.extra}><summary>{t('来源筛选与整理说明','Sources and editorial approach')}{source!=='all'?' · '+config.sources.find(s=>s.id===source)?.name:''}</summary>
      <label>{t('来源','Source')}<select value={source} onChange={e=>{setSource(e.target.value);setLimit(12);}}><option value="all">{t('全部来源','All sources')}</option>{config.sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <p>{t('优先收集 AIHOT 聚合摘要，其他来源补充。通过研究主题规则与构建检查后自动发布，不代表独立事实核验。日期按订阅源提供的发布时间（UTC）分组；来源页可继续访问原始出处。','AIHOT summaries are prioritized, with other sources as supplements. Automated topic and build checks are not independent fact verification. Dates use feed publication timestamps in UTC. Aggregation pages link onward to original reporting.')}</p>
    </details>
    <div className={styles.metaBar}><p role="status">{filtered.length} {t('条资讯','entries')} · UTC</p><div className={styles.mode} aria-label={t('时间分组','Date grouping')}>{['day','week'].map(value=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>{setMode(value);setLimit(12);}}>{value==='day'?t('按日','Daily'):t('按周','Weekly')}</button>)}</div></div>
    {timelineGroups(filtered,limit,mode).map(([date,items])=><section key={date} className={styles.group} aria-label={date}>
      <div className={styles.date}><time dateTime={date}>{date.slice(5).replace('-', ' / ')}</time><small>{date.slice(0,4)}{mode==='week'?t(' · 周起始',' · Week of'):''}</small></div>
      <div className={styles.entries}>{items.map(item=>{const content=localizedNews(item,en?'en':'zh');const aggregator=config.sources.find(s=>s.id===item.sourceId)?.aggregator;return <article className={styles.entry} data-read={reading.read.includes(item.id)} key={item.id}>
        <h2><a href={item.url} target="_blank" rel="noopener noreferrer">{content.title}</a></h2>
        {content.summary&&<p>{content.summary}</p>}
        <div className={styles.entryFooter}><span>{item.sourceName} · {names[item.category][en?1:0]}</span>{item.summaryKind==='ai-summary'&&<span>{t('AI 辅助摘要','AI-assisted summary')}</span>}
          <a href={item.url} target="_blank" rel="noopener noreferrer">{aggregator?t('来源页 ↗','Source page ↗'):t('原文 ↗','Original ↗')}</a><ReadingActions id={item.id} en={en} compact/>
        </div>
      </article>;})}</div>
    </section>)}
    {!filtered.length&&<section className={styles.empty}><p>{t('当前没有匹配的资讯。','No matching entries.')}</p><button type="button" onClick={reset}>{t('清除筛选','Clear filters')}</button></section>}
    {limit<filtered.length&&<button type="button" className={styles.more} onClick={()=>setLimit(v=>v+12)}>{t('加载更多','Load more')} · {Math.min(12,filtered.length-limit)}</button>}
  </main></Layout>;
}
