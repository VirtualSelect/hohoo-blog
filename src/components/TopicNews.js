import ReadingActions from '@site/src/components/ReadingActions';
import { localizedNews } from '@site/src/utils/news-locale.mjs';
import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import news from '@site/data/news/items.json';

export default function TopicNews({ category }) {
  const en = useDocusaurusContext().i18n.currentLocale === 'en';
  const items = news
    .filter((item) => item.category === category)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);
  return (
    <section aria-label={en ? 'Related news' : '相关资讯'}>
      <h2>{en ? 'Related news' : '相关资讯'}</h2>
      <p>
        {en
          ? 'Published updates from external sources.'
          : '这里展示已发布的外部资讯，保留来源与原文入口。'}
      </p>
      {items.length ? (
        items.map((item) => (
          <article
            key={item.id}
            style={{
              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
              padding: '1rem 0',
            }}>
            <small>
              {item.sourceName} ·{' '}
              <time dateTime={item.publishedAt}>
                {item.publishedAt.slice(0, 10)}
              </time>
            </small>
            {localizedNews(item, en ? 'en' : 'zh').fallback && (
              <small>
                {en
                  ? 'Original text · Translation unavailable'
                  : '暂无译文，显示原文'}
              </small>
            )}
            <h3>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {localizedNews(item, en ? 'en' : 'zh').title} ↗
              </a>
            </h3>
            {localizedNews(item, en ? 'en' : 'zh').summary && (
              <p>{localizedNews(item, en ? 'en' : 'zh').summary}</p>
            )}
            <small>
              {item.summaryKind === 'ai-summary'
                ? en
                  ? 'AI-assisted summary'
                  : 'AI 辅助摘要'
                : en
                  ? 'Original source'
                  : '原始来源摘录或链接'}
            </small>
            <ReadingActions id={item.id} en={en} compact />
          </article>
        ))
      ) : (
        <p>{en ? 'No published news in this topic yet.' : '暂无相关信号。'}</p>
      )}
      <p>
        <Link to="/radar">
          {en ? 'Browse all AI news →' : '浏览全部 AI 资讯 →'}
        </Link>
      </p>
    </section>
  );
}
