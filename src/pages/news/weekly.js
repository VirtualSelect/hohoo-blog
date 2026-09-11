import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import news from '@site/data/news/items.json';
import {localizedNews} from '@site/src/utils/news-locale.mjs';
import styles from '../news.module.css';

export default function Weekly() {
  const locale = useDocusaurusContext().i18n.currentLocale;
  const en = locale === 'en';
  const groups = new Map();
  for (const item of [...news].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt))) {
    const date = new Date(item.publishedAt);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay()+6)%7);
    const week = date.toISOString().slice(0,10);
    if (!groups.has(week)) groups.set(week, []);
    groups.get(week).push(item);
  }
  const names = {'ai-apps':en?'AI applications':'AI 应用开发',llm:en?'LLMs':'LLM 分享','embodied-ai':en?'Embodied AI':'具身智能'};
  return <Layout title={en ? 'Weekly reading' : '每周阅读汇总'}><main className={styles.page}>
    <h1>{en ? 'A week of reading, by topic.' : '每周阅读，按方向回顾。'}</h1>
    <p>{en ? 'Published entries grouped by original publication week (Monday, UTC). A reading index, without generated trend claims.' : '按原文发布周（UTC，周一开始）与研究方向整理已发布资讯，方便回顾。这里只汇总阅读线索，不自动编写趋势结论。'}</p>
    {!groups.size && <p>{en ? 'No published entries yet.' : '暂无已发布的资讯。'}</p>}
    {[...groups].map(([week,items])=><section key={week} className={styles.card}>
      <h2>{week} {en ? '· Week of' : '起的一周'}</h2>
      {Object.entries(names).filter(([category])=>items.some(item=>item.category===category)).map(([category,name])=><div key={category}>
        <h3>{name}</h3><ul>{items.filter(item=>item.category===category).map(item=><li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer">{localizedNews(item,locale).title} ↗</a>{' · '}{item.sourceName}</li>)}</ul>
      </div>)}
    </section>)}
    <Link to="/news">{en ? 'All news →' : '返回资讯列表 →'}</Link>
  </main></Layout>;
}
