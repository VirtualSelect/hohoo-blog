import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import RadarItem from './RadarItem';
import { useEnglish, useContent, ContentRows, Section } from './ContentUI';
export default function RadarWeekly({ digest }) {
  const en = useEnglish();
  const { entries } = useContent();
  const domains = [...new Set(digest.items.map((i) => i.domain))];
  const related = [...new Set(digest.items.flatMap((i) => i.related || []))];
  return (
    <Layout
      title={'AI Radar · ' + digest.week}
      description="按原始发布时间汇总的外部 AI 资讯。">
      <main className="hh-page">
        <p className="hh-eyebrow">RADAR / WEEKLY</p>
        <h1>{digest.week}</h1>
        <p className="hh-lead">
          {en
            ? 'This week in AI: source excerpts and reading links, grouped by original publication week.'
            : '按原始发布周整理来源摘录与阅读线索，不自动生成个人观点或趋势结论。'}
        </p>
        {domains.map((d) => (
          <Section key={d} label="THIS WEEK IN AI" title={d.toUpperCase()}>
            <div className="hh-radar">
              {digest.items
                .filter((i) => i.domain === d)
                .map((i) => (
                  <RadarItem key={i.id} item={i} />
                ))}
            </div>
          </Section>
        ))}
        {!!related.length && (
          <Section
            label="SAVED TO KNOWLEDGE"
            title={en ? 'Connected knowledge' : '关联知识'}>
            <ContentRows
              items={entries.filter((e) => related.includes(e.id))}
            />
          </Section>
        )}
        <Link to="/radar">← AI Radar</Link>
      </main>
    </Layout>
  );
}
