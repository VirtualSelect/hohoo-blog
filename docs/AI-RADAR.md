# Huhohoo AI Radar

## 2026-11-08 · 构建副本瘦身（当前本地分支）

保留当前全部资讯、日报、周报、旧地址和 RSS。瘦身针对重复序列化：雷达和周报只携带已关联的研究条目及搜索所需的三篇文章，不随页复制全站目录与完整学习路线。独立整理的 `radar-digest` 保留原页面条目和相关链接，不能被规则周报替代。

客户端文案按路由取用；普通页面不再附带整套 Journey 文案和已退役主题文案，搜索使用的 `journey.roadmapLabel` 继续保留。Journey 页面、服务器元数据和文案源文件不删。

阅读清单、专题和周报入口不再直接 import 原始新闻 JSON，防止把全体多语言资讯及 RSS 正文打入浏览器脚本。阅读清单使用当前语言的最小记录投影并保留全部原始 ID（包括聚合前的记录）；专题只接收同分类的三条资讯；周报入口只读取构建期周次目录。正文仍是跨语言共用的按需资产。

没有削减配额、历史条数、页面路由或来源信息。体积、完整内容对比及预览验证见 `reports/RADAR-SLIMMING-20261108.md`。仍未提交、合并、推送或发布；本地预算不代表云端累计部署占用。

## 2026-11-07 · RSS 正文站内阅读（当前本地补充）

上一阶段仅将全文用于筛选。本次按读者反馈接通站内阅读：AIHOT `content:encoded` 存在时保留其文本段落与来源归属；没有正文时明确区分“本条全文源只有摘要”和“历史归档未保存正文”。不抓取原始报道页面补全文，也不通过生成模型编写替代正文。当前缓存的 50 条 feed 与已收录记录匹配 7 条，其中仅 1 条实际提供正文；Ling 条目本身没有 `content:encoded`。

原始记录的可选 `feedContent` 不进入语言投影、搜索、日报、周报或本站 RSS 正文。构建时将其生成一份带内容哈希的 `/radar-content/<id>-<hash>.json`，阅读器进入该条时才请求；三个语言共用同一原语言文本，不伪称已翻译。React 按普通文字渲染，不执行 RSS HTML、脚本、样式或嵌入媒体。保留原始报道 HTTPS 链接和正文中的归属文字。

后续采集会为已入库且仍出现在当前 feed 的记录补充/更新正文，不改变原收录时间或重复占用日额度；相同正文不因抓取时间变化而制造提交。全文源明确退回摘要时移除旧正文，简洁源故障回退不会误删全文。生产构建清理未被当前 manifest 引用的旧正文资产，避免历史哈希文件积累。

公开使用范围仍遵循下节所述来源规则；本次只完成本地功能与数据预览。

## 2026-11-07 · AIHOT 单源与三类阅读入口（当前分支）

仅启用 AIHOT，停用另外七个来源，保留注册定义以识别历史来源。以 `/feed/full.xml` 为主源、`/feed.xml` 为顺序故障回退，两者同一批最新 50 条，不并行入库。全文只参与机制筛选，公开记录仍为短摘录与阅读链接；不转载正文。401/403/429 不切换端点重试。每天最多 10 条、两小时任务与 UTC 分时额度不变。

实测发现激活参数、Agent 线程协调、固定图像复杂度/质量的评测和动态模型目录会被旧规则误删，本轮补充这些具体机制及反例测试；融资、纯排名、无技术信息的推广仍过滤。此次本地补采 4 条，不为凑满额度放宽到泛商业资讯。

入口分为“精选动态”“AI 大事记”“每周回顾”。大事记是已收录条目的发布/开源类标题索引，采用保守规则，不表示本站独立核验或重要性排名；按 AIHOT 发布日期整理，原始事件日期查详情。技术方向是横向筛选，不建立重复新闻副本。

用户授权整理历史后，先在仓库外完整备份 431 条与日报，再移除 259 条非 AIHOT 记录；保留 172 条 AIHOT，补采后为 176 条。同步重建日报、周报关系和相关实践映射；被清空的 2026-10-05 日报保留重定向至雷达。旧条目的原时间不改写。

参考 [接入说明](https://aihot.news/llms.txt) 与 [公开使用规则](https://aihot.news/terms)。公开镜像或持续批量再分发需确认书面授权。当前全部改动仅在本地分支，未部署或申请外部权限；公开上线前需确认用户已有授权或改用外链入口。

## 2026-11-07 · 信号流与聚焦巡航（当前本地预览）

最新反馈不采用常驻双栏阅读台。改为按来源 feed 日期分组的信号流，先看标题与三行以内的已有摘要；选择后进入独立聚焦阅读，通过上一条/下一条或焦点位于阅读区域内时的 J/K 切换，Esc 返回原位置与焦点。巡航从第一条未读开始；全部已读时从首条开始，不自动标记已读，不生成摘要。

保留来源摘录与 AI 摘要的区分、完整原文入口、原公告/聚合/收录日期、收藏、已读、相关研究、搜索和组合筛选。没有摘要的条目标为原文可读。聚焦内切换只替换当前 hash，浏览器返回可退出巡航；进入与返回不建立新的阅读状态协议。边界停住，不无限循环；需要更多档案时明确提供加载按钮。先检查已加载范围与失败状态，不将尚未加载的结果当作零。

旧 `#signal-*`、筛选 query 继续兼容。页面仅读取既有分块档案，日期刻度不代表实时监控，装饰波形不代表测量数据。移除被替代的旧工作台样式，不引入图形库、模型或新服务。

## 2026-11-07 · 雷达阅读工作台（本地分支预览）

本轮只改展示与本地阅读交互：桌面频道/队列/阅读面板，手机列表/阅读切换。搜索、主题、来源、已读/收藏筛选及时间排序组合使用；筛选或深链接需要历史条目时加载完整现有档案，加载失败提供重试，不显示误导性的零结果。选择条目不会自动设为已读。

进一步压缩刊头和累计数量，阅读面板优先展示标题与来源摘要；来源日期和核验详情可展开检查。已有 Related 与预设阅读问题提前显示，没有映射时不补造“推荐理由”或作者观点。列表和频道随页面滚动，仅桌面长阅读面板独立滚动，手机频道横向可操作。

所有内容仍来自已有构建期结果，不触发 RSS 抓取、模型处理或全文转载。保留来源、语言、日期、核验与相关报道语义；没有摘要时明确提示读原文。未改变日额度、时效排序、来源注册表或自动发布链路。工作台 URL 与状态协议见 `docs/CONTENT-MODEL.md`。

## 2026-10-06 · 来源时间的展示边界

- 保持 `publishedAt` 为来源 feed 发布时刻、`collectedAt` 为本站收录时刻；日报继续按 UTC 收录日归档，不把收录日称为事件发生日。
- 可选 `originalPublication` 保存已核实原公告的 `date`（日期精度）、`sourceUrl` 与 `verifiedAt`。不以聚合页时间推导原公告时间；未核实的聚合条目标为“原公告日期未核实”。
- 页面与 RSS 共用 `src/utils/radar-provenance.cjs` 的来源事实标签。Vicuna 条目保留 2026-10-03 的聚合与收录时间，另外注明 LMSYS 原公告 2023-03-30；不删除历史条目或伪造抓取时间。
- Next.js 的文章 RSS 保留所有已发布且有当前语言内容的 Docs/Blog，按原发表日期倒序；资讯 RSS 保留全部已发布归档。订阅说明随归档规则保持一致，不硬编码“最近 100 条”。`/news/rss.xml` 与 `/radar/rss.xml` 继续兼容。


## 2026-09-29 时效与日额度修复

- 日额度继续按 UTC 入库日累计，全站最多10条。按用户最新要求，AIHOT取消原有6条独立上限，与其他来源共享总额，可入库0–10条；其他单源默认最多2条，不删除已发布条目来腾额度。
- Source Registry 的 `dailyLimit: "shared"` 表示该来源动态使用全站剩余额度，不额外分配名额，也不保证保底数量；整数仍表示固定来源上限，省略则使用 `perSourceLimit`。AIHOT配置为 `"shared"`，全站总额变化时自动跟随。
- `pacedDailyBudget` 将累计可用额度在 UTC 00/06/12/18 时分别释放到40%/60%/80%/100%（向上取整），全站为4/6/8/10；AIHOT共用这份额度。重复执行共享额度，未使用的额度可延续到当天稍晚；已经用满的日期不会因为新策略而重置。例如其他来源已经入库3条，全天AIHOT最多可用7条。
- `freshnessFirst` 先按来源发布日期（UTC）倒序，再在同一天按研究相关性、来源优先级和发布时间排序。技术筛选门槛保持不变，防止较旧论文在第一轮占满全天名额。
- 报告加入日额度已用量、当前释放量和剩余量，区分硬上限与留给后续时段的额度；最多保存10条因额度延后的候选摘要，全文仍不公开。
- 页面时间轴、首页资讯、专题与单条资讯日期统一显示北京时间（UTC+8），保留原始 ISO 时间，避免 SSR 与浏览器本地时区差异。UTC入库日、原始发布时间、ISO周报边界及旧地址均不改写。
- 2026-09-29 08:59 UTC运行8个来源成功，0条新增，313条候选被日额度挡住。此前02:16 UTC一次入库10条，其中6条按北京时间属于较早日期。这是额度与显示时区共同造成的“今天没更新”，不是当次部署失败。
- 每两小时的计划保持不变。GitHub Actions schedule 可能延迟或丢弃排队任务，不能承诺准点；参考[官方说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。

## AIHOT 全文订阅与筛选（2026-09-17）

订阅地址由 `config/news-sources.json` 管理，改用 `/feed/full.xml`（`aihot-full-v2`）。优先使用 RSS `content:encoded` 的清洗文本评估相关性，缺失时回退到未截断的摘要；不另外抓取原网页全文。全文只在采集过程中作为 `relevanceText` 使用，进入摘要处理、coverage 和公开 JSON 之前移除。公开摘要仍不超过 180 字符，保留标题、来源与阅读链接；自动翻译仍暂停。

筛选同时要求研究主题与技术信息，补齐 AI Coding、Codex、上下文工程、记忆、ROS2、模拟器和机器人数据的中英文表达。上下文压缩、记忆持久化、沙箱测试、话题通信、观测动作对齐等机制可提供技术证据；纯排名、商业宣传、仅有产品名称的公告不收录。含评测方法、消融或复现步骤的榜单分析可保留。规则仅判断收录相关性，不代表事实核验。

当时配额按 UTC 入库日全站最多10条、AIHOT最多6条；AIHOT独立上限已于2026-09-29改为共享全站额度，当前规则见本文顶部。跨采集执行共享额度，每两小时计划运行一次，不保证凑满，不批量重写已有资讯。

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
- 配额按 UTC 采集日累计：全站10条；AIHOT自2026-09-29起动态共享全站额度，其他单源默认2条。补采与定时任务共享配额，不保证凑满。
- 报告记录窗口、各源最新发布时间、窗口内条数、主题拒绝、重复、超出窗口、日配额和来源配额。合法空 RSS 代表无更新，网络/格式失败仍单独报告并输出 Actions warning。
- 每两小时是 GitHub Actions 的计划频率，实际执行可能延迟；查看运行历史与报告，而非将绿色任务状态等同有新文发布。
- 全文只作临时筛选证据；中文静态分析、形式化证明、实时多模态与稀疏 MoE 等机制可作为证据，网址中的 agent 不构成技术主题。商业宣传与纯榜单继续过滤。

## 2026-11-06 发布推送的临时故障

采集、内容检查和构建通过之后，发布步骤固定当前提交 SHA，最多向同一目标分支推送三次。仅对可识别的服务器临时错误、连接中断或超时重试，两次等待分别为 5 秒和 10 秒。响应丢失时仍使用原提交，不重新生成资讯、日期或重复提交。

权限错误、非快进拒绝及其他未识别错误直接失败；连续临时故障超过上限也以失败结束，保留已有诊断产物。发布步骤不自动拉取、变基或强制推送，避免把未经本次检查的合并结果直接上线。

## 2026-11-12 只读更新核对（本地待审阅）

`npm run news:status` 对比本地归档、远端 main、网站数据快照及 RSS，并读取公开的最近采集任务；不读取凭证、不写文件、不触发补采、合并或发布。附加参数可直接使用 `node scripts/news/status.mjs --json` 或 `node scripts/news/status.mjs --preview http://localhost:4216`，避免部分 npm / PowerShell 版本拦截参数。访问失败时显示无法核实，不把失败转换为空归档或健康状态。

构建生成一份 `/radar/snapshot.json`，三种语言共用。`dataHash` 是原始归档的 SHA-256 指纹：忽略对象键和顶层记录顺序，但保留字段、正文与数组内容；它不代表代码版本、最后扫描时间或来源事实已核验。快照不含 feed URL、凭证或全文，固定文件覆盖更新，不积累历史快照。原始记录数与去重聚合后的信号数分开；`latestFeedPublishedAt` 对应聚合信号的 feed 日期，`latestCollectedAt` 是原始记录中最近入库的时间，均不是原事件日期或任务运行时间。

旧生产版尚无快照时，工具仍核对 RSS 条数和 feed 日期，但明确无法做数据指纹比较。RSS 摘要一致不能证明内容逐条一致。任务成功也不等于有新增；每两小时是计划频率，实际执行时间及筛选、去重、失败原因以对应 Actions 报告为准。页面沿用“关于这些信号”折叠区解释每日 UTC 上限、最近收录和运行记录，不增加实时采集请求或新的常驻面板。
