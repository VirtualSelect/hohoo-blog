# 第二阶段精修验收

实施：2026-09-11 至 2026-09-12。基于 Docusaurus 3.10.2 增量修改，未升级框架、未推送、未部署。

## Audit Findings

先完成源码与 28 个页面的二次审计，见 `PHASE-2-AUDIT.md`。实际网站已共用 Docusaurus Layout/Footer，主要问题是遗留配置、首页数据重复、实验提案过薄、来源信任不明确和搜索覆盖不可控；没有按假设另建一套页面外壳。

## Branding Changes

统一 Hohoo. / Hohoo's AI Lab，标语保留 Learning in public. Building in public.。首页 title 精确为 `Hohoo's AI Lab · AI Engineering, LLM & Embodied AI`。核心目录使用 Projects / Labs / Papers / Notes / Learning Path / Blog 的一致 title 规则，补齐 Papers、Reading、Subscribe description。仓库 projectName 修正为真实 hohoo-blog。

## Route Changes

周汇总 canonical 为 `/radar/weekly`；历史 `/lab` 归并到 `/labs`。现有 Project/Lab/Docs/Blog 详情保留地址；没有删除文章。

## Redirects Added

- `/news/weekly` → `/radar/weekly`，含英文前缀。
- `/lab` → `/labs`，含英文前缀；已知 `/lab#retrieval-eval` 等实验锚点继续到对应详情。
- 保留旧 About、news 与包含空格的 Blog slug 跳转。
- Vercel `permanent: true` 使用平台永久重定向（308），静态预览通过 noindex / canonical / replace 兼容。11 个旧地址/锚点浏览器检查通过；线上尚未部署，不宣称已验证线上响应头。

## Footer Changes

继续使用唯一的原生 Footer。新增共享 `data/navigation.cjs`，Navbar、Footer 与快捷导航复用目录；移动导航继续复用 Navbar 配置。清理旧 Footer 翻译中已不用的友情链接/平台标签。保留 CC BY-NC 4.0 原协议与版权行，没有再开一套 Footer。

## Homepage Changes

Featured Build 的标题、描述、状态、技术栈、slug、仓库来自真实 Project；方向数量从 topics 计算，论文数量从内容索引计算。Behind the Lab 提供真实流水线及 Changelog 入口。首页只加载三条精简 Radar 摘要，详情正文不再进入全局内容索引。Currently 继续与 Now 共用已有数据。

## Radar Trust Changes

AIHOT 标记 AGGREGATOR，继续承担主要发现来源；引入标准 Source Type 与 Verification Status。当前内容仅显示 SINGLE SOURCE / COMMUNITY SIGNAL，没有补造一手确认。核验记录必须包含检查者、时间和证据，自动发布审批不能代替事实核验。

事件模型提供 eventId / clusterId，支持规范化 URL、时间窗口内精确规范化标题 / 已有内容哈希去重，以及显式事件 ID。官方来源优先展示；采集的 attachCoverage 可保留后续同事件报道和原收藏 ID。测试验证后发现官方报道时不会变成“自动已核验”。

Weekly 改为概览、重点信号、主题变化、待跟踪线索、真实 Related 关系。统计源自数据，标记 RULE-BASED DIGEST；不是 AI 生成个人周评。

## Lab Changes

三个已有 Lab 补成实验设计草案：问题、假设、变量、未确定的数据集、计划基线、指标、判定条件、风险和复现要求。状态仍为 PLANNED，没有假数据、假结果、假执行日期。增加可选 experimentLog；结果、观察、结论和限制仍分开保存。同步实验模板。

## Project Changes

真实博客项目增加语义 CSS 架构图。Build Log 从五条真实 Git 提交提取，与 Changelog 复用；明确不等同于发行版本或部署时间。支持可选截图、结构化决策和带证据指标，当前无数据的区块隐藏。

## Search Changes

SearchBar 入口升级为按需加载的全站搜索与快捷导航。支持 Docs / Blog / Papers / Projects / Labs / Notes / Radar，按 KNOWLEDGE / BUILD / DISCOVER / SHARE 分组。支持 `type:paper RAG`、`type:lab`、`topic:embodied`，论文简称参与检索。

原生 dialog 支持键盘、焦点约束、Esc 关闭、关闭后焦点恢复、空结果与加载失败重试。只索引标题/摘要/标签，不宣称全文检索，不增加搜索后台。

## SEO Changes

沿用框架 canonical / Open Graph；添加 Person 与真实 Project SoftwareSourceCode / BreadcrumbList JSON-LD，保留原生文章结构化数据。品牌化 404 可直接打开搜索。提供 1200×630 SVG OG 模板，尚未自动替换所有社交图片；后续应导出社交平台兼容的 PNG/JPEG。

## Components Added

ArchitectureDiagram、ProjectEvidence、ExperimentDesign、ContentProvenance / Freshness、LearningOverview、PaperMetadata / PaperNotes、StructuredData、SearchDialog，以及 SearchBar / NotFound Content 主题覆盖。

## Components Reused

Docusaurus Layout、Footer、Navbar/MobileSidebar、BlogLayout、DocItem、Heading、Link；ContentUI 的 Section / ContentRows / Related / Status；CurrentFocus、HomeUpdates、HomeProjects、RadarItem、RadarWeekly、ReadingActions、useLearningProgress。

## Data Models Changed

新增共享导航、Git 构建日志、实验设计与执行日志契约、Project 证据字段、Paper 编号/已有版本/概念路径、可选人工笔记与比较 metadata、来源核验/事件模型、内容来源/时效字段。

Reading Inbox 使用 `huhohoo.reading.v2`，迁移旧资讯/论文收藏；INBOX / READING / DONE，按类型、主题、保存时间及已有阅读时长筛选排序。学习记录继续保留原命名空间，通过适配器展示。缺少保存时间和阅读时长的记录不补造数字。Notes 仍为空，只保留真实 Draft Template。

## Dependencies Added

None。package.json / package-lock.json 未改动。未引入 UI、图形、搜索或数据库依赖。

## Performance Impact

- 搜索 UI 与索引使用独立动态加载 chunk；当前英文精简索引约 3.9 KB（未压缩 JSON，不代表全站 JS 大小）。
- 项目章节、实验设计与证据正文从全局数据移到详情路由；首页 Radar 保留三条摘要。
- 架构图为 HTML/CSS，没有图形运行时。没有实时抓取、模型请求或全文内容进入普通页面请求。
- 未进行线上 Lighthouse / Web Vitals 测量，不宣称 LCP/CLS 提升百分比。

## Validation

- 38/38 Node 测试通过，包括核验边界、后续官方报道合并、阅读迁移与搜索过滤。
- `npm run news:check` 通过：现有 4 条真实数据，未新增采集内容。
- Docusaurus 中文、英文生产构建通过；无构建错误或 broken-link 报告。
- 34 个页面 × 6 个宽度 × 2 个主题 = 408 次布局检查，未发现横向溢出或浏览器运行时异常。
- 27 项第二阶段交互验收通过；11 项原有交互回归通过。
- 验证包括搜索简称、空结果宽度、焦点、Esc、404 搜索、旧收藏迁移、阅读状态切换、中英文共用状态、存储被禁用时降级、移动导航、随机探索空状态、reduced-motion。
- `git diff --check` 通过。项目没有 lint / typecheck 脚本，没有虚构执行结果。
- 唯一构建环境提示：Docusaurus 更新检查不能写入用户配置目录；不影响编译、SSR 或页面输出。

## Known Limitations

- 未部署线上；远端永久重定向与实际爬虫调度待上线后验证。
- 没有语义向量聚类、实体推断或自动事实核验；不同措辞/语言的同事件可能需要显式 eventId。
- 搜索是标题摘要检索。Algolia 旧配置暂保留以便回退；不保证远端索引同步。
- Weekly 是规则 Digest，没有生成式摘要或作者观点。
- Paper 作者、venue、代码链接与人工笔记仅支持真实字段，没有代填未知事实。
- OG 是模板，不是全内容自动 PNG 生成管线。
- 无新实验结果、真实 Note 或新增项目指标。尚未选定的实验数据集明确显示未知。
- 完整双语 build 与 dev 共用 `.docusaurus`；已记录先停 dev 再 build 的操作约定，避免开发缓存串语言。

## Remaining Technical Debt

已有少量旧页面仍用页面级 CSS，后续随内容更新渐进收敛。构建日志目前从 Git 整理后存 JSON，不在构建中依赖 Git 命令。Radar 的强核验标签依赖编辑者提供真实独立证据，不是自动事实核查系统。计划阅读时长不参与“真实最短文章”的排序。

## Recommended Next Content

1. 给检索实验确定一份有许可的数据集、固定问题与评分规则，再执行基线。
2. 人工补一篇短 Note（如 Structured Output / Tool Calling），再连接对应 Lab。
3. 核验一条聚合资讯的一手来源，留下证据与检查时间。
4. 在真实论文阅读完成后填写 My Notes，不让摘要代替阅读结论。

下一步建议优先做内容与实验，而不是继续扩充模块。本轮不自动开始下一阶段。

## Files Modified / Added

- `README.md`
- `config/news-sources.json`
- `data/experiments.json`
- `data/papers.json`
- `data/projects.json`
- `docs/AI-RADAR.md`
- `docs/CONTENT-MODEL.md`
- `docs/DESIGN-SYSTEM.md`
- `docs/ROADMAP.md`
- `docs/templates/lab.md`
- `docusaurus.config.js`
- `i18n/en/docusaurus-plugin-content-blog/options.json`
- `i18n/en/docusaurus-theme-classic/footer.json`
- `i18n/zh-CN/docusaurus-plugin-content-blog/options.json`
- `i18n/zh-CN/docusaurus-theme-classic/footer.json`
- `plugins/content-index.cjs`
- `plugins/radar-pages.cjs`
- `plugins/route-redirects.cjs`
- `scripts/news/collect.mjs`
- `scripts/verify/interactions.cjs`
- `scripts/verify/layout.cjs`
- `src/components/ContentDetail.js`
- `src/components/ContentUI.js`
- `src/components/DocReadingContext.js`
- `src/components/HomeProjects.js`
- `src/components/HomeUpdates.js`
- `src/components/RadarItem.js`
- `src/components/RadarWeekly.js`
- `src/components/ReadingActions.js`
- `src/css/custom.css`
- `src/pages/about.js`
- `src/pages/index.js`
- `src/pages/lab.js`
- `src/pages/labs.js`
- `src/pages/learning.js`
- `src/pages/news/weekly.js`
- `src/pages/notes.js`
- `src/pages/papers.js`
- `src/pages/projects.js`
- `src/pages/radar.js`
- `src/pages/reading.js`
- `src/pages/research.js`
- `src/pages/subscribe.js`
- `src/utils/radar.cjs`
- `vercel.json`
- `data/build-log.json`
- `data/navigation.cjs`
- `plugins/search-index.cjs`
- `reports/PHASE-2-ACCEPTANCE.md`
- `reports/PHASE-2-AUDIT.md`
- `scripts/verify/phase2.cjs`
- `src/components/ArchitectureDiagram.js`
- `src/components/ContentProvenance.js`
- `src/components/ExperimentDesign.js`
- `src/components/LearningOverview.js`
- `src/components/PaperMetadata.js`
- `src/components/ProjectEvidence.js`
- `src/components/SearchDialog.js`
- `src/components/StructuredData.js`
- `src/pages/changelog.js`
- `src/pages/radar/weekly.js`
- `src/theme/NotFound/Content/index.js`
- `src/theme/SearchBar/index.js`
- `src/utils/reading-inbox.mjs`
- `src/utils/search.mjs`
- `static/img/og-template.svg`
- `tests/phase2.test.cjs`

本地最终检查：3000 开发首页与 4173 预览首页均为正确品牌标题、hydrated=true，无运行时异常。
