import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
export default function CurrentFocus(){
  const en=useDocusaurusContext().i18n.currentLocale==='en';
  return <section><h2>{en?'What has my attention':'最近在做什么'}</h2>
    <p>{en?'I am maintaining this blog and its news pipeline, reading about retrieval and tool use, and preparing small experiments. Embodied intelligence remains a direction for study, starting with papers and simulation.':'最近在维护博客与资讯采集流程，阅读检索增强和工具调用的资料，准备做小规模对照实验。具身智能仍以论文阅读和仿真学习为起点。'}</p>
    <p><Link to="/lab">{en?'Projects and experiment plans →':'查看项目与实验计划 →'}</Link></p>
  </section>;
}
