import { translate } from '@docusaurus/Translate';
import React from 'react';
import Link from '@docusaurus/Link';
import { useEnglish } from '@site/src/components/ContentUI';
export default function NotFoundContent() {
  const en = useEnglish();
  return (
    <main className="hh-page hh-reading">
      <p className="hh-eyebrow">404 / LOST SIGNAL</p>
      <h1>
        {en
          ? 'This signal has gone quiet.'
          : translate({
              id: 'ui.aede70ae3f',
              message:
                '\u8FD9\u4E2A\u94FE\u63A5\uFF0C\u6682\u65F6\u5931\u8054\u4E86\u3002',
            })}
      </h1>
      <p className="hh-lead">
        {en
          ? 'Try a search or pick up a learning path.'
          : translate({
              id: 'ui.b3ec0ae3b7',
              message:
                '\u8BD5\u7740\u641C\u7D22\u5173\u952E\u8BCD\uFF0C\u6216\u6CBF\u7740\u5B66\u4E60\u8DEF\u7EBF\u7EE7\u7EED\u63A2\u7D22\u3002',
            })}
      </p>
      <div className="hh-controls">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('hohoo-search'))}>
          {en
            ? 'Search'
            : translate({
                id: 'ui.f04090805c',
                message: '\u641C\u7D22',
              })}{' '}
          →
        </button>
        <Link to="/learning">Learning Path →</Link>
        <Link to="/radar">AI Radar →</Link>
      </div>
    </main>
  );
}
