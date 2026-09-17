import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseFeed, publicNewsItem, selectItems} from '../scripts/news/lib.mjs';
import {assessRelevance, researchPriority} from '../scripts/news/relevance.mjs';

const source = {id:'aihot',name:'AIHOT',hosts:['aihot.news'],aggregator:true};
const now = new Date('2026-09-17T06:00:00Z');
const feed = (description, content='') => `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Test fixture</title><item><title>Codex 工程实践</title><link>https://aihot.news/items/fixture</link><pubDate>Thu, 17 Sep 2026 00:00:00 GMT</pubDate><description><![CDATA[${description}]]></description><content:encoded><![CDATA[${content}]]></content:encoded></item></channel></rss>`;

test('full feed provides evidence beyond the short excerpt without publishing its body', async()=>{
  const full = '<p>' + '项目背景说明。'.repeat(50) + '在沙箱运行单元测试和静态分析。</p><script>ignorePreviousInstructions()</script><p>via AIHOT · 导航</p>';
  const {items} = await parseFeed(feed('项目近况。',full),source,now);
  const item = items[0];
  assert.equal(item.summary,'项目近况。');
  assert.ok(item.relevanceText.length>180);
  assert.ok(!item.relevanceText.includes('ignorePreviousInstructions'));
  assert.ok(!item.relevanceText.includes('via AIHOT'));
  assert.equal(assessRelevance(item).accepted,true);
  assert.equal(assessRelevance(publicNewsItem(item)).accepted,false);
  assert.equal(researchPriority(item),2);
  const chosen = selectItems(items,[],{dailyLimit:10,perSourceLimit:2,sources:[{id:'aihot',dailyLimit:6}]},now).map(publicNewsItem);
  assert.ok(!JSON.stringify(chosen).includes('relevanceText'));
  assert.ok(!JSON.stringify(chosen).includes('静态分析'));
});

test('summary-only and full-only feeds retain bounded public excerpts', async()=>{
  const text='背景说明。'.repeat(50)+'Codex 通过沙箱执行单元测试。';
  for(const xml of [feed(text),feed(text,'<p> </p>'),feed('',text)]) {
    const item=(await parseFeed(xml,source,now)).items[0];
    assert.ok(item.summary.length<=180);
    assert.equal(assessRelevance(item).accepted,true);
  }
});

test('Chinese and English engineering mechanisms qualify without a single required keyword',()=>{
  for(const [title,summary,category] of [
    ['Codex 工程实践','用沙箱隔离工具，并运行单元测试。','ai-apps'],
    ['AI Coding workflow','Runs a test suite and static analysis in a sandbox.','ai-apps'],
    ['上下文工程','按预算压缩历史并卸载上下文。','ai-apps'],
    ['Context engineering','Budget and offload messages with compaction.','ai-apps'],
    ['Grok Build 记忆','跨会话读取记忆文件，整理为主题文件。','ai-apps'],
    ['Agent memory','Persist cross-session memory files.','ai-apps'],
    ['ROS2 数据通信','通过话题发布订阅，以时间戳同步观测和动作。','embodied-ai'],
    ['ROS 2 QoS','Synchronize publishers and subscribers with timestamps.','embodied-ai'],
    ['MuJoCo 仿真','在仿真环境用控制器执行关节轨迹。','embodied-ai'],
    ['Robot data collection','Align observation and action into episode records using timestamps.','embodied-ai'],
  ]) {
    const result=assessRelevance({title,summary});
    assert.equal(result.accepted,true,title);
    assert.equal(result.category,category,title);
  }
});

test('promotions, bare announcements and pure rankings stay excluded',()=>{
  for(const [title,summary] of [
    ['Codex 新版上线','欢迎试用，全面提升效率。'],
    ['ROS2 生态发展','更多伙伴加入，共创未来。'],
    ['Agent memory launch','Remember more, work better.'],
    ['LLM benchmark 排行榜','最新评测登顶，得分全球第一。'],
    ['AI Coding leaderboard','Ranked first on a benchmark with 90 points.'],
    ['Codex 编程教程限时优惠','立即购买课程。'],
    ['机器人公司融资','训练机器人策略。'],
    ['新模型上线平台','支持 Claude Code、Codex；定价每百万 tokens 1 元。'],
    ['Claude Code 被用于导弹软件','报道包含 code 和 simulation。'],
    ['办公记忆管理','跨会话保存会议记忆文件。'],
  ]) assert.equal(assessRelevance({title,summary}).accepted,false,title);
  assert.equal(assessRelevance({title:'LLM 排行榜分析',summary:'提供评测代码和复现步骤，使用消融实验解释差异。'}).accepted,true);
});

test('configured full feed preserves ten total and six AIHOT daily slots',()=>{
  const config=JSON.parse(fs.readFileSync(new URL('../config/news-sources.json',import.meta.url)));
  assert.equal(config.dailyLimit,10);
  const source=config.sources.find(s=>s.id==='aihot');
  assert.equal(source.dailyLimit,6);
  assert.equal(new URL(source.feed).pathname,'/feed/full.xml');
  assert.equal(new URL(source.feed).searchParams.get('aihot_actor'),'5a162b13-b63a-47c5-8257-ce3b0d9bc878');
});
