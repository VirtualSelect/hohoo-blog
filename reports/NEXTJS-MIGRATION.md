# Next.js 重构验收

> 后续解耦已完成，当前状态见 `DOCUSAURUS-DECOUPLING.md`。以下为初次迁移时的历史记录，其中 legacy 命令、compat 层和旧依赖保留说明已被后续清理取代。

日期：2026-09-12。分支：`codex/nextjs-redesign`，从当时干净的 main 创建。用户原有 `pnpm-lock.yaml`、`yarn.lock` 未动。未提交、未推送、未部署。

## Before / After

- 原先由 Docusaurus 提供路由与主题；本分支默认启动与构建切换为 Next.js App Router。旧版仍能通过 legacy 命令构建、预览和回滚。
- 首页由居中 Hero 改成左侧大标题 + 右侧近况，接真实文章列表、两项已有项目、三条学习主线与三条外部 Radar 信号。项目视觉是文字架构展示，不冒充运行截图。
- 暖白 / 深绿黑背景、低饱和绿色 Accent；减少卡片，使用留白、编号、细分割线和一致的正文层级。
- 导航、手机菜单、搜索、主题与语言切换采用新壳层；保留五个一级入口。
- 文章以窄正文、左右导航、稳定锚点、代码高亮/复制、学习上下文、翻译来源提示组成阅读布局。
- Radar 采用日期侧栏 + 紧凑来源摘要；空结果有清晰重置操作，已修复隐藏标签导致的手机溢出。
- About 改成轻量个人介绍、共用近况、工作方式与真实作品，不增加履历或虚构成绩。

## Routes Changed / New Routes

保留首页、articles、learning、build、projects 及详情、labs 及详情、notes、papers、reading、research、timeline、now、about、subscribe、changelog、radar、weekly、历史 daily、docs、blog/tags/archive。

全部支持简体根路径、`/zh-TW`、`/en`。108 个页面响应已检查。没有新增第四条学习主线。

`aboutMe`、`news`、`lab`、`news/weekly`、包含空格的旧 Blog 地址提供永久重定向；未知地址返回 404。RSS 保留 blog/news 路径并提供 radar/rss.xml。

## Components Added / Reused

新增：Shell、Home、Radar、Document、Views，以及小型 Next.js 上下文/链接适配器。

复用：ContentUI、ContentDetail、DocReadingContext、CurrentFocus、ReadingActions、RadarItem、RadarWeekly、NewsDigest、TopicLanding、项目证据、实验设计，以及现有学习、阅读、论文与时间轴业务组件。收藏 key、迁移与异常处理保持原语义。

## Files Modified

- `apps/web/`：App Router、主题样式、页面壳层、内容适配、依赖锁、测试与说明。
- `package.json`：默认命令指向新版，保留 legacy 命令。
- `.github/workflows/validate.yml`、`ai-news.yml`：安装新版独立锁定依赖，再构建验证。
- `.gitignore`：允许提交新应用的忽略规则。
- README、ROADMAP、DESIGN-SYSTEM、CONTENT-MODEL：同步本分支运行和内容规则。

## Content Models Changed

未改变正式内容状态、作者、时间和成果数据。构建器读取原 Markdown/JSON/翻译文件，复用既有内容校验和 Radar 处理，生成三语言路由、正文 HTML、目录、索引和 RSS。不读取 `.docusaurus` 产物，不需要先构建旧站。

内容没有新增虚假文章、项目、实验、指标或作者观点。自动资讯翻译仍暂停。

## Dependencies Added

独立应用：Next.js 16.3.5、React / React DOM 19.3.0、gray-matter、marked、sanitize-html；开发格式化使用 Prettier。版本由 apps/web/package-lock.json 锁定。未新增 CSS 框架、CMS、数据库、动画库。

Markdown/front matter 转换和 HTML 清理在构建端完成；代码高亮复用仓库已有 Prism。Docusaurus 依赖暂留用于回滚及原有数据校验，Next.js 前端使用薄适配层，不运行 Docusaurus Router。

## SEO Changes

Next Metadata 提供 title、description、canonical、Open Graph 与可用译文 alternate；未翻译正文回退原文的页面 noindex，canonical 指向原文。sitemap 不收这些重复回退正文。提供 robots、正确服务端 html lang 与旧地址跳转。

## Responsive / Accessibility

- 首页检查 1440 / 1280 / 1024 / 768 / 430 / 375，无水平溢出。
- 375px 抽查首页、文章列表、学习、实践、项目详情、实验、论文、阅读清单、Docs、Radar、About 共 11 类页面，无水平溢出。
- 实际查看深色桌面与浅色手机效果；测试手机菜单开关、全站搜索结果、Radar 空结果、学习路线展开、继续阅读、收藏与筛选。测试收藏已取消。
- 跳转正文链接、可见焦点、原生表单 label、dialog Escape 与关闭后焦点恢复、主题切换、减少动效规则。
- 浏览器抽查未发现 console error。未宣称做过完整人工 WCAG 认证或所有组合的屏幕阅读器测试。

## Validation

- 原仓库测试：42 / 42。
- 新迁移测试：6 / 6，覆盖三语言内容路由、代码证据链接、目录、真实学习索引、Radar 隔离与 RSS。
- Next.js 生产构建通过。
- HTTP 回归：108 个三语言页面、12 条历史地址跳转、9 个 RSS、404，均通过。
- 浏览器：六档宽度、11 类移动页、三语言核心路由、明暗主题及关键交互。

## Performance Impact

新版不加载旧版 Router、首页粒子或额外 UI 库；各业务页面使用路由组件分包。Markdown 与 Radar 处理不在访问链路运行。当前为保证多语言文档根标签正确，使用 Next.js SSR 和轻量代理传递 locale；需要 Node.js 部署，不是纯静态 export。尚未做同条件 Lighthouse 对比，不声称 LCP/CLS 有量化提升。

## Known Limitations

1. 部分复杂业务组件仍通过 `compat` 薄层复用；这不是把所有旧源码删除后的纯原生组件重写。这样保留稳定的学习、阅读与证据功能，后续可逐页移除适配层。
2. 现有 Markdown、表格、代码、admonition、TopicLanding、NewsDigest 已接入；任意新增可执行 MDX 组件需显式接入，不能把外部 RSS 当作代码执行。
3. 线上博客仍是现有部署，因此项目资料保留其实际线上技术描述；没有把本地 Next.js 分支虚报为已上线。
4. Vercel 需先配置 apps/web 预览项目并允许访问仓库上级内容；本次没有变更线上 Root Directory、域名、环境变量或发起部署。
5. 尚未翻译的外部资讯保持来源语言；原有尚空的 Notes 和未执行实验不伪造内容。

## 下一步

先审阅本地新版布局，再决定是否提交与创建 Vercel 预览部署。预览验收后再切换正式域名；不自动发布。

## 后续修复：个人页粒子与本机 npm

已将原 AstraParticleHero 接回 /about，增加 useBaseUrl 静态资源适配与 GLSL 资源加载规则。恢复既有粒子字形、拨散、复位、暂停、滚动到个人介绍与减少动效逻辑；About 正文位于 about-content 锚点。构建通过，浏览器状态 ready，拨散/复位/暂停播放和 375px 无溢出已验证，控制台无 error。

Node 26.8.2 / npm 12.0.2 已安装且系统 PATH 正确；旧终端继承 E:\nodejs 时仍显示 22.4.0 / 10.8.1。scripts/use-node.ps1 可在 PowerShell 中 dot-source，重新读取系统 PATH，验证后显示新版。也可重启终端所属 IDE/Codex。
