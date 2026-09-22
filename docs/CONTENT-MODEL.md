# Huhohoo Content Model

## 本地学习背包与证据入口（2026-09-19）

- `huhohoo.practice.v1:docs/ai-apps/java-first-llm`：`{version:1,completed:string[]}`，仅 environment/request/parse/history 四项访客自检，不是作者进度或自动验证。
- 背包文件：`{version:1,kind:"huhohoo-backpack",records:{[storageKey]:rawJsonString}}`，最大 2 MB / 1000 份记录。白名单仅 reading.v2 / learning.v1 / reflection.v1 与上述 practice.v1。未知版本、字段和非法记录拒绝导入，不静默降级。已有阅读和学习旧键迁移沿用原 hook；备份格式未来升级须新增显式迁移。
- 导入冲突按整份记录处理，默认保留本地；覆盖为读者显式选择。执行前再次校验预览快照。存储失败尝试回滚，回滚失败明确提示；不宣称浏览器存储具有事务保证或跨设备自动同步。
- `data/article-history.json`：以无语言前缀 route 为键，记录真实 date / commit / 三语言 summary。当前仅核实 Java 首篇发布提交。日期不是部署时间或再次核验时间，无记录的文章隐藏此模块。
- `data/radar-practice.json`：显式 signalId / 三语言 question / 本站 href / 三语言 label。它是维护者可编辑的阅读问题，不是 HOOHOO'S TAKE、论文复现结果或自动生成的结论；来源记录不改动。

## Journey 计划模型

虚拟实验注册表位于 `data/journey-labs.json`，通过 engine / milestones / project 关联，不复制成正式 Lab 成果。状态 planning / learning / completed / future；completed 要求真实日期、result 与 evidence，规划状态不允许成果字段。模型类型与验证位于 `apps/web/lib/journey.mjs`，显示文案使用 journey.* 翻译键。主项目目标架构和实验闭环保存在 Journey 模型，未知当前周和当前实验为 null。

`data/journey.json` 为独立的作者学习计划，schema version 1；模型字段及维护流程见 [JOURNEY.md](JOURNEY.md)。计划不进入原创文章索引或 Timeline；已有文章通过引用关联。作者状态和访客本地阅读状态保持独立。


## 实践文章初稿与代码入口

- 实践初稿可使用 `unlisted: true`、`status: learning`：生成可审阅路由，但不进入已发布内容索引、学习路线索引和 sitemap。不填写虚构的发布日期；正式发布时移除 unlisted，补充真实日期、阅读时长与 learning_step。
- Project 可选 `resources: [{label,labelEn,description,descriptionEn,href}]`，用于稳定版本的 Demo 目录和明确标注初稿的配套文章。正文由文章维护，完整代码由独立仓库维护。
- `hohoo-ai-lab` 作为一个 building 项目，三个 Demo 是项目内阶段，不拆成三个项目，不标记为 production。

## 第二阶段实现约定（2026-09-11）

以下是当前实现的增量字段，优先于后文概念示例；不要求回填未知历史值。

- 导航目录：`data/navigation.cjs`；页面入口、Navbar/Footer、搜索快捷导航共用。
- 通用可选字段：`provenance`（author / ai-summary / source-excerpt / paper-abstract / auto-translation / experiment-result）、`lastVerified`、`contentStatus`（current / may-be-outdated / historical）。缺失时隐藏，更新时间不等于核验时间。
- 实验：沿用既有 `planning` 存储值，UI 显示 PLANNED；支持 running / completed / inconclusive / archived。`design.zh/en` 包含 hypothesis、variables.independent/controlled/dependent、dataset、baseline、metrics、successCriteria、risks、reproduce。设计是提案，不是实验结论。
- `experimentLog: [{date,title}]` 仅保存实际发生的执行记录。result / observations / conclusion / limitations 分开；没有结果就不填。
- Project：`architecture: string[]` 使用 CSS 图；可选 screenshots（src/alt/width/height）、decisions（id/title/decision/context/alternatives/why/tradeoffs）、metrics（label/value/evidence）。没有真实证据则不显示。
- `data/build-log.json` 从真实 Git 提交整理：project / commit / date / title。供 Project 与 Changelog 复用；不是部署日志，不编造版本号。
- Paper：number、version（当前从已存 URL 的版本读取）、authors、venue、code、projectPage、readingStatus。`comparison` 可保存 method / task / architecture / retrieval / training / evaluation / code；未实现复杂比较界面。
- Paper 的 `myNotes` 仅供人工填写：author 必须为 Hohoo，readingStatus 必须为 read；learned / surprised / disagree / openQuestions 可选。访客的本地已读状态不能让作者笔记自动出现。
- Reading Inbox：`huhohoo.reading.v2`，`{version:2,saved,read,reading,savedAt}`。从 `hohoo-news-reading-v1` 迁移，保留旧键；没有历史 savedAt 不补造。学习状态仍使用 `huhohoo.learning.v1`，Inbox 通过适配器合并展示。选题尚未发布不能在 Inbox 冒充已读文章。
- Search：构建时生成精简 title/description/type/topic/tags/href/status 索引，当前 Next.js 页面通过 SiteContext 提供给搜索组件。支持 type:paper / type:lab / topic:embodied（embodied-ai 别名）。搜索覆盖标题、摘要与标签，不宣称全文检索。空查询的最近文章与首页复用 writingEntries，只展示真实已发布内容。
- Radar 页面状态使用 q / domain / source URL 参数；未知筛选值回退到全部。列表来源最近收录时间取真实 collectedAt，时间轴仍使用 publishedAt，不冒充工作流运行时间。
- Notes 仍仅发布 status=published 的真实内容。草稿使用现有 `docs/templates/note.md`，不自动创建 Hohoo 已发布笔记。


## 1. Purpose

本文件定义 huhohoo.com 的长期内容类型、Metadata、Front Matter 与内容关系规范。

目标不是一开始建立复杂 CMS，而是让 Markdown / MDX 内容能够：

- 被索引；
- 被搜索；
- 被首页复用；
- 形成学习路线；
- 建立 Related / Prerequisite；
- 进入 Timeline；
- 最终可以被 Ask Hohoo 检索。

原则：

> **Simple schema, rich relationships.**

---

# 2. Content Types

长期内容类型：

```text
doc
blog
note
project
lab
paper
resource
glossary
radar-item
radar-digest
```

其中 Glossary 推荐主要作为“索引数据”，不要为每个 Term 创建大篇重复内容。

---

# 3. Common Fields

所有新内容尽量支持以下公共字段。

> 实际字段需结合 `lib/content` 与 Next.js 内容加载器；旧内容不要求一次迁移。

```yaml
title: string
description: string
slug: string # optional when framework derives it
date: YYYY-MM-DD
updated: YYYY-MM-DD # optional
status: string
domain: string
tags:
  - string
readingTime: number # optional; only when truly managed manually
related:
  - content-id
prerequisites:
  - content-id
```

## 3.1 `title`

必须清楚具体。

推荐：

```text
Spring AI Tool Calling
理解 Embedding：从向量到语义检索
RAG Chunk Size 实验
```

避免：

```text
一些思考
学习笔记
测试
```

## 3.2 `description`

1～2 句摘要，用于：

- SEO；
- Card/List；
- Search；
- Ask Hohoo 内容摘要。

不要与正文第一段机械重复。

## 3.3 `date` / `updated`

- `date`：首次正式发布；
- `updated`：有实质内容更新时修改；
- 小型拼写修复无需制造“更新”。

## 3.4 `domain`

建议稳定枚举：

```text
ai-apps
llm
embodied-ai
engineering
meta
```

可以按实际内容增加，但不要同义词泛滥。

错误示例：

```text
llm
large-language-model
large-model
大模型
```

这些不应同时作为 domain。

## 3.5 `tags`

Tag 用于横向主题。

示例：

```text
rag
agent
spring-ai
java
embedding
transformer
vlm
vla
mcp
```

每篇建议 2～5 个，不追求数量。

---

# 4. Content ID

为了建立跨内容关系，建议为新内容提供稳定 ID。

格式：

```text
<type>:<slug>
```

例如：

```text
note:embedding
note:kv-cache
doc:rag-from-scratch
lab:rag-chunk-size
project:ask-hohoo
paper:attention-is-all-you-need
```

优点：

- 路由未来变化时关系不必依赖 URL；
- Ask Hohoo Citation 更稳定；
- Knowledge Map 更容易生成。

如果当前架构中直接使用 slug 更简单，可以第一阶段只使用 slug，但必须保持唯一和稳定。

---

# 5. Relationship Model

推荐关系：

```yaml
prerequisites:
  - note:embedding
  - note:vector-database

related:
  - lab:rag-chunk-size
  - project:ask-hohoo
```

后续如需求真实出现，可增加语义更明确的关系：

```yaml
projects:
  - project:ask-hohoo
labs:
  - lab:rag-chunk-size
papers:
  - paper:...
```

第一阶段不要把关系 schema 设计得过于复杂。

---

# 6. Status Model

## General

```text
planning
learning
building
experiment
published
archived
```

## Project

```text
planning
building
experiment
production
archived
```

## Lab

```text
planning
running
completed
archived
```

## Paper

```text
to-read
reading
read
```

代码中的 UI Label 可以转换为：

```text
building → Building
completed → Completed
```

内容中只存语义值，不存颜色。

---

# 7. Docs

## Purpose

系统化教程与学习路线核心内容。

建议 Front Matter：

```yaml
---
id: rag-from-scratch
title: RAG From Scratch
description: 从检索、上下文构建到生成，理解 RAG 的完整工作流程。
domain: ai-apps
difficulty: intermediate
status: published
tags:
  - rag
  - retrieval
prerequisites:
  - note:embedding
  - note:vector-database
related:
  - lab:rag-chunk-size
  - project:ask-hohoo
---
```

### Difficulty

稳定使用：

```text
beginner
intermediate
advanced
```

避免：

```text
easy
basic
starter
medium
hard
```

多套并存。

---

# 8. Notes

## Purpose

原子知识，通常围绕一个概念或一个具体问题。

建议长度：

```text
约 300～800 字（不是硬限制）
```

结构建议：

```text
一句话
WHY
HOW
WHEN IT MATTERS
RELATED
```

Front Matter：

```yaml
---
id: note:kv-cache
title: KV Cache
description: KV Cache 通过缓存历史 Token 的 Key/Value，减少自回归生成中的重复计算。
domain: llm
status: published
tags:
  - inference
  - transformer
aliases:
  - Key-Value Cache
related:
  - note:attention
  - note:context-window
---
```

## `aliases`

用于：

- Glossary Search；
- Ask Hohoo Retrieval；
- 同义词匹配。

不要把 Tag 当 Alias 使用。

---

# 9. Glossary

Glossary 的职责：

> 快速查词 + 指向权威站内内容。

建议每个 term 数据：

```ts
{
  term: 'RAG',
  fullName: 'Retrieval-Augmented Generation',
  description: '检索增强生成：先检索相关外部知识，再将其提供给模型生成回答。',
  domain: 'ai-apps',
  aliases: ['检索增强生成'],
  target: 'doc:rag-from-scratch'
}
```

规则：

- description 保持 1～2 句；
- 长解释写 Note / Docs；
- target 优先链接到站内最佳内容；
- 不复制整篇 Note。

---

# 10. Projects

## Purpose

展示“真实做出了什么”。

Project Detail 不应只是 README 镜像。

推荐 Front Matter：

```yaml
---
id: project:ask-hohoo
title: Ask Hohoo
description: 基于 huhohoo.com 已发布内容构建的个人知识库 AI 助手。
date: 2026-09-01
updated: 2026-09-11
status: building
domain: ai-apps
tags:
  - rag
  - spring-ai
  - java
stack:
  - Java
  - Spring AI
  - PostgreSQL
repo: null
demo: null
featured: true
related:
  - doc:rag-from-scratch
  - note:embedding
labs:
  - lab:rag-chunk-size
---
```

## Optional Fields

```yaml
repo: https://...
demo: https://...
featured: true
cover: /img/...
```

只有真实存在时才填写。

## Detail Structure

```text
Overview
Problem
Goal
Architecture
Tech Stack
Decisions
Challenges
Metrics
Lessons
Related
```

### Metrics

Metrics 必须是实测数据。

推荐结构：

```yaml
metrics:
  latencyP50Ms: 820
  latencyP95Ms: 1600
```

不要使用：

```yaml
successRate: 99%
```

除非确实有定义、样本和测量方式。

如果 metrics 复杂，优先写在正文，而不是把 Front Matter 变成数据库。

---

# 11. Labs

## Purpose

Lab 的核心是：

> 一个明确问题 + 一套可复现方法 + 证据 + 有边界的结论。

Front Matter：

```yaml
---
id: lab:rag-chunk-size
title: RAG Chunk Size 实验
description: 比较不同 Chunk Size 对当前知识库检索结果的影响。
date: 2026-09-10
status: running
domain: ai-apps
question: 不同 Chunk Size 如何影响当前数据集上的检索质量？
tags:
  - rag
  - evaluation
  - chunking
related:
  - doc:rag-from-scratch
  - project:ask-hohoo
---
```

不要在实验完成前填写 `completed`。

## Detail Structure

```text
Question
Hypothesis
Setup
Method
Result
Observations
Conclusion
Limitations
Reproduce
Related
```

## Setup

正文中记录：

- Model Version；
- Embedding Model；
- Dataset；
- Parameters；
- Database；
- Hardware（相关时）；
- Date。

## Observation vs Conclusion

必须区分。

示例：

```text
Observation:
在当前 50 条测试问题中，400-token chunk 的 Recall@5 高于 800-token chunk。

Conclusion:
只能说明当前数据集和配置下 400-token 更适合，不代表所有 RAG 系统都应该使用 400。
```

---

# 12. Papers

## Purpose

论文阅读重点是“自己的理解”，不做全文翻译。

Front Matter：

```yaml
---
id: paper:attention-is-all-you-need
title: Attention Is All You Need
description: Transformer 奠基论文阅读记录。
year: 2017
status: read
domain: llm
authors:
  - Ashish Vaswani
  - Noam Shazeer
paperUrl: https://arxiv.org/abs/1706.03762
tags:
  - transformer
  - attention
related:
  - note:attention
---
```

## Detail Structure

```text
Why I Read It
Problem
Core Idea
Architecture
Experiment
Result
Limitation
My Take
Related
```

`My Take` 是这个内容类型的重要价值。

---

# 13. Resources

## Purpose

精选，不求全。

推荐数据结构：

```yaml
id: resource:spring-ai
title: Spring AI
type: framework
description: Spring 生态中的 AI 应用开发框架。
url: https://spring.io/projects/spring-ai
domain: ai-apps
tags:
  - java
  - spring-ai
recommendedFor:
  - Java Developer
  - Spring Developer
why: 与 Spring 体系集成自然，适合作为 Java 开发者进入 AI 应用开发的入口。
related:
  - doc:spring-ai-intro
```

### Type

建议稳定枚举：

```text
course
book
paper
tool
framework
model
blog
github
embodied-ai
```

如果未来出现新类型再增加。

每条必须有 `why` 或等价说明，避免变成网址收藏夹。

---

# 14. Blog

Blog 用于：

- 开发总结；
- 阶段复盘；
- 观点；
- 工具实践；
- 个人随笔。

Blog 不需要被 Learning Path 强行约束。

但可以通过 metadata 关联：

```yaml
related:
  - project:ask-hohoo
  - lab:rag-chunk-size
```

---

# 15. Timeline Event Model

Timeline 可以从内容自动生成，也可以保留少量显式事件。

推荐事件类型：

```text
article
note
lab
project
paper
radar-digest
```

自动生成时：

- 发布时间使用内容 `date`；
- Project 状态变更如果没有真实历史记录，不要反推伪造事件；
- 同一天内容按明确规则排序；
- 单条 `radar-item` 默认不进入 Timeline；
- Daily / Weekly Digest 可作为 `radar-digest` 进入 Timeline。

示意：

```ts
{
  date: '2026-09-11',
  type: 'lab',
  title: 'RAG Chunk Size Experiment',
  href: '/labs/rag-chunk-size'
}
```

---

---

# 15A. AI Radar Content Model

Radar 是外部信息的“信号层”，与 Blog / Note / Doc 分开。

## Source Registry

建议：

```ts
interface RadarSource {
  id: string;
  name: string;
  type: 'official' | 'paper' | 'media' | 'community' | 'release';
  homepage?: string;
  trustLevel: 'primary' | 'high' | 'medium' | 'signal';
  topics: string[];
  enabled: boolean;
  fetchStrategy: 'api' | 'rss' | 'html';
  interval?: string;
  parserVersion?: string;
}
```

Source ID 必须稳定。

## Radar Item

建议核心字段：

```ts
interface RadarItem {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;

  summary?: string;
  whyItMatters?: string;
  hohoosTake?: string; // only if manually authored

  sourceId: string;
  sourceType: RadarSource['type'];
  sourceUrl: string;
  canonicalUrl?: string;
  authors?: string[];

  publishedAt?: string;
  fetchedAt: string;

  domain: string;
  topics: string[];
  tags: string[];
  language?: string;

  contentHash?: string;
  semanticHash?: string;
  clusterId?: string;

  radarScore?: number;
  relevanceScore?: number;
  authorityScore?: number;
  noveltyScore?: number;
  impactScore?: number;
  trendScore?: number;
  freshnessScore?: number;
  personalRelevanceScore?: number;
  confidence?: number;

  status:
    | 'fetched'
    | 'normalized'
    | 'duplicate'
    | 'rejected'
    | 'review'
    | 'approved'
    | 'published'
    | 'archived';

  related?: string[];

  aiGenerated?: boolean;
  aiModel?: string;
  promptVersion?: string;
  parserVersion?: string;

  createdAt: string;
  updatedAt: string;
}
```

### `hohoosTake`

禁止由自动摘要流程填充。只有用户本人实际撰写/确认后才能存在。

### `publishedAt` vs `fetchedAt`

必须分开：

- `publishedAt`：来源原始发布时间；
- `fetchedAt`：Radar 首次发现/抓取时间。

如果来源没有可信发布时间，可以只保留 `fetchedAt`，不得猜测。

## Event Cluster

同一事件多来源聚合：

```ts
interface RadarCluster {
  id: string;
  canonicalTitle: string;
  summary?: string;
  primaryItemId: string;
  itemIds: string[];
  topics: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  importance?: number;
}
```

Primary Item 优先选择：

1. 官方 Primary Source；
2. 原始论文 / 官方仓库；
3. 高可信来源；
4. 其他覆盖。

## Radar Score

概念上拆分：

```text
Relevance
Authority
Novelty
Impact
Trend
Freshness
Personal Relevance
```

具体权重应放配置，不写进内容文件。

UI 只在真实需要时展示结果，不需要把内部所有分数暴露给用户。

## Radar Topic Domain

一级推荐稳定枚举：

```text
models
agents
ai-coding
rag
multimodal
embodied-ai
research
infra
product
open-source
```

公司、模型、框架名称进入 tags。

## AI Summary Contract

AI 处理层应优先输出结构化字段：

```ts
interface RadarSummaryOutput {
  normalizedTitle: string;
  summary: string;
  whyItMatters?: string;
  domain: string;
  topics: string[];
  tags: string[];
  confidence: number;
}
```

LLM 不得决定发布目标、运行 Shell、读取 Secret 或修改系统配置。

## Radar Digest

```ts
interface RadarDigest {
  id: string;
  type: 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  itemIds: string[];
  sections: {
    topic: string;
    itemIds: string[];
    summary?: string;
  }[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
}
```

Digest 可以进入 Timeline。单条 Item 默认不进入。

## Paper Signal → Papers

Radar 中发现论文后，允许显式转为：

```text
paper:<slug>
```

转换时保留来源关系，例如：

```yaml
related:
  - radar:<signal-id>
```

但 Paper Note 仍需要用户真实阅读内容，不能直接把 AI 摘要冒充为阅读笔记。

## Related Knowledge

Radar 可以显式关联：

```text
doc:*
note:*
lab:*
project:*
paper:*
```

建议关系语义：

```text
related
informed-by
follow-up
```

第一阶段仍可统一使用 `related`，不要过早复杂化。

---

# 16. Learning Path Model

推荐每个 Learning Item：

```ts
{
  id: 'doc:rag-from-scratch',
  track: 'build',
  order: 4,
  difficulty: 'intermediate',
  prerequisites: ['note:embedding'],
  content: 'doc:rag-from-scratch'
}
```

Track：

```text
build
understand
explore
```

映射：

```text
build      → AI Applications
understand → LLM
explore    → Embodied AI
```

学习状态属于**用户本地状态**，不要写入内容文件：

```text
not-started
reading
completed
saved
```

---

# 17. Local Progress Schema

推荐：

```ts
interface LearningProgressV1 {
  version: 1;
  items: Record<string, {
    status: 'reading' | 'completed';
    updatedAt: string;
  }>;
  saved: string[];
  lastOpened?: string;
}
```

Storage Key：

```text
huhohoo.learning.v1
```

升级 schema 时：

- 新建 `v2`；或
- 提供 migration；
- 不假设旧 localStorage 永远合法。

---

# 18. Related Content Resolution

Related 的解析顺序建议：

1. 显式 `related`；
2. `prerequisites`；
3. 同主题 metadata；
4. 最后才做自动推荐。

不要仅凭同 Tag 随机推荐三个内容。

Related UI 需要显示内容类型：

```text
NOTE
Embedding

LAB
Chunk Size Experiment

PROJECT
Ask Hohoo
```

---

# 19. Knowledge Map Data

第一阶段可由内容关系转换：

```ts
Node {
  id
  type
  title
  domain
  href
}

Edge {
  source
  target
  relation: 'prerequisite' | 'related' | 'used-by' | 'informed-by'
}
```

不要在 Knowledge Map 单独维护内容标题和 description 的第二份副本。

图谱数据应该从内容 registry / metadata 派生。

---

# 20. Ask Hohoo Indexing Contract

为了未来 RAG，每个可索引内容建议最终能导出：

```ts
interface SearchDocument {
  id: string;
  type: ContentType | 'radar-item' | 'radar-digest';
  title: string;
  description?: string;
  url: string;
  domain?: string;
  tags: string[];
  text: string;
  updated?: string;
  publishedAt?: string;
  sourceUrl?: string;
  sourceType?: string;
  freshness?: 'evergreen' | 'current';
}
```

Chunk 后每块至少保留：

```ts
interface SearchChunk {
  chunkId: string;
  documentId: string;
  text: string;
  headingPath?: string[];
  url: string;
  title: string;
}
```

这样 Citation 可以映射回：

```text
Document → Heading → URL
```

不要把向量数据库 ID 作为用户可见 Citation。

Ask Hohoo 默认索引长期 Published Knowledge。Radar 建议使用独立索引/namespace 或至少保留 `freshness=current`，只有涉及最新动态的问题再参与检索，避免短期资讯覆盖长期知识。

---

# 21. Search Contract

站内 Search 最终应能返回：

```text
Docs
Blog
Notes
Projects
Labs
Papers
Resources (optional)
Radar
```

每个 Result 至少需要：

```text
type
title
description/url
```

Search UI 不应暴露底层内容目录结构。

---

# 22. Filename / Slug Naming

建议：

```text
kebab-case
```

例如：

```text
rag-from-scratch.mdx
kv-cache.mdx
rag-chunk-size.mdx
ask-hohoo.mdx
```

避免：

```text
RAG最终版2.mdx
学习笔记-new.mdx
test1.md
```

Slug 一旦公开，尽量保持稳定。

---

# 23. Content Directory

实际目录以当前项目能力为准。

如果需要新增内容目录，可考虑：

```text
content/
├── notes/
├── projects/
├── labs/
├── papers/
├── resources/
└── radar/ # only if radar is file-backed; DB/API-backed is also acceptable
```

或者继续使用现有内容数据层，按内容类型聚合。

**不要仅因为本文件示意而立即重构目录。**

Codex 必须先评估：

- 当前内容插件；
- 路由；
- Sidebar；
- Search；
- Build；
- Front Matter 解析方式。

然后选最小改造方案。

---

# 24. Validation Rules

开发内容 registry / parser 时必须检查：

- ID 唯一；
- Slug 不冲突；
- `related` 目标存在；
- `prerequisites` 目标存在；
- 状态值有效；
- Domain 值有效；
- 日期格式有效；
- 外链格式有效；
- `featured` 不应导致首页空白错误；
- Radar `sourceId` 必须存在；
- Radar `sourceUrl` 必须有效；
- `hohoosTake` 不得由自动处理流程生成；
- `publishedAt` 与 `fetchedAt` 不得混淆；
- Radar Item 的 AI Summary 必须可追溯到来源。

如果现有架构适合，可以增加轻量类型校验；不要为几个 Markdown 文件自建复杂 schema 服务。

---

# 25. Content Creation Templates

## New Note

```yaml
---
id: note:<slug>
title: <Title>
description: <One sentence>
domain: llm
status: published
tags: []
related: []
---
```

正文：

```md
## 一句话

## 为什么重要

## 如何工作

## 什么时候需要关注

## Related
```

## New Project

```yaml
---
id: project:<slug>
title: <Title>
description: <Problem / outcome>
date: YYYY-MM-DD
status: building
domain: ai-apps
tags: []
stack: []
repo: null
demo: null
featured: false
related: []
labs: []
---
```

## New Lab

```yaml
---
id: lab:<slug>
title: <Title>
description: <Experiment summary>
date: YYYY-MM-DD
status: planning
domain: ai-apps
question: <Question>
tags: []
related: []
---
```

## New Radar Item（通常由 Pipeline 生成，不建议手写）

```yaml
---
id: radar:<id>
title: <Normalized title>
sourceId: <source>
sourceUrl: <url>
publishedAt: YYYY-MM-DDTHH:mm:ssZ
fetchedAt: YYYY-MM-DDTHH:mm:ssZ
domain: models
topics: []
tags: []
status: published
aiGenerated: true
related: []
---
```

`hohoosTake` 不属于自动模板。

## New Paper

```yaml
---
id: paper:<slug>
title: <Paper title>
description: <Why it matters>
year: 2026
status: to-read
domain: llm
authors: []
paperUrl: <URL>
tags: []
related: []
---
```

---

# 26. Content Review Checklist

发布新内容前：

- [ ] 类型选对了吗？应该是 Note 还是 Doc？Lab 还是 Project？
- [ ] Title 是否具体？
- [ ] Description 是否可独立理解？
- [ ] Domain 是否使用已有枚举？
- [ ] Tags 是否精简？
- [ ] Related 是否真实相关？
- [ ] Prerequisite 是否真的需要先学？
- [ ] 是否存在虚假数据？
- [ ] Lab 是否区分 Observation / Conclusion？
- [ ] Project 是否说明 Problem / Decision / Lesson？
- [ ] Paper 是否包含自己的理解，而不是长篇翻译？
- [ ] Resource 是否解释 Why I Recommend？
- [ ] URL / slug 是否适合长期保持？
- [ ] Radar 是否显示 Primary Source？
- [ ] Radar AI Summary 是否和人工观点分开？
- [ ] 同一事件是否已经聚类/去重？
- [ ] Radar Item 是否误进了 Blog / Note / Timeline？

## 2026-09 Locale 与翻译 metadata

正文保持既有原生目录；`data/localization.json` 只维护源及译文版本关系。状态与字段、revision 计算和缺失回退见 `docs/I18N.md`。统一 Articles 只聚合当前语言 published 的 doc/note/paper/blog；Radar 信号、论文摘要导读和 planned 内容不进入原创发布流。

## Next.js 内容适配（2026-09-12）

apps/web/scripts/content.mjs 从同一内容源生成三语言路由、文章 HTML/目录、内容与学习索引、Radar 和 RSS。复用原内容校验、翻译清单和 Radar 来源/去重规则，不改变内容状态或自动生成文章。正文 HTML 经白名单清理，仓库现有 TopicLanding / NewsDigest 显式映射为组件；外部 RSS 不作为 MDX 执行。

## 阅读偏好与证据展示（2026-09-20）

本机阅读宽度保存于 `huhohoo.reader.v1`：`{version:1,width:"standard"|"wide"}`。无记录、损坏或未知版本回退标准宽度；存储失败仅在本次访问生效。该偏好不进入作者内容、统计或跨设备同步。

项目界面预览不产生新的内容记录；运行摘录、首页摘句、教程实践对照复用已发布 Java 教程中的真实记录，不能独立标为新实验或新结论。项目过程导航来自既有 sections，截图仅从既有 screenshots 元数据生成。

## 对话记忆实验室证据（2026-09-22）

`apps/web/lib/memory-lab.mjs` 保存作者提供的三轮控制台摘录与当次 Token 用量。来源为已发布 Java 首篇；UI 保留原始中文，并翻译说明文字。消息列表按控制台记录还原，不能标成完整网络请求。

裁剪模式从同一历史按原顺序选择消息；当前问题始终保留，事实检查仅针对固定记录中的 Java 字符串。不预测答案，不显示历史 Token 作为裁剪请求的估算。导出的 v1 请求封套带 `execution: not-executed`；没有模型调用、存储或用户标识。不进入正式 Lab 结果索引。

## Notes 正文与来源（2026-09-22）

`data/notes.json` 使用 published 条目形成可阅读笔记，分支审阅与上线分开。每篇 sections 为 heading / headingEn / headingTw 与 zh / en / tw；sources 使用 href / label / labelEn / labelTw；related 继续使用真实内容 ID。

`editorialOrigin: ai-assisted-reference` 必须展示 AI 协助资料整理说明，不等于作者个人实测或已人工审阅观点。notes.json 的三语言共存，现有 manifest 以同一文件的 SHA256 跟踪完整性，任意修改后须重新检查对应译文再同步 revision。非中文只在翻译状态为 AI_TRANSLATED 或 REVIEWED 时显示正文，缺失译文沿用原提示。

## 教学交互目录

apps/web/lib/workshop-catalog.mjs 为工作台问题、三语言任务说明、领域、标签和关联入口的单一来源。type:workshop 只进入搜索，不进入原创文章/研究成果索引。URL 使用 /build?tool=<id>#workbench，兼容原有三个 desk 锚点。failure-lab.mjs 是确定性的本地状态机，模拟数据与真实 memory-lab 运行摘录分开。
