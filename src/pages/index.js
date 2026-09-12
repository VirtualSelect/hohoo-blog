import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { translate } from '@docusaurus/Translate';
import { usePluginData } from '@docusaurus/useGlobalData';
import StructuredData from '../components/StructuredData';
import CurrentFocus from '../components/CurrentFocus';
import WritingList from '../components/WritingList';
import RadarItem from '../components/RadarItem';
import { ContentRows, useContent } from '../components/ContentUI';
import { writingEntries } from '../utils/localization.cjs';
import styles from './index.module.css';
export default function Home() {
  const { entries } = useContent();
  const { preview } = usePluginData('radar-pages');
  const intro = translate({
    id: 'home.intro',
    message: '从 Java 到 AI。边学、边实验、边构建。',
  });
  return (
    <Layout title="Hohoo's AI Lab" description={intro}>
      <main className={styles.home}>
        <StructuredData person />
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            AI Builder · Software Engineer · Explorer
          </p>
          <h1 className={styles.title}>
            {translate({
              id: 'home.hello',
              message: '你好，我是 Hohoo.',
            })}
          </h1>
          <p className={styles.intro}>{intro}</p>
          <div className={styles.actions}>
            <Link className={styles.primary} to="/articles">
              {translate({
                id: 'home.read',
                message: '阅读最新文章',
              })}{' '}
              →
            </Link>
            <Link className={styles.secondary} to="/learning">
              {translate({
                id: 'home.learn',
                message: '查看学习路线',
              })}{' '}
              →
            </Link>
          </div>
        </section>
        <section className="hh-section">
          <div className="hh-section-heading">
            <h2 className="hh-eyebrow">LATEST WRITING</h2>
            <Link to="/articles">ALL ARTICLES →</Link>
          </div>
          <WritingList items={writingEntries(entries).slice(0, 4)} />
        </section>
        <CurrentFocus />
        <section className="hh-section">
          <div className="hh-section-heading">
            <h2 className="hh-eyebrow">FEATURED BUILD</h2>
            <Link to="/build">BUILD →</Link>
          </div>
          <ContentRows
            items={entries
              .filter(
                (e) =>
                  e.type === 'project' && e.featured && e.status !== 'planning',
              )
              .slice(-1)}
          />
        </section>
        <section className="hh-section">
          <div className="hh-section-heading">
            <h2 className="hh-eyebrow">AI RADAR</h2>
            <Link to="/radar">RADAR →</Link>
          </div>
          <div className="hh-radar">
            {preview.slice(0, 3).map((item) => (
              <RadarItem key={item.id} item={item} compact />
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
