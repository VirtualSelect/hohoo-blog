import React from 'react';
import Layout from '@lab/runtime/Layout';
import CurrentFocus from '@site/src/components/CurrentFocus';
import { useEnglish } from '@site/src/components/ContentUI';
import current from '@site/data/current.json';
export default function Now() {
  const en = useEnglish();
  return (
    <Layout title="Now" description="当前的构建、学习、阅读与探索。">
      <main className="hh-page hh-reading">
        <p className="hh-eyebrow">NOW / {current.updated.slice(0, 7)}</p>
        <h1>
          {en ? 'Where my attention goes.' : '最近，把注意力放在这些事上。'}
        </h1>
        <CurrentFocus full />
      </main>
    </Layout>
  );
}
