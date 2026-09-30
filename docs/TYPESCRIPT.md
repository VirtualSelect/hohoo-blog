# 博客 TypeScript 接入与维护

2026-09-30：在 Next.js 博客应用中渐进接入，不涉及 Java / 具身工程，不新增研究文章，也不改变内容和 URL。

## 当前范围

- `apps/web/app/[[...segments]]/`：异步路由参数、静态路径、页面 metadata、服务端到客户端的数据边界。
- `apps/web/runtime/`：SiteContext、useDoc、useContentData、Translate、Link、Layout；数据集键与三种 locale 显式约束。
- `apps/web/lib/site-types.ts`：内容索引的公共字段、文章元信息、标题目录、学习索引与 Radar 预览契约。项目和实验的完整正文模型暂时仍由原 JSON 和运行时校验管理。
- `apps/web/components/`：Shell、RouteContent、Document、ArticleContents。
- `src/pages/articles.tsx`、WritingList、WritingKind：文章发现到阅读的核心链路。
- `src/utils/learning-progress.ts`、`writing-kinds.ts`，以及 `apps/web/lib/navigation.ts`、`reader-settings.ts`：分类、语言跳转、版本化学习记录与阅读偏好。
- 已有的粒子组件 TS 源码也纳入检查；shader 类型与现有 webpack `asset/source` 一致。

## 检查与共存

```sh
npm ci
npm ci --prefix apps/web
npm run typecheck
npm run format:check
npm run test:web
node --test tests/*.test.cjs tests/*.test.mjs
npm run build
```

`typecheck` 依次生成真实内容、Next.js 路由类型，再运行 `tsc --noEmit`。CI 与本地共用命令；生产构建同时保留 Next.js 类型检查，未启用 `ignoreBuildErrors`。

根目录与 `apps/web/.npmrc` 均固定官方 npm registry；应用有独立锁文件，因此单独安装时也应使用同一来源。新增依赖后检查 `apps/web/package-lock.json` 的下载地址，避免本机镜像设置进入锁文件。npm 12 的 CI 安装会拒绝不属于当前 registry 的远程包地址；应修正来源并保留 integrity 校验，不放宽安装安全规则。

`strict: true`，`allowJs: true`，`checkJs: false`。已迁移 TS 严格检查；仍在使用的 JS/JSX 并不等于已完成类型迁移。`skipLibCheck` 只跳过第三方声明内部检查。迁移边界暂用少量 JSDoc 描述 JS 组件参数，不使用全局 `any` 模块声明或 `@ts-nocheck`。

编译器与 React / React DOM / Node 类型包均为 `apps/web` 的开发依赖。固定 TypeScript 7.0.2，当前 Next.js 16.3.5 已支持 CLI 类型检查；不升级框架、不引入运行时库。使用项目固定 Node 26.8.2；原生 Node 测试执行可擦除类型的 `.ts` 文件，不使用 enum、namespace 或参数属性。

`@site/*`、`@lab/*` 与 webpack 保持一致。共享源码的 React 声明解析到应用内类型包，对应现有运行时单 React 别名。`apps/web/lib` 和 `src/utils` 显式声明 ESM；已有 `.cjs` 仍为 CommonJS。Next.js 页面使用 `.ts` / `.tsx`，不依赖额外的 `.mts` loader。

根目录 `tsconfig.json` 继承应用配置，方便编辑器从 `src/` 打开共享 TS 文件时发现同一项目；不维护第二套类型选项。生成的 `next-env.d.ts`、`.next/types` 和增量缓存均不提交。

## 数据与安全边界

TypeScript 不会校验网络或本地存储的 JSON。学习记录与阅读偏好从 `unknown` 开始检查形状和版本，保留旧 key 迁移、异常恢复，不制造完成记录。

`getContent` 只读取 `prepare:content` 生成的本地文件，依赖原有 metadata / 关联校验与真实生成数据契约测试；它不是通用网络反序列化器。Radar 抓取验证、Markdown 清理与翻译清单继续生效。正文仍在服务端输出 HTML，客户端上下文只携带元数据。

`tests/type-contracts.ts` 为只编译的负例，确保错误语言、数据集名、研究方向、状态和字段类型无法通过。其中的 `@ts-expect-error` 是断言：未来类型被意外放宽时检查反而会失败，不用于压制应用错误。

## 后续原则

新应用模块默认使用 TS/TSX。按实际开发需要，下一批可迁移 Search / Radar 的异步状态与 API 边界，再迁移 Projects / Labs 的完整数据契约。每次先补真实字段与运行时校验，再迁移消费组件，不集中改写剩余所有 JS。Markdown、JSON、采集脚本与已发布文章继续使用现有格式。
