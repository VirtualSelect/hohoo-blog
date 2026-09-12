import StructuredData from '@site/src/components/StructuredData';
import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Comment from '@site/src/components/Comment/comment';
import CurrentFocus from '@site/src/components/CurrentFocus';
import {
  useContent,
  useEnglish,
  Section,
  ContentRows,
} from '@site/src/components/ContentUI';
import social from '@site/data/social';
export default function About() {
  const en = useEnglish();
  const { entries } = useContent();
  return (
    <Layout
      title={en ? 'About' : '关于 Hohoo'}
      description="Hohoo：从 Java 到 AI，公开学习、实验与构建。">
      <main className="hh-page hh-reading">
        <StructuredData person />
        <p className="hh-eyebrow">ABOUT / HOOHOO</p>
        <h1>{en ? 'Hello, I’m Hohoo.' : '你好，我是 Hohoo。'}</h1>
        <p className="hh-lead">
          {en
            ? 'I usually write Java. I enjoy turning ideas into small projects, and am exploring AI applications and embodied intelligence.'
            : '平时主要写 Java，喜欢把感兴趣的想法做出来。最近把更多注意力放在 AI 应用，也开始读大语言模型与具身智能的资料。'}
        </p>
        <p>
          {en
            ? 'This site keeps questions, sources and implementation decisions together.'
            : '这里记录遇到的问题、查过的资料和尝试过的方法。把资料、计划与验证过的结论分开，也保留暂时没有答案的问题。'}
        </p>
        <CurrentFocus />
        <Section
          label="SELECTED BUILDS"
          title={en ? 'Things you can inspect' : '可以打开看看的作品'}>
          <ContentRows
            items={entries.filter((e) => e.type === 'project' && e.featured)}
          />
        </Section>
        <Section
          label="HOW I WORK"
          title={
            en ? 'Learn. Experiment. Build. Write.' : '学习，实验，构建，记录。'
          }>
          <p>
            {en
              ? 'Start with a question, keep the sources, and record the limits of each result.'
              : '从一个具体问题出发，保留来源，通过小实验验证，再整理成可复用的记录。'}
          </p>
        </Section>
        <Section label="TECH" title={en ? 'Tools at hand' : '手边的工具'}>
          <p>Java · React · Docusaurus · GitHub Actions</p>
        </Section>
        <Section label="ELSEWHERE" title={en ? 'Beyond the code' : '代码之外'}>
          <p>
            {en
              ? 'Music, food and quiet time with books.'
              : '喜欢听音乐、寻找好吃的，也享受安静读书的时间。认真做事，也给生活留一些空白。'}
          </p>
          <div className="hh-controls">
            <a href={social.github.href}>GitHub ↗</a>
            <a href={social.twitter.href}>X ↗</a>
            <a href={social.email.href}>Email ↗</a>
            <Link to="/subscribe">RSS →</Link>
          </div>
        </Section>
        <Comment />
      </main>
    </Layout>
  );
}
