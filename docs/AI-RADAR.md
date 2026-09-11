# Huhohoo AI Radar

## 1. 定位

AI Radar 是 huhohoo.com 的外部信息输入层。

它不是自动写博客工具，也不是新闻门户。

目标：

```text
Discover → Filter → Cluster → Understand → Connect
```

把外部 AI 前沿变化连接到本站长期学习、Notes、Labs、Projects、Papers 与 Ask Hohoo。

最终知识闭环：

```text
External World
      ↓
   AI Radar
      ↓
Learning / Paper Queue
      ↓
Note → Lab → Project → Blog
      ↓
   Knowledge
      ↑
   Ask Hohoo
```

---

## 2. Pipeline

推荐：

```text
Source Registry
      ↓
Fetch
      ↓
Normalize
      ↓
URL / Hash Dedup
      ↓
Semantic Dedup
      ↓
Event Cluster
      ↓
Classify
      ↓
Score
      ↓
AI Summary
      ↓
Source / Fact Guard
      ↓
Publish / Review / Reject
      ↓
Radar / Digest / Knowledge Connection
```

页面访问不能触发实时批量抓取。采集和 AI 处理应通过调度任务 / Worker / CI / 后台任务独立运行。

---

## 3. Source Strategy

优先级：

```text
API / RSS
> 官方结构化页面
> 原始论文 / 官方仓库
> 高质量媒体
> 社区 Signal
> 普通网页抓取
```

Source Registry 至少保存：

- id
- name
- type
- trustLevel
- topics
- enabled
- fetchStrategy
- interval
- parserVersion

推荐 Source Type：

```text
official
paper
release
media
community
```

社区来源只作为趋势和发现信号，不能默认覆盖 Primary Source。

---

## 4. 工程能力

Crawler / Fetcher 至少考虑：

```text
Scheduler
Rate Limit
Timeout
Retry
Exponential Backoff
Circuit Breaker（有实际需要时）
ETag
Last-Modified
Incremental Fetch
Content Hash
Parser Version
Dead Letter / Failure Record
Observability
```

不要为个人博客过早引入重型消息队列；优先选择与现有部署方式匹配的最小方案。

---

## 5. Dedup & Cluster

去重不能只依赖 URL。

推荐分层：

```text
Canonical URL
      ↓
Content Hash
      ↓
Title Similarity
      ↓
Semantic Similarity
      ↓
Entity + Time Window
      ↓
Event Cluster
```

用户看到“事件”，不是多个重复网页。

Cluster 选择 Primary Source 时优先：

1. 官方发布；
2. 原始论文；
3. 官方仓库 / Release；
4. 高可信二手报道；
5. 社区覆盖。

---

## 6. Classification

一级 Domain：

```text
MODELS
AGENTS
AI CODING
RAG
MULTIMODAL
EMBODIED AI
RESEARCH
INFRA
PRODUCT
OPEN SOURCE
```

二级 Tags：

```text
OpenAI
Anthropic
Gemini
Codex
MCP
Spring AI
Embedding
Reranker
VLM
VLA
...
```

避免把公司名、模型名与 Domain 混成一层。

---

## 7. Scoring

Radar Score 拆成可解释维度：

```text
Relevance
Authority
Novelty
Impact
Trend
Freshness
Personal Relevance
```

初始权重可以配置，但不得成为不可维护的硬编码常量散落在 UI。

Personal Relevance 用于回答：

> 这条资讯对 Hohoo 当前学习与项目到底有多大关系？

可根据：

- AI Application
- Java / Spring AI
- AI Coding / Codex
- RAG / Agent
- LLM
- Embodied AI

动态调整。

---

## 8. AI Summary

推荐结构：

```text
WHAT HAPPENED
WHY IT MATTERS
KEY CHANGES
RELATED KNOWLEDGE
SOURCE
```

AI 输出必须使用结构化 Schema。

必须区分：

```text
AI SUMMARY
HOOHOO'S TAKE
```

后者不能自动生成。

---

## 9. Prompt Injection / Trust Boundary

所有外部内容都是 Data，不是 Instruction。

禁止外部正文控制：

- System Prompt
- Tool Call
- Shell
- File System
- Publication Target
- Secret
- Credentials

Crawler 抓到：

```text
Ignore previous instructions...
```

只能作为普通文本处理。

LLM 只负责：

- 标题规范化
- 摘要
- 分类
- Why It Matters
- Related suggestion

发布决策由受控 Pipeline / Policy 完成。

---

## 10. Publishing Policy

状态：

```text
FETCHED
NORMALIZED
DUPLICATE
REJECTED
REVIEW
APPROVED
PUBLISHED
ARCHIVED
```

建议：

- 高分 + Primary Source + 高 Confidence：可自动发布 Radar Item；
- 中间分数：Review；
- 低相关 / 重复 / 低可信：Reject / Archive。

AI 自动化允许：

- Title normalization
- Summary
- Key changes
- Why It Matters
- Tags
- Translation
- Related Knowledge suggestion
- Digest Draft

不允许自动冒充：

- Hohoo 深度解读
- 我的观点
- 我的结论

---

## 11. Page Architecture

路由建议：

```text
/radar
/radar/<slug-or-date>
/radar/topics/<topic>
/radar/weekly/<year-week>
/radar/trends/<topic>
```

第一阶段不一定全部实现，按 ROADMAP 分期。

Navbar 推荐把 Radar 放在 Learn 下，不额外增加一级导航。

---

## 12. Homepage

最终首页顺序建议：

```text
01 Hero
02 Currently
03 Learning Tracks
04 Latest           ← 我的输出
05 AI Radar         ← 外部输入
06 Featured Builds
07 Latest Lab
08 Learning Activity
09 Footer CTA
```

Radar 只显示 3～5 条最有价值信号。

首页不能变成资讯瀑布流。

---

## 13. Radar Index UX

核心页面效果：

```text
AI RADAR
What's happening at the AI frontier.

ALL · MODELS · AGENTS · AI CODING · RAG ...

RADAR / SIGNAL
MODEL · OFFICIAL                         2H AGO
Title
AI Summary...
Why it matters...
Primary Source ↗
────────────────────────────────────────────
```

用户应该在 5～10 秒内判断：

1. 什么发生了；
2. 为什么值得关注；
3. 来自哪里；
4. 和我的知识体系有什么关系。

---

## 14. Daily / Weekly Digest

Daily：高自动化、短。

Weekly：编辑感更强，可作为长期页面。

```text
RADAR / WEEKLY
2026 · W37

01 MODELS
02 AGENTS
03 AI CODING
04 RESEARCH

WORTH FOLLOWING
SAVED TO KNOWLEDGE
```

只有 Digest 建议进入 Timeline，单条 Signal 默认不进入。

---

## 15. Trend Detection

趋势页面可以显示：

- 7d Signal count；
- 30d Signal count；
- Trend direction；
- 代表事件；
- 相关论文；
- 相关本站知识。

Trend 数值必须来自真实历史数据。

视觉保持极简，不做金融行情式红绿屏。

---

## 16. Paper Radar

论文 Signal 与普通 Release 区别展示。

可以支持：

```text
PAPER SIGNAL / 042
Title
Authors · Published
Topics
AI Summary
Why it may matter
Paper ↗
Code ↗ (if real)
Save to Papers →
```

Save 后进入 Papers Reading Queue；AI 摘要不能直接变成用户论文笔记。

---

## 17. Knowledge Connection

Radar Item 可以关联：

```text
NOTE
DOC
LAB
PROJECT
PAPER
LEARNING ITEM
```

例如：

```text
New Reranking Paper
      ↓
RADAR
      ├── NOTE / Reranker
      ├── DOC / RAG
      ├── LAB / Retrieval Evaluation
      └── PROJECT / Ask Hohoo
```

这一步是 Radar 与普通新闻聚合器最重要的差异。

---

## 18. Ask Hohoo Integration

未来 Ask Hohoo 支持两种知识层：

```text
Published Knowledge  ← 长期、稳定
Radar                 ← 最新、时效
```

默认问题优先长期知识。

涉及：

- 最新
- 最近
- 今天
- 本周
- 新发布
- 前沿进展

时再检索 Radar。

回答 Citation 必须显示：

- 来源类型；
- 原始来源；
- 发布时间 / 抓取时间；
- 本站相关知识。

---

## 19. Observability

至少能回答：

```text
今天抓了多少？
多少成功？
多少重复？
多少 Reject？
多少进入 Review？
多少自动发布？
哪个 Source 连续失败？
平均发现延迟是多少？
```

这些数据首先用于内部运维，不需要全部公开到网站。

---

## 20. Definition of Done

第一阶段完成标准：

- [ ] Source Registry 存在；
- [ ] 抓取与页面请求解耦；
- [ ] 至少两类 Source Strategy；
- [ ] 去重有效；
- [ ] Radar Item 有 Primary Source；
- [ ] AI Summary 有明确标识；
- [ ] 没有自动 `HOOHOO'S TAKE`；
- [ ] `/radar` 可用；
- [ ] 首页 Radar 不超过 5 条；
- [ ] 移动端可读；
- [ ] 外部内容不能执行指令；
- [ ] Blog 在 Radar 服务失败时仍可正常访问；
- [ ] lint / typecheck / test / build（项目实际存在的命令）通过。
