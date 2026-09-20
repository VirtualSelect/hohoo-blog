# Huhohoo Design System

## 科幻粒子视觉变体

以下粒子规范现适用于 About 的既有展示；首页以文末“2026-09 发现入口精简”为准。视觉参考用户提供的 GPT-6 Astra 宣传截图：近黑星空、蓝白星点、少量暖色星光，以及有真实纵深的粒子字形。完整品牌 **Hohoo** 必须由粒子本身构成；不能用普通文字叠在抽象轨道或流场上代替。

- 首页采用居中纵向结构：一句定位与简介、中央粒子字形、阅读和项目入口；移除左右双栏及重复个人名片。桌面与手机沿同一阅读顺序布局。粒子限定在品牌展示区，透明画布与页面共用底色；浅色模式使用墨蓝／琥珀粒子，深色模式使用蓝白／暖金星光，全站正文不再铺设动态星空。
- 全站采用石墨黑／暖白中性底色、低饱和蓝色链接、细分割线；首页与栏目页统一 1160px 外框及桌面 32px／手机 20px 内边距。减少发光和装饰渐变，标题与正文负责信息层级。
- 鼠标不按下时掠过字形会拨散局部粒子，移开后弹簧回归；按住拖动改变三维投影的角度。
- 触屏支持横向旋转，纵向保留页面滚动。方向键旋转、空格拨散、R/Escape 复位，仅显示拨散／复位两个胶囊分组控件；操作说明视觉隐藏，保留读屏关联描述。字形采用更密集的采样、较高不透明度与缓慢明暗变化，浅色加强墨蓝对比，深色强化亮星。
- 使用原生 Canvas 字形采样和三维投影，不新增图形依赖、不使用官方素材或产品文案。
- 提供静态文字 SSR/Canvas 失败回退、暂停开关、系统减少动态效果、后台及离屏暂停。暂停偏好键为 `huhohoo.motion.v1`。
- 限制帧率约 30fps、DPR 1.5；初次加载手机屏幕时降低采样密度。字体属于装饰字形，语义正文独立可读。
- 粒子颜色不代表内容状态或任何真实模型指标。长篇正文保持稳定底色。

## 第二阶段统一约定

品牌使用 Hohoo.；产品名 Hohoo's AI Lab；标语 Learning in public. Building in public.。
当前外壳为 Next.js 的 `apps/web/components/Shell.jsx`，复用统一导航与页脚，不新增平行页面外壳。内容来源与核验状态使用轻量 Eyebrow / Metadata，不使用彩色权威勋章。
全站搜索采用原生 dialog 与构建期索引，Tab / Enter / Esc 可操作；空查询展示真实文章与常用入口，空结果保留对话框宽度。架构图使用可换行的语义有序列表，不引入图形库。

2026-09-16 阅读体验约定：移动端目录使用原生 details，桌面目录避让顶部导航并标识当前章节；Radar 以紧凑元数据、细线时间轴和独立结果统计展示。来源发布时间与最近收录时间分开，不能把收录时间当作采集成功时间。首页阅读指引只关联已存在的教程和项目。沿用当前暖白 / 深绿底色与绿色 Accent。

交互入口约定：主题使用“护眼 / 夜间”文字与 SVG 图标，保留 `huhohoo.theme.v1` 的 `light / dark` 值，按钮至少 44px 高宽；刷新、路由切换及同源多标签页保持一致。站内链接在等待路由响应时显示不拦截点击的状态提示。About 粒子限制约 30fps、DPR 不超过 1.5，继续保留暂停、减少动态效果与离屏停止。
`static/img/og-template.svg` 是 1200×630 的分享图模板，尚未替换站点现有 OG 图片；后续导出 PNG/JPEG 后再用于社交平台，避免假设平台支持 SVG。


## 1. Design Direction

huhohoo.com 的视觉目标不是“炫酷 AI 官网”，而是：

> **Editorial · Developer · Minimal · AI Lab**

希望用户感受到：

- 技术理性；
- 持续学习；
- 工程实践；
- 编辑杂志感；
- 克制、清晰、有秩序。

视觉系统应长期稳定，让内容成为主体。

---

# 2. Brand Language

## 2.1 核心三轨

```text
01 / BUILD
AI APPLICATIONS

02 / UNDERSTAND
LLM

03 / EXPLORE
EMBODIED AI
```

## 2.2 内容编号

```text
PROJECT / 001
LAB / 001
NOTE / 001
PAPER / 001
RADAR / SIGNAL
RADAR / WEEKLY
```

用途：

- Page Hero Eyebrow；
- Card / List Label；
- Timeline；
- Related Content；
- 首页 Featured Content。

编号应使用 Mono / UI Font，避免用巨大装饰字体抢正文。

---

# 3. Design Tokens

> 如果当前项目已有 Docusaurus/CSS Variables，请基于它们扩展，不要平行创建完全独立体系。

推荐语义变量：

```css
:root {
  --hh-bg: var(--ifm-background-color);
  --hh-surface: var(--ifm-background-surface-color);
  --hh-surface-subtle: /* derived */;

  --hh-text-primary: var(--ifm-font-color-base);
  --hh-text-secondary: /* lower contrast */;
  --hh-text-tertiary: /* metadata */;

  --hh-border: /* subtle border */;
  --hh-border-strong: /* stronger divider */;

  --hh-accent: /* single accent color */;
  --hh-code-bg: /* code surface */;
}
```

原则：

- 使用**语义变量**而不是 `--gray-300` 到处散落。
- Light / Dark 使用同一语义名映射不同值。
- Accent Color 尽量只有一个主色。
- Status 色只做辅助，不把页面做成彩色仪表盘。

---

# 4. Color

## 4.1 基础比例

建议视觉面积：

```text
Neutral 85%+
Accent  10%以内
Status/semantic 少量
```

## 4.2 Accent 使用场景

可以用于：

- Current item；
- Link hover；
- Focus ring；
- Progress；
- 小面积 Status；
- Active filter。

避免用于：

- 每张卡背景；
- 大面积 Hero 渐变；
- 所有标题；
- 大片按钮矩阵。

---

# 5. Typography

## 5.1 层级

建议语义层级，不强制具体 px；Codex 应结合现有站点字号体系实现。

```text
Display / Hero
Page Title / H1
Section Title / H2
Content Heading / H2-H3
Card/List Title
Body
Lead
Metadata
Eyebrow / Mono
```

## 5.2 中文阅读

中文正文重点：

- 行高不能太紧；
- 一行不能过宽；
- 粗体使用克制；
- 英文术语与中文之间保持自然排版；
- 长篇正文和 UI Metadata 要有明显区别。

## 5.3 Mono Font

适合：

```text
LAB / 001
SEP 11
12 MIN
BUILDING
AI APPLICATIONS
```

不适合整个正文。

---

# 6. Layout

## 6.1 Container

推荐：

```text
Site max width: 1200～1280px
Reading width: 720～820px
```

以现有布局变量为准，不强制重复定义。

## 6.2 Section Rhythm

Section 之间用明显留白建立节奏。

优先：

- whitespace；
- `border-top`；
- section number；
- typography。

而不是：

> 每个 section 都放到一块灰色圆角背景里。

---

# 7. Spacing

建议使用固定 spacing scale，而非随机数值。

示意：

```text
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128
```

使用规则：

- Metadata 内部：小间距；
- Card/List 内容：16～24；
- Section：64～128；
- Hero：根据 viewport 调整。

移动端适当降低，不把 Desktop spacing 原样搬过去。

---

# 8. Border & Radius

## Border

细边框是主要结构语言之一。

```text
1px subtle
1px strong (rare)
```

## Radius

Radius 要克制。

推荐：

- 小型 tag / badge 可较圆；
- Card 中等圆角；
- 大内容块避免“每块都胶囊化”。

不要同时出现大量不同 Radius。

---

# 9. Buttons & Links

## Primary CTA

仅用于关键动作，例如：

- Explore Learning
- View Projects
- Start Reading

## Secondary

使用：

- Text Link；
- Border Button；
- Arrow Link。

## Arrow Behavior

默认：

```text
View Project →
```

Hover：

```text
arrow translateX(4px)
200～250ms
```

## External Link

使用 `↗` 或现有项目的 external icon，保持全站一致。

---

# 10. Cards vs Lists

这是设计系统中的重要约束。

## 优先使用 Card

- Featured Project；
- Project Grid；
- Lab Overview；
- 需要明显独立边界的交互对象。

## 优先使用 List / Editorial Row

- Latest；
- Archive；
- Timeline；
- Notes Index；
- Papers；
- Resources；
- Related Content。

典型 Latest：

```text
01   Spring AI Tool Calling
     AI APP · 12 MIN                         SEP 08
──────────────────────────────────────────────────
02   Understanding Embedding
     LLM · 8 MIN                            SEP 03
```

这比 6 张同样大小的 Card 更符合本站风格。

---

# 11. Component Patterns

## 11.1 Page Hero

```text
EYEBROW / INDEX

Page Title

1～2 行说明。

Optional metadata / CTA
```

不要每个页面 Hero 高度都占满一屏。

---

## 11.2 Section Header

```text
LATEST                                    VIEW ALL →
─────────────────────────────────────────────────
```

或：

```text
04 / LATEST

What I published recently.
```

选择一种和当前页面匹配的模式，不在同一页面混用太多 Header 风格。

---

## 11.3 Status Badge

状态值映射：

```text
planning
learning
building
experiment
published
production
archived
```

原则：

- 小；
- 可读；
- 颜色低饱和；
- 不把状态做成主视觉。

---

## 11.4 Empty State

不使用：

```text
No data.
```

推荐：

```text
FIRST EXPERIMENT IN PROGRESS

The lab will document questions, setup,
evidence and conclusions.
```

或中文：

```text
第一组实验正在整理中。

这里会记录问题、环境、证据、结论与复现方式。
```

Empty State 需要表达“这个区域未来是什么”，但不能伪造已完成内容。

---

# 12. Home Page

目标：

```text
Personal Homepage
+
AI Learning Hub
+
Builder Portfolio
```

## 12.1 Hero

建议：

```text
你好，我是 Hohoo.

Developer · AI Builder · Explorer

从 Java 到 AI。
从模型到应用，再走向真实世界。

Explore Learning →
View Projects →
```

背景可出现超低对比 Typography：

```text
BUILD
UNDERSTAND
EXPLORE
```

要求：

- 不抢标题；
- 手机端可隐藏；
- 本科幻视觉分支允许低密度粒子背景与首页粒子轨道；必须提供暂停控制、浅色适配与减少动态效果支持。

## 12.2 Currently

```text
CURRENTLY

Building       Personal AI Knowledge Assistant
Learning       LLM Evaluation
Exploring      Embodied AI
Updated        SEP 2026
```

适合列表/网格，不做四张独立 Card。

## 12.3 Learning Tracks

三轨使用一致结构：

```text
01 / BUILD
AI APPLICATIONS
Description...
Model API · RAG · Agent · Evaluation
Explore →
```

没有真实进度时不要显示百分比。

## 12.4 Latest

使用 Editorial List。

## 12.5 AI Radar

首页增加一个轻量外部资讯区块，位置推荐在 `Latest` 与 `Featured Builds` 之间。

关键视觉原则：

```text
LATEST          = Hohoo 自己的内容
AI RADAR        = 外部世界的重要信号
```

Radar 不使用和 Project / Note 完全相同的卡片视觉。推荐 Editorial Row：

```text
AI RADAR                                      VIEW ALL →

SIGNAL / OFFICIAL                                  2H AGO
GPT-xxx Released
一句 AI Summary……
OpenAI ↗                         MODEL · API
──────────────────────────────────────────────────────
PAPER SIGNAL                                      5H AGO
...
```

必须显示：

- `SIGNAL / OFFICIAL / PAPER SIGNAL / RELEASE` 等来源属性；
- 时间；
- Primary Source；
- Topic；
- 必要时显示 `AI SUMMARY` 标识。

避免：

- 新闻门户式密集卡片墙；
- 大封面图；
- 夸张“Breaking News”视觉；
- 用 Radar 抢过 Projects / Labs 的视觉权重。

首页最多 3～5 条高价值 Signal。

## 12.6 Featured Builds

最多 2～3 个。

## 12.7 Latest Lab

最多突出 1 个。

## 12.8 Activity

首页只显示 4～6 条，完整历史去 Timeline。

单条 Radar Signal 默认不进入 Activity；Weekly Digest 或真正转化为 Paper / Note / Lab / Blog 的内容才进入。

---

# 13. Project UI

## Index

```text
BUILD / PROJECTS

Ideas are useful.
Shipping makes them real.
```

重点项目可以用较大 Feature Layout，普通项目进入列表/网格。

## Detail

Hero：

```text
PROJECT / 001

ASK HOOHOO

Personal AI Knowledge Assistant

RAG · Java · Spring AI
BUILDING
```

Architecture / Metrics 等内容区不要每段都做 Card。

Decision 推荐：

```text
DECISION 01
Vector Store

PostgreSQL + pgvector

Why
...

Trade-off
...
```

---

# 14. Lab UI

Lab 强调科学记录感。

```text
LAB / 004

Does reranking really help?

RAG · EVALUATION
SEP 2026
```

Result 可以使用：

- Table；
- 简单 Bar；
- 小型 Metric。

不要为了“实验室感”变成霓虹 Dashboard。

Observations 与 Conclusion 视觉上要区分。

---

# 15. Notes UI

Notes 是轻量内容。

Index：Editorial list 优先。

```text
NOTE / 024
KV Cache
LLM · INFERENCE · 5 MIN
一句话说明……
```

Detail：

```text
WHAT
WHY
HOW
WHEN IT MATTERS
RELATED
```

不需要完整 Docs Sidebar。

---

# 16. Glossary UI

顶部：

```text
AI GLOSSARY

[ Search concepts... ]

A B C D E ... Z
```

Term：

```text
RAG
Retrieval-Augmented Generation
检索增强生成。
LLM / APPLICATION
Read more →
```

Glossary 是索引，不复制 Note 的长内容。

---

# 17. Papers UI

使用偏文献目录的列表风格。

```text
PAPER / 012
Attention Is All You Need
Vaswani et al. · 2017
Transformer · Foundation
READ

Reading Note →        Paper ↗
```

避免做成“收藏网站卡片墙”。

---

# 18. Resources UI

Resource Item：

```text
Spring AI
FRAMEWORK

适合
Java / Spring Developer

为什么推荐
与 Spring 生态整合自然，适合作为 Java 开发者进入 AI 应用开发的入口。

Official ↗     My Notes →
```

强调推荐理由，不强调 Logo 墙。

---

# 19. Learning Page

它是 Learning Dashboard，但不是 SaaS Dashboard。

推荐：

```text
LEARNING PATH

CONTINUE LEARNING
RAG Evaluation →

01 BUILD
○ Model API
✓ Structured Output
◐ RAG
○ Agent

02 UNDERSTAND
...
```

少用彩色图表，多用 Typography + Status + Progress。

---

# 20. Knowledge Map

Desktop：

- 2D；
- 清晰节点；
- Hover Highlight；
- Click Side Detail；
- Filter Domain。

不要默认：

- 3D；
- 粒子；
- 无限缩放；
- 复杂 physics。

Mobile：

改成：

```text
RAG
├── Prerequisite
│   ├── Embedding
│   └── Vector Database
├── Related
│   └── Reranking
└── Used by
    └── Ask Hohoo
```

---

# 21. Docs / Article Reading

## Reading Width

正文保持约 720～820px 的舒适范围。

## Header

```text
AI APPLICATIONS / RAG

RAG From Scratch

Description

INTERMEDIATE · 12 MIN · UPDATED SEP 2026
```

## Learning Context

只展示当前位置上下文：

```text
PART 03 / 08
AI APPLICATIONS

02 Structured Output ✓
03 RAG ← YOU
04 Agent
```

不复制整个 Sidebar。

## Related

```text
KEEP EXPLORING

NOTE / Embedding
LAB / Chunk Size
PROJECT / Ask Hohoo
```

---

---

# 22. AI Radar UI

Radar 的视觉任务是：

> **让用户快速判断“发生了什么、为什么值得看、信息来自哪里”，而不是制造无限滚动的信息焦虑。**

## 22.1 Radar Index

Hero：

```text
AI RADAR

What's happening at the AI frontier.
Curated signals, connected to what I'm learning.
```

顶部控制：

```text
ALL · MODELS · AGENTS · AI CODING · RAG · MULTIMODAL · EMBODIED · RESEARCH
```

Filter 如果移动端放不下，使用横向滚动 / Select / Sheet，不挤成多行小按钮墙。

列表优先 Editorial Row，不做瀑布流。

## 22.2 Radar Item

推荐结构：

```text
RADAR / SIGNAL
MODEL · OFFICIAL                         SEP 11 · 2H AGO

GPT-xxx Released

AI SUMMARY
发生了什么……

WHY IT MATTERS
为什么值得关注……

RELATED KNOWLEDGE
NOTE / ...
LAB / ...
PROJECT / ...

PRIMARY SOURCE
OpenAI ↗

RELATED COVERAGE
...
```

`AI SUMMARY` 必须明确可见。

`HOOHOO'S TAKE` 只有存在真实人工内容时显示，并使用不同 Eyebrow：

```text
HOOHOO'S TAKE
```

不要自动生成这个区块。

## 22.3 Radar Cluster

同一事件多来源时，不展示多张同级主卡。

推荐：

```text
Primary Source   OpenAI
Coverage         4 sources
```

点击展开 Related Coverage。

## 22.4 Weekly Digest

页面更像编辑周报，而不是列表：

```text
RADAR / WEEKLY
2026 · W37
SEP 07 — SEP 13

THIS WEEK IN AI

01 MODELS
02 AGENTS
03 AI CODING
04 RESEARCH

WORTH FOLLOWING
...

SAVED TO KNOWLEDGE
3 Papers · 2 Notes · 1 Lab Idea
```

数字只能来自真实数据。

## 22.5 Trend Page

趋势页面使用小型数据可视化即可：

- Signal count；
- 7d / 30d；
- Timeline；
- Related sources；
- Related knowledge。

不做股票行情式红绿大盘，不制造“涨跌焦虑”。

## 22.6 Mobile

移动端：

- Radar Row 纵向排列 Metadata；
- Source / Time 保持可见；
- Why It Matters 默认可读；
- Related Coverage 可折叠；
- Topic Filter 不造成多行拥挤；
- 不使用横向复杂表格作为主阅读方式。

---

# 23. Ask Hohoo UI

## Launcher

```text
✦ Ask Hohoo
```

Desktop：Side Panel。

Mobile：Full Screen 或 Bottom Sheet。

## Initial

```text
ASK HOOHOO
Ask anything about my published notes.

RAG 应该怎么入门？
Embedding 和 Reranker 有什么区别？
```

## Answer

```text
Answer...

SOURCES
01 RAG From Scratch
02 Embedding
03 RAG Evaluation
```

Sources 是视觉核心，不允许弱化到不可发现。

如果未来 Ask Hohoo 支持 Radar，UI 必须区分来源范围：

```text
KNOWLEDGE SOURCE
RADAR SOURCE · 2H AGO
```

默认知识问答优先长期 Published Knowledge；只有涉及“最新 / 最近 / 本周”等问题才突出 Radar Freshness。

---

# 24. Motion

统一：

```text
Entrance: opacity + translateY(12px)
200～350ms
```

Hover：

```text
translateY(-2px)
arrow translateX(4px)
```

必须支持：

```css
@media (prefers-reduced-motion: reduce) {
  /* disable non-essential motion */
}
```

---

# 25. Responsive

必须检查：

```text
1440
1280
1024
768
430
375
```

Mobile Rules：

- Hero Typography 背景可隐藏；
- 两列/三列自然堆叠；
- Metadata 换行；
- Table 横向滚动；
- Code Block 不撑破 viewport；
- Dropdown / Dialog 支持触控；
- 重要 CTA 高度满足触控；
- Knowledge Map 降级。

---

# 独立 GPU 视觉实验（2026-09-12）

用户明确指定的 Astra 风格方案位于 `apps/astra-hero`，采用 Next.js、TypeScript、Three.js；它与现有 Docusaurus 博客独立运行。视觉主体必须是完整 **Hohoo** SVG 粒子字形，背景固定 `#050505`，使用白、淡蓝、少量淡金星光及不均匀亮度。支持悬停划散、拖拽旋转、滚动变形，同时保留静态阅读和减少动效模式。

技术配置与降级规则见该应用 README；本实验不改变正文阅读区和现有内容模型的长期规范。

# 26. Visual Review Checklist

Codex 每次视觉任务结束前检查：

- [ ] 页面是否 Card 过多？
- [ ] 是否存在不必要渐变？
- [ ] Accent 是否滥用？
- [ ] Typography 层级是否清楚？
- [ ] Section 是否有足够呼吸感？
- [ ] Mono Label 是否一致？
- [ ] Arrow / Link 行为是否一致？
- [ ] Light/Dark 都成立？
- [ ] 375px 是否可阅读？
- [ ] prefers-reduced-motion 是否成立？
- [ ] 有没有为了“AI 感”增加低价值装饰？

页尾延续正文底色，首页结束语居中呼应首屏；页脚使用细分割线、紧凑导航组和品牌／版权分列的落款及居中许可说明，不再使用整块异色背景。手机导航组纵向堆叠，链接保持 44px 触控高度。

## 2026-09 发现入口精简

首页顺序：Hero → Latest Writing → Currently → Featured Build → AI Radar → Footer。Hero 不再使用粒子展示；About 的既有视觉保留。Articles 使用编号、标题、摘要、日期组成的编辑式列表。Planned 仅显示轻量标题，Full Roadmap / Experiment Proposals 使用原生 details 折叠。翻译状态用细分割线和 metadata 表达，不额外包大卡片。

## Next.js 分支视觉（2026-09-12）

apps/web 使用暖白 / 深绿黑中性色与低饱和绿色 Accent。首页采用左侧文字 Hero + 右侧 Currently、文章编号列表、双列真实项目、三轨入口、轻量 Radar。正文采用独立目录、限定阅读宽度、语法高亮与复制按钮。保留既有 hh-* 语义组件，覆盖底层 token，不新增 CSS 框架。手机导航使用可展开菜单，所有隐藏辅助标签必须不影响布局宽度。

## Radar 阅读操作行

资讯来源与收藏、已读操作使用独立 Grid 操作行：桌面来源靠左、阅读操作靠右，垂直居中，链接及按钮至少 44px 高，两组之间保留 24px 间距。来源文字放入独立 span，外链箭头不参与文字拆分。600px 以下改为单列，按钮组自然换行。阅读状态按钮使用细边框与透明底色，沿用主题 token；选中态使用文字与边框强调，并保留 aria-pressed 和键盘 focus。不得靠空格、文字基线或固定定位对齐。

段落级 `p.hh-meta` 按文本流排列，避免 flex 将时间和说明拆成错位列；只有明确的元数据容器使用 flex。搜索结果依次展示类型、标题、摘要。筛选按钮使用统一选中态；展开控件至少 44px 高；菜单 Esc 关闭后焦点返回触发按钮。

## 关于页个人名片（Next.js）

首页保留简洁文字介绍与右侧近况，沿用暖白、深绿和绿色强调色。参考图中的错层个人名片放在关于页粒子效果下方，与个人介绍并列，使用 static/img/hohoo.jpg 原有头像。名片轻微倾斜，hover/focus 回正，减少动效时保持静止；手机纵向排列。桌面搜索提示统一 Ctrl + K，保留 Ctrl/Meta 两种键盘触发。
