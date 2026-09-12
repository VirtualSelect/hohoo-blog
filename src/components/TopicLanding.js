import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import Link from '@lab/runtime/Link';
import tracks from '@site/data/learning-paths.json';
import topics from '@site/data/topics';
import { Section, ContentRows, useContent, useEnglish } from './ContentUI';
import TopicPapers from './TopicPapers';
import TopicNews from './TopicNews';
export default function TopicLanding({ category }) {
  const en = useEnglish();
  const { entries } = useContent();
  const topic = topics.find((t) => t.id === category);
  const track =
    tracks.find((t) => t.domain === category) ||
    tracks.find(
      (t) =>
        t.id === (category === 'embodied-ai' ? 'embodied' : 'applications'),
    );
  const docs = entries.filter(
    (e) => e.domain === category && ['doc', 'note'].includes(e.type),
  );
  return (
    <>
      <p className="hh-eyebrow">
        0{topics.indexOf(topic) + 1} / {topic.tag}
      </p>
      <p className="hh-lead">{en ? topic.english : topic.description}</p>
      <Section
        label={uiLabel("START HERE")}
        title={en ? 'Choose a starting point' : '从这里开始'}>
        <ol className="hh-concepts">
          {track.steps.slice(0, 7).map((s) => {
            const article = docs.find((d) => d.stepId === s.id);
            return (
              <li key={s.id}>
                <Link to={article?.href || '/learning#step-' + s.id}>
                  {en ? s.en : s.title}
                </Link>
                {!article && <small className="hh-meta"> · {uiLabel('PLANNED')}</small>}
              </li>
            );
          })}
        </ol>
      </Section>
      {category === 'ai-apps' && (
        <Section
          label={uiLabel("AI ENGINEERING")}
          title={
            en ? 'From application to delivery' : '从应用实现，到工程交付'
          }>
          <p className="hh-lead">
            {en
              ? 'An application subdirection, not a separate track.'
              : 'AI Applications 的工程子方向。'}
          </p>
          <ul className="hh-concepts">
            {[
              'AI Coding',
              'Codex',
              'MCP',
              'Skills',
              'Harness',
              'Testing',
              'Evals',
              'Observability',
              'Production',
              'Performance',
            ].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <Link to="/learning#engineering">
            {en ? 'Engineering topics →' : '工程选题 →'}
          </Link>
        </Section>
      )}
      <Section label={uiLabel("LATEST")} title={en ? 'Published knowledge' : '已发布内容'}>
        <ContentRows items={docs} />
      </Section>
      {entries.some((e) => e.domain === category && e.type === 'project') && (
        <Section label={uiLabel("PROJECTS")} title={en ? 'Working builds' : '相关项目'}>
          <ContentRows
            items={entries.filter(
              (e) => e.domain === category && e.type === 'project',
            )}
          />
        </Section>
      )}
      <details>
        <summary>{en ? 'Related experiments' : '相关实验'}</summary>
        <ContentRows
          items={entries.filter(
            (e) => e.domain === category && e.type === 'lab',
          )}
        />
      </details>
      <TopicPapers category={category} />
      <TopicNews category={category} />
      <p>
        <Link to="/learning">
          {en ? 'Continue along a learning path →' : '继续系统学习 →'}
        </Link>
      </p>
    </>
  );
}
