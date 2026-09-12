import React from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
export default function StructuredData({ entry, person = false }) {
  const { siteConfig, i18n } = useDocusaurusContext();
  const base = siteConfig.url.replace(/\/$/, ''),
    prefix = i18n.currentLocale === 'en' ? '/en' : '';
  const data = person
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Hohoo',
        url: base + prefix + '/about',
        sameAs: [
          'https://github.com/VirtualSelect',
          'https://x.com/HuHohoo1997',
        ],
      }
    : {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'SoftwareSourceCode',
            name: entry.title,
            description: entry.description,
            codeRepository: entry.repo,
            url: base + entry.href,
            ...(entry.updated ? { dateModified: entry.updated } : {}),
            ...(entry.programmingLanguages
              ? { programmingLanguage: entry.programmingLanguages }
              : {}),
            ...(entry.runtimePlatform
              ? { runtimePlatform: entry.runtimePlatform }
              : {}),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Projects',
                item: base + prefix + '/projects',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: entry.title,
                item: base + entry.href,
              },
            ],
          },
        ],
      };
  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(data).replace(/</g, '\\u003c')}
      </script>
    </Head>
  );
}
