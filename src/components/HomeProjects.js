import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import topics from '@site/data/topics';
import { Status, useContent } from './ContentUI';
import styles from './HomeProjects.module.css';

export default function HomeProjects({ en }) {
  const t = (zh, english) => (en ? english : zh);
  const { entries } = useContent();
  const papers = entries.filter((e) => e.type === 'paper');
  const project = entries.find(
    (p) => p.type === 'project' && p.featured && p.status !== 'planning',
  );
  if (!project) return null;
  return (
    <section className={styles.section} aria-labelledby="projects-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>{uiLabel("FEATURED BUILDS")}</p>
          <Heading as="h2" id="projects-title">
            {t('把想法，做成看得见的东西。', 'Ideas, made tangible.')}
          </Heading>
        </div>
        <Link to="/projects">{t('项目与实验', 'Project lab')} ↗</Link>
      </div>
      <article className={styles.feature}>
        <div
          className={styles.overview}
          role="img"
          aria-label={t(
            '博客功能总览：文章与研究连接资讯时间轴和个人阅读清单',
            'Blog overview: writing and research connect to the news timeline and saved reading',
          )}>
          <div className={styles.windowBar}>
            <span>● ● ●</span>
            <span>huhohoo.com</span>
            <span>↗</span>
          </div>
          <div className={styles.canvas}>
            <small>{uiLabel("HOHOO / DIGITAL GARDEN")}</small>
            <strong>
              {t('学习有迹，实践有形。', 'Notes into knowledge.')}
            </strong>
            <div className={styles.map}>
              <span>
                01 <b>{t('文章', 'Writing')}</b>
                <i>{t('记录与复盘', 'Notes & reflections')}</i>
              </span>
              <span>
                02 <b>{t('研究', 'Research')}</b>
                <i>AI · LLM · Robotics</i>
              </span>
              <span>
                03 <b>{t('资讯', 'News')}</b>
                <i>{t('精选摘要时间轴', 'Curated timeline')}</i>
              </span>
              <span>
                04 <b>{t('稍后读', 'Reading')}</b>
                <i>{t('收藏与进度', 'Save & revisit')}</i>
              </span>
            </div>
            <div className={styles.diagramFooter}>
              <span>{t('站点功能总览', 'SITE OVERVIEW')}</span>
              <span>React / Docusaurus</span>
            </div>
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.badges}>
            <Status value={project.status} />
            <span>{project.stack.join(' · ')}</span>
          </div>
          <h3>{project.title}</h3>
          <p>
            {en
              ? project.descriptionEn || project.description
              : project.description}
          </p>
          <dl>
            <div>
              <dt>{String(topics.length).padStart(2, '0')}</dt>
              <dd>{t('研究方向', 'Research topics')}</dd>
            </div>
            <div>
              <dt>{String(papers.length).padStart(2, '0')}</dt>
              <dd>{t('论文导读', 'Paper guides')}</dd>
            </div>
            <div>
              <dt>RSS</dt>
              <dd>{t('独立订阅', 'Separate feeds')}</dd>
            </div>
          </dl>
          <div className={styles.links}>
            <Link to={'/projects/' + project.slug}>
              {t('查看项目', 'View project')} →
            </Link>
            <a href={project.repo} target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
          </div>
        </div>
      </article>
      {entries
        .filter(
          (entry) =>
            entry.type === 'project' &&
            entry.featured &&
            entry.id !== project.id &&
            entry.status !== 'planning',
        )
        .map((entry) => (
          <article className={styles.pipeline} key={entry.id}>
            <div className={styles.pipelineIcon} aria-hidden="true">
              ↳
            </div>
            <div>
              <span className={styles.kicker}>PROJECT / {entry.number}</span>{' '}
              <Status value={entry.status} />
              <h3>{en ? entry.titleEn || entry.title : entry.title}</h3>
              <p>
                {en
                  ? entry.descriptionEn || entry.description
                  : entry.description}
              </p>
            </div>
            <Link to={'/projects/' + entry.slug}>
              {t('查看代码与实践', 'Explore the demos')} →
            </Link>
          </article>
        ))}
      <article className={styles.pipeline}>
        <div className={styles.pipelineIcon} aria-hidden="true">
          ↳
        </div>
        <div>
          <span className={styles.kicker}>{uiLabel("BEHIND THE LAB")}</span>{' '}
          <Link to="/changelog">Changelog →</Link>
          <h3>{t('研究资讯采集流水线', 'Research news pipeline')}</h3>
          <p>
            {t(
              '从订阅源到阅读时间轴：采集、筛选、检查、发布。每一步都留在代码里。',
              'From feeds to a reading timeline: collect, filter, check and publish. The implementation is open to explore.',
            )}
          </p>
        </div>
        <a
          href="https://github.com/VirtualSelect/hohoo-blog/tree/main/scripts/news"
          target="_blank"
          rel="noopener noreferrer">
          {t('查看实现', 'View implementation')} ↗
        </a>
      </article>
    </section>
  );
}
