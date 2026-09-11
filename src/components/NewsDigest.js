import ReadingActions from '@site/src/components/ReadingActions';
import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import news from '@site/data/news/items.json';
import {localizedNews} from '@site/src/utils/news-locale.mjs';

export default function NewsDigest({day}) {
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const en = currentLocale === 'en';
  return <section>
    <p>{en ? 'Reviewed source excerpts, grouped by collection date (UTC).' : '按采集日期（UTC）汇总已审核资讯，原文日期单独标注。'}</p>
    <Link to="/news">{en ? 'All AI news' : '返回资讯列表'}</Link>
    {news.filter(item => item.collectedAt.startsWith(day)).map(item => {
      const content = localizedNews(item, currentLocale);
      return <article key={item.id}>
        <h2>{content.title}</h2>
        <p>{item.sourceName} · <time dateTime={item.publishedAt}>{item.publishedAt.slice(0, 10)}</time></p>
        <p>{content.summary}</p>
        <small>{content.fallback ? (en ? 'Original text · Translation unavailable' : '原文内容 · 暂无该语言译文') : (en ? 'AI-assisted translation · Check the source' : 'AI 辅助翻译 · 请核对原文')}</small>
        <p><a href={item.url} target="_blank" rel="noopener noreferrer">{en ? 'Read original ↗' : '阅读原文 ↗'}</a></p>
      <ReadingActions id={item.id} en={en}/></article>;
    })}
  </section>;
}
