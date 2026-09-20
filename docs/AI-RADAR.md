# Huhohoo AI Radar

## AIHOT 全文订阅与筛选（2026-09-17）

订阅地址由 `config/news-sources.json` 管理，改用 `/feed/full.xml`（`aihot-full-v2`）。优先使用 RSS `content:encoded` 的清洗文本评估相关性，缺失时回退到未截断的摘要；不另外抓取原网页全文。全文只在采集过程中作为 `relevanceText` 使用，进入摘要处理、coverage 和公开 JSON 之前移除。公开摘要仍不超过 180 字符，保留标题、来源与阅读链接；自动翻译仍暂停。

筛选同时要求研究主题与技术信息，补齐 AI Coding、Codex、上下文工程、记忆、ROS2、模拟器和机器人数据的中英文表达。上下文压缩、记忆持久化、沙箱测试、话题通信、观测动作对齐等机制可提供技术证据；纯排名、商业宣传、仅有产品名称的公告不收录。含评测方法、消融或复现步骤的榜单分析可保留。规则仅判断收录相关性，不代表事实核验。

配额保持按 UTC 入库日全站最多 10 条、AIHOT 最多 6 条，跨采集执行共享；每两小时运行一次。6 条是上限而非保底。仅修改订阅和规则，不批量重写已有资讯。

## 第二阶段信任与事件模型（2026-09-11）

当前实现 `src/utils/radar.cjs` 使用 primary / official / paper / media / aggregator / community 六类来源。AIHOT 继续作为主要发现订阅，但标记 AGGREGATOR，不代表一手权威；官方来源优先成为同一事件的展示主来源。未知来源 ID 报错，已知来源的 URL 不属于登记域名时降为社区信号。

`verificationStatus` 与发布审核完全独立。默认 SINGLE SOURCE，社区为 COMMUNITY SIGNAL；没有证据不生成“官方确认”。PRIMARY CONFIRMED / CROSS-CHECKED 必须有手工核验记录 `verification: {status,checkedBy,checkedAt,evidence:[{url,note,kind}]}`。一手确认要求 primary 证据；交叉核验要求至少两个不同域名的记录，但域名数量本身不会自动产生该状态。记录编辑者仍需确认独立性与内容一致性。

采集不自动写 verification、lastVerified 或 hohoosTake。当前四条信号均未补造核验记录。

事件去重支持 URL 规范化（移除跟踪参数）、72 小时窗口内规范化标题完全一致 / 已有 contentHash，以及显式 eventId / clusterId。返回一个事件和 coverage；不根据模糊近似标题贸然合并不同版本或事件。语义向量、实体推断尚未实现。

`attachCoverage` 让后续发现的同事件官方报道保留到已选记录的 coverage，保留原收藏 ID，并为已记录事件保存 eventId。AIHOT 的发现优先级仍保留，事件展示来源按 primary → official → paper → media → aggregator → community 排序。相关报道不会冒充独立核验，也不逐条进入 Timeline。

周报是 RULE-BASED DIGEST：真实信号/主题/来源数量、已有相关度分数与发布时间排序、分主题来源摘录、待核验线索、显式 Related 内容。不自动生成 Hohoo 的个人判断；若后续接入生成式周摘要，须另存生成来源与 AI-GENERATED WEEKLY SUMMARY 标签。当前自动翻译仍暂停。


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

## 2026-09 多语言呈现

当前语言数据由 `src/utils/radar-locale.cjs` 在构建时投影，保留原始来源标题和多语言标题检索关键词。无译文时明确 SOURCE LANGUAGE，有译文时显示 AI TRANSLATED，并继续展示 AI SUMMARY / SOURCE EXCERPT 等内容归属。禁止将翻译等同人工审核。此次仅升级展示与搜索基础，不恢复自动翻译任务。

## 2026-09-20 采集时效与补采

- 常规采集仅选择最近 48 小时发布的条目；RSS 仍解析最多 14 天作为诊断与显式补采窗口，防止旧文章抢占新文章的日配额。
- 手动 Actions 的 `window_hours` 可设置 1–336；本地设置 `NEWS_WINDOW_HOURS`，预览 `npm run news:collect`，确认后添加 `-- --write`。不修改原始发布时间或伪造采集时间。
- 配额仍按 UTC 采集日累计：全站 10 条、AIHOT 6 条、其他单源默认 2 条。补采与定时任务共享配额，不保证凑满。
- 报告记录窗口、各源最新发布时间、窗口内条数、主题拒绝、重复、超出窗口、日配额和来源配额。合法空 RSS 代表无更新，网络/格式失败仍单独报告并输出 Actions warning。
- 每两小时是 GitHub Actions 的计划频率，实际执行可能延迟；查看运行历史与报告，而非将绿色任务状态等同有新文发布。
- 全文只作临时筛选证据；中文静态分析、形式化证明、实时多模态与稀疏 MoE 等机制可作为证据，网址中的 agent 不构成技术主题。商业宣传与纯榜单继续过滤。
