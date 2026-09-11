import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
export default function LegacyRedirect({ to }) {
  const href = useBaseUrl(to);
  useEffect(() => {
    window.location.replace(
      href + window.location.search + window.location.hash,
    );
  }, [href]);
  return (
    <Layout title="Moved" noIndex>
      <Head>
        <link rel="canonical" href={'https://huhohoo.com' + href} />
      </Head>
      <main className="hh-page">
        <Link to={href}>继续阅读 →</Link>
      </main>
    </Layout>
  );
}
