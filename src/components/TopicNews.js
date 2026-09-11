import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import news from '@site/data/news/items.json';

export default function TopicNews({category}) {
  const en = useDocusaurusContext().i18n.currentLocale === 'en';
  const items = news.filter(item => item.category === category)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6);
  return <section aria-label={en ? 'Related news' : '相关资讯'}>
    <h2>{en ? 'Related news' : '相关资讯'}</h2>
    <p>{en ? 'Reviewed updates from external sources.' : '这里展示已审核发布的外部资讯，保留来源与原文入口。'}</p>
    {items.length ? items.map(item => <article key={item.id} style={{borderBottom: '1px solid var(--ifm-color-emphasis-200)', padding: '1rem 0'}}>
      <small>{item.sourceName} · <time dateTime={item.publishedAt}>{item.publishedAt.slice(0, 10)}</time></small>
      <h3><a href={item.url} target="_blank" rel="noopener noreferrer">{en ? item.title : item.titleZh || item.title} ↗</a></h3>
      {item.summary && <p>{item.summary}</p>}
      <small>{item.summaryKind === 'ai-summary' ? (en ? 'AI-assisted summary' : 'AI 辅助摘要') : (en ? 'Original source' : '原始来源摘录或链接')}</small>
    </article>) : <p>{en ? 'No reviewed news in this topic yet.' : '该方向暂时没有已审核发布的资讯。采集内容通过审核并发布后，会自动出现在这里。'}</p>}
    <p><Link to="/news">{en ? 'Browse all AI news →' : '浏览全部 AI 资讯 →'}</Link></p>
  </section>;
}
