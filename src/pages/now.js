import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import social from '@site/data/social';
import styles from './learning.module.css';

export default function Now() {
  const en = useDocusaurusContext().i18n.currentLocale === 'en';
  const items = [
    {title: en ? 'Build something useful' : '把想法做成能用的东西', text: en ? 'The planned starting point is a small Java-to-LLM application, followed by a Q&A system for this blog.' : '计划从 Java 调用大语言模型的小应用开始，再尝试给这个博客做一个知识库问答。', to: '/learning'},
    {title: en ? 'Understand the method' : '多问一句：为什么', text: en ? 'The reading plan focuses on prompts, structured output and evaluation, with sources and limitations recorded alongside conclusions.' : '接下来的阅读围绕提示词、结构化输出和效果评估展开。除了结论，也记录来源、条件和暂时没想明白的问题。', to: '/docs/llm'},
    {title: en ? 'Explore the physical world' : '从屏幕走向真实世界', text: en ? 'Embodied AI is a learning direction: start with concepts and papers before attempting a small simulation task.' : '具身智能是想继续探索的方向：先读基础概念和论文，再尝试一个小型仿真任务。', to: '/learning'},
  ];
  return <Layout title={en ? 'Now' : '最近在做什么'} description={en ? 'Current interests and next steps for this personal blog.' : '这个博客当前关注的问题、接下来的计划，以及交流入口。'}>
    <main className={styles.page}><p className={styles.eyebrow}>NOW / NEXT</p>
      <h1>{en ? 'What has my attention lately.' : '最近，把注意力放在这些事上。'}</h1>
      <p className={styles.lead}>{en ? 'These are current interests and plans, not a list of completed projects. Actual published notes appear on the learning timeline.' : '这里记录当前关注的方向和下一步计划，不是已经完成的项目清单。实际发布的内容会收录在学习时间轴里。'}</p>
      <div className={styles.tabs}><Link to="/aboutMe">{en ? 'About me' : '关于我'}</Link><Link to="/timeline">{en ? 'Learning timeline' : '学习时间轴'}</Link></div>
      <div className={styles.steps}>{items.map(item => <section key={item.title} className={styles.card}><h2>{item.title}</h2><p>{item.text}</p><Link to={item.to}>{en ? 'Explore the plan →' : '看看具体计划 →'}</Link></section>)}</div>
      <section className={styles.empty}><h2>{en ? 'What would you like to explore?' : '你也有想一起研究的问题吗？'}</h2><p>{en ? 'Suggest a topic, point out a mistake, or share a different approach. Your email app will open; nothing is sent automatically.' : '欢迎提一个想看的选题、指出文章中的问题，或者聊聊不同的实现思路。点击后打开邮件应用，由你编辑并发送。'}</p><a href={social.email.href + '?subject=' + encodeURIComponent(en ? 'A topic idea for your blog' : '博客选题交流')}>{en ? 'Suggest a topic ↗' : '给我一个选题 ↗'}</a></section>
    </main>
  </Layout>;
}
