# Open Lab 整体改造 · 2026-11-12

## 基线与范围

- 分支：`codex/ai-lab-reimagined-20261112`。
- 起点：抓取后的 `origin/main`，`7e222e8`。
- 独立工作区：`C:/Users/Hohoo/.codex/worktrees/ai-lab-reimagined/hohoo-blog`。
- 原 E 盘工作区及其未提交的内容、搜索改动保持原样，没有混入本分支。
- 当前仅本地改造，未提交、合并、推送或发布。

## 设计与实现

浅色强调色经复核调整为 `#b63e28`，小字对暖白约5.02:1、对soft底约4.54:1；深色强调色保留。

采用 Open Lab 开放实验室：暖白／近黑／朱橙、强无衬线标题、Mono编号、细分割线与开放索引。用顶部通栏导航替换固定书桌侧栏，保留星轨品牌、搜索、语言、主题；个人阅读与订阅入口在页脚。

首页从个人实验室定位进入，以原生 SVG 说明问题→学习→构建→分享的开放循环。图形是概念示意。四个研究方向复用原阅读路线 URL 协议，切换对应已有文章和实验记录。原 MuJoCo 实际轨迹图保留，不改画数据。近作和项目从内容索引读取，外部 Radar 入口保持独立。

学习、文章、实践、知识、Radar 和长文统一编辑式排版。正文在1440px视口实测760px宽，保留左侧方向与右侧目录；小屏采用已有折叠目录和局部代码／表格滚动。保留已有内容、全部URL、三语、阅读状态和浏览器存储协议；没有新增运行时依赖、实验、付费模型或外部服务。

主要文件：

- `apps/web/components/Home.jsx`、`ResearchPortal.tsx`、`Shell.tsx`
- `apps/web/app/lab-shell.css`、`lab-pages.css`、`lab-home.css`
- 正常布局及全局404的样式导入
- `src/pages/articles.tsx`、`learning.js`、`build.js` 的三语刊头
- `docs/DESIGN-SYSTEM.md`、`docs/ROADMAP.md`

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `npm run format:check` | 通过 |
| `npm run typecheck` | 通过 |
| `npm test --prefix apps/web` | 144/144通过 |
| `npm run build` | 通过，634个构建静态项 |
| `PREVIEW_URL=http://localhost:4217 npm run test:routes --prefix apps/web` | 615页，errors=[]；脚本同时检查RSS、重定向和404 |
| 本地非压缩静态输出估计 | 143,492,835 bytes，约136.85 MiB；低于现有250MB门禁 |
| `git diff --check` | 通过 |

浏览器使用正式构建预览，检查了 `/`、`/learning`、`/articles`、`/build`、`/radar`、`/notes`、`/docs/llm/kv-cache`，在1440/1280/1024/768/430/375六档宽度及明暗主题下均无整页横向溢出。英文首页六档与繁体375px入口同样无溢出。视觉检查覆盖首页、学习页及正文的桌面／手机视图。

交互检查：

- 手机菜单展开、Escape关闭、焦点回到触发按钮。
- 首页选择LLM时网址变为 `?track=llm`，内容随之切换；浏览器返回恢复具身方向。
- 文章搜索无匹配时显示空状态；“缓存”查询返回9篇真实文章并同步网址。
- 全局搜索可打开，Escape关闭，焦点回到搜索按钮。
- 主题切换与导航后保持一致。
- 404保留首页、文章、学习及项目回链。
- 正文 canonical 和 Open Graph 标题保持正确。
- 正式构建启动后的浏览验证没有新增 console error；此前失效依赖缓存的错误已随本地依赖修复和缓存重建排除。

## 预览与边界

本地预览：`http://localhost:4217/`。采用生产构建服务，不需要原工作区的开发服务。独立工作区跨盘复用 Next 依赖曾触发缓存路径问题，已按原锁文件安装本地依赖并重新构建，package 与 lock 文件未更改。

当前成果供视觉审阅；未对每篇历史正文逐段视觉检查，没有更改原研究结论或启动新实验。旧版页面基础样式仍被部分既有交互使用，新样式按外壳／内页／首页分层后置加载，避免本轮大规模重写无关功能。
