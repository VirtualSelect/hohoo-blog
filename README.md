# Hohoo 的个人博客

基于 Docusaurus 3 和 React 18，聚焦 AI 应用开发、LLM 分享、具身智能与个人随笔，支持中文、英文界面和深浅主题。文章正文目前主要为中文；英文站点会回退显示原文。

## 本地开发

需要 Node.js 18 或更高版本。

```sh
npm ci
npm start -- --no-open
```

英文界面：`npm run start:en -- --no-open`。

## 构建与预览

```sh
npm run build
npm run serve -- --no-open
```

构建会检查站内链接，并生成两个语言版本到 `build/`。部署时发布此目录即可。

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
