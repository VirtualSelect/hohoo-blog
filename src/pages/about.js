import { uiLabel } from '@site/src/utils/ui-labels';
import { translate } from '@docusaurus/Translate';
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
import AstraParticleHero from '@site/src/components/AstraParticleHero';
export default function About() {
  const en = useEnglish();
  const { entries } = useContent();
  return (
    <Layout
      title={
        en
          ? 'About'
          : translate({
              id: 'ui.a3910125df',
              message: '\u5173\u4E8E Hohoo',
            })
      }
      description={
        en
          ? 'Hohoo: learning, experimenting and building, from Java to AI.'
          : translate({
              id: 'ui.b2830b25e0',
              message:
                'Hohoo\uFF1A\u4ECE Java \u5230 AI\uFF0C\u516C\u5F00\u5B66\u4E60\u3001\u5B9E\u9A8C\u4E0E\u6784\u5EFA\u3002',
            })
      }>
      <main>
        <AstraParticleHero en={en} />
        <div
          id="about-content"
          className="hh-page hh-reading"
          style={{
            scrollMarginTop: 88,
          }}>
          <StructuredData person />
          <p className="hh-eyebrow">{uiLabel("ABOUT / HOOHOO")}</p>
          <h2>
            {en
              ? 'Hello, I’m Hohoo.'
              : translate({
                  id: 'ui.d22f242c15',
                  message: '\u4F60\u597D\uFF0C\u6211\u662F Hohoo\u3002',
                })}
          </h2>
          <p className="hh-lead">
            {en
              ? 'I usually write Java. I enjoy turning ideas into small projects, and am exploring AI applications and embodied intelligence.'
              : translate({
                  id: 'ui.6aba6b62c2',
                  message:
                    '\u5E73\u65F6\u4E3B\u8981\u5199 Java\uFF0C\u559C\u6B22\u628A\u611F\u5174\u8DA3\u7684\u60F3\u6CD5\u505A\u51FA\u6765\u3002\u6700\u8FD1\u628A\u66F4\u591A\u6CE8\u610F\u529B\u653E\u5728 AI \u5E94\u7528\uFF0C\u4E5F\u5F00\u59CB\u8BFB\u5927\u8BED\u8A00\u6A21\u578B\u4E0E\u5177\u8EAB\u667A\u80FD\u7684\u8D44\u6599\u3002',
                })}
          </p>
          <p>
            {en
              ? 'This site keeps questions, sources and implementation decisions together.'
              : translate({
                  id: 'ui.9282b6e323',
                  message:
                    '\u8FD9\u91CC\u8BB0\u5F55\u9047\u5230\u7684\u95EE\u9898\u3001\u67E5\u8FC7\u7684\u8D44\u6599\u548C\u5C1D\u8BD5\u8FC7\u7684\u65B9\u6CD5\u3002\u628A\u8D44\u6599\u3001\u8BA1\u5212\u4E0E\u9A8C\u8BC1\u8FC7\u7684\u7ED3\u8BBA\u5206\u5F00\uFF0C\u4E5F\u4FDD\u7559\u6682\u65F6\u6CA1\u6709\u7B54\u6848\u7684\u95EE\u9898\u3002',
                })}
          </p>
          <CurrentFocus />
          <Section
            label={uiLabel("SELECTED BUILDS")}
            title={
              en
                ? 'Things you can inspect'
                : translate({
                    id: 'ui.986c64be2d',
                    message:
                      '\u53EF\u4EE5\u6253\u5F00\u770B\u770B\u7684\u4F5C\u54C1',
                  })
            }>
            <ContentRows
              items={entries.filter((e) => e.type === 'project' && e.featured)}
            />
          </Section>
          <Section
            label={uiLabel("HOW I WORK")}
            title={
              en
                ? 'Learn. Experiment. Build. Write.'
                : translate({
                    id: 'ui.83da62e1e4',
                    message:
                      '\u5B66\u4E60\uFF0C\u5B9E\u9A8C\uFF0C\u6784\u5EFA\uFF0C\u8BB0\u5F55\u3002',
                  })
            }>
            <p>
              {en
                ? 'Start with a question, keep the sources, and record the limits of each result.'
                : translate({
                    id: 'ui.51d0291ad7',
                    message:
                      '\u4ECE\u4E00\u4E2A\u5177\u4F53\u95EE\u9898\u51FA\u53D1\uFF0C\u4FDD\u7559\u6765\u6E90\uFF0C\u901A\u8FC7\u5C0F\u5B9E\u9A8C\u9A8C\u8BC1\uFF0C\u518D\u6574\u7406\u6210\u53EF\u590D\u7528\u7684\u8BB0\u5F55\u3002',
                  })}
            </p>
          </Section>
          <Section
            label={uiLabel("TECH")}
            title={
              en
                ? 'Tools at hand'
                : translate({
                    id: 'ui.f07f7fbc5f',
                    message: '\u624B\u8FB9\u7684\u5DE5\u5177',
                  })
            }>
            <p>Java · React · Docusaurus · GitHub Actions</p>
          </Section>
          <Section
            label={uiLabel("ELSEWHERE")}
            title={
              en
                ? 'Beyond the code'
                : translate({
                    id: 'ui.84eb68552f',
                    message: '\u4EE3\u7801\u4E4B\u5916',
                  })
            }>
            <p>
              {en
                ? 'Music, food and quiet time with books.'
                : translate({
                    id: 'ui.27250fc8fe',
                    message:
                      '\u559C\u6B22\u542C\u97F3\u4E50\u3001\u5BFB\u627E\u597D\u5403\u7684\uFF0C\u4E5F\u4EAB\u53D7\u5B89\u9759\u8BFB\u4E66\u7684\u65F6\u95F4\u3002\u8BA4\u771F\u505A\u4E8B\uFF0C\u4E5F\u7ED9\u751F\u6D3B\u7559\u4E00\u4E9B\u7A7A\u767D\u3002',
                  })}
            </p>
            <div className="hh-controls">
              <a href={social.github.href}>GitHub ↗</a>
              <a href={social.twitter.href}>X ↗</a>
              <a href={social.email.href}>Email ↗</a>
              <Link to="/subscribe">RSS →</Link>
            </div>
          </Section>
          <nav
            className="hh-controls"
            aria-label={
              en
                ? 'More about Hohoo'
                : translate({
                    id: 'ui.6c155ab779',
                    message: '\u66F4\u591A\u5173\u4E8E Hohoo',
                  })
            }>
            <Link to="/now">Now →</Link>
            <Link to="/timeline">Timeline →</Link>
            <Link to="/changelog">Changelog →</Link>
          </nav>
          <Comment />
        </div>
      </main>
    </Layout>
  );
}
