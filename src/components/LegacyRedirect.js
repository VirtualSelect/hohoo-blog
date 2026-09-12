import React, { useEffect } from 'react';
import Layout from '@lab/runtime/Layout';
import Head from '@lab/runtime/Head';
import Link from '@lab/runtime/Link';
import useBaseUrl from '@lab/runtime/base-url';
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
