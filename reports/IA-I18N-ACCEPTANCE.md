# 信息架构精简与国际化验收

日期：2026-09-12。改动已在本地实现及验证，尚未提交或部署。开始前分析见 IA-I18N-AUDIT.md，维护说明见 docs/I18N.md。

## Before / After Information Architecture

从按内容类型分散的多个菜单，调整为“文章 → 学习 → 实践 → Radar → 关于”。二级内容保持原址，通过聚合、上下文和 Footer 发现；不是删除已有知识模块。

## Old Navbar

学习分组（阅读路线、研究总览、AI Radar、学习活动）、构建分组（项目、实验）、知识分组（短笔记、论文阅读）、随笔。

## New Navbar

文章 / 学习 / 实践 / Radar / 关于。辅助能力保留全站搜索、原生语言下拉和主题切换。移动端保留五个入口，并增加菜单内搜索按钮。

## Homepage Sections Removed

首页移除大块三方向路线、Behind The Lab、空实验区、重复活动流、底部重复联系区和粒子首屏。现在依次为 Hero、Latest Writing、Currently、Featured Build、AI Radar、Footer。真实文章紧跟 Hero；Radar 最多三条。About 的既有视觉继续保留。

## Articles Aggregation

新增 /articles，复用 content-index，不建立另一份手填文章清单。只聚合当前语言 published 的 Docs / Notes / Paper Notes / Blog；排除 MISSING、规划条目、论文摘要导读和 Radar。类型筛选同步 URL，并提供无结果状态。

当前简体入口展示真实 Java 文章与既有随笔；en / zh-TW 各展示一篇真实文章译文，没有填充样例文章。

## Learning Simplification

默认 Current Path 七个节点。已发布文章显示阅读入口和真实进度；planned 仅轻量标题。完整路线折叠，保留搜索、想读、随机探索、完成状态、继续学习与既有本地存储迁移/错误处理。三条 Track 保持不变；Java / Python / Frontend 进入 Foundations。旧节点锚点保留。

## Build Aggregation

新增 /build，展示两个真实项目；三个实验仍为 planning，放入可展开提案，不伪造实验结果。/projects、/labs 及详情页继续存在。

## Secondary Routes

/research、/papers、/notes、/reading、/timeline、/now、/changelog、/blog、Tags、Archive 均保留。About 提供 Now / Timeline / Changelog 的上下文入口。

## i18n Architecture

原生 Docusaurus i18n；UI 使用 translate 与 code.json，Navbar / Footer 使用原生主题翻译。zh-CN 是源语言。沿用现有部分英文分支，增量迁移核心 UI，不做运行时繁简替换或第三套页面外壳。

## Locale Routes

| 语言 | 前缀 | 示例 |
| --- | --- | --- |
| 简体中文 | 根路径 | /articles |
| 繁體中文 | /zh-TW | /zh-TW/articles |
| English | /en | /en/articles |

详情 slug 不变，语言切换保留当前文章路径。

## Translation Strategy

第一篇 Java 模型调用文章提供完整 en / zh-TW 示例，保留真实实验数据、示例和 GitHub 链接。译文标记 AI_TRANSLATED，没有标记人工审核。

Docs / Blog 未翻译正文明确显示原文入口。Projects / Labs 提供本地化标题、简介和状态；未登记长文译文时回到中文原文。没有批量翻译历史随笔和所有 planned 选题。

## Translation Status Model

ORIGINAL / AI_TRANSLATED / REVIEWED / OUTDATED / MISSING。manifest 记录 sourceLocale、sourceUpdatedAt、sourceRevision 及译文日期和 revision。构建校验真实文件指纹；中文更新使旧译文提示待同步。检查仅提示，不因缺少翻译阻断中文发布。

## SEO / hreflang

验证了三语言独立 canonical、zh-CN / zh-TW / en / x-default hreflang、核心页面本地化 description。结构化数据修正繁中前缀及项目本地化标题。

Docusaurus 分别生成三份 locale sitemap；robots.txt 声明全部三份。未把所有语言 canonical 指向中文。

## Search Changes

每个 locale 独立生成搜索索引；缺失原创译文不进入该语言搜索结果。结果分 WRITING / BUILD / DISCOVER，包含 Learning 路线。Radar 保留原始标题及既有多语言标题关键词；页面数据仅投影当前语言摘要，来源文本回退明确标识 SOURCE LANGUAGE。

## Files Modified

- `data/current.json`
- `data/experiments.json`
- `data/navigation.cjs`
- `data/projects.json`
- `docs/AI-RADAR.md`
- `docs/CONTENT-MODEL.md`
- `docs/DESIGN-SYSTEM.md`
- `docs/ROADMAP.md`
- `docusaurus.config.js`
- `i18n/en/code.json`
- `i18n/en/docusaurus-theme-classic/footer.json`
- `i18n/en/docusaurus-theme-classic/navbar.json`
- `package.json`
- `plugins/content-index.cjs`
- `plugins/radar-pages.cjs`
- `plugins/route-redirects.cjs`
- `plugins/search-index.cjs`
- `src/components/AstraParticleHero/index.jsx`
- `src/components/ContentDetail.js`
- `src/components/ContentUI.js`
- `src/components/CurrentFocus.js`
- `src/components/DocReadingContext.js`
- `src/components/ParticleField.js`
- `src/components/RadarItem.js`
- `src/components/ReadingActions.js`
- `src/components/SearchDialog.js`
- `src/components/StructuredData.js`
- `src/css/custom.css`
- `src/pages/about.js`
- `src/pages/index.js`
- `src/pages/index.module.css`
- `src/pages/learning.js`
- `src/pages/radar.js`
- `src/theme/BlogLayout/index.js`
- `src/theme/DocItem/Content/index.js`
- `src/theme/NotFound/Content/index.js`
- `src/theme/SearchBar/index.js`
- `src/utils/news-locale.mjs`
- `src/utils/search.mjs`

## Files Added

- `data/localization.json`
- `docs/I18N.md`
- `"i18n/en/docusaurus-plugin-content-blog/archive/\344\270\200\344\270\252\346\226\260\347\232\204\345\274\200\345\247\213.md"`
- `i18n/en/docusaurus-plugin-content-docs/current/ai-apps/java-first-llm.md`
- `i18n/en/docusaurus-plugin-content-docs/current/intro.md`
- `i18n/terminology/zh-TW.json`
- `i18n/zh-TW/code.json`
- `"i18n/zh-TW/docusaurus-plugin-content-blog/archive/\344\270\200\344\270\252\346\226\260\347\232\204\345\274\200\345\247\213.md"`
- `i18n/zh-TW/docusaurus-plugin-content-docs/current/ai-apps/java-first-llm.md`
- `i18n/zh-TW/docusaurus-plugin-content-docs/current/intro.md`
- `i18n/zh-TW/docusaurus-theme-classic/footer.json`
- `i18n/zh-TW/docusaurus-theme-classic/navbar.json`
- `plugins/translation-check.cjs`
- `reports/IA-I18N-AUDIT.md`
- `scripts/i18n/check.cjs`
- `src/components/TranslationNotice.js`
- `src/components/WritingList.js`
- `src/pages/articles.js`
- `src/pages/build.js`
- `src/theme/BlogPostItem/Content/index.js`
- `src/theme/Navbar/MobileSidebar/PrimaryMenu/index.js`
- `src/utils/localization.cjs`
- `src/utils/radar-locale.cjs`
- `static/robots.txt`
- `tests/localization.test.cjs`
- reports/IA-I18N-ACCEPTANCE.md（本报告）

## Redirects

未更改任何已发布中文 canonical slug。保留 aboutMe → about、news → radar、news/weekly → radar/weekly、lab → labs、a new milestone → a-new-milestone，并扩展 locale 前缀处理。实际浏览器验证了原有十一条跳转，包括带实验锚点的旧地址。

## Dependencies Added

None。仍使用 npm；没有修改或采用工作区原有未跟踪 pnpm-lock.yaml / yarn.lock。

## Performance Impact

首页取消粒子组件入口，未引入新动画库。全文留在内容路由，搜索继续按需加载；Radar 采用构建期 locale 投影。没有执行 Lighthouse 或 Core Web Vitals 实测，因此不宣称具体 LCP/CLS 改善数值。

## Accessibility Changes

保留原生语义链接、按钮、details 和 dialog。验证搜索自动聚焦、Escape 关闭及焦点返回，语言菜单保持原生 Docusaurus 行为。新增移动菜单搜索入口，键盘 Enter 可打开菜单；明暗主题、可见焦点、减少动态效果保留。

## Validation

- 42 项 Node 自动化测试通过，包含新增翻译版本、缺失回退、聚合排除和 Radar locale 投影测试。
- 三语言生产 build 成功；无项目 broken link、broken anchor、编译或 SSR 错误。
- 324 次布局检查：27 个语言/页面组合 × 六种宽度 × 两个主题，均无横向溢出、运行时异常。
- 52 项交互断言通过：五项导航、类型筛选 URL、当前语言搜索、Escape/焦点、折叠路线、空状态、译文状态、移动端菜单搜索、404、语言切换及 canonical。
- Radar 无结果前后 main 宽度均为 360px（375px 视口），没有变形。
- Git 默认换行配置下 diff --check 通过。仓库没有独立 lint/typecheck script，未虚报执行。

## Known Limitations

这是核心 UI 和内容发现基础升级，不是全站正文翻译完成。部分二级研究数据、论文导读与规划选题仍保留原始语言。通用全文译文需登记 manifest；未登记时按缺失处理。

CLI 的版本更新检查受本机配置目录权限限制出现提示，不影响三语言构建产物；未改动系统权限来消除该环境提示。

## Missing Translations

现有随笔正文、Project 长 Case Study、Lab 长实验设计未登记完整译文。已有标题/简介本地化不等同全文翻译。Radar 大量来源文本尚无繁中或英文摘要，按来源语言展示；自动翻译任务仍暂停。

## Recommended Translation Queue

1. 人工核对首篇 Java 文章的两份 AI 译文，尤其代码解释、术语与实验结论边界。
2. 翻译 Java LLM 实作集的项目案例正文。
3. 下一篇正式教程发布后，再同步高价值译文与相关入口。
4. 等真实实验完成后翻译 Lab 结果，不提前生成结论。

下一步建议优先审阅种子文章译文并继续写真实技术内容。本轮没有自动启动后续阶段，也没有提交或部署。
