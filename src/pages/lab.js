import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import experiments from '@site/data/experiments.json';
import { useEnglish } from '@site/src/components/ContentUI';
export default function Lab() {
  const en = useEnglish();
  return (
    <Layout
      title={en ? 'Projects and experiments' : '项目与实验'}
      description="项目与实验的兼容入口。">
      <main className="hh-page">
        <h1>{en ? 'Projects and experiments' : '项目与实验'}</h1>
        <p>
          <Link to="/projects">{en ? 'Projects' : '真实项目'} →</Link>
          {' · '}
          <Link to="/labs">{en ? 'Labs' : '实验记录'} →</Link>
        </p>
        {experiments.map((e) => (
          <section className="hh-section" key={e.id}>
            <Heading as="h2" id={e.id}>
              {en ? e.en : e.zh}
            </Heading>
            <p className="hh-meta">PLANNED</p>
            <Link to={'/labs/' + e.id}>
              {en ? 'View proposal →' : '查看实验提案 →'}
            </Link>
          </section>
        ))}
      </main>
    </Layout>
  );
}
