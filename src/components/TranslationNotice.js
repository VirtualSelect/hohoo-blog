import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import Link from '@docusaurus/Link';
import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import manifest from '@generated/translation-check/default/manifest.json';
import { translationStatus } from '../utils/localization.cjs';
export default function TranslationNotice({ id, original }) {
  const { i18n } = useDocusaurusContext();
  const meta = manifest[id];
  const status = translationStatus(meta, i18n.currentLocale);
  return (
    <aside
      className="hh-translation"
      aria-label={translate({
        id: 'translation.label',
        message: '内容语言',
      })}>
      <span className="hh-eyebrow">{uiLabel(status.replace('_', ' '))}</span>
      {status === 'MISSING' ? (
        <p>
          {translate({
            id: 'translation.missing',
            message: '此内容目前仅提供简体中文。',
          })}{' '}
          <Link to={'https://huhohoo.com' + original} autoAddBaseUrl={false}>
            {translate({
              id: 'translation.original',
              message: '阅读原文',
            })}{' '}
            →
          </Link>
        </p>
      ) : status !== 'ORIGINAL' ? (
        <p>
          {status === 'REVIEWED'
            ? uiLabel('REVIEWED') + ' · '
            : translate({
                id: 'translation.ai',
                message: '译自简体中文，AI 翻译，尚未经过人工译文审阅。',
              })}
          {meta?.translations?.[i18n.currentLocale]?.translatedAt && (
            <span className="hh-meta">
              {' '}
              · {meta.translations[i18n.currentLocale].translatedAt}
            </span>
          )}
          {status === 'OUTDATED' &&
            ' ' +
              translate({
                id: 'translation.outdated',
                message: '原文已更新，译文待同步。',
              })}{' '}
          <Link to={'https://huhohoo.com' + original} autoAddBaseUrl={false}>
            {translate({
              id: 'translation.original',
              message: '阅读原文',
            })}{' '}
            →
          </Link>
        </p>
      ) : null}
    </aside>
  );
}
