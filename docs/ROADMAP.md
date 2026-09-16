# Huhohoo.com Roadmap

## 当前体验优化（2026-09-16）

网站已使用 Next.js App Router，历史迁移阶段说明保留在下文。当前分支改善已有内容的发现与阅读：Radar 可分享筛选、来源和收录说明，搜索起始入口，移动文章目录、复制反馈，以及首页真实教程与配套 Demo 的阅读指引。范围、风险与验收见 `reports/EXPERIENCE-POLISH-20260916.md`。继续保留三个学习方向、本地进度、收藏和现有 URL；新增原创文章与实验结果依赖真实写作和执行。

## 用户授权的 Next.js 重构（2026-09-12）

本分支 `codex/nextjs-redesign` 按用户明确要求采用 Next.js App Router。新版位于 `apps/web`，根目录 start/build/preview 指向新版；Docusaurus 依赖、配置、主题覆盖与 legacy 命令已移除，旧版本通过 Git 保留。原 Markdown、JSON、采集流程、本地阅读状态继续共用。共享组件直接使用 `apps/web/runtime`；纯内容索引位于 `lib/content`；翻译使用 `i18n/{locale}/docs` 与 `blog`。没有发布或切换线上部署。

运行与迁移边界见 `apps/web/README.md`；验收见 `reports/NEXTJS-MIGRATION.md`。

## 已规划：沉浸式个人介绍页

状态：已实现，待用户审阅。独立 Next.js 预览（本地 4180）的 GPU 粒子视觉已接入 `/about` 及 `/en/about`；原有正文和内容来源保留。

- **首屏 / Hohoo**：复用 SVG 路径、五条星臂、Bloom、FBO 划散与拖拽惯性；完整 Hohoo 字形居中，配简短身份介绍及“了解我”正文锚点。视觉控件仅保留拨散、复位、暂停，操作说明保持读屏可用。
- **过渡**：下滚时星群逐步展开并淡出，背景从深色主视觉平滑衔接当前主题的正文底色。正文在首屏之后自然进入，不强制滚动吸附、不拦截滚动、不等待动效才出现。
- **正文顺序**：我是谁 → 当前关注 → 精选作品 → 做事方式／手边工具 → 代码之外／联系。复用现有 `about.js`、`CurrentFocus`、内容索引和 `data/social`；不添加未经用户确认的履历、成果或指标。评论保留在正文末尾。
- **全站衔接**：沿用博客导航与页脚，首页、导航及页脚的“关于”入口统一指向 `/about`。保留 `/en/about` 与 `/aboutMe` 旧入口兼容。
- **实现边界**：保留独立 Next.js 视觉应用作为实验预览，框架无关场景统一位于 `src/components/AstraParticleHero`，独立应用通过转导出复用；GLSL 使用 asset/source 加载，关于页按需加载图形代码；不将 localhost 地址写入正式页面，不以 iframe 作为正式接入方案，不要求整站迁移 Next.js。
- **降级**：手机减少粒子和 Bloom 分辨率、DPR 限制；离屏暂停；支持用户暂停及 prefers-reduced-motion；无 WebGL／无 JavaScript 仍可阅读个人介绍。监听与 GPU 资源在离开页面时释放。
- **验收**：深浅主题首屏与正文过渡、中英文、六种宽度、鼠标／触屏／键盘、静态回退、路由切换资源释放与构建。帧率单独实测，不沿用独立预览的性能结果作为集成后的保证。

## 科幻视觉分支

分支：`codex/sci-fi-particle-lab`。保留内容数据、URL 与 Docusaurus 架构；更新全站主题与首页信息层级，加入可暂停、可静态降级的交互 Hohoo 粒子字形（悬停拨散、拖动三维旋转、自动归位）。验收包含双语言构建、响应式、深浅色、键盘、动效开关与控制台检查。

## 当前增量：第二阶段精修

本轮聚焦统一品牌导航、修复历史入口、真实数据复用、实验设计、Radar 来源信任/事件基础、周报层级、项目证据、轻量全站搜索、阅读 Inbox 和 SEO 基础。详细审计与范围见 `reports/PHASE-2-AUDIT.md`，验收见 `reports/PHASE-2-ACCEPTANCE.md`。
不自动进入下一阶段；后续优先执行真实实验、补充作者 Notes、人工核验 Radar，而不是新增空模块。


## 1. 目标

将 huhohoo.com 从“有清晰 AI 学习规划的个人技术博客”逐步升级为：

> **Hohoo's AI Lab — AI 学习系统 + 知识库 + 实验室 + 项目作品集。**

核心循环：

```text
Learn → Note → Lab → Build → Share
  ↑                              ↓
  └────────── Discover ──────────┘
```

路线图遵循三个原则：

1. **真实内容优先于空模块。**
2. **内容闭环优先于功能数量。**
3. **先完成低维护成本能力，再做 AI Native 能力。**

---

## 2. 当前目标信息架构

```text
Home

Learn
├── Learning Path
├── AI Radar
├── Topics
├── Timeline
└── Knowledge Map

Build
├── Projects
├── Labs
└── Playground

Knowledge
├── Notes
├── Papers
├── Glossary
└── Resources

Blog

Other
├── Now
└── About
```

---

# 3. Release Plan

## V1.1 — Content Discovery

### Goal

解决“站点结构已经成熟，但真正内容入口和消费体验仍然偏弱”的问题。

### Scope

- [ ] Navbar 信息架构整理
- [ ] Footer 整理
- [ ] 首页 Latest
- [ ] Tags 统一
- [ ] Archive
- [ ] Search 入口优化
- [ ] Docs / Blog 阅读体验基础统一
- [ ] Empty State 规范
- [ ] 移动端导航检查

### Home Changes

首页推荐顺序：

```text
01 Hero
02 Currently
03 Learning Tracks
04 Latest
05 AI Radar
06 Featured Builds (允许 Empty State)
07 Latest Lab (允许 Empty State)
08 Learning Activity
09 Footer CTA
```

### Acceptance

- 首页能快速看到真实更新，而不是只看到未来规划。
- 一级导航不超过 5 个主要内容入口。
- `/docs` 与 `/blog` 原有 URL 不被破坏。
- Tags 与 Archive 在移动端可用。
- 无虚假阅读量、完成率或统计数据。
- Build 成功。

### Content Milestone

至少准备 3～6 条可展示 Latest 的真实内容。

---

## V1.2 — Builder Portfolio

### Goal

让网站明确展示：

> 不仅在学习 AI，而且在做项目、做实验。

### Scope

#### Projects

- [ ] `/projects`
- [ ] `/projects/<slug>`
- [ ] Project Card
- [ ] Project Status
- [ ] Project Detail Layout
- [ ] Related Content

Project Detail 标准结构：

```text
Overview
Problem
Goal
Architecture
Tech Stack
Decisions
Challenges
Metrics (optional, real data only)
Lessons
Related
```

#### Labs

- [ ] `/labs`
- [ ] `/labs/<slug>`
- [ ] Lab Card
- [ ] Experiment Metadata
- [ ] Result Table/Chart 基础能力
- [ ] Reproduce Section

Lab Detail 标准结构：

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

### Acceptance

- Project 与 Lab 在信息结构上明显不同。
- 没有项目数据时使用 Empty State，不伪造案例。
- 没有实验数据时不显示假指标。
- Project/Lab Metadata 可被首页复用。
- 首页可以展示真实 Featured Builds / Latest Lab。
- Build 成功。

### Recommended First Real Project

```text
PROJECT / 001
Huhohoo / Ask Hohoo
Personal AI Knowledge Assistant
```

推荐后续配套真实实验：

```text
LAB / 001 Chunk Size
LAB / 002 Embedding Model
LAB / 003 Hybrid Search
LAB / 004 Reranking
LAB / 005 RAG Evaluation
```

以上只是内容方向，不得在实验未完成时生成虚假结论。

---

## V1.3 — Knowledge System

### Goal

让内容从“文章集合”升级为相互连接的个人知识系统。

### Scope

#### Learning

- [ ] Learning Summary
- [ ] Continue Learning
- [ ] Completed / Reading / Saved
- [ ] Prerequisites
- [ ] Next Step
- [ ] Local Progress Versioning

#### Timeline

支持内容类型：

- Article
- Note
- Lab
- Project
- Paper

#### Notes

- [ ] `/notes`
- [ ] `/notes/<slug>`
- [ ] Search / Filter
- [ ] Related Concepts

#### Glossary

- [ ] `/glossary`
- [ ] 字母索引
- [ ] Search
- [ ] Term → Note / Docs

#### Papers

- [ ] `/papers`
- [ ] `/papers/<slug>` 或 MDX Detail
- [ ] To Read / Reading / Read

#### Resources

- [ ] `/resources`
- [ ] Curated Categories
- [ ] Why I Recommend

#### Knowledge Map

- [ ] `/knowledge-map`
- [ ] 2D Relationship View
- [ ] Hover Highlight
- [ ] Detail Panel
- [ ] Mobile List Fallback

### Acceptance

一个主题，例如 `RAG`，应至少能够形成如下关系中的 2～3 条：

```text
RAG Doc
├── prerequisite → Embedding
├── note → Chunking
├── lab → Retrieval Experiment
├── project → Ask Hohoo
└── paper/resource → Related Research
```

关系不要求一次全部补齐，但架构允许逐步增加。

### Content Milestone

优先填充：

#### AI Application

- Java 调用 LLM
- Spring AI 入门
- Structured Output
- Tool Calling
- RAG
- Evaluation

#### LLM

- Token
- Context Window
- Embedding
- Attention
- Transformer
- Evaluation

#### Embodied AI

- 什么是具身智能
- Perception / Decision / Action
- VLM / VLA
- 第一组 Simulation 实验

---

## V1.4 — AI Radar Foundation

### Goal

建立站点的“外部信息输入层”：持续发现 AI 前沿资讯，但不把信息流直接污染为原创 Blog。

定位：

> **AI Radar = Discover / Filter / Connect，不等于自动写博客。**

### Scope

#### Source Layer

- [ ] Source Registry
- [ ] Fetch Adapter / Parser Adapter
- [ ] API / RSS First 策略
- [ ] Source Trust Level
- [ ] Fetch Interval
- [ ] ETag / Last-Modified / Incremental Fetch
- [ ] Timeout / Retry / Backoff / Rate Limit

#### Processing Layer

- [ ] Normalize
- [ ] URL / Content Hash Dedup
- [ ] Semantic Dedup 基础能力
- [ ] Event Cluster
- [ ] Domain / Topic Classification
- [ ] Radar Score
- [ ] Personal Relevance Score
- [ ] AI Summary
- [ ] Why It Matters
- [ ] Source / Citation Mapping
- [ ] Prompt / Parser Version Trace

#### Publishing Layer

- [ ] `/radar`
- [ ] `/radar/<date-or-slug>`
- [ ] Topic Filter
- [ ] Source Type Filter
- [ ] `AI SUMMARY` 明确标识
- [ ] Primary Source
- [ ] Related Coverage
- [ ] Related Knowledge
- [ ] Empty / Loading / Error State

#### Workflow

状态建议：

```text
FETCHED
→ NORMALIZED
→ DUPLICATE / REJECTED
→ REVIEW / APPROVED
→ PUBLISHED
→ ARCHIVED
```

高质量 Primary Source 可根据明确阈值自动发布 Radar Item；不满足阈值的内容进入 Review / Reject，不要求全部发布。

### Topic Baseline

一级 Domain 控制在稳定范围：

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

具体公司、模型、框架进入二级 Tag。

### Home Changes

首页在 `Latest` 后增加一个轻量 `AI RADAR` 区块，只显示 3～5 条高价值信号：

```text
LATEST          ← 我的输出
AI RADAR        ← 外部世界
FEATURED BUILDS ← 我的实践
LATEST LAB      ← 我的验证
```

两者视觉必须可区分，不能让用户误以为 Radar 是原创内容。

### Acceptance

- Radar Item 必须有来源。
- AI Summary 与用户本人观点明确区分。
- 同一事件不会因为 4 个来源出现 4 条主卡片。
- 首页最多展示少量高分 Radar，不变成新闻门户。
- 个体 Signal 不逐条进入 Timeline。
- 抓取失败不影响博客静态页面可用。
- 外部正文不能控制 Agent/System Prompt。
- Build 成功。

---

## V1.5 — Radar Intelligence

### Goal

让 Radar 从“聚合器”升级为“个性化前沿观察系统”。

### Scope

#### Scoring

建议拆分：

```text
Relevance
Authority
Novelty
Impact
Trend
Freshness
Personal Relevance
```

权重必须可配置，不把临时数字硬编码在 UI。

#### Digest

- [ ] Daily Radar（可全自动）
- [ ] Weekly AI Brief
- [ ] `/radar/weekly/<year-week>`
- [ ] Top Signals
- [ ] Topic Summary
- [ ] Saved Papers / Tools / Projects

Weekly Digest 可以由 AI 生成 Draft，但如包含 `HOOHOO'S TAKE`，必须来自用户本人实际编辑。

#### Trend Detection

- [ ] 7d / 30d topic signal count
- [ ] Trend direction
- [ ] `/radar/trends/<topic>`
- [ ] Related papers / releases / notes

#### Paper Radar

- [ ] Paper Signal 独立展示
- [ ] Authors / Published / Paper URL
- [ ] Code / Project Page（真实存在时）
- [ ] Save to Papers / Reading Queue

#### Knowledge Connection

Radar Item 可以关联：

```text
Docs
Notes
Labs
Projects
Papers
Learning Path
```

形成：

```text
External Signal
      ↓
Radar
      ↓
Learn / Paper Queue
      ↓
Note → Lab → Project → Blog
```

### Acceptance

- Trend 来源于真实聚合数据，不伪造百分比。
- Personal Relevance 可配置。
- Radar 与现有知识内容至少支持显式 Related 关系。
- Weekly Digest 可进入 Timeline，但单条 Signal 默认不进入。
- Paper Signal 可转入 Papers Reading Queue，不复制长篇论文正文。

---

## V1.6 — Reading Experience

> 如果 V1.1 已完成部分能力，本版本只补齐剩余项，不重复重构。

### Scope

- [ ] Article Metadata Header
- [ ] Reading Progress
- [ ] Learning Context
- [ ] Prerequisites
- [ ] Better Previous / Next
- [ ] Related Content
- [ ] Code Copy UX
- [ ] Heading Anchor
- [ ] Table / Code Mobile Overflow
- [ ] 中文阅读宽度和行高统一

### Target Header

```text
AI APPLICATIONS / RAG

RAG From Scratch

Description...

INTERMEDIATE · 12 MIN · UPDATED SEP 2026

Prerequisites
Embedding →
Vector Database →
```

### Acceptance

- 阅读正文宽度适合长文本。
- 页面可明确知道“我在哪条路线、当前第几步、下一步是什么”。
- 不复制一份完整 Sidebar 到正文。
- Blog 仍保持更自由的随笔体验，不强行课程化。

---

# V2.0 — AI Native Blog

## Goal

让博客本身成为一个真实 AI 工程项目。

核心模块：

```text
Ask Hohoo
```

定位：

> Ask my notes.

不是通用 ChatGPT Clone。

### Phase A — UI + Architecture

- [ ] Ask Hohoo Launcher
- [ ] Desktop Side Panel
- [ ] Mobile Fullscreen/Bottom Sheet
- [ ] Suggested Questions
- [ ] Answer Layout
- [ ] Sources
- [ ] Loading
- [ ] Error
- [ ] No Source
- [ ] Mock Provider
- [ ] Provider Interface
- [ ] Retriever Interface

### Phase B — Retrieval

```text
Published Knowledge + Optional Radar Index
↓
Chunk
↓
Embedding
↓
Vector Store
↓
Retrieve
↓
Rerank (optional)
↓
Prompt
↓
LLM
↓
Answer + Sources
```

- [ ] 内容导出/索引
- [ ] Chunk 策略
- [ ] Embedding
- [ ] Vector Store
- [ ] Retrieval
- [ ] Citation Mapping
- [ ] Knowledge / Radar Source Scope
- [ ] Freshness Metadata

### Phase C — Evaluation

- [ ] Test Questions
- [ ] Retrieval Evaluation
- [ ] Answer Groundedness
- [ ] Citation Correctness
- [ ] Latency
- [ ] Cost

所有指标必须来自真实测量。

### Acceptance

- API Key 不出现在前端 Bundle。
- 无足够博客内容或 Radar 来源时明确拒绝猜测。
- 默认回答优先使用 Published Knowledge；涉及“最新/最近/本周”时才允许检索 Radar。
- Sources 可以跳转到真实页面。
- Backend Error 不导致页面不可用。
- AI 功能失败时网站其他部分正常工作。

---

# V2.1 — Knowledge Map Enhancement

只有 V1.3 的基础 2D Map 内容足够丰富后再做。

候选能力：

- 自动根据 metadata 生成关系；
- Cluster；
- Domain Filter；
- Prerequisite Direction；
- “从这里开始学”导航；
- 与 Search / Ask Hohoo 联动。

不优先做 3D。

---

# V2.2 — AI Playground

只有真实 Demo 足够多后开放。

候选：

- Structured Output Demo
- Tool Calling Demo
- Retrieval Demo
- Chunking Visualizer
- Embedding Similarity Demo
- Prompt Comparison

Playground 每个 Demo 必须对应真实文章 / Lab / Project，避免成为孤立玩具。

---

# V3.0 — Personal Account（Optional）

除非确实有跨设备需求，否则不急于实现。

候选：

- 登录；
- 云端阅读进度；
- Bookmark Sync；
- Personal Dashboard；
- 跨设备 Continue Learning。

在 V1/V2 阶段，本地 Local Storage 足够时不要提前增加认证和数据库复杂度。

---

# 4. 首页最终目标形态

```text
┌──────────────────────────────────────────────┐
│ HERO                                         │
│ 你好，我是 Hohoo.                            │
│ Developer · AI Builder · Explorer            │
│ 从 Java 到 AI，从模型到真实世界。            │
└──────────────────────────────────────────────┘

CURRENTLY
Building / Learning / Exploring

01 BUILD        02 UNDERSTAND       03 EXPLORE
AI Apps         LLM                 Embodied AI

LATEST
01 Article ...
02 Note ...
03 Lab ...

AI RADAR
01 SIGNAL · Official ...
02 PAPER SIGNAL ...
03 RELEASE ...

FEATURED BUILDS
Project / 001 ...

LATEST EXPERIMENT
Lab / 001 ...

LEARNING ACTIVITY
SEP 11 ...
SEP 08 ...

KEEP BUILDING.
```

核心原则：

**真实内容的可发现性 > 首页装饰性。**

---

# 5. 内容建设与开发比例

在技术框架基本可用后，建议维持：

```text
30% 网站功能
70% 内容与真实实验/项目
```

当出现“模块很多但大部分为空”时，暂停横向开发，优先填内容。

---

# 6. 每个版本的 Codex 执行模板

每次实现某个版本，不直接说“把 V1.2 全部做完”。

使用以下格式：

```text
请阅读：
- AGENTS.md
- docs/ROADMAP.md
- docs/DESIGN-SYSTEM.md
- docs/CONTENT-MODEL.md

本次只实现：<明确范围>

要求：
1. 先分析现有实现，不立即编码。
2. 明确哪些组件/数据可以复用。
3. 列出将新增/修改的文件。
4. 不修改本次任务之外的内容。
5. 不生成虚假内容或统计数据。
6. 完成后运行项目实际存在的 lint/typecheck/test/build。
7. 页面任务必须验证 Desktop/Mobile + Light/Dark。
8. 最后输出变更、验证结果、已知限制和下一步。
```

---

# 独立 GPU Hero 实验（2026-09-12）

- 已在 `apps/astra-hero` 实现 Next.js + TypeScript + Three.js 独立视觉应用，保留现有博客。
- 已完成 SVG 路径纹理、五条星臂、Vertex Shader 形态及第二阶段 FBO ping-pong 交互。
- 已通过生产构建、桌面/手机模拟交互验证；GTX 1660 Ti 短时桌面实测约 60 FPS。
- 实体手机长时间性能与真实标签页后台切换仍待验证。未部署至正式博客。
- 验收记录：`reports/ASTRA-GPU-ACCEPTANCE.md`。

# 7. Release Gate

进入下一个里程碑前检查：

## Content Gate

- 当前新增页面是否有真实内容？
- 是否出现多个 Coming Soon 页面？
- 如果是，暂停新页面开发。

## Quality Gate

- Build 成功；
- 无明显 broken link；
- 无明显 hydration error；
- 375px 可用；
- Light / Dark 可用；
- Keyboard 基础可用。

## Architecture Gate

- 是否创建第二份重复内容数据？
- 是否引入不必要依赖？
- 是否把新逻辑硬编码进首页？
- 是否建立可复用 metadata？

只有通过 Gate 才继续。

## 2026-09 信息架构精简与国际化基础

主导航调整为文章、学习、实践、Radar、关于。首页以真实发布内容优先；完整路线和实验提案折叠；三条 Track 不变。新增 `/articles`、`/build` 仅承担聚合发现，不新增内容副本。现有二级路由保留。

原生 i18n 增加 zh-TW，中文为 Source of Truth。第一篇正式文章提供三语言示例，其余正文按价值逐步翻译；翻译不阻断中文发布。实现与维护说明见 `docs/I18N.md`。
