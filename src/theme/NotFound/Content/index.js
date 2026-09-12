import React from 'react';
import Link from '@docusaurus/Link';
import { useEnglish } from '@site/src/components/ContentUI';
export default function NotFoundContent() {
  const en = useEnglish();
  return (
    <main className="hh-page hh-reading">
      <p className="hh-eyebrow">404 / LOST SIGNAL</p>
      <h1>{en ? 'This signal has gone quiet.' : '这个链接，暂时失联了。'}</h1>
      <p className="hh-lead">
        {en
          ? 'Try a search or pick up a learning path.'
          : '试着搜索关键词，或沿着学习路线继续探索。'}
      </p>
      <div className="hh-controls">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('hohoo-search'))}>
          {en ? 'Search' : '搜索'} →
        </button>
        <Link to="/learning">Learning Path →</Link>
        <Link to="/radar">AI Radar →</Link>
      </div>
    </main>
  );
}
