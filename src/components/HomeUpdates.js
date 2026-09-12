import React from 'react';
import { Section, ContentRows, useContent, useEnglish } from './ContentUI';
import { usePluginData } from '@docusaurus/useGlobalData';
import RadarItem from './RadarItem';
export default function HomeUpdates({ position }) {
  const en = useEnglish();
  const { entries, activity } = useContent();
  const { preview } = usePluginData('radar-pages');
  if (position === 'activity')
    return (
      <>
        <Section
          label="LATEST LAB"
          title={en ? 'From question to evidence' : '从问题，到证据'}
          to="/labs">
          <ContentRows
            items={activity.filter((e) => e.type === 'lab').slice(0, 1)}
            empty="暂无已完成实验。"
          />
        </Section>
        <Section
          label="LEARNING ACTIVITY"
          title={en ? 'A record of making' : '留下真实的足迹'}
          to="/timeline">
          <ContentRows items={activity.slice(0, 4)} />
        </Section>
      </>
    );
  return (
    <>
      <Section
        label="LATEST / FROM HOOHOO"
        title={en ? 'Recently published' : '最近发布'}
        to="/blog">
        <ContentRows
          items={activity
            .filter((e) => ['doc', 'blog', 'note'].includes(e.type))
            .slice(0, 4)}
        />
      </Section>
      <Section
        label="AI RADAR / EXTERNAL SIGNALS"
        title={en ? 'Beyond this notebook' : '来自外部世界的线索'}
        to="/radar">
        <div className="hh-radar">
          {preview.map((item) => (
            <RadarItem key={item.id} item={item} compact />
          ))}
        </div>
      </Section>
    </>
  );
}
