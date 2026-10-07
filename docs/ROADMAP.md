# Huhohoo.com Roadmap

## 2026-10-07 · 本轮九篇实践与Astra整合

按本轮授权恢复新研究：三方向各三篇，配套代码仍归属Java/LLM和具身两个独立仓库。Java包含请求字节预算、七种本地HTTP重试条件、142种截断前缀及三个异常退出进程；LLM包含909次开销查询、558次内核计时、36组量化对照；MuJoCo第二个二维力控场景36回合、72,000行记录。保留缓存仍慢、量化误差与延迟控制失败结果，不新增付费模型调用。

新文章加入现有阅读路线、Labs与项目资源。第二场景不是机械臂或ROS2集成，完整VL01/M4/M5状态不变。Agnes相似干扰128次计划仍未执行，不复用旧授权。完整Java在线助手、真实模型质量、GPU内核与具身状态估计留作后续验证；旧阶段的暂停仅指当时任务。

关于页直接复用Astra共享粒子引擎，点击后加载，收起释放；不嵌入独立站点，不新增数据库或依赖。发布和最终验收以本轮报告为准。

## 2026-10-06 · 内容复核与阅读路径（本地待验收）

本轮暂停新研究，先核查线上与当前仓库，再修正主题误标、Journey 阶段状态、订阅说明、近况和来源日期。将已有 38 篇技术文章纳入三条阅读路线，保留旧 URL、三语言、个人阅读状态与已发表结论。

选 Java 会话归属、LLM 缓存准入、MuJoCo 完成资格作为三个教学样板，补机制对照、图示、练习、复现与局限；不批量扩写其他正文。固定版本中的解析、延迟和释放时序缺陷以勘误呈现，不伪称已修复独立工程。

后续候选继续使用既有研究待办：完整 Java 助手需要先确认会话语义；真实模型评测需要独立预算与执行授权；缓存开销归因需要分段计时；第二机器人场景需要定义迁移变量和成功条件。本轮不执行这些研究，不调用付费模型、不推送或部署。


## 2026-09-30 · 博客应用渐进接入 TypeScript

网站本体接入 TypeScript 7 严格检查，完成路由、共享上下文、三语链接与翻译、文章发现到阅读链路、分类筛选、学习进度与阅读偏好的首批迁移。其余 JS/JSX 保持兼容；不改写研究文章，不改变 URL、主题或静态生成方式。根目录与 CI 增加 `typecheck`，生产构建保留类型检查。维护范围见 `docs/TYPESCRIPT.md`，发布前本地验收见 `reports/TYPESCRIPT-ADOPTION-20260930.md`。用户已确认合并主干并发布，沿用现有 Git → Vercel 流程；实际发布结果以主干 CI 与生产部署记录为准。

## 2026-09-30 · 三篇有证据的研究/工程实践

新增Java事务式对话历史、TypeScript输出边界对照、MuJoCo恢复门控三篇三语文章，分别对应真实运行的41项检查、32组差分对照和18回合仿真。代码保留在Java与具身两个独立仓库；博客复用内容索引、项目、Lab、时间轴和精选入口。TypeScript只加入独立工程实验；站点依赖不增加。Agnes3.0新模型计划已冻结，在线实验尚未执行，不发布虚构结果。

## 当前执行状态 · 2026-09-29

已进入真实研究与证据呈现阶段。首页精选由 `data/editorial.json` 管理，优先展示 Java 输出验收和 MuJoCo 抓取；Now 与首页共用近况。文章提供按需输出校验、已录制仿真与 CSV 轨迹对照；VL01 首轮进入 Lab，完整 Journey 保持原状态。

L1 上下文位置首轮已执行：48 项计划，29 次尝试，26 份正常响应，连续三次 HTTP 429 后停止。发布方法、记录和局限，Lab 为 inconclusive，不宣称已经完成位置效应验证。下一步先修订请求节流与实验材料协议，再继续对照；具身智能继续验证抓取失败时停止搬运。

主干推送运行现有完整验证流程；本轮不新增依赖。下列旧阶段描述是历史记录，其中“待审阅／不发布”等约束仅针对当时阶段，不代表当前授权和部署状态。验收见 `reports/RESEARCH-EVIDENCE-20260929.md`。

本轮跟进：具身智能抓取门控已完成18回合，九对抓取前缀一致、六次失败取消搬运；新增三语言教程与 Lab 006。LLM L1v2 已冻结24项成组计划，通过80项离线检查及独立审计；尚未执行新一轮线上请求，不更新模型效果结论。工程与博客分开保存证据，旧记录不覆盖。下一步为经授权的L1v2实测，以及模拟搬运中滑落的持续监测。

## 内容呈现精修（2026-09-20，本地待审阅）

在 `codex/editorial-visual-polish` 整合首页交错项目、真实文章摘句、按需界面预览、阅读宽度/代码展开/图像查看、学习分组、Radar 操作反馈、RSS 和 404。复用已有请求旅行、错误诊疗、便签和个人名片，不新增内容导航或虚构成果。具体实施与验收见 `reports/EDITORIAL-POLISH-20260920.md`。不合并或发布，等待用户本地审阅；真实生活照片、新实验数据和额外文章仍需作者提供。

## Vercel 访客统计（2026-09-20）

首页匿名访问汇总、近 7 天热门文章和模块、国家/地区列表；文章页近 7 天浏览。只复用 Vercel Web Analytics，不接外部存储，不实现“我来过”计数。公开数据读取依赖服务端权限，未配置不显示假数据。启用步骤、统计口径与限制见 [VISITOR-STATS.md](VISITOR-STATS.md)。

## 文章内互动学习（2026-09-19）

第三轮实用互动：Java 教程增加错误诊疗室（401/429/读取超时/JSON）、访客实践自检和基于真实提交的文章更新轨迹；AI 应用专题增加手动分段输出/取消/断线教学模拟；虚拟实验室增加三个固定地图预测题。新增统一 TryIt 原生折叠入口，默认收起，支持锚点自动展开。阅读清单整合学习背包：最近学习、私人便签、v1 JSON 备份、导入预览、按记录保留/覆盖冲突、并发变更检查与失败回滚。Radar 通过显式 signalId 注册三个验证问题，不自动生成观点或实验结论。实现与未完成的浏览器验收见 `reports/PRACTICAL-INTERACTIONS-20260919.md`。

第二轮互动扩展：Java 教程的对话拆解台支持所选历史的规则摘要，并显示事实保留与缺失；虚拟实验室增加固定网格指令编排（前进、左右转、重复展开、单步、碰撞暂停、删除与重放，最多 40 条）；AI 应用专题增加提示词结构修理铺，并在检索抽屉内提供手工教学分数的混合排序与 Top-K 遗漏反馈。文章末尾按概念、动手、深入三种意图，从 metadata 关联和同领域已发布内容中选择真实入口，无内容时回到学习路线。三语言、主题变量、不持久化、不调用模型、不新增导航或内容成果；不把教学评分当作真实 Embedding 或效果指标。验收见 `reports/LEARNING-INTERACTIONS-20260919.md`。

五项后续教学互动：虚拟实验室支持局部视野（当前位置与四邻格可见，记忆已观察格，未知暂作空地，每步重规划，不保证总路程最短）；博客项目页提供基于已核实 Git 提交的时间机，无历史截图和部署日期推断；LLM 专题增加教学容量行李箱（非 Token/费用估算）；AI 应用专题增加固定资料的 RAG 证据选择与三场景 Agent 权限练习。不创建正式文章或 Lab，不调用模型，不持久化操作。所有新增教学界面支持三语言和键盘。

虚拟实验室增加 5×5 绕路教学示意：已知全图、四邻等代价 BFS，允许放置障碍、逐步行动、查看规划路线、重置与无路线反馈。不包含物理引擎、模型推理或训练，不修改 Journey 里程碑和真实 Lab 状态；步数仅为当前示意地图的计算值。三语言共用逻辑，不保存地图，不添加导航项。

Java LLM 教程增加“一次请求的旅行”：五步手动教学流程，支持正常响应、401 鉴权失败、读取超时三个场景。切换场景回到第一步，支持后退和重放，无自动播放、网络请求或模拟计时。固定响应示例明确标为教学数据，不进入内容索引和实验成果。强调 HTTP 200 不保证回答正确，读取超时不是 HTTP 状态码，也不代表服务端没有执行。与对话上下文演示、私人便签共用现有文章入口，不增加首页区块。

文章底部增加折叠的私人学习便签“写给未来的自己”：理解、疑问、下一步三个字段，按无语言前缀的文章 route 保存至 `huhohoo.reflection.v1:<route>`（schema version 1）。三语言共用，不上传、不计入作者 Notes 或公开内容。未知版本或损坏记录不覆盖，存储失败保留当前输入并提示导出。支持 Markdown 导出；暂无跨设备同步、多标签页冲突合并和导入。

首页作品区之后增加“好奇心指南针”：按文章、项目和外部信号三种意图浏览真实内容，支持顺序换一条。复用内容索引与已发布 Radar 数据，不新增推荐后端、不记录偏好，不把外部资讯混为原创文章。指南针仅作选项方向反馈，支持减少动态效果；空内容有降级提示。

首篇 Java LLM 教程底部加入“对话上下文”拆解台，首页阅读指引提供直达锚点。读者可分别移除用户与助手历史消息，观察请求 JSON 和信息缺失。使用固定教学示例，明确标注本地演示，不调用 API、不模拟模型回答、不计入真实 Lab 成果。支持三种语言、键盘与深浅主题，不持久化访客操作，也不增加导航层级。后续互动优先依附真实文章。

## Hohoo AI Journey · Sprint 1

仿真优先升级：在已有 Journey 基础上增加 `/journey/virtual-lab`、四个关联实验计划、运行/训练闭环、主项目目标架构、新版十个里程碑与八周安排。Isaac、Sim2Real 和真实机器人属于未来阶段。本轮不实现真实机器人数据管线、ACT、VLA、Isaac 集成或 Dashboard。最新结构与后续 Sprint 见 [JOURNEY.md](JOURNEY.md)。

新增 `/journey`：三轨路线、十个里程碑、状态与八周建议节奏。保留旧学习路线和本地阅读状态；不创建虚假成果。数据与后续 Sprint 边界见 [JOURNEY.md](JOURNEY.md)。本轮完成后等待下一步指令。


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

## 2026-09-30 Agnes 3.0实测与格式检查

L1v2-agnes3按既有冻结协议完成24次真实调用，6个完整对照块，18个正确编号和6个正确拒答。结果补充在既有成组协议文章第9节（三语言），保留原发布日期和Agnes 2.5准备材料，不合并不同模型的样本。原始响应、用量、请求哈希、独立审计和5项审计测试已归档；本轮预算已用完。全对只说明本组固定任务未观察到位置差异，后续先改进材料区分度。

应用原有70个格式告警确认为Windows CRLF检出引起，增加应用LF属性与根目录format:check入口，在CI启用同一门禁；Windows重新检出124个应用文件后检查通过。未迁移博客TypeScript、未改变业务逻辑、未新增依赖。验收见 `reports/AGNES3-FORMAT-20260930.md`。

## 创意工作台预览（2026-09-21）

- 分支 `codex/creative-workbench-20260921`，仅本地预览，合并与上线等待用户确认。
- 在 `/build#workbench` 集中提供决策调音台、信任边界剧场、JSON 结构透镜；不新增一级导航或空内容页面。
- Jev 仅作为结构化决策概念参考，链接官方文档。滑块是访客手动教学参数，无模型调用、预测概率或实测结论。
- 三语言、双主题、原生键盘控件；工具按需挂载，不保存或上传输入。JSON 输入限制 20,000 字符，结构预览最多 100 节点、8 层。
- 增加 nosniff、同源嵌入、严格跨源 Referrer 与关闭未使用硬件权限的响应头。没有启用未经兼容测试的严格 CSP；不宣称完成全面安全审计。

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

## 2026-09-20 页面性能修复

- 根布局移入 `apps/web/app/[[...segments]]/layout.jsx`，从路由参数读取语言，取消仅用于语言传递的 Proxy 和请求头依赖。正文与语言版本在构建时生成，保留已有 URL、canonical 与重定向。
- 全局 404 使用 Next.js `global-not-found`（当前需 `experimental.globalNotFound`）；升级框架时保留 404 与三语言回归检查。
- 搜索组件及索引按需加载；索引采用内容哈希文件名，避免发布后使用旧版本。失败可重试，核心正文不依赖搜索请求。
- 只有首页与 Radar/周报向客户端发送资讯，首页保留前十条供指南针使用；其他页面不再重复传递完整资讯和搜索索引。
- 折叠实验首次展开才挂载，之后保留状态；带实验锚点的访问仍支持自动展开。主题在路由变更时于绘制前恢复。
- 本次关于页 Shell 数据实测（JSON UTF-8，压缩前）：164379 → 61212 bytes；不等同于端到端延迟或 Core Web Vitals 改善比例。
- `npm run test:routes --prefix apps/web` 检查三语言正文、RSS、旧链接和 404；生产速度应使用 build 后的 preview 评估，开发模式会有首次编译成本。

## 2026-09-20 按需加载与阅读体验精修

- 文章中的请求演示、错误排查、对话记忆和实践自检使用独立动态模块，首次展开才下载；保留直达锚点与展开后的状态。
- Docs / Blog 正文由服务端组合输出，不再作为完整 HTML 字符串放入客户端共享 context；目录、复制与阅读状态仍为客户端交互。
- 目录通过 IntersectionObserver 更新当前位置，滚动结束后补一次校准，处理快速跳转越过标题的情况，不逐帧读取全部标题位置。
- Radar 首屏携带 12 条资讯，历史按每片最多 24 条生成带内容哈希的静态文件；加载更多按片获取，筛选与历史锚点读取完整归档。三语言分片均校验顺序、条数与原始数据一致，失败可重试，不删除历史数据。
- `npm run perf:check --prefix apps/web` 在 build 后的本地生产预览上运行。可用 `PREVIEW_URL` 指定端口；目标必须与本地 `.next` 构建一致。输出四个关键页面各三次 HTTP 响应时间、HTML 大小、引用 JS 原始大小及缓存状态。该检查不代表 LCP / INP / CLS，也不包含浏览器执行或网络压缩后的传输量。
- 本轮不新增依赖。后续根据真实浏览器性能记录决定是否继续拆分聚合页面，避免无依据的大重构。
- 验证记录：39 项测试通过，141 个真实页面路由检查无错误，生产构建通过。Radar 与正文在 1440 / 1280 / 1024 / 768 / 430 / 375 宽度无横向溢出；已验证三语言、主题切换、收藏/已读、分页、无结果、历史来源筛选、目录锚点和实验展开，测试页面未捕获控制台错误。首页、关于与虚拟实验室另行检查了 375px 布局。

### 展示与交互复查

- Radar 来源与操作改为左右 Grid 分组，手机单列；修正元信息段落继承 inline-flex 造成的时间说明偏移。
- 补齐共享边框/次要文字 token；统一选中、禁用、文本输入与展开控件；搜索结果类型/标题/摘要分行展示。
- 学习页区分“标记完成”和“已完成”；详情页高亮对应主导航；移动菜单 Esc 关闭返回按钮焦点；文章筛选保留 Next.js history state。
- 375px 巡检首页、学习、Journey、虚拟实验室、实践、项目与详情、Labs、Notes、Timeline、Now、About、Reading，无横向溢出；夜间桌面检查首页、文章、学习、实践、项目详情、Radar、教程、About。验证搜索 Ctrl+K / Esc、菜单焦点与资讯按钮操作；没有新增依赖或改变内容。

## 2026-09-22 旗舰内容体验（本地待确认）

- 本轮聚焦首页 → Java 首篇教程 → Java LLM 项目，不增加空文章。
- 首页首屏右侧采用实践手册封面，展示三个真实 Demo 阶段与历史对话摘录；移除重复精选教程和摘句。无额外文章的语言不显示空列表标题。
- 教程和项目复用 FlagshipExperience：切换请求、解析、历史三个阶段；并列简化代码与原始运行证据，提供自检解释、字段说明、读取超时复盘以及固定提交的 GitHub 链接。
- 原有长文、目录、代码复制和阅读工具保留；额外练习收纳到可展开区域。
- 不新增后端或依赖；演示不是在线模型调用，不要求读者向本站提交密钥。
- 45 项测试、160 个静态页面构建、141 个路由检查通过。仅本地预览，等待用户决定后续优化或发布。

## 2026-09-22 对话记忆实验室与共创研究（开发分支）

- 升级已有 ConversationWorkbench，项目页直接体验，教程继续按需展开，首页作品区提供直达入口。
- 真实三轮记录按步骤回放；请求明确为依据控制台还原。裁剪模式只显示请求证据，不重用历史回答冒充新结果。导出包含 not-executed 标记，不携带凭证。
- 研究案例待办见 [RESEARCH-COCREATION.md](RESEARCH-COCREATION.md)。A1（Java 助手）和 L1（上下文位置对照）补充执行细节；已有 retrieval-eval / tool-eval / action-representation / VL01–VL04 复用，不重复添加正式实验条目。
- 没有新增正式文章或实验结论；真实 API 对照和仿真留待人机共创。本轮不合并或发布。

## 2026-09-22 首批三方向短笔记

新增三篇有正文的知识整理：conversation-is-not-memory（LLM）、read-timeout-evidence（AI 应用）、state-observation-action（具身智能）。以已有作者记录、Oracle 与 MuJoCo 官方文档为依据，明确 AI 协助整理与未新增实测；保留共创实验待办，不制造研究结论。当前分支可预览，未部署。

Notes 正文支持简体、繁体和英文，翻译按现有 manifest 标记 AI_TRANSLATED。自动进入首页近作和领域专题，Java 项目增加相关笔记入口。不新增导航层级或依赖。

## 2026-09-22 内容质量回退

上述三篇短笔记经用户审阅未达到案例内容要求，已从正式数据、翻译 manifest 与项目关联中撤下，原稿保存在 reports/co-creation/reference-notes.json。首页、专题、搜索与站点地图不再收录。保留 Notes 渲染能力。优先推进 A1，方案见 JAVA-HISTORY-CASE.md；没有新增实验结果，不发布占位文章。

## 2026-09-22 问题驱动的实践工作台

重做 /build：统一发现八个教学交互，支持三方向筛选、关键词、直达链接及返回教程/项目。新增本地故障注入，对照发送时追加与成功后提交两种消息历史；不调用模型，不充当 Java 实证。首页与搜索复用同一实验目录；正式内容索引、Timeline 和成果计数不收录教学工具。文章页隐藏空分类（旧筛选 URL 仍有明确空态）。修复无关锚点导致全部折叠实验挂载的问题。仍在开发分支本地预览。


## 2026-09-22 三方向深度阅读（已确认发布）

新增 AI Radar 工程案例、KV Cache 机制拆解、OpenVLA 动作数据流导读及三语言译文；文章按阅读目的与三个研究方向筛选，复用现有专题与关系索引。验证与证据边界见 `reports/DEEP-CONTENT-20260922.md`。作者已确认合并主干并发布；真实案例共创继续使用 `docs/RESEARCH-COCREATION.md` 的 A1/L1/E1，不重复添加待办。

## 2026-09-28 两篇可复现实践（开发分支）

完成Java LLM第二篇“结构化输出验收”和具身智能第一篇“MuJoCo抓取偏差对照”，各自代码进入独立GitHub仓库，正文固定提交版本。教程提供简体、繁体与英文，译文标记AI_TRANSLATED；同步学习步骤、项目与VL01关系，不把实验次数当学习完成度。

Java保留四次真实调用的失败边界和35项离线检查；MuJoCo保留九回合轨迹、状态、视频、截图与CSV生成图。文章视频使用受限本地资产和原生控件，按需加载，不引入播放器依赖。验收见 `reports/PRACTICE-ARTICLES-20260928.md`，尚未合并主干或部署生产。

## 2026-09-29 搬运监测：从前置确认到过程检查

复用 VL01 场景，新增27回合持续监测对照，独立工程保留冻结协议、完整轨迹、状态、事件、审计及坐标重放。发布具身实践第三篇（三语言）与 Lab 007，关联项目、首页精选和 Journey；不把确定性重复当泛化成功率，也不自动提升作者学习完成度。

三种条件为无扰动、单个空接触报告、受控松爪；三种策略为一次性门控、立即报警、连续三次异常确认。明确区分报警延迟、后续累计路径、目标保持和实际停止。监测只覆盖搬运阶段，没有恢复抓取或硬件急停。OpenGL 渲染不可用时提供有明确标识的 CPU 坐标投影，不冒充三维录像。

下一轮复用既有研究待办，规划采样间隔、异常持续时间和观测新鲜度；本轮不提前执行。LLM L1v2 仍保留离线就绪、线上待实测的状态。验证与发布记录见 `reports/TRANSFER-MONITOR-20260929.md`。

## 2026-09-29 观测新鲜度与采样间隔

复用VL01和原有接触监测，完成45回合固定条件对照（10/20/50ms采样×5故障/正常条件×3策略）。独立工程保存协议冻结版本、2ms控制记录、50Hz物理状态及独立审计。具身第四篇提供简体、繁体与英文，新增已执行Lab 008，关联首页精选、项目与Journey。

内容区分异常样本计数、连续坏观测的时间跨度、捕获年龄和消息接收时刻。明确固定故障相位、单次确定性单元、没有泛化统计；年龄报警不等于确认掉落，也没有恢复任务。仅新增由真实日志生成的两幅静态图，沿用文章和图片查看器，无新依赖。下一项复用研究待办中的延迟、乱序与重新观测后的恢复条件，尚未执行。验收见 `reports/OBSERVATION-FRESHNESS-20260929.md`。


## 2026-09-30 研究交付包接入：E6与L1v3

从交付目录接入两个独立工程，保留原始运行元数据与文件指纹。具身E6为30回合恢复门控/路径消融，另18回合用于E5回归；本机30项测试和独立审计通过，新增真实Lab 012及三语言实践第六篇。首页精选、项目资源和VL01接入文章与证据，完整M4/M5状态不变。

LLM L1v3为128项相似干扰冻结计划：Java 8编译、2515项离线断言、60项Node测试与准备材料审计通过。新增三语言实验设计文章，明确真实模型请求0次、预算待审定，不将离线模拟作为模型结果。下一轮继续使用既有研究共创待办。

沿用已有文章、实验、项目和图片组件；仅导入两幅真实数据静态图，无新依赖。验收与发布记录见 `reports/RESEARCH-DELIVERY-20260930.md`。
# 2026-10-01 · 具身E7阶段契约

沿现有VL01研究链新增第七篇实测文章及Lab 013。21回合、105份逐回合文件、10份源码/协议指纹、21组分叉前缀与21项测试通过；按阶段解释判据，分别报告误报、报警、保持动作和最终放置。复用现有首页精选、项目、实验与Journey入口，三语言同步，无新增运行依赖。完整VL01/M4/M5保持原状态。

后续沿原研究待办细化退出动作与释放后检查；LLM128次在线对照待本轮费用授权，不自动复用旧额度。

## 2026-10-07 · 历史内容与部署优化收尾

38 篇技术文章整理为三条完整阅读路线，复核入口主题、RSS 范围、资讯日期来源与教学复现说明。修正 Java Demo08–10 的 JSON 接收边界、含空格路径及源码审计；修正具身 E11/E14 的观测到期顺序与释放后证据时间边界。旧版文章与证据保留，三语言增加修正版链接，未增加新研究文章或付费调用。

同步合并部署输出减重、访客接口路径白名单和 Astra 无关提交跳过构建；通过本地生产构建及路由检查后按本次授权合并主干。体积、回归范围、固定版本与未执行事项见 [收尾记录](../reports/RELEASE-OPTIMIZATION-20261007.md)。历史部署删除另行确认，不把本地体积估算冒充线上释放量。
