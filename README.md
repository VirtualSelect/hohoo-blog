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
npm run format:check
npm run typecheck
npm run test:web
node --test tests/*.test.cjs tests/*.test.mjs
npm run i18n:check
npm run news:check
npm run build
# 启动生产预览后：
npm run test:routes --prefix apps/web
```

`format:check` 从仓库根目录调用应用检查，覆盖 `apps/web` 的 app、components、runtime、lib、scripts、tests、配置文件及本轮迁移的共享 TS 文件。应用与共享 TS 文件由 `.gitattributes` 固定 LF 换行，避免 Windows 检出后出现仅换行造成的告警；CI 使用同一命令。Markdown 内容、研究原始证据和生成目录不纳入这项应用格式检查，也不因此被改写。

博客已渐进接入 TypeScript：路由、上下文、国际化、文章列表与阅读器、分类筛选和学习进度使用严格类型检查；其他 JS/JSX 继续共存。`npm run typecheck` 会先生成内容和 Next.js 路由类型，干净检出后也可运行。范围、边界及后续迁移方法见 [TypeScript 维护说明](docs/TYPESCRIPT.md)。当前没有独立 lint 命令。

## 维护与部署

开发规则见 AGENTS.md；视觉、内容与 Radar 规范见 docs/。国际化说明见 docs/I18N.md，采集运行说明见 NEWS.md。
部署配置与 MDX 支持边界见 apps/web/README.md。本次框架迁移不自动修改线上部署；Docusaurus 历史代码可通过 Git 查阅，无需维护第二套构建。
