import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './news.module.css';

export default function Lab() {
  const en = useDocusaurusContext().i18n.currentLocale === 'en';
  return <Layout title={en ? 'Project lab' : '项目实验室'}>
    <main className={styles.page}>
      <p className={styles.eyebrow}>BUILD / TEST / REFLECT</p>
      <h1>{en ? 'Projects with something to inspect.' : '把想法做出来，也把过程留下来。'}</h1>
      <p>{en ? 'Working code, design decisions and known limitations. More experiments will be added when there is evidence to share.' : '记录可查看的代码、实现选择与已知局限。有可展示的成果后，再加入新的实验。'}</p>
      <article className={styles.card}>
        <h2>{en ? 'Research news collection pipeline' : '研究资讯采集与审核流水线'}</h2>
        <p>{en ? 'RSS → topic and technical-content filters → deduplication → optional bilingual translation → draft review → static publishing.' : 'RSS 采集 → 主题与技术内容筛选 → 去重 → 可选双语翻译 → 草稿审核 → 静态发布。'}</p>
        <h3>{en ? 'What to examine' : '值得复盘的问题'}</h3>
        <ul>
          <li>{en ? 'How strict filters reduce noise while potentially missing relevant entries.' : '严格筛选如何减少噪声，以及可能漏掉哪些相关内容。'}</li>
          <li>{en ? 'How failed sources and translations fall back without inventing content.' : '来源或翻译失败时，如何回退并保持信息真实。'}</li>
          <li>{en ? 'Why external feed data is treated as untrusted input.' : '为什么要将外部 Feed 内容作为不可信输入处理。'}</li>
        </ul>
        <p>{en ? 'Limits: keyword filtering is not semantic review; feed excerpts cannot support full-article conclusions. Translation requires a configured provider.' : '局限：关键词筛选不能替代语义审核；RSS 短摘录不足以支持全文结论。自动翻译需要配置模型服务。'}</p>
        <Link to="/news">{en ? 'See the output →' : '查看资讯输出 →'}</Link>{' · '}
        <a href="https://github.com/VirtualSelect/hohoo-blog/tree/main/scripts/news" target="_blank" rel="noopener noreferrer">{en ? 'Source code ↗' : '查看源码 ↗'}</a>
      </article>
    </main>
  </Layout>;
}
