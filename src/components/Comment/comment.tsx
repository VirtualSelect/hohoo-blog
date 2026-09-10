import React from 'react';
import Giscus, {GiscusProps} from '@giscus/react';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useColorMode, useThemeConfig} from '@docusaurus/theme-common';

type CommentConfig = Pick<GiscusProps, 'repo' | 'repoId' | 'category' | 'categoryId'>;

export default function Comment(): JSX.Element | null {
  const {giscus} = useThemeConfig() as unknown as {giscus?: CommentConfig};
  const {colorMode} = useColorMode();
  const {pathname} = useLocation();
  const {i18n} = useDocusaurusContext();
  if (!giscus?.repo || !giscus.repoId || !giscus.categoryId) return null;

  const segments = pathname.split('/').filter(Boolean);
  if (i18n.locales.includes(segments[0])) segments.shift();
  // The existing about page used "index". Preserve its discussion history.
  const term = segments.join('/') === 'aboutMe' ? 'index' : segments.join('/') || 'home';

  return <Giscus
    repo={giscus.repo} repoId={giscus.repoId}
    category={giscus.category} categoryId={giscus.categoryId}
    id="comments" mapping="specific" term={term} strict="1"
    reactionsEnabled="1" emitMetadata="0" inputPosition="top" loading="lazy"
    lang={i18n.currentLocale === 'en' ? 'en' : 'zh-CN'}
    theme={colorMode === 'dark' ? 'transparent_dark' : 'light'}
  />;
}
