# 信息架构与国际化审计（编码前）

## Current Information Architecture
主干 35a3951；Docusaurus 3.10.2 / React 18 / npm。中文已有正式 Java 教程、随笔、2 个项目、3 个实验提案、3 个摘要导读、Radar。页面数量明显多于原创文章。

## Current Navbar
学习（阅读路线/研究总览/Radar/活动）、构建（项目/实验）、知识（短笔记/论文）、随笔、语言、搜索与主题。移动侧栏复用同一树，已有 Esc 与焦点处理。

## Current Footer
EXPLORE / KNOWLEDGE / ELSEWHERE，重复导航内容；版权正文固定中文。保留原生 Footer，不另做页面外壳。

## Current Content Types
doc、blog、project、lab、note、paper、radar-digest、radar。content-index 汇总内容；paper 被设为 to-read，不应视为已发布 Paper Note。

## Duplicate Entry Points
Learning、Research、三个专题、Papers、Timeline 都引导相同学习内容。Reading 是本地收藏功能，不应成为一级内容类型。

## Duplicate Content Presentation
首页 Latest 和 Activity 重复文章；Projects 与 Behind the Lab 重复站点实现；论文摘要在 Research/Papers/专题多次出现。

## Homepage Section Audit
Hero（含大粒子字形）→大块 Tracks→Currently→项目及 Behind the Lab→Latest 与 Radar→空 Lab→Activity→联系 CTA。真实文章出现太晚。保留现有粒子实现供其他页面使用，本轮首页改为紧凑文字 Hero。

## Planned Content Density
Learning 默认完整展开全部计划及难度/前置/时间/想读按钮，实际只有一篇正式路线文章。Labs 已有折叠提案，可以复用。

## Current i18n Status
多数 React 组件使用 en 布尔值；i18n/en 只有 UI JSON，没有正式文章译文。英文 Docs/Blog 因原生回退直接显示中文，缺少翻译状态。数据存在 zh/en 双份元信息，但无来源版本关联。

## Current Locale Configuration
defaultLocale=zh-CN，locales=en/zh-CN；没有 zh-TW。多个自定义插件硬编码 en 前缀；必须使用 Docusaurus locale 配置派生前缀。不能只添加 locales 数组。

## SEO / hreflang Status
原生 canonical/sitemap 已存在。新增 locale 需保留各自 canonical，补 x-default；缺翻译页面应有原文提示，不伪装翻译或进入本地化 Articles。不能用中文标题填充英文 Latest。

## Route Risks
保留所有 /learning、/research、/projects、/labs、/radar、/papers、/notes、/reading、/blog、/about、/now、/timeline、/docs/* 和旧重定向。新建 /articles 与 /build 仅做聚合。自动生成 Docs 目录要排除新规范文件。翻译文件路径与源文档 ID 必须一致。

## Reusable Components
Layout/Footer、ContentRows/Section/Status、CurrentFocus、RadarItem、SearchDialog、DocReadingContext、原生 TOC/代码块、移动侧栏、ReadingActions。继续使用现有 CSS tokens 与 hh-rows。

## Proposed Simplified IA
五个直接入口：文章 / 学习 / 实践 / Radar / 关于。其他页面从相关页面或 Footer 可达；无删除。首页只保留 Hero / Latest Writing / Currently / Featured Build / Radar / Footer。

## Proposed i18n Architecture
原生三 locale 路由与原生 translate/code.json；简中源文件作为事实源；locale 静态构建各自的内容与搜索索引。统一翻译清单记录源修订、译文修订和时间，缺失/过期提示不阻塞中文。首篇 Java 教程作为三语样板，新增译文明确 AI_TRANSLATED，不标人工审核。项目/实验优先元数据，长文缺失则指向原文。Radar 结构适配原始字段和 locale 字段，自动翻译任务不在页面请求中启动。

## Files To Modify
docusaurus.config.js、data/navigation.cjs、content/learning/search/radar/redirect 插件、首页/learning/about/radar、共享内容/搜索/阅读组件、现有 theme 包装、i18n JSON、内容规范。

## Files To Add
/articles、/build、WritingList、翻译状态组件/清单/核验脚本、zh-TW UI 目录、首篇 en/zh-TW 译文、缺译 Blog 提示、测试与验收报告。

## Risks
en 二元判断遗漏、缺译内容混入索引、硬编码前缀产生断链、翻译过期、localStorage 迁移被误改。保留所有本地状态 key 与迁移逻辑，使用真实内容筛选与针对性测试。

## Audit Evidence
检查源码目录、数据、配置、锁文件、重定向、模板、主题与静态资产。改造前浏览器检查覆盖现有 34 个路由及英文入口，在 1440/1280/1024 宽度完成页面循环；原始日志 `.cache-loader/ia-before-browser.log`。zh-TW 尚未配置，不能认为已经存在。后续验收会用精简范围独立脚本验证全部三语与六种宽度，避免重型 About 动效干扰批量检查。
