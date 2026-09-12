import React from 'react';
import OriginalContent from '@theme-original/BlogPostItem/Content';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import manifest from '@generated/translation-check/default/manifest.json';
import { translationStatus } from '@site/src/utils/localization.cjs';
import TranslationNotice from '@site/src/components/TranslationNotice';
export default function Content(props) {
  const { metadata } = useBlogPost();
  const locale = useDocusaurusContext().i18n.currentLocale;
  const original = metadata.permalink.replace(/^\/(en|zh-TW)(?=\/)/, '');
  const id =
    'blog:' +
    (metadata.frontMatter.slug || original.split('/').filter(Boolean).pop());
  const status = translationStatus(manifest[id], locale);
  return (
    <OriginalContent {...props}>
      {locale !== 'zh-CN' && <TranslationNotice id={id} original={original} />}
      {status !== 'MISSING' && props.children}
    </OriginalContent>
  );
}
