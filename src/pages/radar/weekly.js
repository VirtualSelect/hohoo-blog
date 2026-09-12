import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import Layout from '@lab/runtime/Layout';
import Link from '@lab/runtime/Link';
import news from '@site/data/news/items.json';
import config from '@site/config/news-sources.json';
import { isoWeek, signals } from '@site/src/utils/radar.cjs';
import { useEnglish } from '@site/src/components/ContentUI';
export default function Weekly() {
  const en = useEnglish();
  const weeks = [...new Set(signals(news,config).map((i) => isoWeek(i.publishedAt)))]
    .sort()
    .reverse();
  return (
    <Layout
      title={en ? 'Radar weekly archive' : 'Radar 周汇总'}
      description="按周回看外部 AI 信号。">
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("RADAR / WEEKLY")}</p>
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
