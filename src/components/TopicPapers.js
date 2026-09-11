import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import papers from '@site/data/papers.json';

export default function TopicPapers({category}) {
  const en=useDocusaurusContext().i18n.currentLocale==='en';
  return <section><h2>{en?'Paper reading guides':'论文阅读入口'}</h2>
    <ul>{papers.filter(p=>p.categories.includes(category)).map(p=><li key={p.id}><Link to={'/papers#'+p.slug}>{p.short} · {p[en?'en':'zh'].question}</Link></li>)}</ul>
  </section>;
}
