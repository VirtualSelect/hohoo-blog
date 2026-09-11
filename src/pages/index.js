import HomeProjects from '@site/src/components/HomeProjects';
import CurrentFocus from '@site/src/components/CurrentFocus';
import HomeUpdates from '@site/src/components/HomeUpdates';
import React from 'react';
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
      title={t(
        '首页 · AI 应用、LLM 与具身智能',
        'Home · AI, LLMs & Embodied Intelligence',
      )}
      description={t(
        'Hohoo 的个人博客，聚焦 AI 应用开发、LLM 分享与具身智能，记录学习、实验和实践。',
        'Hohoo’s learning journal on AI applications, LLMs and embodied intelligence.',
      )}>
      <main className={styles.home}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div>
            <p className={styles.eyebrow}>
              <span className={styles.dot} />{' '}
              {t('探索 AI，也记录每一步', 'BUILD · UNDERSTAND · EXPLORE')}
            </p>
            <Heading as="h1" id="home-title" className={styles.title}>
              {t('你好，我是 ', 'Hello, I’m ')}
              <span>Hohoo.</span>
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
              <Link className={styles.secondary} to="/about">
                {t('认识一下我', 'About me')} →
              </Link>
            </div>
            <div className={styles.topics}>
              <span>AI Applications</span>
              <span>LLM</span>
              <span>{t('具身智能', 'Embodied AI')}</span>
            </div>
          </div>
          <aside
            className={styles.profile}
            aria-label={t('个人简介', 'Profile')}>
            <div className={styles.profileTop}>
              <span>HELLO, WORLD_</span>
              <span aria-hidden="true">↗</span>
            </div>
            <img
              src={avatar}
              alt="Hohoo"
              width="112"
              height="112"
              className={styles.avatar}
            />
            <p className={styles.profileName}>
              Hohoo<span>Developer · AI Explorer</span>
            </p>
            <p className={styles.quote}>
              {t('忙时学习，闲时读书。', 'Stay curious. Keep growing.')}
              <br />
              {t(
                '在热爱的事情里，慢慢积累。',
                'Make room for the things you love.',
              )}
            </p>
            <div className={styles.profileBottom}>
              <span>{t('学习 · 实践 · 分享', 'Learn · Build · Share')}</span>
              <a href={social.github.href}>GitHub ↗</a>
            </div>
          </aside>
        </section>
        <CurrentFocus />
        <section className={styles.notes} aria-labelledby="notes-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>01 / {t('三个专栏', 'TOPICS')}</p>
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
        <HomeUpdates position="latest" />
        <HomeProjects en={en} />
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
          <Link className={styles.secondary} to="/aboutMe">
            {t('关于与近况', 'About & now')} ↗
          </Link>
        </section>
      </main>
    </Layout>
  );
}
