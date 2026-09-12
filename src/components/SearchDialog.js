import { translate } from '@docusaurus/Translate';
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
            {en
              ? 'Search the Lab'
              : translate({
                  id: 'ui.dd90256c10',
                  message: '\u641C\u7D22 AI Lab',
                })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={
              en
                ? 'Close search'
                : translate({
                    id: 'ui.e40a06c88b',
                    message: '\u5173\u95ED\u641C\u7D22',
                  })
            }>
            Esc ×
          </button>
        </header>
        <label htmlFor="site-search" className="hh-meta">
          {en
            ? 'Title, summary, type:paper or topic:embodied'
            : translate({
                id: 'ui.f7918b483b',
                message:
                  '\u6807\u9898\u3001\u6458\u8981\uFF0C\u6216 type:paper / topic:embodied',
              })}
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
            ? `${results.length} ${
                en
                  ? 'results'
                  : translate({
                      id: 'ui.1e302c4ffd',
                      message: '\u6761\u7ED3\u679C',
                    })
              }`
            : en
              ? 'QUICK NAVIGATION'
              : translate({
                  id: 'ui.84fd7b2484',
                  message: '\u5FEB\u6377\u5BFC\u822A',
                })}
        </p>
        {!query.trim() ? (
          <nav
            className="hh-quick-nav"
            aria-label={
              en
                ? 'Quick navigation'
                : translate({
                    id: 'ui.84fd7b2484',
                    message: '\u5FEB\u6377\u5BFC\u822A',
                  })
            }>
            {Object.entries(navigation.links)
              .filter(([id]) =>
                ['articles', 'learning', 'build', 'radar', 'about'].includes(
                  id,
                ),
              )
              .map(([id, l]) => (
                <Link key={id} to={l.to} onClick={onClose}>
                  {translate({ id: 'nav.' + id, message: l.label })} →
                </Link>
              ))}
          </nav>
        ) : results.length ? (
          <div>
            {['WRITING', 'BUILD', 'DISCOVER'].map((g) => {
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
              : translate({
                  id: 'ui.65a937e71a',
                  message:
                    '\u6CA1\u6709\u5339\u914D\u5185\u5BB9\u3002\u8BD5\u8BD5\u5176\u4ED6\u5173\u952E\u8BCD\u6216\u79FB\u9664\u7B5B\u9009\u6761\u4EF6\u3002',
                })}
          </p>
        )}
        <p className="hh-meta">
          {en
            ? 'Searches titles and summaries. Tab to navigate, Enter to open, Esc to close.'
            : translate({
                id: 'ui.db35da5bf4',
                message:
                  '\u641C\u7D22\u6807\u9898\u4E0E\u6458\u8981\u3002Tab \u5207\u6362\uFF0CEnter \u6253\u5F00\uFF0CEsc \u5173\u95ED\u3002',
              })}
        </p>
      </div>
    </dialog>
  );
}
