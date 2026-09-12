import React from 'react';
import Link from '@docusaurus/Link';
import { translate } from '@docusaurus/Translate';
export default function WritingList({ items }) {
  return items.length ? (
    <ol className="hh-rows hh-writing-list">
      {items.map((item, index) => (
        <li key={item.id}>
          <div>
            <p className="hh-eyebrow">
              {String(index + 1).padStart(2, '0')} /{' '}
              {item.type === 'doc'
                ? {
                    'ai-apps': 'BUILD',
                    llm: 'UNDERSTAND',
                    'embodied-ai': 'EXPLORE',
                  }[item.domain] || 'DOC'
                : item.type.toUpperCase()}
            </p>
            <h2>
              <Link to={item.href}>{item.title}</Link>
            </h2>
            <p>{item.description}</p>
          </div>
          <div className="hh-row-meta">
            {item.date && <time dateTime={item.date}>{item.date}</time>}
            {item.minutes && <span>{item.minutes} MIN</span>}
            {item.translationStatus === 'AI_TRANSLATED' && (
              <span>AI TRANSLATED</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <p className="hh-empty">
      {translate({
        id: 'writing.empty',
        message: '当前语言暂无匹配的已发布内容。',
      })}
    </p>
  );
}
