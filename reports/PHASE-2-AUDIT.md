# 第二阶段精修审计

审计日期：2026-09-11。基线：64fbc82，Docusaurus 3.10.2。先读源码及规范，再实际访问 28 个页面；页面均 hydration 成功，没有运行时异常。浏览器原始结果保存在本地 `.cache-loader/verification/phase2-audit.json`。

## Current Branding
配置标题和导航已是 AI Lab / Hohoo.；部署 projectName 仍是 Blog，首页 SEO 仍以个人博客描述。统一品牌，不重建站点。

## Old vs New Layout Differences
页面实际共用 Docusaurus Layout，未发现第二个生效的 Footer。旧 Papers/Reading 使用较重卡片，新页面使用 hh-* 排版。保留原生 Docs/Blog 阅读框架，统一外围信息层级。

## Route Inconsistencies
`/news/weekly` 是有效旧页面，缺少 `/radar/weekly`。`/lab` 仍是旧聚合页；论文引用 `/lab#id`。`/aboutMe`、旧 Blog slug 已兼容。

## Footer Inconsistencies
Footer 本身统一，但配置、翻译 JSON 有遗留友情链接及旧标签；Navbar/Footer 重复维护链接。抽取共享导航目录，仍用原生移动菜单。

## Metadata Inconsistencies
Papers、Reading、Subscribe 缺少 description；首页 title 不符合新规则。Canonical 由框架正确生成，无需另造系统。

## Reusable Components
ContentUI 的 Section / ContentRows / Related / Status；ContentDetail；RadarItem / RadarWeekly；CurrentFocus；ReadingActions；原生 Layout、Navbar、DocItem、BlogLayout。

## Duplicate Data Sources
首页项目只读取标题，描述、路径、状态、仓库另写；方向数量写死 03。content-index 已汇集 Docs、Blog、Projects、Labs、Notes、Papers，可用于搜索。阅读状态仍分学习进度和资讯收藏，需适配而非丢弃旧数据。

## Hardcoded Statistics
HomeProjects 的 03 研究方向写死；论文数量动态。Learning 当前没有 0/0，但缺少其他内容阅读概览。不添加虚假完成度。

## Radar Trust Issues
AIHOT aggregator 被映射为 media；缺少 Verification Status。标题同日去重能力较窄，未明确 eventId/clusterId 输出。不能将自动审核当成事实核验，不能将多篇转载当交叉核验。

## Lab Detail Weaknesses
三个 Lab 都是 planning，仅有问题和未执行提示。需补充明确标注的实验设计：假设、变量、待选数据集、基线、指标、判定规则、风险。不能填写假结果或实验日志。

## Project Detail Weaknesses
真实站点项目有说明、代码、Demo，但架构只有文字。可从现有流水线绘制 CSS 流程图；Build Log 从真实 Git 提交提取，不编造版本。支持可选截图、决策记录、指标，缺数据隐藏。

## Search Limitations
Algolia 外部索引覆盖由远端配置决定，本地无法证明索引完整。新增按需下载的精简站内索引，复用 SearchBar 入口，支持类型分组与快捷导航；不引入搜索后台或大型库。

## SEO Gaps
缺少个性化 OG 模板、Project 结构化数据和品牌化 404。优先统一 title/description/redirect，再补真实实体 metadata。

## Proposed Changes
P0：共享品牌导航/Footer、路由兼容、首页项目数据复用、Learning 概览、Lab 设计、Radar 信任标签。验证通过后 P1：事件模型、周摘要层级、项目证据、内容来源、搜索、研究概念入口。再处理 P2：Reading Inbox、Paper 可选人工笔记/比较字段、真实 Changelog、OG 模板、结构化数据、404。

## Files To Modify
docusaurus.config.js、vercel.json、plugins/content-index.cjs、plugins/route-redirects.cjs、data/projects.json、data/experiments.json、config/news-sources.json、src/utils/radar.cjs、src/components/{HomeProjects,ContentDetail,ContentUI,RadarItem,RadarWeekly,ReadingActions}.js、src/pages/{index,learning,research,reading,papers,radar,lab}.js、src/pages/news/weekly.js、src/css/custom.css、相关导航翻译、测试与内容规范。

## Files To Add
共享 navigation / brand 配置；Provenance / Freshness / Architecture / 实验设计组件；/radar/weekly；轻量 search-index 插件及 SearchBar；Reading v2 适配；真实 changelog 数据与页面；404 与 OG 模板；阶段验收报告。最终以实际必要性为准。

## Redirect Plan
新增 `/news/weekly` → `/radar/weekly`、`/lab` → `/labs`，保留 `/lab#实验-id` 的对应详情跳转。中英各一套。Vercel 使用 permanent（308）；静态预览使用 canonical + noindex + replace。旧 About/Blog/news 兼容继续保留。

## Risks
本地依赖统一 npm；不再次升级框架。路由迁移必须检查 hash 和语言前缀；客户端存储必须迁移、容错且 SSR 安全；搜索索引按需加载，不能向首页注入完整原始资讯。所有 Source Trust 都由可追溯证据决定，未知保持未知。现存 pnpm-lock.yaml/yarn.lock 不纳入本次修改。
