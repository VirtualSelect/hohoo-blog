import React from 'react';
import Link from '@docusaurus/Link';
import { useContent, useEnglish } from './ContentUI';
import { useNewsReading } from './ReadingActions';
export default function LearningOverview({ entries, progress }) {
  const en = useEnglish(),
    reading = useNewsReading(),
    content = useContent();
  const papers = content.entries.filter((e) => e.type === 'paper');
  const completed = entries.filter(
    (e) => progress.items[e.stepId]?.status === 'completed',
  ).length;
  return (
    <section className="hh-section">
      <h2 className="hh-eyebrow">LEARNING PROGRESS</h2>
      <dl className="hh-overview">
        <div>
          <dt>{en ? 'Route articles' : '路线文章'}</dt>
          <dd>
            {entries.length
              ? `${completed} / ${entries.length}`
              : en
                ? 'Not published yet'
                : '正式路线文章尚未发布'}
          </dd>
        </div>
        <div>
          <dt>
            <Link to="/reading">{en ? 'Reading list' : '阅读清单'}</Link>
          </dt>
          <dd>
            {reading.ready ? reading.saved.length + progress.saved.length : '—'}{' '}
            {en ? 'saved' : '已收藏 / 想读'}
          </dd>
        </div>
        <div>
          <dt>
            <Link to="/papers">Papers</Link>
          </dt>
          <dd>
            {reading.ready
              ? papers.filter((p) => reading.read.includes(p.id)).length
              : '—'}{' '}
            / {papers.length} {en ? 'read' : '已读'}
          </dd>
        </div>
        <div>
          <dt>
            <Link to="/labs">Labs</Link>
          </dt>
          <dd>
            {
              content.entries.filter(
                (e) => e.type === 'lab' && e.status === 'completed',
              ).length
            }{' '}
            {en ? 'completed experiments' : '已完成实验'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
