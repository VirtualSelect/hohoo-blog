import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import news from '@site/data/news/items.json';
import { isoWeek } from '@site/src/utils/radar.cjs';
import { useEnglish } from '@site/src/components/ContentUI';
export default function Weekly() {
  const en = useEnglish();
  const weeks = [...new Set(news.map((i) => isoWeek(i.publishedAt)))]
    .sort()
    .reverse();
  return (
    <Layout
      title={en ? 'Radar weekly archive' : 'Radar 周汇总'}
      description="按周回看外部 AI 信号。">
      <main className="hh-page">
        <p className="hh-eyebrow">RADAR / WEEKLY</p>
        <h1>{en ? 'Weekly archive' : '按周回看'}</h1>
        <ul className="hh-rows">
          {weeks.map((w) => (
            <li key={w}>
              <Link to={'/radar/weekly/' + w}>{w} →</Link>
            </li>
          ))}
        </ul>
        <p>
          <Link to="/radar">← AI Radar</Link>
        </p>
      </main>
    </Layout>
  );
}
