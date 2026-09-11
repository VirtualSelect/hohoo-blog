import React from 'react';
import Link from '@docusaurus/Link';
import styles from '@site/src/pages/learning.module.css';
export default function LearningNavigation({active, en}) {
  return <nav className={styles.tabs} aria-label={en ? 'Learning navigation' : '学习导航'}>
    <Link to="/learning" aria-current={active === 'learning' ? 'page' : undefined}>{en ? 'Reading paths' : '阅读路线'}</Link>
    <Link to="/timeline" aria-current={active === 'timeline' ? 'page' : undefined}>{en ? 'Learning timeline' : '学习时间轴'}</Link>
    <Link to="/docs/skill">{en ? 'All topics' : '专题总览'}</Link>
  </nav>;
}
