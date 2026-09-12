# Hohoo's AI Lab

公开学习、实验、构建与分享 AI 的个人数字花园。当前网站使用 Next.js App Router，保留既有内容与三语言 URL。

## 本地运行

使用 .node-version 指定的 Node.js 和 package.json 指定的 npm。

```sh
npm ci
npm ci --prefix apps/web
npm start
```

开发地址：http://localhost:4181 。生产构建运行 `npm run build`，预览运行 `npm run preview`。
Windows 旧终端未更新 Node 路径时可运行 `. ./scripts/use-node.ps1`。

## 代码与内容

- `apps/web/app`：路由、SEO、全局样式。
- `apps/web/components`：首页、导航、搜索、Radar、文章阅读器与页面入口。
- `apps/web/runtime`：共享站点上下文、翻译、链接与文档上下文。
- `src/components`、`src/pages`：仍复用的内容与学习业务组件，由 Next.js 按需加载。
- `src/css/shared.css`：共享阅读和内容样式；`--hh-base-*`、`--hh-*` 为站点变量。
- `lib/content`：框架无关的内容、学习索引与 RSS 工具。
- `docs/`、`blog/`：技术教程与个人随笔；`docs/templates` 保存模板。
- `i18n/{locale}/docs`、`i18n/{locale}/blog`：译文；`code.json`：界面文案。
- `data/`：项目、实验、路线、近况、翻译清单及 Radar 数据。
- `static/`：原始图片和公共资源；构建时复制到新版应用。

三条学习主线保持 AI 应用开发、LLM、具身智能。真实文章通过 learning_step、published_at、reading_minutes 关联路线与时间轴。草稿和规划不伪装成已发布内容。学习状态与收藏仅保存在浏览器本地。

## 验证

```sh
npm run test:web
node --test tests/*.test.cjs tests/*.test.mjs
npm run i18n:check
npm run news:check
npm run build
# 启动生产预览后：
npm run test:routes --prefix apps/web
```

## 维护与部署

开发规则见 AGENTS.md；视觉、内容与 Radar 规范见 docs/。国际化说明见 docs/I18N.md，采集运行说明见 NEWS.md。
部署配置与 MDX 支持边界见 apps/web/README.md。本次框架迁移不自动修改线上部署；Docusaurus 历史代码可通过 Git 查阅，无需维护第二套构建。
