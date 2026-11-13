# 八套主题整合

日期：2026-11-13。分支：`codex/ai-lab-reimagined-20261112`。用户已确认五张新设计稿全部保留；当前五套已接入网站，与A/B/C共八套。仍为本地实现，未提交、合并、推送或发布。

## 交付

| 编号 | 主题/偏好ID | 实际结构 |
| --- | --- | --- |
| A | 研究空间 / `space` | 原午夜蓝研究空间、地形与底部导航 |
| B | 清晰阅读 / `clear` | 原白蓝阅读布局 |
| C | 主干手记 / `classic` | 原主干暖纸绿色、左侧书桌与真实实验封面 |
| D | 插画花园 / `garden` | 满幅生成插画、可点击方向路牌；手机插画+方向列表 |
| E | 光影随记 / `photo` | 摄影风格宽封面、独立叶影细节、作者/精选/近作错落排版 |
| F | 几何构成 / `construct` | 黑字朱红、四块不等分内容网格、原生几何图形 |
| G | 知识地图 / `map` | 目录、真实路线关系画布、精选预览；手机分层列表 |
| H | 章节书册 / `chapters` | 双页目录与文章摘要、章节签、暗红书签；手机单页 |

原未采纳的极简专栏、紫色展廊、独立刊物与黄黑工程档案不属于当前集合；旧样式/组件已清除。历史阶段报告保留用于追溯，不表示当前设计已采纳。

八套共享内容、URL、三语、收藏、学习进度、搜索及同一研究方向状态。一个Home、一个H1；新增槽默认隐藏，仅在对应主题显示。核心正文不需要通过JavaScript生成才可阅读。A基础明暗为暗，其余为亮。

`huhohoo.design.v1`继续保存固定ID；旧`journal/gallery`分别兼容到`garden/photo`，旧`dark/light`偏好仍映射A/B。首屏初始化与选择器用同一纯函数；加载不写入/清除用户阅读数据。选择八套后刷新、跨页和同源标签按最新偏好恢复。

## 内容真实性

图稿中的日期、示例标题、统计与关系没有复制到内容索引。实际页面读取现有文章/项目/路线和当前语言链接。地图的每条边只表达「本站研究方向→已发表入口文章」，不推断先修、实验结论或文章之间的关联。入口使用`selectedHomeArticle`；缺少文章时显示空状态。手机直接提供分层列表和普通链接。

三张生成图片只作装饰，未当作真实实验、用户环境或成果。正文中的真实图表、代码、来源与数据保留；Radar继续保持外部内容归属。没有新增依赖、外部字体、内容源、模型后端或账号服务。

## 文件

- `apps/web/lib/design-themes.mjs`、`theme-init.mjs`及两份偏好测试：八主题注册表、迁移与首屏协议。
- `ThemeToggle.jsx`、`design-picker.css`：八项三语选择器、当前状态、键盘和小预览。
- `Home.jsx`、`HomeConcepts.tsx`、`HomeVariations.tsx`、`home-concepts.css`：五种首页结构、真实地图和章节签；保留原方向状态。
- `design-collection.css`：新五套全站颜色、导航、文章、学习、项目、Radar、正文及手机降级；只命中新五套。
- `design-layouts.css`、`home-presets.css`：保留C及公共别名，清除未采纳版式；页面/404加载新的样式。
- `static/media/design`：三个WebP装饰素材，沿用现有静态资源复制流程。
- `docs/DESIGN-SYSTEM.md`、`CONTENT-MODEL.md`、`ROADMAP.md`：同步用户选择、当前设计与内容边界。

## 验证

| 检查 | 结果 |
| --- | --- |
| `npm run format:check` | 通过 |
| `npm run typecheck` | 通过 |
| `npm test --prefix apps/web` | 162项通过，0失败 |
| `npm run build` | 634静态页面生成成功，250MB门禁通过 |
| 最终生产版`test:routes` | 615页，0错误，原重定向与RSS等检查通过 |
| 新五主题布局 | 5×7页×6宽度=210项，无整页横向溢出、保持单一H1及主题 |
| ABC回归 | 3×7页×2宽度=42项，无整页横向溢出、保持单一H1及主题 |
| 英文/繁体首页 | 5×2语言×3宽度=30项，布局与本地化文章链接通过 |
| 方向状态 | 地图选RAG后切到书册，文章与`?track=rag`保持 |
| 搜索/选择器 | 查询“缓存”逐一切换八主题不重置；Escape关闭并回到选择按钮 |
| 正式版本刷新 | 八套逐一选择和刷新，主题/明暗、查询和URL均正确恢复 |
| 同源多标签 | 一个标签切花园，另一已打开学习页同步花园 |
| 实际生产首屏脚本 | 首页与404分别执行八主题和两个旧ID，共20项映射通过 |
| 手机实际视觉 | 花园插画/方向列表、地图分层关系清单可读可操作 |
| 正式版本截图/控制台 | 八项选择器与五套首页已保存；正式检查时段无新增error |

七页为首页、`/learning`、`/articles`、`/build`、`/radar`、`/notes`及`/docs/llm/kv-cache`。六宽度为1440、1280、1024、768、430、375；ABC回归为1440和375；英文/繁体为1440、768和375。布局矩阵在开发预览执行，正式构建另做路由、刷新/同步、截图与首屏检查。没有对615页逐篇进行人工视觉检查。

最终本地静态输出估算153,745,148 bytes（约146.62MiB），客户端资产2,661,966 bytes，public资源7,411,872 bytes。该估算不是云端计费占用。三张新装饰图合计581,192 bytes；使用已有Sharp依赖仅做WebP格式压缩，未改画面内容，未新增依赖。

## 预览与截图

预览：<http://localhost:4217/>。保留本地生产服务，当前已打开八套选择器。窗口尺寸检查后已恢复正常浏览器视口。

以下实际截图保存在`C:/Users/Hohoo/.codex/visualizations/2026/11/12/01a1ce5f-4beb-75d1-8f61-7efba060f4f6/`：

- `eight-theme-picker-20261113.jpg`
- `eight-theme-garden-20261113.jpg`
- `eight-theme-photo-20261113.jpg`
- `eight-theme-construct-20261113.jpg`
- `eight-theme-map-20261113.jpg`
- `eight-theme-chapters-20261113.jpg`

截图来自最终生产版正常1920×911视口。原五张概念图及提示词在同一可视化目录的`theme-concepts-20261113/`下保留；实际页面以真实内容为准。

## 装饰素材与最终提示词

均通过内置图像生成工具基于用户选定稿生成，再转换为WebP；未将整张含UI的设计图作为网页内容。

| 文件 | 尺寸 | 字节 |
| --- | --- | --- |
| `static/media/design/garden-scene.webp` | 1853×849 | 359656 |
| `static/media/design/light-cover.webp` | 1896×830 | 102664 |
| `static/media/design/photo-detail.webp` | 1536×1024 | 118872 |

### Garden

Use case: precise-object-edit. The attached image is an approved website DESIGN REFERENCE. Produce ONLY the garden illustration asset used across its large desktop hero, without any of the surrounding website / mobile preview / frame. Wide landscape illustration approximately 2400 by 1100, front-facing gouache and pencil on warm cream paper. Closely preserve the approved style, colors and composition: large leafy tree and books with sleeping cat on the left, greenhouse and small friendly robot dog on the right, fine vegetation and paper-like paths in the bottom. Keep a broad clean cream negative-space opening through the upper middle for later HTML headline. Remove ALL website chrome, labels, wooden signposts with text, paper article cards, floating notes, letters, numbers and all UI typography. Any wooden garden objects must have no writing. No screenshot or device frame. Extend the illustration naturally to the edges, retaining painterly detail and sophistication. No 3D, no new text, no watermark. This is a purely decorative imagined digital garden, no real experiment or personal-workspace claim.

### Light cover

Use case: precise-object-edit. The attached approved website DESIGN REFERENCE contains a wide atmospheric photographic cover. Deliver ONLY that cover photograph as a clean standalone wide asset, approximately 2400 by 1050; remove all UI, page layout, mobile preview, frames, branding and letters. Preserve its quiet premium still-life art direction: translucent unprinted paper sheets on a neutral desk, an unmarked closed linen notebook at the right, cropped brushed metal vessel at the far right, warm soft afternoon window shadows crossing the scene. Upper/left and lower/left should have uninterrupted tonal space for HTML white headline later. Realistic editorial photography, tactile paper grain, muted warm monochrome, restrained contrast, no people, no printed text, no screens, no logos, no watermark, no synthetic 3D look. Pure abstract atmosphere rather than a claim to depict the author's actual desk.

### Photo detail

Use case: precise-object-edit. The reference is an approved website mockup. Extract and recreate ONLY the small central photographic detail showing the shadow and a few real leaves on a warm cream wall. Output one clean rectangular editorial photograph with no website UI, no mobile screen, no lettering, no title, no book, no chrome. A branch of small olive-green leaves at the upper right throws long delicate afternoon shadows onto a textured warm off-white wall, with much negative space and a soft rectangular window shadow. Sophisticated natural light still life matching the reference's muted warm photographic tone. Wide 3:2 composition, approximately 1200x800. No watermark, no fabricated experiment. This is an abstract decorative photo-style image.
