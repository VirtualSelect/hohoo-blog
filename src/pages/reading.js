import papers from '@site/data/papers.json';
import React, {useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import news from '@site/data/news/items.json';
import {localizedNews} from '@site/src/utils/news-locale.mjs';
import ReadingActions, {useNewsReading} from '@site/src/components/ReadingActions';
import styles from './news.module.css';

export default function Reading() {
  const locale=useDocusaurusContext().i18n.currentLocale;
  const en=locale==='en';
  const state=useNewsReading();
  const [filter,setFilter]=useState('unread');
  const paperItems=papers.map(p=>({id:p.id,title:p.title,url:p.url,sourceName:en?'Paper':'论文',publishedAt:String(p.year),translations:{zh:{title:p.title,summary:p.zh.question},en:{title:p.title,summary:p.en.question}}}));
  const items=[...news,...paperItems].filter(item=>state.saved.includes(item.id) && (filter==='all' || (filter==='read')===state.read.includes(item.id)));
  return <Layout title={en?'Saved reading':'稍后读'}><main className={styles.page}>
    <h1>{en?'Keep a reading queue.':'留下值得继续读的内容。'}</h1>
    <p>{en?'Saved in this browser, shared between language versions. Opening a source does not mark it as read.':'收藏保存在当前浏览器，中英文页面共用。打开原文不会自动标记已读。'}</p>
    <p><Link to="/learning">{en?'Planned learning topics →':'查看学习选题清单 →'}</Link></p>
    <label>{en?'Show':'查看'} <select value={filter} onChange={event=>setFilter(event.target.value)}>
      <option value="unread">{en?'Unread saved entries':'未读收藏'}</option><option value="all">{en?'All saved entries':'全部收藏'}</option><option value="read">{en?'Read saved entries':'已读收藏'}</option>
    </select></label>
    <p role="status">{state.ready ? `${items.length} ${en?'entries':'条内容'}` : (en?'Loading saved entries…':'正在读取收藏…')}</p>
    {state.error && <p role="status">{en?'Browser storage is unavailable. Your selections may not survive a reload.':'浏览器存储不可用，刷新后可能无法保留选择。'}</p>}
    {state.ready && !items.length && <section className={styles.empty}><h2>{en?'Nothing here yet.':'当前清单暂无内容。'}</h2><Link to="/news">{en?'Find something to read →':'去资讯板块挑选内容 →'}</Link></section>}
    {items.map(item=>{const content=localizedNews(item,locale);return <article key={item.id} className={styles.card}>
      <small>{item.sourceName} · {item.publishedAt.slice(0,10)}</small><h2><a href={item.url} target="_blank" rel="noopener noreferrer">{content.title} ↗</a></h2><p>{content.summary}</p>
      <ReadingActions id={item.id} en={en}/>
    </article>;})}
  </main></Layout>;
}
