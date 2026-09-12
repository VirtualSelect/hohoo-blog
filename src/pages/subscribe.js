import React from 'react';
import Layout from '@lab/runtime/Layout';
import useSiteConfig from '@lab/runtime/context';
import styles from './news.module.css';

export default function Subscribe() {
  const en = useSiteConfig().i18n.currentLocale === 'en';
  const prefix = en ? '/en' : '';
  return (
    <Layout
      title={en ? 'RSS subscriptions' : 'RSS 订阅'}
      description="Subscribe to Hohoo’s writing and AI Radar feeds.">
      <main className={styles.page}>
        <h1>
          {en ? 'Read on your own schedule.' : '在自己的阅读器里，慢慢读。'}
        </h1>
        <p>
          {en
            ? 'Copy a feed address into your RSS reader. No account or email is needed.'
            : '将订阅地址添加到 RSS 阅读器，即可接收更新，无需注册或留下邮箱。'}
        </p>
        <div className={styles.list}>
          {[
            {
              path: '/blog/rss.xml',
              name: en ? 'Original writing' : '原创文章',
              description: en
                ? 'Personal articles and learning notes.'
                : '个人文章与学习记录。',
            },
            {
              path: '/news/rss.xml',
              name: en ? 'Selected AI news' : '精选 AI 资讯',
              description: en
                ? 'The latest 100 published entries, filtered by research topic. Source links and attribution are retained.'
                : '最近 100 条已发布资讯，经过研究主题规则筛选，保留来源及链接。',
            },
          ].map((feed) => (
            <section key={feed.path} className={styles.card}>
              <h2>{feed.name}</h2>
              <p>{feed.description}</p>
              <a href={prefix + feed.path}>
                {'https://huhohoo.com' + prefix + feed.path}
              </a>
            </section>
          ))}
        </div>
        <p>
          {en
            ? 'News is automatically checked, not independently fact-verified. When translation is unavailable, the source language is retained.'
            : '资讯通过自动规则检查，不代表已经独立核实事实。暂无译文时，订阅内容保留来源语言。'}
        </p>
      </main>
    </Layout>
  );
}
