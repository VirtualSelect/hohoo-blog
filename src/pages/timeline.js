import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
import Layout from '@theme/Layout';
import {
  useContent,
  useEnglish,
  ContentRows,
} from '@site/src/components/ContentUI';
export default function Timeline() {
  const en = useEnglish();
  const { activity } = useContent();
  return (
    <Layout
      title={en ? 'Learning activity' : '学习活动'}
      description="真实发布的文章、笔记、实验、项目与周汇总。">
      <main className="hh-page">
        <p className="hh-eyebrow">{uiLabel("LEARNING ACTIVITY")}</p>
        <h1>
          {en
            ? 'A record of learning and building.'
            : '学习与构建，留下真实足迹。'}
        </h1>
        <p className="hh-lead">
          {en
            ? 'Published work and documented milestones. Individual external signals stay in Radar.'
            : '按真实日期回看文章、笔记、实验、项目与周汇总。单条外部资讯留在 Radar。'}
        </p>
        <ContentRows items={activity} />
      </main>
    </Layout>
  );
}
