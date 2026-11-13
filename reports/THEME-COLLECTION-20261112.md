# 五套主题与布局验收

日期：2026-11-12。分支：`codex/ai-lab-reimagined-20261112`。本地主干参照：重新获取的 `origin/main`，提交 `7e222e8`。本轮仅本地实现，未提交、合并、推送或发布。

## 交付

| 主题 | 桌面布局 | 手机布局 |
| --- | --- | --- |
| A / 研究空间 `space` | 午夜蓝地形、研究航线、底部导航 | 内容堆叠、底部导航 |
| B / 清晰阅读 `clear` | 白蓝产品式排版、顶部导航 | 内容堆叠、底部导航 |
| C / 主干手记 `classic` | 暖纸与绿色、196px书桌侧栏、真实实验封面 | 收起侧栏、顶部工具与底部导航 |
| D / 极简专栏 `journal` | 黑白衬线、窄单列索引、顶部导航 | 单列正文、底部导航 |
| E / 作品展廊 `gallery` | 深紫、项目优先、不对称展区、顶部导航 | 项目按顺序堆叠、底部导航 |

复用原有内容和路由，全部由一个内容树驱动。C恢复主干视觉与入口，未复制另一份应用或导入原工作区未提交的改动。其MuJoCo封面读取现有真实轨迹图，四方向入口连接已有学习路线。A/B/E概念插图不作为实验结果；D保留正文图表与证据。每个预设有固定基础明暗，分别为暗/亮/亮/亮/暗。

统一选择器提供五种小预览、三语名称、当前状态及说明。新偏好保存在`huhohoo.design.v1`；继续兼容`huhohoo.theme.v1`，旧暗/亮分别映射A/B。首屏同步设置`data-design`与`data-theme`，不等待React再恢复外观。存储不可用时保持当前会话选择并提示未保存。

切换无需刷新，不更换页面组件树；网址、查询、筛选、输入、收藏及学习进度保持原协议。切换布局时按当前可见正文锚点和新旧导航高度调整滚动，优先保留正在阅读的内容。不同布局内容高度变化时，页末仍受浏览器最大滚动位置限制。

## 主要文件

- 主题协议与首屏：`apps/web/lib/design-themes.mjs`、`theme-init.mjs`。
- 选择与本地偏好：`apps/web/components/ThemeToggle.jsx`。
- 公共壳层、首页和方向入口：`Shell.tsx`、`Home.jsx`、`HomeVariations.tsx`、`ResearchPortal.tsx`。
- 布局样式：`apps/web/app/design-layouts.css`、`home-presets.css`、`design-picker.css`；沿用A/B的`lab-shell.css`、`lab-home.css`、`lab-pages.css`。
- 页面及404统一加载相应样式；学习、文章、实践继续共享原内容适配器。
- 新增依赖：无。未变更包管理器、框架、URL或内容采集。

## 验证

| 检查 | 结果 |
| --- | --- |
| `npm run format:check` | 通过 |
| `npm run typecheck` | 通过 |
| `npm test --prefix apps/web` | 160项通过，0失败 |
| `npm run build` | 634个静态页面生成成功，250MB门禁通过 |
| `PREVIEW_URL=http://localhost:4217 npm run test:routes --prefix apps/web` | 615页，0错误；包含既有重定向、RSS等检查 |
| 实际生产首页与404中的首屏脚本 | 两份脚本分别执行五套偏好，设计/明暗均正确 |
| 五主题×七页×六宽度 | 210项检查，单一H1、主题保留、无整页横向溢出 |
| 英文与繁体首页×五主题×三宽度 | 30项检查，标题/内容与链接保持本地化、无整页横向溢出 |
| 生产浏览器偏好恢复 | 五套分别选择并刷新，原文章查询`缓存`和URL均保留 |
| 跨标签 | 一个标签切换C，另一个已打开的学习页同步为C |
| 阅读位置 | C侧栏切换D顶栏后，同一KV Cache文章保持在阅读区域；过滤输入未重置 |
| 选择器键盘与手机 | Enter打开、Escape关闭并回到触发器；原生模态对话框，375px面板可滚动、44px关闭按钮保持可见 |
| C方向导航 | 点击LLM进入`/learning?track=llm` |
| 浏览器控制台 | 正式版本检查未发现error |

七页为首页、`/learning`、`/articles`、`/build`、`/radar`、`/notes`及`/docs/llm/kv-cache`。六宽度为1440、1280、1024、768、430、375；英文/繁体补充宽度为1440、768、375。布局矩阵不是对每篇文章逐一做视觉检查，615页路由检查另行验证内容可访问性。

本地未压缩静态输出估算为150,599,191 bytes（约143.62 MiB），不代表云端计费占用；无新增依赖或远程字体。开发模式曾出现Next缓存快照警告，正式构建与浏览器验收通过。

## 实际截图与预览

预览：<http://localhost:4217/>。保留在本地生产预览服务，主题面板可直接选择五种设计。

截图位于当前会话可视化目录：

- `C:/Users/Hohoo/.codex/visualizations/2026/11/12/01a1ce5f-4beb-75d1-8f61-7efba060f4f6/theme-collection-picker.jpg`
- `C:/Users/Hohoo/.codex/visualizations/2026/11/12/01a1ce5f-4beb-75d1-8f61-7efba060f4f6/theme-collection-picker-mobile.jpg`
- `C:/Users/Hohoo/.codex/visualizations/2026/11/12/01a1ce5f-4beb-75d1-8f61-7efba060f4f6/theme-collection-classic.jpg`
- `C:/Users/Hohoo/.codex/visualizations/2026/11/12/01a1ce5f-4beb-75d1-8f61-7efba060f4f6/theme-collection-gallery.jpg`

A/B前期验收保留在`reports/DUAL-THEME-20261112.md`，本报告覆盖最新五主题集合。
