import TranslationNotice from '@site/src/components/TranslationNotice';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import manifest from '@generated/translation-check/default/manifest.json';
import { translationStatus } from '@site/src/utils/localization.cjs';
import React from 'react';
import OriginalContent from '@theme-original/DocItem/Content';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import DocReadingContext from '@site/src/components/DocReadingContext';
export default function Content(props) {
  const { frontMatter, metadata } = useDoc();
  const locale = useDocusaurusContext().i18n.currentLocale;
  const id = 'doc:' + metadata.id;
  const original = metadata.permalink.replace(/^\/(en|zh-TW)(?=\/)/, '');
  const missing =
    !frontMatter.landing &&
    locale !== 'zh-CN' &&
    translationStatus(manifest[id], locale) === 'MISSING';
  return (
    <OriginalContent {...props}>
      {!frontMatter.landing && !missing && (
        <DocReadingContext position="header" />
      )}
      {!frontMatter.landing && (
        <TranslationNotice id={id} original={original} />
      )}
      {!missing && props.children}
      {!frontMatter.landing && !missing && (
        <DocReadingContext position="footer" />
      )}
    </OriginalContent>
  );
}
