import ReadingActions from '@site/src/components/ReadingActions';
import {localizedNews} from '@site/src/utils/news-locale.mjs';
import React, {useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import news from '@site/data/news/items.json';
import config from '@site/config/news-sources.json';
import styles from './news.module.css';
const names = {'ai-apps':['AI 应用开发','AI applications'],llm:['LLM 分享','LLMs'],'embodied-ai':['具身智能','Embodied AI']};
const pageSize = 12;
export default function News() {
  const en = useDocusaurusContext().i18n.currentLocale === 'en';
  const t = (zh, english) => en ? english : zh;
  const [category, setCategory] = useState('all');
  const [source, setSource] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const filtered = [...news].sort((a,b) => b.publishedAt.localeCompare(a.publishedAt)).filter(item =>
    (category === 'all' || item.category === category) && (source === 'all' || item.sourceId === source) &&
    [item.title,item.titleZh,item.summary,...Object.values(item.translations || {}).flatMap(value => [value.title,value.summary])].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  return <Layout title={t('AI 资讯','AI news')} description={t('来自官方来源的 AI 应用、大语言模型与具身智能资讯，附短摘要与原文入口。','AI news from official sources, with short summaries and original links.')}>
    <main className={styles.page}>
      <p className={styles.eyebrow}>AI / NEWS DESK</p>
      <p><Link to="/news/weekly">{t('每周阅读汇总','Weekly reading')}</Link>{' · '}<Link to="/lab">{t('项目实验室','Project lab')}</Link></p>
      <h1>{t('关注变化，也保留出处。','Follow the news. Keep the source.')}</h1>
      <p className={styles.lead}>{t('精选 AI 应用、大语言模型与具身智能资讯。这里整理外部消息，与本站的原创文章和学习记录分开呈现。','Selected news on AI applications, LLMs and embodied intelligence, separate from personal articles and learning notes.')}</p>
      <details className={styles.sources}><summary>{t('来源与整理方式','Sources and editorial approach')}</summary>
        <p>{t('从官方 RSS 收集，由人工审核后发布。摘要可能是来源摘录或 AI 辅助整理，均在条目中标明；请以原文为准。排序使用原文发布日期，日报使用采集日期（UTC）。','Collected from official RSS feeds and reviewed before publication. Each entry identifies a source excerpt or AI-assisted summary. Original sources take precedence. Entries use source dates; digests use collection dates in UTC.')}</p>
        <ul>{config.sources.filter(item=>item.enabled).map(item=><li key={item.id}><a href={item.feed} target="_blank" rel="noopener noreferrer">{item.name} RSS ↗</a></li>)}</ul>
      </details>
      <section className={styles.filters} aria-label={t('筛选资讯','Filter news')}>
        <label>{t('方向','Topic')}<select value={category} onChange={event=>{setCategory(event.target.value);setPage(1);}}><option value="all">{t('全部方向','All topics')}</option>{Object.entries(names).map(([id,labels])=><option key={id} value={id}>{labels[en?1:0]}</option>)}</select></label>
        <label>{t('来源','Source')}<select value={source} onChange={event=>{setSource(event.target.value);setPage(1);}}><option value="all">{t('全部来源','All sources')}</option>{config.sources.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className={styles.search}>{t('关键词','Keyword')}<input type="search" placeholder={t('搜索标题或摘要','Search titles or summaries')} value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}} /></label>
      </section>
      <p className={styles.count} role="status">{filtered.length} {t('条资讯','entries')}</p>
      {filtered.length ? <div className={styles.list}>{filtered.slice((current-1)*pageSize,current*pageSize).map(item=><article className={styles.card} key={item.id}>
        <div className={styles.meta}><span>{names[item.category][en?1:0]}</span><span>{item.sourceName}</span><time dateTime={item.publishedAt}>{item.publishedAt.slice(0,10)}</time></div>
        {localizedNews(item, en ? 'en' : 'zh').fallback && <small>{en ? 'Original text · Translation unavailable' : '暂无译文，显示原文'}</small>}<h2><a href={item.url} target="_blank" rel="noopener noreferrer">{localizedNews(item, en ? 'en' : 'zh').title} ↗</a></h2>
        {!en && item.titleZh && <p className={styles.original}>{item.title}</p>}
        <p>{localizedNews(item, en ? 'en' : 'zh').summary || t('来源未提供摘要，请阅读原文。','No excerpt was provided. Read the original article.')}</p>
        <div className={styles.bottom}><span>{item.summaryKind === 'ai-summary' ? t('AI 辅助摘要 · 请核对原文','AI-assisted summary · Check the source') : item.summaryKind === 'source-excerpt' ? t('来源短摘录','Source excerpt') : t('原文链接','Source link')}</span><Link to={'/news/daily/'+item.collectedAt.slice(0,10)}>{t('查看当日汇总','Daily digest')} →</Link></div>
      <ReadingActions id={item.id} en={en}/></article>)}</div> : <section className={styles.empty}><h2>{news.length ? t('没有匹配的资讯','No matching entries') : t('第一期资讯，等待与你见面。','The first edition is on its way.')}</h2><p>{news.length ? t('换个关键词，或清除筛选条件试试。','Try another keyword or clear your filters.') : t('正在准备来源与审核流程。正式内容通过审核后会出现在这里。','Sources and the review process are being prepared. Entries will appear here after review.')}</p>{news.length > 0 && <button type="button" onClick={()=>{setCategory('all');setSource('all');setQuery('');setPage(1);}}>{t('清除筛选','Clear filters')}</button>}</section>}
      {pages > 1 && <nav className={styles.pagination} aria-label={t('资讯分页','News pagination')}><button disabled={current===1} onClick={()=>setPage(current-1)}>{t('上一页','Previous')}</button><span>{current} / {pages}</span><button disabled={current===pages} onClick={()=>setPage(current+1)}>{t('下一页','Next')}</button></nav>}
    </main>
  </Layout>;
}
