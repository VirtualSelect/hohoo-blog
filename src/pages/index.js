import ParticleWordmark from '@site/src/components/ParticleWordmark';
import StructuredData from '@site/src/components/StructuredData';
import HomeProjects from '@site/src/components/HomeProjects';
import CurrentFocus from '@site/src/components/CurrentFocus';
import HomeUpdates from '@site/src/components/HomeUpdates';
import React from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import social from '@site/data/social';
import styles from './index.module.css';
import topics from '@site/data/topics';

const notes = topics.map((topic) => ({ ...topic, to: `/docs/${topic.id}` }));

export default function Home() {
  const { i18n } = useDocusaurusContext();
  const en = i18n.currentLocale === 'en';
  const t = (zh, english) => (en ? english : zh);
  const avatar = useBaseUrl('/img/hohoo.jpg');
  return (
    <Layout
      title="Hohoo's AI Lab · AI Engineering, LLM & Embodied AI"
      description={t(
        'Hohoo 的 AI Lab：公开学习 AI 工程、LLM 与具身智能，展示真实项目与实验。',
        'Hohoo’s learning journal on AI applications, LLMs and embodied intelligence.',
      )}>
      <Head>
        <title>Hohoo's AI Lab · AI Engineering, LLM &amp; Embodied AI</title>
        <meta
          property="og:title"
          content="Hohoo's AI Lab · AI Engineering, LLM & Embodied AI"
        />
      </Head>
      <ParticleWordmark en={en} />
      <main className={styles.home}>
        <StructuredData person />
        <section className={styles.hero} aria-labelledby="home-title">
          <div>
            <p className={styles.eyebrow}>
              <span className={styles.dot} />{' '}
              HOOHOO / EXPLORING INTELLIGENCE
            </p>
            <Heading as="h1" id="home-title" className={styles.title}>
              <span className={styles.greeting}>{t('你好，我是 Hohoo。', 'Hello, I’m Hohoo.')}</span>
              {t('探索智能，', 'Explore intelligence.')}<br />
              <span>{t('构建可能。', 'Build possibilities.')}</span>
            </Heading>
            <p className={styles.eyebrow}>Developer · AI Builder · Explorer</p>
            <p className={styles.intro}>
              {t(
                '从 Java 到 AI。从模型到应用，再走向真实世界。',
                'From Java to AI. From models to applications, and into the physical world.',
              )}
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} to="/learning">
                {t('开始阅读路线', 'Explore reading paths')} ↗
              </Link>
              <Link className={styles.secondary} to="/projects">
                {t('探索项目', 'Explore projects')} →
              </Link>
            </div>
            <div className={styles.topics}>
              <span>AI Applications</span>
              <span>LLM</span>
              <span>{t('具身智能', 'Embodied AI')}</span>
            </div>
          </div>
          <aside className={styles.observatory} aria-label={t('个人 AI 实验室', 'Personal AI laboratory')}>
            <div className={styles.profile}>
              <img src={avatar} alt="Hohoo" width="48" height="48" className={styles.avatar} />
              <div><strong>Hohoo</strong><p>Developer · AI Builder · Explorer</p></div>
              <a href={social.github.href} aria-label="Hohoo GitHub">↗</a>
            </div>
            <p className={styles.visualCaption}>LEARNING IN PUBLIC. BUILDING IN PUBLIC.</p>
          </aside>
        </section>
        <section className={styles.notes} aria-labelledby="notes-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>01 / LEARNING COORDINATES</p>
              <Heading as="h2" id="notes-title">
                {t('三条主线，持续深入', 'Three tracks to explore')}
              </Heading>
            </div>
            <Link to="/research">{t('研究总览', 'All research')} ↗</Link>
          </div>
          <div className={styles.noteGrid}>
            {notes.map((note, index) => (
              <Link key={note.to} to={note.to} className={styles.note}>
                <div className={styles.noteTop}>
                  <span>{note.tag}</span>
                  <span>0{index + 1}</span>
                </div>
                <Heading as="h3">{en ? note.en : note.title}</Heading>
                <p>{en ? note.english : note.description}</p>
                <span className={styles.noteStatus}>
                  {t(
                    '论文 · 资讯 · 学习路线',
                    'Papers · News · Learning paths',
                  )}
                </span>
                <span className={styles.noteArrow} aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </section>
        <CurrentFocus />
        <HomeProjects en={en} />
        <HomeUpdates position="latest" />
        <HomeUpdates position="activity" />
        <section className={styles.connect}>
          <div>
            <p className={styles.eyebrow}>STAY CURIOUS, KEEP BUILDING.</p>
            <Heading as="h2">
              {t('很高兴，在这里遇见你。', 'Glad our paths crossed.')}
            </Heading>
            <p>
              {t(
                '如果某篇记录对你有用，或你有想交流的想法，欢迎打个招呼。',
                'Found something useful, or have an idea to share? Say hello.',
              )}
            </p>
          </div>
          <Link className={styles.secondary} to="/about">
            {t('关于与近况', 'About & now')} ↗
          </Link>
        </section>
      </main>
    </Layout>
  );
}
