import StructuredData from './StructuredData';
import ProjectEvidence from './ProjectEvidence';
import ReadingActions from './ReadingActions';
import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ExperimentDesign from './ExperimentDesign';
import ContentProvenance, { Freshness } from './ContentProvenance';
import { Related, Status, useEnglish } from './ContentUI';
export default function ContentDetail({ entry: e }) {
  const en = useEnglish();
  const lab = e.type === 'lab';
  const title = en ? e.titleEn || e.title : e.title;
  return (
    <Layout
      title={title}
      description={en ? e.descriptionEn || e.description : e.description}>
      <main className="hh-page hh-reading">
        {e.type === 'project' && <StructuredData entry={e} />}
        <p className="hh-eyebrow">
          {e.type.toUpperCase()} / {e.number}
        </p>
        <h1>{title}</h1>
        <p className="hh-lead">
          {en ? e.descriptionEn || e.description : e.description}
        </p>
        <div className="hh-meta">
          <Status value={e.status} />
          {e.date && (
            <>
              {' '}
              · <time dateTime={e.date}>{e.date}</time>
            </>
          )}
          {e.updated && <> · UPDATED {e.updated}</>}
        </div>
        <ContentProvenance kind={e.provenance} />
        <Freshness entry={e} />
        {e.stack && <p className="hh-meta">{e.stack.join(' · ')}</p>}
        {(e.repo || e.demo) && (
          <p>
            {e.repo && (
              <a href={e.repo} target="_blank" rel="noopener noreferrer">
                GitHub ↗
              </a>
            )}
            {e.repo && e.demo && ' · '}
            {e.demo && <a href={e.demo}>Website ↗</a>}
          </p>
        )}
        {lab ? (
          <>
            <section className="hh-section">
              <h2 className="hh-eyebrow">01 / QUESTION</h2>
              <p>{en ? e.goalEn : e.goalZh}</p>
            </section>
            <ExperimentDesign entry={e} />
            {e.status === 'planning' || e.status === 'planned'
              ? null
              : [
                  'hypothesis',
                  'setup',
                  'method',
                  'result',
                  'observations',
                  'conclusion',
                  'limitations',
                  'reproduce',
                ]
                  .filter((key) => e[key])
                  .map((key) => (
                    <section className="hh-section" key={key}>
                      <h2>{key.toUpperCase()}</h2>
                      <p>{e[key]}</p>
                    </section>
                  ))}
          </>
        ) : (
          e.sections?.map((s) => (
            <section className="hh-section" key={s.heading}>
              <h2>{s.heading}</h2>
              <p>{en ? s.en : s.zh}</p>
            </section>
          ))
        )}
        {!!e.experimentLog?.length && (
          <section className="hh-section">
            <h2>EXPERIMENT LOG</h2>
            <ol>
              {e.experimentLog.map((log) => (
                <li key={log.date + log.title}>
                  <time dateTime={log.date}>{log.date}</time> · {log.title}
                </li>
              ))}
            </ol>
          </section>
        )}
        {e.type === 'project' && <ProjectEvidence entry={e} />}
        {e.type === 'note' && <ReadingActions id={e.id} en={en} />}
        <Related ids={e.related} />
        <p>
          <Link to={lab ? '/labs' : e.type === 'note' ? '/notes' : '/projects'}>
            {en ? '← Back to index' : '← 返回目录'}
          </Link>
        </p>
      </main>
    </Layout>
  );
}
