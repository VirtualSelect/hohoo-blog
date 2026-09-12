# Next.js 博客

用户授权的全站重构分支：`codex/nextjs-redesign`。

## 运行

仓库根目录 `npm ci`，然后 `npm ci --prefix apps/web`。

- `npm start`：新版开发服务，http://localhost:4181
- `npm run build`：内容构建与 Next.js 生产构建
- `npm run preview`：新版生产预览

## 内容与边界

`scripts/content.mjs` 读取原有 docs/blog/JSON/翻译目录，复用内容校验、学习索引与 Radar 去重逻辑，不依赖 `.docusaurus` 或旧站点构建产物。生成数据与 public 资源不入库。

App Router 管理路由、metadata、404、旧地址跳转、sitemap、robots。为服务端正确输出三语言 `html lang`，当前使用轻量请求头代理与 SSR；内容预处理仍在构建阶段完成，没有实时采集或模型请求。

首页、导航、搜索、Radar、About、文章阅读器为 Next.js 新组件。`runtime` 提供站点自己的 Link、翻译与内容上下文；共享组件直接导入这些模块，不再使用 Docusaurus API 或别名。保留原组件用于复用收藏、学习进度和实验证据逻辑。

当前正文支持仓库已使用的 Markdown、表格、代码、admonition、TopicLanding 与 NewsDigest 页面。任意新增 MDX React 组件需要显式接入，不应将不可信外部内容当作可执行 MDX。

## 部署

Vercel 项目 `hohoo-blog` 的 Root Directory 必须为 `apps/web`，并开启 Include source files outside of the Root Directory。应用内 `vercel.json` 固定安装根目录与应用的两份依赖，并使用 Next.js 构建输出。Node.js 选择 Vercel 支持的 24.x。不要从仓库根目录直接构建该 Vercel 项目，否则不会读取应用内配置。

此分支尚未部署，不修改线上项目设置。新建 Vercel 预览或迁移已有项目时：Root Directory 选择 `apps/web`，启用读取 Root Directory 外的源文件；安装命令使用 `cd ../.. && npm ci && npm ci --prefix apps/web`，构建命令 `npm run build`（在 apps/web 内），框架 Next.js，输出默认 `.next`。发布前先验证预览部署与现有域名跳转，再切生产。

现有 RSS 管线从根目录继续运行。Docusaurus 依赖、插件生命周期、主题覆盖与旧版构建命令已移除；历史版本通过 Git 保留。
