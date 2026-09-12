import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {
  useContent,
  useEnglish,
  ContentRows,
} from '@site/src/components/ContentUI';
export default function Projects() {
  const en = useEnglish();
  const { entries } = useContent();
  return (
    <Layout title="Projects" description="真实项目、实现选择与代码入口。">
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("BUILD / PROJECTS")}</p>
        <h1>{en ? 'Ideas, made useful.' : '把想法做成能用的东西。'}</h1>
        <p className="hh-lead">
          {en
            ? 'Working code, architecture and trade-offs.'
            : '从真实问题出发，留下实现、选择与边界。'}
        </p>
        <p>
          <Link to="/labs">{en ? 'Experiments →' : '实验记录 →'}</Link>
        </p>
        <ContentRows items={entries.filter((e) => e.type === 'project')} />
      </main>
    </Layout>
  );
}
