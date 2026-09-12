import { uiLabel } from '@site/src/utils/ui-labels';
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
              {uiLabel(item.type === 'doc'
                ? {
                    'ai-apps': 'BUILD',
                    llm: 'UNDERSTAND',
                    'embodied-ai': 'EXPLORE',
                  }[item.domain] || 'DOC'
                : item.type.toUpperCase())}
            </p>
            <h2>
              <Link to={item.href}>{item.title}</Link>
            </h2>
            <p>{item.description}</p>
          </div>
          <div className="hh-row-meta">
            {item.date && <time dateTime={item.date}>{item.date}</time>}
            {item.minutes && <span>{item.minutes} {uiLabel("MIN")}</span>}
            {item.translationStatus === 'AI_TRANSLATED' && (
              <span>{uiLabel("AI TRANSLATED")}</span>
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
