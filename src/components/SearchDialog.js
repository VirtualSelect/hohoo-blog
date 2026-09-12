import React, { useEffect, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import index from '@generated/search-index/default/index.json';
import navigation from '@site/data/navigation.cjs';
import { useEnglish } from './ContentUI';
import { searchEntries, searchGroup } from '@site/src/utils/search.mjs';
export default function SearchDialog({ onClose }) {
  const en = useEnglish(),
    dialog = useRef(null),
    input = useRef(null),
    [query, setQuery] = useState('');
  const results = query.trim() ? searchEntries(index, query) : [];
  useEffect(() => {
    dialog.current.showModal();
    input.current.focus();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="hh-search-dialog"
      aria-labelledby="site-search-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="hh-search-inner">
        <header>
          <h2 id="site-search-title">
            {en ? 'Search the Lab' : '搜索 AI Lab'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={en ? 'Close search' : '关闭搜索'}>
            Esc ×
          </button>
        </header>
        <label htmlFor="site-search" className="hh-meta">
          {en
            ? 'Title, summary, type:paper or topic:embodied'
            : '标题、摘要，或 type:paper / topic:embodied'}
        </label>
        <input
          ref={input}
          id="site-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <p role="status" className="hh-meta">
          {query.trim()
            ? `${results.length} ${en ? 'results' : '条结果'}`
            : en
              ? 'QUICK NAVIGATION'
              : '快捷导航'}
        </p>
        {!query.trim() ? (
          <nav
            className="hh-quick-nav"
            aria-label={en ? 'Quick navigation' : '快捷导航'}>
            {Object.entries(navigation.links)
              .filter(([id]) => id !== 'rss')
              .map(([id, l]) => (
                <Link key={id} to={l.to} onClick={onClose}>
                  {en ? l.en : l.label} →
                </Link>
              ))}
          </nav>
        ) : results.length ? (
          <div>
            {['KNOWLEDGE', 'BUILD', 'DISCOVER', 'SHARE'].map((g) => {
              const rows = results.filter((e) => searchGroup(e.type) === g);
              return rows.length ? (
                <section key={g}>
                  <h3 className="hh-eyebrow">{g}</h3>
                  <ul className="hh-search-results">
                    {rows.map((r) => (
                      <li key={r.id}>
                        <Link to={r.href} onClick={onClose}>
                          <small>
                            {r.type.toUpperCase()} · {r.status?.toUpperCase()}
                          </small>
                          <strong>{r.title}</strong>
                          <span>{r.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null;
            })}
          </div>
        ) : (
          <p className="hh-empty">
            {en
              ? 'No results. Try another term or remove filters.'
              : '没有匹配内容。试试其他关键词或移除筛选条件。'}
          </p>
        )}
        <p className="hh-meta">
          {en
            ? 'Searches titles and summaries. Tab to navigate, Enter to open, Esc to close.'
            : '搜索标题与摘要。Tab 切换，Enter 打开，Esc 关闭。'}
        </p>
      </div>
    </dialog>
  );
}
