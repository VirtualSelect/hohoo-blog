import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import Layout from '@lab/runtime/Layout';
import logs from '@site/data/build-log.json';
import projects from '@site/data/projects.json';
import { useEnglish } from '@site/src/components/ContentUI';
export default function Changelog() {
  const en = useEnglish();
  return (
    <Layout title="Changelog" description="可追溯到代码提交的站点演进记录。">
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("BEHIND THE LAB")}</p>
        <h1>Changelog</h1>
        <p className="hh-lead">
          {en
            ? 'Repository history, not a production deployment log.'
            : '可追溯的代码演进，不等同于生产部署记录。'}
        </p>
        <ol className="hh-rows">
          {logs.map((l) => (
            <li key={l.commit}>
              <time dateTime={l.date}>{l.date}</time>
              <div>
                <h2>
                  <a
                    href={
                      projects.find((p) => p.id === l.project).repo +
                      '/commit/' +
                      l.commit
                    }
                    target="_blank"
                    rel="noopener noreferrer">
                    {l.title} ↗
                  </a>
                </h2>
                <code>{l.commit.slice(0, 7)}</code>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </Layout>
  );
}
