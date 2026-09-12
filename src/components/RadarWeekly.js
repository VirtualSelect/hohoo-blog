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
  const sources = new Set(
    digest.items
      .flatMap((i) => [i, ...(i.coverage || [])])
      .map((i) => i.sourceId),
  );
  const top = [...digest.items]
    .sort(
      (a, b) =>
        (b.relevanceScore || 0) - (a.relevanceScore || 0) ||
        b.publishedAt.localeCompare(a.publishedAt),
    )
    .slice(0, 3);
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
        <section className="hh-section">
          <h2 className="hh-eyebrow">THIS WEEK AT A GLANCE</h2>
          <dl className="hh-overview">
            <div>
              <dt>{en ? 'Signals' : '信号'}</dt>
              <dd>{digest.items.length}</dd>
            </div>
            <div>
              <dt>{en ? 'Topics' : '主题'}</dt>
              <dd>{domains.length}</dd>
            </div>
            <div>
              <dt>{en ? 'Sources' : '来源'}</dt>
              <dd>{sources.size}</dd>
            </div>
          </dl>
          <p className="hh-meta">
            {en
              ? 'RULE-BASED DIGEST · Counts and source excerpts, not an authored weekly opinion.'
              : '规则整理周报 · 统计与来源摘录，不代表作者个人周评。'}
          </p>
        </section>
        <Section
          label="TOP SIGNALS"
          title={en ? 'Start with these signals' : '先看这些信号'}>
          <p className="hh-meta">
            {en
              ? 'Ordered by available relevance score, then publication time.'
              : '优先采用已有相关度分数，再按发布时间排序。'}
          </p>
          <ol className="hh-rows">
            {top.map((i) => (
              <li key={i.id}>
                <a href={'#signal-' + i.id}>{i.title} →</a>
                <span className="hh-meta">{i.sourceType.toUpperCase()}</span>
              </li>
            ))}
          </ol>
        </Section>
        {domains.map((d) => (
          <Section
            key={d}
            label="WHAT CHANGED / SOURCE SIGNALS"
            title={d.toUpperCase()}>
            <div className="hh-radar">
              {digest.items
                .filter((i) => i.domain === d)
                .map((i) => (
                  <RadarItem key={i.id} item={i} />
                ))}
            </div>
          </Section>
        ))}
        <Section
          label="WORTH FOLLOWING"
          title={en ? 'Questions still open' : '继续跟踪'}>
          <ul>
            {digest.items
              .filter(
                (i) =>
                  !['primary-confirmed', 'cross-checked'].includes(
                    i.verificationStatus,
                  ),
              )
              .map((i) => (
                <li key={i.id}>
                  <a href={'#signal-' + i.id}>{i.title}</a> ·{' '}
                  {en
                    ? 'Awaiting independent verification'
                    : '待补独立核验依据'}
                </li>
              ))}
          </ul>
        </Section>
        {!!related.length && (
          <Section
            label="RELATED TO MY LEARNING"
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
