import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import social from '@site/data/social';
import styles from './index.module.css';
import topics from '@site/data/topics';

const notes = topics.map(topic => ({...topic, to: `/docs/${topic.id}`}));

export default function Home() {
  const {i18n} = useDocusaurusContext();
  const en = i18n.currentLocale === 'en';
  const t = (zh, english) => en ? english : zh;
  const avatar = useBaseUrl('/img/hohoo.jpg');
  return (
    <Layout title={t('首页 · AI 应用、LLM 与具身智能', 'Home · AI, LLMs & Embodied Intelligence')} description={t('Hohoo 的个人博客，聚焦 AI 应用开发、LLM 分享与具身智能，记录学习、实验和实践。', 'Hohoo’s learning journal on AI applications, LLMs and embodied intelligence.')}>
      <main className={styles.home}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div>
            <p className={styles.eyebrow}><span className={styles.dot} /> {t('探索 AI，也记录每一步', 'BUILD · UNDERSTAND · EXPLORE')}</p>
            <Heading as="h1" id="home-title" className={styles.title}>{t('你好，我是', 'Hello, I’m ')}<span>Hohoo.</span><br />{t('从模型出发，向真实世界。', 'From models to the real world.')}</Heading>
            <p className={styles.intro}>{t('一名生活在苏州的开发者。接下来，聚焦 AI 应用开发、LLM 分享与具身智能，把学习中的问题、实验和思考整理在这里。', 'A developer based in Suzhou, exploring AI applications, LLMs and embodied intelligence. A place for questions, experiments and reflections.')}</p>
            <div className={styles.actions}><Link className={styles.primary} to="/docs/skill">{t('浏览研究方向', 'Explore topics')} ↗</Link><Link className={styles.secondary} to="/aboutMe">{t('认识一下我', 'About me')} →</Link></div>
            <div className={styles.topics}><span>AI Applications</span><span>LLM</span><span>{t('具身智能', 'Embodied AI')}</span></div>
          </div>
          <aside className={styles.profile} aria-label={t('个人简介', 'Profile')}>
            <div className={styles.profileTop}><span>HELLO, WORLD_</span><span aria-hidden="true">↗</span></div>
            <img src={avatar} alt="Hohoo" width="112" height="112" className={styles.avatar} />
            <p className={styles.profileName}>Hohoo<span>Developer · AI Explorer</span></p>
            <p className={styles.quote}>{t('忙时学习，闲时读书。', 'Stay curious. Keep growing.')}<br />{t('在热爱的事情里，慢慢积累。', 'Make room for the things you love.')}</p>
            <div className={styles.profileBottom}><span>⌖ {t('中国 · 苏州', 'Suzhou, China')}</span><a href={social.github.href}>GitHub ↗</a></div>
          </aside>
        </section>
        <section className={styles.writing} aria-labelledby="writing-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>01 / {t('内容路线', 'ROADMAP')}</p><Heading as="h2" id="writing-title">{t('三个方向，一起探索', 'Three directions to explore')}</Heading></div><Link to="/docs/skill">{t('专题总览', 'All topics')} ↗</Link></div>
          <Link to="/docs/skill" className={styles.featured}>
            <div className={styles.articleArt} aria-hidden="true"><span>LEARN<br />BUILD<span className={styles.artDot}>.</span></span><small>AI · LLM · EMBODIED INTELLIGENCE</small></div>
            <div className={styles.articleBody}><div className={styles.meta}><span>{t('内容规划', 'CONTENT ROADMAP')}</span><span>{t('专栏筹备中', 'In preparation')}</span></div><Heading as="h3">{t('从应用到智能，再到行动', 'Applications, intelligence and action')}</Heading><p>{t('以 AI 应用开发为实践入口，通过 LLM 分享理解方法，再逐步探索具身智能。专题规划已经整理，正式文章将随学习与实践逐步更新。', 'Build AI applications, understand methods through LLM notes, and explore embodied intelligence. The roadmap is ready; articles will follow actual learning and practice.')}</p><span className={styles.readMore}>{t('查看内容规划与分类方式', 'Read the roadmap and topic boundaries')} <span aria-hidden="true">↗</span></span></div>
          </Link>
        </section>
        <section className={styles.notes} aria-labelledby="notes-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>02 / {t('三个专栏', 'TOPICS')}</p><Heading as="h2" id="notes-title">{t('接下来，关注这些问题', 'Questions to explore next')}</Heading></div><Link to="/docs/skill">{t('专题总览', 'All topics')} ↗</Link></div><div className={styles.noteGrid}>{notes.map((note, index) => <Link key={note.to} to={note.to} className={styles.note}><div className={styles.noteTop}><span>{note.tag}</span><span>0{index + 1}</span></div><Heading as="h3">{en ? note.en : note.title}</Heading><p>{en ? note.english : note.description}</p><span className={styles.noteStatus}>{t('筹备中 · 查看规划', 'In preparation · View roadmap')}</span><span className={styles.noteArrow} aria-hidden="true">↗</span></Link>)}</div></section>
        <section className={styles.connect}><div><p className={styles.eyebrow}>STAY CURIOUS, KEEP BUILDING.</p><Heading as="h2">{t('很高兴，在这里遇见你。', 'Glad our paths crossed.')}</Heading><p>{t('如果某篇记录对你有用，或你有想交流的想法，欢迎打个招呼。', 'Found something useful, or have an idea to share? Say hello.')}</p></div><a className={styles.secondary} href={social.email.href}>{t('聊一聊', 'Say hello')} ↗</a></section>
      </main>
    </Layout>
  );
}
