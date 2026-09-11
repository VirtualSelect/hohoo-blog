# Hohoo 的个人博客

基于 Docusaurus 3.10.2 和 React 18，聚焦 AI 应用开发、LLM 分享、具身智能与个人随笔，支持中文、英文界面和深浅主题。文章正文目前主要为中文；英文站点会回退显示原文。

## 本地开发

需要 Node.js 20 或更高版本；项目 CI 使用 Node.js 22。统一使用 npm 和 `package-lock.json` 安装依赖。

```sh
npm ci
npm start -- --no-open
```

英文界面：`npm run start:en -- --no-open`。

## 构建与预览

```sh
npm run build
npm run preview
```

构建会检查站内链接，并生成两个语言版本到 `build/`。部署时发布此目录即可。

`npm start` 使用开发地址 `http://localhost:3000/`；`npm run preview` 使用生产构建预览地址 `http://localhost:4173/`。

升级依赖前先停止开发和预览服务，再执行 `npm ci`，完成后重新启动。不要在同一个 `node_modules` 中交替执行 npm、pnpm 或 Yarn 安装，否则运行中的开发服务可能混用不同依赖副本，导致 React 上下文错误。依赖升级后若遇到此问题，停止服务后执行 `npm run clear`、`npm ci`，再启动；`clear` 会清除 `build/`，使用预览前需重新构建。

## 内容维护

- `blog/`：随笔；front matter 中设置标题、日期、作者和标签。摘要后添加 `<!-- truncate -->`。
- `docs/`：技术笔记；`docs/intro.md` 是主题索引，目录由 `sidebars.js` 生成。
- `src/pages/index.js`：首页展示结构；专题标题、简介和路由统一维护在 `data/topics.js`。
- `src/pages/index.module.css`：首页样式；`src/css/custom.css`：主题、阅读排版和深色模式。
- `src/pages/aboutMe.mdx`：个人介绍与联系方式。
- `i18n/`：界面翻译；新增导航项时同步英文翻译。
- `docusaurus.config.js`：域名、导航、编辑链接、Algolia 搜索与 Giscus 配置。

搜索依赖 Algolia 索引，评论依赖 GitHub Discussions；本地构建成功不代表这些外部服务已配置成功。发布后需在实际域名验证。

关于页保留原有 Giscus `index` 讨论标识以兼容历史评论；其他页面使用去除语言前缀的完整路径。

## 新的内容分类

公开技术内容分为 `docs/ai-apps/`（AI 应用开发）、`docs/llm/`（LLM 分享）与 `docs/embodied-ai/`（具身智能）。每个目录的 `index.md` 是规划页，真实文章按主题放入相应目录，侧栏自动收录。首页专题数据维护在 `data/topics.js`。

技术文章按主要问题只选择一个专题；RAG、Agent、论文阅读等作为辅助标签。`blog/` 保留个人随笔。旧技术笔记迁到 `archive/legacy/`，不参与发布。删除的旧文章地址会返回 404；部署后需重新抓取 Algolia 索引以清除旧结果。

## 阅读路线与时间轴

`data/learning-paths.json` 管理两条路线及稳定的阶段 ID。规划页不进入时间轴。实际文章写入对应 `docs/` 专题目录，在 front matter 增加以下字段，构建时会自动点亮路线入口并按日期加入 `/timeline`：

```yaml
learning_step: first-call # 对应路线中的唯一阶段 ID
published_at: "2026-09-11" # 换成真实发布日期，必须加引号
reading_minutes: 15 # 根据正式文章篇幅估算
```

不要提前填入虚假的发布日期。草稿使用 `draft: true`，不进入索引；`unlisted: true` 的文章也不会进入路线和时间轴。缺失日期、无效阅读时长、未知或重复阶段 ID 会使构建失败，避免产生错误链接和重复记录。文章的标题、摘要与实际链接由 Docusaurus 提供，无需在时间轴再手动填写。英文站沿用未翻译的中文正文，路线界面有英文说明。

## 个人交互模块

阅读路线支持中英文关键词搜索、方向筛选、想读清单和随机选题。想读与已读保存在浏览器 localStorage（`hohoo-learning-v1`），不上传服务器；规划条目不能标记已读。禁用存储时回退为当前页面内状态。`/now` 展示当前关注的方向与计划，更新此页面时请区分计划和实际成果。邮件选题入口仅打开用户的邮件应用，不自动发送。

## AI 资讯

新增独立资讯板块、RSS 采集与人工审核 PR 流程。配置、试运行和上线步骤见 [NEWS.md](./NEWS.md)。默认采集只生成本地预览，定时任务需要设置 NEWS_ENABLED=true 才会启用。

## 页面层级

主导航仅保留文章、研究、资讯、关于。研究 /research 汇集专题、论文、路线和实验；/news 按来源发布日期（UTC）提供日/周分组和渐进加载。旧 /timeline、/news/weekly、/now 等路径保留。首页三个专题下展示博客功能总览与真实采集流水线，不使用虚构项目或动态 GitHub 数字。
