# Hohoo's AI Lab — 本轮验收

## Before / After
| 之前 | 现在 |
| --- | --- |
| 首页主要解释未来方向 | Hero → Currently → 三轨 → Latest → Radar → Featured Builds → Latest Lab → Activity |
| 近况在多个页面硬编码 | 首页 / Now / About 共用 current.json |
| Topic 是规划说明 | Start Here、应用工程分支、已发布内容、项目、实验提案、论文与外部信号入口 |
| 项目与实验混合 | 真实项目说明与未执行实验提案分开，结果未测量则不展示 |
| Timeline 等待第一篇路线文章 | 从真实发布元数据汇总项目、原创内容与显式发布周汇总；不收单条 Radar |
| 两组 Learning 与无版本存储 | 三条主线、版本迁移、继续阅读、独立收藏与阅读状态 |
| 资讯仅三类研究标签 | Radar 稳定分类、来源类型、UTC 时间轴、同标题同日/显式事件合并与来源追溯 |
| 顶部四个分散入口 | 学习 / 构建 / 知识 / 随笔，移动端沿用原生菜单并完善键盘支持 |

## Routes Changed
- /aboutMe → /about；英文同步，保留旧地址。
- /news → /radar；/news/rss.xml 和每日汇总地址保持可用。
- /blog/a%20new%20milestone → /blog/a-new-milestone；英文同步。
- /lab 与旧片段 ID 保留兼容入口。
- /news/weekly 保留，指向按 ISO 周生成的阅读汇总。

## New Routes
/projects、/projects/hohoo-blog、/labs、/labs/retrieval-eval、/labs/tool-eval、/labs/action-representation、/radar、/radar/weekly/2026-W36、/radar/weekly/2026-W37、/notes、/about，以及对应英文地址。未来 published Notes 与新项目/实验通过 metadata 生成详情。

## Components Added
ContentUI（Section / ContentRows / Status / Related）、ContentDetail、TopicLanding、HomeUpdates、DocReadingContext、RadarItem、RadarWeekly、LegacyRedirect、useLearningProgress；原生 DocItem、BlogLayout、MobileSidebar 的轻量包装。

## Components Reused
HomeProjects、CurrentFocus、ReadingActions、TopicNews、TopicPapers、NewsDigest；原生 Docusaurus Navbar、Sidebar、TOC、MDX、代码块、分页、Blog Tags、Archive。既有 About 评论保留，无新增评论系统。

## Files Modified
完整文件清单（含新增）：

- .github/workflows/validate.yml
- AGENTS.md
- blog/archive/一个新的开始.md
- config/news-sources.json
- data/current.json
- data/experiments.json
- data/learning-paths.json
- data/notes.json
- data/projects.json
- data/radar-digests.json
- data/topics.js
- docs/AI-RADAR.md
- docs/CONTENT-MODEL.md
- docs/DESIGN-SYSTEM.md
- docs/ROADMAP.md
- docs/ai-apps/index.md
- docs/embodied-ai/index.md
- docs/intro.md
- docs/llm/index.md
- docs/templates/doc.md
- docs/templates/lab.md
- docs/templates/note.md
- docusaurus.config.js
- i18n/en/docusaurus-theme-classic/footer.json
- i18n/en/docusaurus-theme-classic/navbar.json
- i18n/zh-CN/docusaurus-theme-classic/navbar.json
- plugins/content-index.cjs
- plugins/learning-index.cjs
- plugins/radar-pages.cjs
- plugins/route-redirects.cjs
- reports/ARCHITECTURE-AUDIT.md
- src/components/ContentDetail.js
- src/components/ContentUI.js
- src/components/CurrentFocus.js
- src/components/DocReadingContext.js
- src/components/HomeProjects.js
- src/components/HomeUpdates.js
- src/components/LegacyRedirect.js
- src/components/NewsDigest.js
- src/components/RadarItem.js
- src/components/RadarWeekly.js
- src/components/ReadingActions.js
- src/components/ReadingActions.module.css
- src/components/TopicLanding.js
- src/components/TopicNews.js
- src/components/useLearningProgress.js
- src/css/custom.css
- src/pages/about.js
- src/pages/aboutMe.mdx
- src/pages/index.js
- src/pages/index.module.css
- src/pages/lab.js
- src/pages/labs.js
- src/pages/learning.js
- src/pages/news-timeline.module.css
- src/pages/news.js
- src/pages/news/weekly.js
- src/pages/notes.js
- src/pages/now.js
- src/pages/projects.js
- src/pages/radar.js
- src/pages/reading.js
- src/pages/research.js
- src/pages/research.module.css
- src/pages/timeline.js
- src/theme/BlogLayout/index.js
- src/theme/DocItem/Content/index.js
- src/theme/Navbar/MobileSidebar/index.js
- src/utils/learning-progress.mjs
- src/utils/radar.cjs
- tests/content-index.test.cjs
- tests/learning-progress.test.mjs
- tests/radar.test.cjs
- vercel.json
- reports/CONTENT-MAINTENANCE.md
- reports/UPGRADE-ACCEPTANCE.md
- scripts/verify/layout.cjs
- scripts/verify/interactions.cjs

## Content Models Changed
- 三轨 learning-paths 保留旧节点 ID；AI Engineering 为 application 内的 area。
- current 维护实质更新时间；projects 保存真实源码、技术栈与说明；experiments 明确 planning 状态。
- notes 当前为空，只发布真实 published 内容。
- content-index 从原生 Docs/Blog 与本地 metadata 建立统一索引，检查 ID/URL 唯一、日期、状态、domain 和显式关系。
- radar-digests 使用真实条目及本轮生成时间，不借原始来源日期伪造本站发布时间。
- huhohoo.learning.v1 从 hohoo-learning-v1 迁移；保留旧键，不声称云同步。

## Dependencies Added
None。package.json 与 package-lock.json 未改。浏览器验收与格式化工具仅临时使用缓存，不进入生产依赖。

## SEO Changes
保留 native canonical / metadata；新增页面 title/description；清理旧 URL 并增加永久/静态兼容；排除开发规范与模板的公开文档路由；sitemap 不索引 /aboutMe、/news 的旧入口。

## Responsive Changes
1440 / 1280 / 1024 / 768 / 430 / 375，Light / Dark，共 264 个页面布局组合通过；无横向溢出或页面异常。移动端首页个人卡片压缩，优先露出近况。Radar 空结果区域宽度稳定。

## Accessibility Changes
语义标题、输入标签、focus-visible、按钮 aria-pressed、44px 主要触控目标；移动菜单 Escape 关闭、焦点返回与边界循环；减少动效媒体查询。11 项浏览器交互检查通过。未进行完整人工屏幕阅读器审计。

## Validation
- node --test tests/*.test.mjs tests/*.test.cjs：31 项通过。
- npm run news:check：4 条真实资讯校验通过。
- npm run build：中英文通过，无内容断链/锚点或 SSR 构建错误。
- 无现成 lint/typecheck script，未虚报运行。
- 浏览器：264 布局组合、11 交互检查、6 个旧地址中英文跳转通过；无检测到的页面运行异常。
- Docusaurus 的更新检查可能提示系统缓存权限问题，不影响构建产物；未改动系统目录权限。

## Performance Impact
没有新增大型库、请求时抓取或模型调用。核心内容静态输出；新增本地进度和索引会增加少量 JS/元数据。未测量 Lighthouse/LCP/CLS 分数，不声称具体提升。

## Known Limitations
- Radar 当前采用规则分类与保守事件合并，并非完整语义聚类/可解释多维评分系统。
- 自动翻译/模型摘要仍暂停；没有对应字段时不展示 WHY IT MATTERS，不生成 Hohoo's Take。
- 后续自动周页为实时数据的周索引；进入 Activity 需要显式发布记录，不自动伪造事件日期。
- 没有正式技术教程可用于完整的真实课程继续阅读链路；本地迁移/收藏和初始空状态已验证，正式内容发布后需补实际课程序列验收。
- P2 Glossary、Resources、Knowledge Map、Ask Hohoo 未启动。

## Content Still Missing
正式技术教程、原创短笔记、已运行实验的环境/方法/结果、本人完成阅读后的论文理解、更多真实项目案例。现有三份论文仅为摘要导读。

## Recommended Content To Write Next
1. Java 调用第一个 LLM：完整请求、失败处理、版本与复现步骤。
2. 一篇 Token / Context Window 短笔记：300～800 字，注明来源。
3. 执行一次检索对照实验：固定资料与问题，记录方法、观察、局限，再形成结论。

下一步应优先补真实内容，不继续扩张模块；本轮没有启动下一阶段。
