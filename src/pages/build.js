import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import Layout from '@lab/runtime/Layout';
import Link from '@lab/runtime/Link';
import { translate } from '@lab/runtime/Translate';
import { useContent, ContentRows } from '../components/ContentUI';
import CreativeWorkbench from '@lab/components/CreativeWorkbench';
export default function Build() {
  const { entries } = useContent();
  const labs = entries.filter((e) => e.type === 'lab');
  return (
    <Layout
      title={translate({
        id: 'nav.build',
        message: '实践',
      })}
      description={translate({
        id: 'build.description',
        message: '做出了什么，验证了什么。',
      })}>
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("BUILD")}</p>
        <h1>
          {translate({
            id: 'build.description',
            message: '做出了什么，验证了什么。',
          })}
        </h1>
        <section className="hh-section">
          <h2>{uiLabel("PROJECTS")}</h2>
          <ContentRows items={entries.filter((e) => e.type === 'project')} />
          <Link to="/projects">
            {translate({
              id: 'build.projects',
              message: '全部项目',
            })}{' '}
            →
          </Link>
        </section>
        <section className="hh-section">
          <h2>{uiLabel("EXPERIMENTS")}</h2>
          <ContentRows
            items={labs.filter(
              (e) => !['planning', 'planned'].includes(e.status),
            )}
          />
          <details>
            <summary>
              {translate({
                id: 'build.proposals',
                message: '实验提案',
              })}
            </summary>
            <ul className="hh-rows">
              {labs
                .filter((e) => ['planning', 'planned'].includes(e.status))
                .map((e) => (
                  <li key={e.id}>
                    <Link to={e.href}>○ {e.title}</Link>
                  </li>
                ))}
            </ul>
          </details>
          <Link to="/labs">
            {translate({
              id: 'build.labs',
              message: '全部实验',
            })}{' '}
            →
          </Link>
        </section>
        <CreativeWorkbench />
      </main>
    </Layout>
  );
}
