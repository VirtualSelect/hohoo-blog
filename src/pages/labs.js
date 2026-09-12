import { uiLabel } from '@site/src/utils/ui-labels';
import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {
  useContent,
  useEnglish,
  ContentRows,
  Section,
} from '@site/src/components/ContentUI';
export default function Labs() {
  const en = useEnglish();
  const { entries } = useContent();
  const labs = entries.filter((e) => e.type === 'lab');
  useEffect(() => {
    const slug = window.location.hash.slice(1);
    const entry = labs.find((e) => e.slug === slug);
    if (entry) window.location.replace(entry.href + window.location.search);
  }, []);
  return (
    <Layout title="Labs" description="以问题、方法和证据为中心的实验记录。">
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("EXPERIMENT / LABS")}</p>
        <h1>
          {en ? 'A question. A method. Evidence.' : '让判断，有证据可循。'}
        </h1>
        <p className="hh-lead">
          {en
            ? 'Observations and conclusions are recorded separately.'
            : '区分观察与结论，记录方法、环境和适用边界。'}
        </p>
        <ContentRows
          items={labs.filter((e) => e.status !== 'planning')}
          empty="暂无已完成的实验记录。"
        />
        <details className="hh-section">
          <summary>{en ? 'Experiment proposals' : '实验提案'}</summary>
          <ContentRows items={labs.filter((e) => e.status === 'planning')} />
        </details>
        <p>
          <Link to="/projects">{en ? 'Projects →' : '查看项目 →'}</Link>
        </p>
      </main>
    </Layout>
  );
}
